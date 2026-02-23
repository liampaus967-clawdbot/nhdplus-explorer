/**
 * Route Discovery API
 * 
 * Returns POIs (campgrounds, hazards, access points) along a route.
 * Used by Explorer mode's "Discover Along the Way" section.
 */
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export interface DiscoveryPOI {
  id: number;
  type: 'campground' | 'dam' | 'waterfall' | 'rapid' | 'access_point';
  name: string;
  latitude: number;
  longitude: number;
  distance_m?: number;
  // Campground fields
  operator?: string;
  website?: string;
  has_water?: boolean;
  has_toilets?: boolean;
  // Dam fields
  dam_height_ft?: number;
  hazard_potential?: string;
  // Rapid fields
  rapid_class?: string;
  // Waterfall fields
  height?: string;
}

export interface DiscoverySummary {
  campgrounds: { count: number; items: DiscoveryPOI[] };
  hazards: { 
    count: number; 
    dams: number;
    waterfalls: number;
    rapids: number;
    items: DiscoveryPOI[] 
  };
  access_points: { count: number; items: DiscoveryPOI[] };
}

/**
 * GET /api/discover?comids=123,456,789&buffer=1000
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const comidsParam = searchParams.get('comids');
  const bufferM = parseFloat(searchParams.get('buffer') || '1000');
  
  if (!comidsParam) {
    return NextResponse.json(
      { error: 'comids parameter required' },
      { status: 400 }
    );
  }
  
  const comids = comidsParam.split(',').map(c => parseInt(c.trim(), 10)).filter(c => !isNaN(c));
  
  if (comids.length === 0) {
    return NextResponse.json({ error: 'Invalid comids' }, { status: 400 });
  }
  
  if (comids.length > 200) {
    return NextResponse.json({ error: 'Max 200 COMIDs per request' }, { status: 400 });
  }
  
  const result: DiscoverySummary = {
    campgrounds: { count: 0, items: [] },
    hazards: { count: 0, dams: 0, waterfalls: 0, rapids: 0, items: [] },
    access_points: { count: 0, items: [] },
  };
  
  try {
    // Route geometry CTE - reused across queries
    const routeGeomCTE = `
      WITH route_geom AS (
        SELECT ST_Union(geom) as geom
        FROM river_edges
        WHERE comid = ANY($1::bigint[])
      )
    `;
    
    // === CAMPGROUNDS ===
    const campgroundResult = await query(`
      ${routeGeomCTE}
      SELECT 
        c.id,
        c.name,
        c.lat as latitude,
        c.lon as longitude,
        c.operator,
        c.website,
        c.drinking_water,
        c.toilets,
        ST_Distance(
          c.geom::geography,
          (SELECT geom::geography FROM route_geom)
        ) as distance_m
      FROM water_access.campgrounds c, route_geom r
      WHERE ST_DWithin(c.geom::geography, r.geom::geography, $2)
        AND c.is_duplicate = false
      ORDER BY distance_m
      LIMIT 10
    `, [comids, bufferM]);
    
    for (const row of campgroundResult.rows) {
      result.campgrounds.items.push({
        id: row.id,
        type: 'campground',
        name: row.name || 'Unnamed Campground',
        latitude: row.latitude,
        longitude: row.longitude,
        distance_m: Math.round(row.distance_m),
        operator: row.operator,
        website: row.website,
        has_water: row.drinking_water === 'yes',
        has_toilets: row.toilets === 'yes',
      });
    }
    result.campgrounds.count = result.campgrounds.items.length;
    
    // === DAMS ===
    const damResult = await query(`
      ${routeGeomCTE}
      SELECT 
        d.id,
        d.dam_name as name,
        d.latitude,
        d.longitude,
        d.dam_height_ft,
        d.hazard_potential,
        ST_Distance(
          d.geom::geography,
          (SELECT geom::geography FROM route_geom)
        ) as distance_m
      FROM hazards_dams d, route_geom r
      WHERE ST_DWithin(d.geom::geography, r.geom::geography, $2)
      ORDER BY distance_m
      LIMIT 10
    `, [comids, bufferM]);
    
    for (const row of damResult.rows) {
      result.hazards.items.push({
        id: row.id,
        type: 'dam',
        name: row.name || 'Unnamed Dam',
        latitude: row.latitude,
        longitude: row.longitude,
        distance_m: Math.round(row.distance_m),
        dam_height_ft: row.dam_height_ft,
        hazard_potential: row.hazard_potential,
      });
      result.hazards.dams++;
    }
    
    // === WATERFALLS ===
    const waterfallResult = await query(`
      ${routeGeomCTE}
      SELECT 
        w.id,
        w.name,
        w.lat as latitude,
        w.lon as longitude,
        w.height,
        ST_Distance(
          w.geom::geography,
          (SELECT geom::geography FROM route_geom)
        ) as distance_m
      FROM water_access.waterfalls w, route_geom r
      WHERE ST_DWithin(w.geom::geography, r.geom::geography, $2)
      ORDER BY distance_m
      LIMIT 10
    `, [comids, bufferM]);
    
    for (const row of waterfallResult.rows) {
      result.hazards.items.push({
        id: row.id + 100000,
        type: 'waterfall',
        name: row.name || 'Unnamed Waterfall',
        latitude: row.latitude,
        longitude: row.longitude,
        distance_m: Math.round(row.distance_m),
        height: row.height,
      });
      result.hazards.waterfalls++;
    }
    
    // === RAPIDS (OSM) ===
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
      LIMIT 15
    `, [comids, bufferM]);
    
    for (const row of rapidResult.rows) {
      result.hazards.items.push({
        id: row.id + 200000,
        type: 'rapid',
        name: row.name || 'Unnamed Rapid',
        latitude: row.latitude,
        longitude: row.longitude,
        distance_m: Math.round(row.distance_m),
        rapid_class: row.rapid_class,
      });
      result.hazards.rapids++;
    }
    
    // === USGS RAPIDS (COMID-linked) ===
    const usgsRapidResult = await query(`
      SELECT 
        id,
        site_name as name,
        latitude,
        longitude,
        predicted_probability
      FROM water_access.usgs_rapids
      WHERE comid = ANY($1::bigint[])
        AND has_rapids = true
      ORDER BY predicted_probability DESC
      LIMIT 10
    `, [comids]);
    
    for (const row of usgsRapidResult.rows) {
      result.hazards.items.push({
        id: row.id + 300000,
        type: 'rapid',
        name: row.name || `Rapid (${Math.round(row.predicted_probability * 100)}% conf)`,
        latitude: row.latitude,
        longitude: row.longitude,
        distance_m: 0,
        rapid_class: row.predicted_probability > 0.8 ? 'High confidence' : 'Detected',
      });
      result.hazards.rapids++;
    }
    
    result.hazards.count = result.hazards.items.length;
    
    // === ACCESS POINTS ===
    const accessResult = await query(`
      ${routeGeomCTE}
      SELECT 
        a.id,
        a.name,
        a.latitude,
        a.longitude,
        ST_Distance(
          a.geom::geography,
          (SELECT geom::geography FROM route_geom)
        ) as distance_m
      FROM water_access.access_points_clean a, route_geom r
      WHERE ST_DWithin(a.geom::geography, r.geom::geography, $2)
      ORDER BY distance_m
      LIMIT 10
    `, [comids, bufferM]);
    
    for (const row of accessResult.rows) {
      result.access_points.items.push({
        id: row.id,
        type: 'access_point',
        name: row.name || 'Water Access',
        latitude: row.latitude,
        longitude: row.longitude,
        distance_m: Math.round(row.distance_m),
      });
    }
    result.access_points.count = result.access_points.items.length;
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('Discover API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch discoveries', details: String(error) },
      { status: 500 }
    );
  }
}
