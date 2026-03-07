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
 * GET /api/discover?lat=44.5&lng=-72.5&radius=2000
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const comidsParam = searchParams.get('comids');
  const lat = parseFloat(searchParams.get('lat') || '');
  const lng = parseFloat(searchParams.get('lng') || '');
  const radius = parseFloat(searchParams.get('radius') || '2000');
  const bufferM = parseFloat(searchParams.get('buffer') || '1000');
  
  // Support lat/lng point query for Lake mode
  if (!isNaN(lat) && !isNaN(lng)) {
    return handlePointQuery(lat, lng, radius);
  }
  
  if (!comidsParam) {
    return NextResponse.json(
      { error: 'Provide either comids or lat/lng parameters' },
      { status: 400 }
    );
  }
  
  const comids = comidsParam.split(',').map(c => parseInt(c.trim(), 10)).filter(c => !isNaN(c));
  
  if (comids.length === 0) {
    return NextResponse.json({ error: 'Invalid comids' }, { status: 400 });
  }
  
  if (comids.length > 500) {
    return NextResponse.json({ error: 'Max 500 COMIDs per request' }, { status: 400 });
  }
  
  const result: DiscoverySummary = {
    campgrounds: { count: 0, items: [] },
    hazards: { count: 0, dams: 0, waterfalls: 0, rapids: 0, items: [] },
    access_points: { count: 0, items: [] },
  };
  
  try {
    // === CAMPGROUNDS (fast index lookup, dedup by name+location) ===
    const campgroundResult = await query(`
      SELECT DISTINCT ON (name, ROUND(lat::numeric, 4), ROUND(lon::numeric, 4))
        id,
        name,
        lat as latitude,
        lon as longitude,
        operator,
        website,
        drinking_water,
        toilets,
        nearest_comid
      FROM us.campgrounds
      WHERE nearest_comid = ANY($1::bigint[])
        AND is_duplicate = false
      ORDER BY name, ROUND(lat::numeric, 4), ROUND(lon::numeric, 4), id
      LIMIT 10
    `, [comids]);
    
    for (const row of campgroundResult.rows) {
      result.campgrounds.items.push({
        id: row.id,
        type: 'campground',
        name: row.name || 'Unnamed Campground',
        latitude: row.latitude,
        longitude: row.longitude,
        distance_m: 0,
        operator: row.operator,
        website: row.website,
        has_water: row.drinking_water === 'yes',
        has_toilets: row.toilets === 'yes',
      });
    }
    result.campgrounds.count = result.campgrounds.items.length;
    
    // === DAMS (fast index lookup) ===
    const damResult = await query(`
      SELECT DISTINCT ON (id)
        id,
        dam_name as name,
        latitude,
        longitude,
        dam_height_ft,
        hazard_potential,
        nearest_comid
      FROM us.dams
      WHERE nearest_comid = ANY($1::bigint[])
      ORDER BY id
      LIMIT 10
    `, [comids]);
    
    for (const row of damResult.rows) {
      result.hazards.items.push({
        id: row.id,
        type: 'dam',
        name: row.name || 'Unnamed Dam',
        latitude: row.latitude,
        longitude: row.longitude,
        distance_m: 0,
        dam_height_ft: row.dam_height_ft,
        hazard_potential: row.hazard_potential,
      });
      result.hazards.dams++;
    }
    
    // === WATERFALLS (fast index lookup) ===
    const waterfallResult = await query(`
      SELECT DISTINCT ON (id)
        id,
        name,
        lat as latitude,
        lon as longitude,
        height,
        nearest_comid
      FROM us.waterfalls
      WHERE nearest_comid = ANY($1::bigint[])
      ORDER BY id
      LIMIT 10
    `, [comids]);
    
    for (const row of waterfallResult.rows) {
      result.hazards.items.push({
        id: row.id + 100000,
        type: 'waterfall',
        name: row.name || 'Unnamed Waterfall',
        latitude: row.latitude,
        longitude: row.longitude,
        distance_m: 0,
        height: row.height,
      });
      result.hazards.waterfalls++;
    }
    
    // === RAPIDS (fast index lookup) ===
    const rapidResult = await query(`
      SELECT DISTINCT ON (id)
        id,
        name,
        lat as latitude,
        lon as longitude,
        rapid_class,
        nearest_comid
      FROM us.rapids
      WHERE nearest_comid = ANY($1::bigint[])
      ORDER BY id
      LIMIT 15
    `, [comids]);
    
    for (const row of rapidResult.rows) {
      result.hazards.items.push({
        id: row.id + 200000,
        type: 'rapid',
        name: row.name || 'Unnamed Rapid',
        latitude: row.latitude,
        longitude: row.longitude,
        distance_m: 0,
        rapid_class: row.rapid_class,
      });
      result.hazards.rapids++;
    }
    
    // === USGS RAPIDS (already COMID-linked) ===
    const usgsRapidResult = await query(`
      SELECT DISTINCT ON (id)
        id,
        site_name as name,
        latitude,
        longitude,
        predicted_probability
      FROM us.usgs_rapids
      WHERE comid = ANY($1::bigint[])
        AND has_rapids = true
      ORDER BY id
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
    
    // === ACCESS POINTS (fast index lookup, dedup by name+location) ===
    const accessResult = await query(`
      SELECT DISTINCT ON (name, ROUND(lat::numeric, 4), ROUND(lon::numeric, 4))
        id,
        name,
        lat as latitude,
        lon as longitude,
        nearest_comid
      FROM us.access_points
      WHERE is_duplicate = false
      ORDER BY name, ROUND(lat::numeric, 4), ROUND(lon::numeric, 4), id
      LIMIT 10
    `, [comids]);
    
    for (const row of accessResult.rows) {
      result.access_points.items.push({
        id: row.id,
        type: 'access_point',
        name: row.name || 'Water Access',
        latitude: row.latitude,
        longitude: row.longitude,
        distance_m: 0,
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

/**
 * Handle point-based query (for Lake mode)
 * Queries POIs within radius of a lat/lng point
 */
async function handlePointQuery(lat: number, lng: number, radiusM: number) {
  const result: DiscoverySummary = {
    campgrounds: { count: 0, items: [] },
    hazards: { count: 0, dams: 0, waterfalls: 0, rapids: 0, items: [] },
    access_points: { count: 0, items: [] },
  };
  
  try {
    // === CAMPGROUNDS ===
    const campgroundResult = await query(`
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
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
        ) as distance_m
      FROM us.campgrounds c
      WHERE ST_DWithin(
        c.geom::geography,
        ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
        $3
      )
        AND c.is_duplicate = false
      ORDER BY distance_m
      LIMIT 10
    `, [lng, lat, radiusM]);
    
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
    
    // === ACCESS POINTS ===
    const accessResult = await query(`
      SELECT 
        a.id,
        a.name,
        a.lat as latitude,
        a.lon as longitude,
        ST_Distance(
          a.geom::geography,
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
        ) as distance_m
      FROM us.access_points a
      WHERE ST_DWithin(
        a.geom::geography,
        ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
        $3
      )
        AND a.is_duplicate = false
      ORDER BY distance_m
      LIMIT 10
    `, [lng, lat, radiusM]);
    
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
    console.error('Discover API point query error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch discoveries', details: String(error) },
      { status: 500 }
    );
  }
}
