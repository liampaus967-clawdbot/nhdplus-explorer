/**
 * Snap Point to Nearest River Node API
 * Returns the closest from_node or to_node to a given lat/lng
 */
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  const lng = parseFloat(searchParams.get('lng') || '');
  const lat = parseFloat(searchParams.get('lat') || '');
  
  if (isNaN(lng) || isNaN(lat)) {
    return NextResponse.json(
      { error: 'Missing or invalid lng/lat parameters' },
      { status: 400 }
    );
  }
  
  try {
    // Find nearest point on any river edge, then get its node
    const result = await query(`
      WITH nearest_edge AS (
        SELECT 
          comid,
          gnis_name,
          from_node,
          to_node,
          stream_order,
          lengthkm,
          ST_Distance(geom::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) as dist_m,
          ST_LineLocatePoint(geom, ST_SetSRID(ST_MakePoint($1, $2), 4326)) as line_position,
          ST_ClosestPoint(geom, ST_SetSRID(ST_MakePoint($1, $2), 4326)) as snap_point,
          geom
        FROM river_edges
        ORDER BY geom <-> ST_SetSRID(ST_MakePoint($1, $2), 4326)
        LIMIT 1
      )
      SELECT 
        comid,
        gnis_name,
        stream_order,
        lengthkm,
        dist_m,
        line_position,
        CASE 
          WHEN line_position < 0.5 THEN from_node 
          ELSE to_node 
        END as node_id,
        ST_X(snap_point) as snap_lng,
        ST_Y(snap_point) as snap_lat,
        ST_X(CASE WHEN line_position < 0.5 THEN ST_StartPoint(geom) ELSE ST_EndPoint(geom) END) as node_lng,
        ST_Y(CASE WHEN line_position < 0.5 THEN ST_StartPoint(geom) ELSE ST_EndPoint(geom) END) as node_lat
      FROM nearest_edge
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
    console.error('Snap error:', error);
    return NextResponse.json(
      { error: 'Database error' },
      { status: 500 }
    );
  }
}
