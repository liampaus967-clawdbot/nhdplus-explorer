/**
 * Route Hazards API
 * 
 * Returns hazards (dams, waterfalls, rapids) along a route.
 * Takes a bounding box or route geometry and returns nearby hazards.
 */
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export interface Hazard {
  id: number;
  type: 'dam' | 'waterfall' | 'rapid';
  name: string;
  latitude: number;
  longitude: number;
  distance_m?: number;
  // Dam-specific fields
  dam_height_ft?: number;
  hazard_potential?: string;
  river_name?: string;
  // Waterfall-specific fields
  height?: string;
  description?: string;
  // Rapid-specific fields
  rapid_class?: string;
  comid?: number;
}

/**
 * GET /api/hazards?min_lng=X&min_lat=Y&max_lng=X&max_lat=Y
 * GET /api/hazards?route=LINESTRING(...)  (WKT geometry)
 * GET /api/hazards?comids=123,456,789
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  // Option 1: Bounding box
  const minLng = parseFloat(searchParams.get('min_lng') || '');
  const minLat = parseFloat(searchParams.get('min_lat') || '');
  const maxLng = parseFloat(searchParams.get('max_lng') || '');
  const maxLat = parseFloat(searchParams.get('max_lat') || '');
  
  // Option 2: COMIDs (query along river segments)
  const comidsParam = searchParams.get('comids');
  
  // Buffer distance in meters for searching along route
  const bufferM = parseFloat(searchParams.get('buffer') || '500');
  
  const hazards: Hazard[] = [];
  
  try {
    if (comidsParam) {
      // Query hazards near river segments by COMID
      const comids = comidsParam.split(',').map(c => parseInt(c.trim(), 10)).filter(c => !isNaN(c));
      
      if (comids.length === 0) {
        return NextResponse.json({ error: 'Invalid comids' }, { status: 400 });
      }
      
      if (comids.length > 200) {
        return NextResponse.json({ error: 'Max 200 COMIDs per request' }, { status: 400 });
      }
      
      // Build route geometry once for all queries
      const routeGeomCTE = `
        WITH route_geom AS (
          SELECT ST_Union(geom) as geom
          FROM river_edges
          WHERE comid = ANY($1::bigint[])
        )
      `;

      // Find dams within buffer distance of the route segments
      const damResult = await query(`
        ${routeGeomCTE}
        SELECT 
          d.id,
          d.dam_name as name,
          d.latitude,
          d.longitude,
          d.dam_height_ft,
          d.hazard_potential,
          d.river_name,
          ST_Distance(
            d.geom::geography,
            (SELECT geom::geography FROM route_geom)
          ) as distance_m
        FROM hazards_dams d, route_geom r
        WHERE ST_DWithin(d.geom::geography, r.geom::geography, $2)
        ORDER BY distance_m
        LIMIT 20
      `, [comids, bufferM]);
      
      for (const row of damResult.rows) {
        hazards.push({
          id: row.id,
          type: 'dam',
          name: row.name || 'Unnamed Dam',
          latitude: row.latitude,
          longitude: row.longitude,
          distance_m: Math.round(row.distance_m),
          dam_height_ft: row.dam_height_ft,
          hazard_potential: row.hazard_potential,
          river_name: row.river_name,
        });
      }

      // Find waterfalls within buffer distance
      const waterfallResult = await query(`
        ${routeGeomCTE}
        SELECT 
          w.id,
          w.name,
          w.lat as latitude,
          w.lon as longitude,
          w.height,
          w.description,
          ST_Distance(
            w.geom::geography,
            (SELECT geom::geography FROM route_geom)
          ) as distance_m
        FROM water_access.waterfalls w, route_geom r
        WHERE ST_DWithin(w.geom::geography, r.geom::geography, $2)
        ORDER BY distance_m
        LIMIT 20
      `, [comids, bufferM]);
      
      for (const row of waterfallResult.rows) {
        hazards.push({
          id: row.id,
          type: 'waterfall',
          name: row.name || 'Unnamed Waterfall',
          latitude: row.latitude,
          longitude: row.longitude,
          distance_m: Math.round(row.distance_m),
          height: row.height,
          description: row.description,
        });
      }

      // Find rapids (OSM data with class ratings) within buffer distance
      const rapidResult = await query(`
        ${routeGeomCTE}
        SELECT 
          r.id,
          r.name,
          r.lat as latitude,
          r.lon as longitude,
          r.rapid_class,
          ST_Distance(
            r.geom::geography,
            (SELECT geom::geography FROM route_geom)
          ) as distance_m
        FROM water_access.rapids r, route_geom rg
        WHERE ST_DWithin(r.geom::geography, rg.geom::geography, $2)
        ORDER BY distance_m
        LIMIT 30
      `, [comids, bufferM]);
      
      for (const row of rapidResult.rows) {
        hazards.push({
          id: row.id,
          type: 'rapid',
          name: row.name || 'Unnamed Rapid',
          latitude: row.latitude,
          longitude: row.longitude,
          distance_m: Math.round(row.distance_m),
          rapid_class: row.rapid_class,
        });
      }

      // Find USGS rapids (ML-detected, tied to COMIDs) - direct COMID match
      const usgsRapidResult = await query(`
        SELECT 
          id,
          site_name as name,
          latitude,
          longitude,
          predicted_probability,
          comid
        FROM water_access.usgs_rapids
        WHERE comid = ANY($1::bigint[])
          AND has_rapids = true
        ORDER BY predicted_probability DESC
        LIMIT 30
      `, [comids]);
      
      for (const row of usgsRapidResult.rows) {
        hazards.push({
          id: row.id + 1000000, // Offset to avoid ID collision
          type: 'rapid',
          name: row.name || `Rapid (${Math.round(row.predicted_probability * 100)}% confidence)`,
          latitude: row.latitude,
          longitude: row.longitude,
          distance_m: 0, // On the actual route
          rapid_class: row.predicted_probability > 0.8 ? 'High confidence' : 'Detected',
          comid: row.comid,
        });
      }
      
    } else if (!isNaN(minLng) && !isNaN(minLat) && !isNaN(maxLng) && !isNaN(maxLat)) {
      // Query by bounding box - dams
      const damResult = await query(`
        SELECT 
          id,
          dam_name as name,
          latitude,
          longitude,
          dam_height_ft,
          hazard_potential,
          river_name
        FROM hazards_dams
        WHERE geom && ST_MakeEnvelope($1, $2, $3, $4, 4326)
        ORDER BY dam_height_ft DESC NULLS LAST
        LIMIT 50
      `, [minLng, minLat, maxLng, maxLat]);
      
      for (const row of damResult.rows) {
        hazards.push({
          id: row.id,
          type: 'dam',
          name: row.name || 'Unnamed Dam',
          latitude: row.latitude,
          longitude: row.longitude,
          dam_height_ft: row.dam_height_ft,
          hazard_potential: row.hazard_potential,
          river_name: row.river_name,
        });
      }

      // Query by bounding box - waterfalls
      const waterfallResult = await query(`
        SELECT 
          id,
          name,
          lat as latitude,
          lon as longitude,
          height,
          description
        FROM water_access.waterfalls
        WHERE geom && ST_MakeEnvelope($1, $2, $3, $4, 4326)::geography::geometry
        LIMIT 50
      `, [minLng, minLat, maxLng, maxLat]);
      
      for (const row of waterfallResult.rows) {
        hazards.push({
          id: row.id,
          type: 'waterfall',
          name: row.name || 'Unnamed Waterfall',
          latitude: row.latitude,
          longitude: row.longitude,
          height: row.height,
          description: row.description,
        });
      }

      // Query by bounding box - rapids
      const rapidResult = await query(`
        SELECT 
          id,
          name,
          lat as latitude,
          lon as longitude,
          rapid_class
        FROM water_access.rapids
        WHERE geom && ST_MakeEnvelope($1, $2, $3, $4, 4326)::geography::geometry
        LIMIT 50
      `, [minLng, minLat, maxLng, maxLat]);
      
      for (const row of rapidResult.rows) {
        hazards.push({
          id: row.id,
          type: 'rapid',
          name: row.name || 'Unnamed Rapid',
          latitude: row.latitude,
          longitude: row.longitude,
          rapid_class: row.rapid_class,
        });
      }
      
    } else {
      return NextResponse.json(
        { error: 'Provide either comids or bounding box (min_lng, min_lat, max_lng, max_lat)' },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      hazard_count: hazards.length,
      hazards,
    });
    
  } catch (error) {
    console.error('Hazards API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch hazards', details: String(error) },
      { status: 500 }
    );
  }
}
