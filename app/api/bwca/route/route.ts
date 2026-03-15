import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.BWCA_DB_HOST || 'driftwise-west.cfs02ime4lxt.us-west-2.rds.amazonaws.com',
  database: process.env.BWCA_DB_NAME || 'gisdata',
  user: process.env.BWCA_DB_USER || 'postgres',
  password: process.env.BWCA_DB_PASSWORD || 'driftingInVermont',
  port: 5432,
  ssl: { rejectUnauthorized: false },
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { start, end } = body;

    if (!start || !end || !start.lng || !start.lat || !end.lng || !end.lat) {
      return NextResponse.json(
        { error: 'Start and end points required' },
        { status: 400 }
      );
    }

    // Find nearest nodes to start and end points
    const nearestNodesQuery = `
      WITH start_node AS (
        SELECT id, the_geom,
          ST_Distance(the_geom::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) as dist
        FROM public.bwca_edges_noded_vertices_pgr
        ORDER BY the_geom <-> ST_SetSRID(ST_MakePoint($1, $2), 4326)
        LIMIT 1
      ),
      end_node AS (
        SELECT id, the_geom,
          ST_Distance(the_geom::geography, ST_SetSRID(ST_MakePoint($3, $4), 4326)::geography) as dist
        FROM public.bwca_edges_noded_vertices_pgr
        ORDER BY the_geom <-> ST_SetSRID(ST_MakePoint($3, $4), 4326)
        LIMIT 1
      )
      SELECT 
        s.id as start_node, s.dist as start_dist,
        e.id as end_node, e.dist as end_dist
      FROM start_node s, end_node e
    `;

    const nodesResult = await pool.query(nearestNodesQuery, [
      start.lng, start.lat, end.lng, end.lat
    ]);

    if (nodesResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Could not find nearby network nodes' },
        { status: 404 }
      );
    }

    const { start_node, end_node, start_dist, end_dist } = nodesResult.rows[0];

    // Check if points are too far from network (> 10km)
    if (start_dist > 10000 || end_dist > 10000) {
      return NextResponse.json(
        { error: 'Selected points are too far from the BWCA trail network' },
        { status: 400 }
      );
    }

    // Calculate route using pgRouting
    const routeQuery = `
      WITH route AS (
        SELECT seq, node, edge, cost
        FROM pgr_dijkstra(
          'SELECT id, source, target, cost, reverse_cost FROM public.bwca_edges_noded',
          $1::bigint,
          $2::bigint,
          directed := false
        )
      ),
      route_edges AS (
        SELECT 
          r.seq,
          r.edge,
          r.cost,
          e.geom
        FROM route r
        JOIN public.bwca_edges_noded e ON e.id = r.edge
        WHERE r.edge > 0
      )
      SELECT 
        json_build_object(
          'type', 'FeatureCollection',
          'features', COALESCE(json_agg(
            json_build_object(
              'type', 'Feature',
              'geometry', ST_AsGeoJSON(geom)::json,
              'properties', json_build_object(
                'seq', seq,
                'edge_id', edge,
                'cost', cost
              )
            ) ORDER BY seq
          ), '[]'::json)
        ) as geojson,
        COALESCE(SUM(cost) / 1000, 0) as distance_km,
        COUNT(*) as paddle_segments,
        0 as portage_count,
        COALESCE(SUM(cost), 0) as total_cost
      FROM route_edges
    `;

    const routeResult = await pool.query(routeQuery, [start_node, end_node]);
    
    if (routeResult.rows.length === 0 || routeResult.rows[0].distance_km === 0) {
      return NextResponse.json(
        { error: 'No route found between these points. They may be in disconnected areas.' },
        { status: 404 }
      );
    }

    const row = routeResult.rows[0];

    return NextResponse.json({
      route: row.geojson,
      distance_km: parseFloat(row.distance_km),
      paddle_segments: parseInt(row.paddle_segments),
      portage_count: parseInt(row.portage_count),
      total_cost: parseFloat(row.total_cost),
      start_node: parseInt(start_node),
      end_node: parseInt(end_node),
    });

  } catch (error) {
    console.error('BWCA route error:', error);
    return NextResponse.json(
      { error: 'Failed to calculate route' },
      { status: 500 }
    );
  }
}
