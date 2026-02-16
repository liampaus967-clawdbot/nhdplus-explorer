/**
 * Snap Point to Nearest River Node API
 * Returns the closest from_node or to_node to a given lat/lng
 */
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { checkRateLimit, getClientIP } from '@/lib/rateLimit';
import { validateCoordinate } from '@/lib/validation';

export async function GET(request: NextRequest) {
  // Rate limiting
  const ip = getClientIP(request);
  const rateLimit = checkRateLimit(ip);
  
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Try again later.' },
      { 
        status: 429,
        headers: {
          'Retry-After': Math.ceil(rateLimit.resetIn / 1000).toString(),
          'X-RateLimit-Remaining': '0'
        }
      }
    );
  }

  const { searchParams } = new URL(request.url);
  
  const lng = parseFloat(searchParams.get('lng') || '');
  const lat = parseFloat(searchParams.get('lat') || '');
  
  // Validate coordinates
  const coordCheck = validateCoordinate(lng, lat);
  if (!coordCheck.valid) {
    return NextResponse.json(
      { error: coordCheck.error },
      { status: 400 }
    );
  }
  
  try {
    // Find nearest river edge using KNN with bounding box pre-filter
    // The && operator uses the GIST index for fast bbox filtering
    const result = await query(`
      WITH nearest AS (
        SELECT 
          comid,
          gnis_name,
          from_node,
          to_node,
          stream_order,
          lengthkm,
          geom,
          ST_Distance(geom, ST_SetSRID(ST_MakePoint($1, $2), 4326)) * 111139 as dist_m
        FROM river_edges
        WHERE geom && ST_Expand(ST_SetSRID(ST_MakePoint($1, $2), 4326), 0.1)
        ORDER BY geom <-> ST_SetSRID(ST_MakePoint($1, $2), 4326)
        LIMIT 1
      )
      SELECT 
        comid,
        gnis_name,
        stream_order,
        lengthkm,
        dist_m,
        ST_LineLocatePoint(geom, ST_SetSRID(ST_MakePoint($1, $2), 4326)) as line_position,
        CASE 
          WHEN ST_LineLocatePoint(geom, ST_SetSRID(ST_MakePoint($1, $2), 4326)) < 0.5 THEN from_node 
          ELSE to_node 
        END as node_id,
        ST_X(ST_ClosestPoint(geom, ST_SetSRID(ST_MakePoint($1, $2), 4326))) as snap_lng,
        ST_Y(ST_ClosestPoint(geom, ST_SetSRID(ST_MakePoint($1, $2), 4326))) as snap_lat,
        ST_X(CASE WHEN ST_LineLocatePoint(geom, ST_SetSRID(ST_MakePoint($1, $2), 4326)) < 0.5 THEN ST_StartPoint(geom) ELSE ST_EndPoint(geom) END) as node_lng,
        ST_Y(CASE WHEN ST_LineLocatePoint(geom, ST_SetSRID(ST_MakePoint($1, $2), 4326)) < 0.5 THEN ST_StartPoint(geom) ELSE ST_EndPoint(geom) END) as node_lat
      FROM nearest
    `, [lng, lat]);
    
    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'No rivers found nearby' },
        { status: 404 }
      );
    }
    
    const row = result.rows[0];
    
    // Max snap distance: 5km
    if (row.dist_m > 5000) {
      return NextResponse.json(
        { error: 'Click too far from river network', distance_m: row.dist_m },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      node_id: row.node_id,
      comid: row.comid,
      gnis_name: row.gnis_name,
      stream_order: row.stream_order,
      distance_m: Math.round(row.dist_m),
      snap_point: {
        lng: row.snap_lng,
        lat: row.snap_lat
      },
      node_point: {
        lng: row.node_lng,
        lat: row.node_lat
      }
    });
    
  } catch (error) {
    // Log internally but don't expose details to client
    console.error('Snap error:', error);
    return NextResponse.json(
      { error: 'An error occurred processing your request' },
      { status: 500 }
    );
  }
}
