/**
 * River Routing API
 * Uses bbox-constrained Dijkstra for efficient routing
 */
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

interface Edge {
  comid: number;
  from_node: string;
  to_node: string;
  lengthkm: number;
  gnis_name: string | null;
  stream_order: number;
  velocity_fps: number | null;
  min_elev_m: number | null;
  max_elev_m: number | null;
}

interface GraphNode {
  edges: { target: string; edge: Edge }[];
}

// Build adjacency graph from edges
function buildGraph(edges: Edge[]): Map<string, GraphNode> {
  const graph = new Map<string, GraphNode>();
  
  for (const edge of edges) {
    const from = edge.from_node;
    const to = edge.to_node;
    
    // Forward direction
    if (!graph.has(from)) graph.set(from, { edges: [] });
    graph.get(from)!.edges.push({ target: to, edge });
    
    // Reverse direction (bidirectional for paddling)
    if (!graph.has(to)) graph.set(to, { edges: [] });
    graph.get(to)!.edges.push({ target: from, edge });
  }
  
  return graph;
}

// Dijkstra's algorithm
function dijkstra(graph: Map<string, GraphNode>, start: string, end: string): { path: string[]; edges: Edge[] } | null {
  const dist = new Map<string, number>();
  const prev = new Map<string, { node: string; edge: Edge }>();
  const visited = new Set<string>();
  
  // Priority queue (simple sorted array for now)
  const queue: { node: string; dist: number }[] = [];
  
  dist.set(start, 0);
  queue.push({ node: start, dist: 0 });
  
  while (queue.length > 0) {
    // Get minimum distance node
    queue.sort((a, b) => a.dist - b.dist);
    const { node: u } = queue.shift()!;
    
    if (visited.has(u)) continue;
    visited.add(u);
    
    if (u === end) break;
    
    const nodeData = graph.get(u);
    if (!nodeData) continue;
    
    for (const { target: v, edge } of nodeData.edges) {
      if (visited.has(v)) continue;
      
      const cost = edge.lengthkm * 1000; // meters
      const newDist = (dist.get(u) || 0) + cost;
      
      if (newDist < (dist.get(v) || Infinity)) {
        dist.set(v, newDist);
        prev.set(v, { node: u, edge });
        queue.push({ node: v, dist: newDist });
      }
    }
  }
  
  if (!prev.has(end) && start !== end) return null;
  
  // Reconstruct path
  const path: string[] = [];
  const edges: Edge[] = [];
  let current = end;
  
  while (current !== start) {
    path.unshift(current);
    const prevData = prev.get(current);
    if (!prevData) break;
    edges.unshift(prevData.edge);
    current = prevData.node;
  }
  path.unshift(start);
  
  return { path, edges };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  const startLng = parseFloat(searchParams.get('start_lng') || '');
  const startLat = parseFloat(searchParams.get('start_lat') || '');
  const endLng = parseFloat(searchParams.get('end_lng') || '');
  const endLat = parseFloat(searchParams.get('end_lat') || '');
  
  if (isNaN(startLng) || isNaN(startLat) || isNaN(endLng) || isNaN(endLat)) {
    return NextResponse.json(
      { error: 'Missing coordinates. Required: start_lng, start_lat, end_lng, end_lat' },
      { status: 400 }
    );
  }
  
  try {
    // Calculate bbox that encompasses both points with buffer
    const buffer = 0.5; // ~50km buffer
    const minLng = Math.min(startLng, endLng) - buffer;
    const maxLng = Math.max(startLng, endLng) + buffer;
    const minLat = Math.min(startLat, endLat) - buffer;
    const maxLat = Math.max(startLat, endLat) + buffer;
    
    // Snap points to nearest nodes
    const snapStart = await snapToNode(startLng, startLat);
    const snapEnd = await snapToNode(endLng, endLat);
    
    if (!snapStart) {
      return NextResponse.json({ error: 'Start point too far from river network' }, { status: 400 });
    }
    if (!snapEnd) {
      return NextResponse.json({ error: 'End point too far from river network' }, { status: 400 });
    }
    
    // Load edges within bounding box
    const edgesResult = await query<Edge>(`
      SELECT 
        comid,
        from_node::text as from_node,
        to_node::text as to_node,
        lengthkm,
        gnis_name,
        stream_order,
        velocity_fps,
        min_elev_m,
        max_elev_m
      FROM river_edges
      WHERE geom && ST_MakeEnvelope($1, $2, $3, $4, 4326)
        AND from_node IS NOT NULL 
        AND to_node IS NOT NULL
    `, [minLng, minLat, maxLng, maxLat]);
    
    if (edgesResult.rows.length === 0) {
      return NextResponse.json({ error: 'No rivers found in area' }, { status: 404 });
    }
    
    console.log(`Loaded ${edgesResult.rows.length} edges for routing`);
    
    // Build graph and run Dijkstra
    const graph = buildGraph(edgesResult.rows);
    const result = dijkstra(graph, snapStart.node_id, snapEnd.node_id);
    
    if (!result) {
      return NextResponse.json(
        { error: 'No route found between these points. They may not be connected.' },
        { status: 404 }
      );
    }
    
    // Get geometries for the route edges
    const comids = result.edges.map(e => e.comid);
    const geomResult = await query(`
      SELECT comid, ST_AsGeoJSON(geom)::json as geometry
      FROM river_edges
      WHERE comid = ANY($1::bigint[])
    `, [comids]);
    
    const geomMap = new Map(geomResult.rows.map(r => [r.comid, r.geometry]));
    
    // Calculate stats
    let totalDistance = 0;
    let totalFloatTime = 0;
    let elevStart: number | null = null;
    let elevEnd: number | null = null;
    const waterways = new Set<string>();
    
    for (const edge of result.edges) {
      totalDistance += edge.lengthkm * 1000;
      
      const velocity = edge.velocity_fps ? edge.velocity_fps * 0.3048 : 0.89;
      totalFloatTime += (edge.lengthkm * 1000) / velocity;
      
      if (elevStart === null && edge.max_elev_m) elevStart = edge.max_elev_m;
      if (edge.min_elev_m) elevEnd = edge.min_elev_m;
      
      if (edge.gnis_name) waterways.add(edge.gnis_name);
    }
    
    const distanceMiles = totalDistance / 1609.34;
    const elevDropFt = (elevStart && elevEnd) ? (elevStart - elevEnd) * 3.28084 : 0;
    
    // Build GeoJSON
    const geojson = {
      type: 'FeatureCollection' as const,
      features: result.edges.map(edge => ({
        type: 'Feature' as const,
        geometry: geomMap.get(edge.comid) || { type: 'LineString', coordinates: [] },
        properties: {
          comid: edge.comid,
          gnis_name: edge.gnis_name,
          stream_order: edge.stream_order,
          lengthkm: edge.lengthkm
        }
      }))
    };
    
    return NextResponse.json({
      route: geojson,
      stats: {
        distance_m: Math.round(totalDistance),
        distance_mi: Math.round(distanceMiles * 10) / 10,
        float_time_h: Math.round(totalFloatTime / 360) / 10,
        float_time_s: Math.round(totalFloatTime),
        elev_start_m: elevStart,
        elev_end_m: elevEnd,
        elev_drop_ft: Math.round(elevDropFt),
        gradient_ft_mi: distanceMiles > 0 ? Math.round(elevDropFt / distanceMiles * 10) / 10 : 0,
        segment_count: result.edges.length,
        waterways: Array.from(waterways)
      },
      snap: {
        start: snapStart,
        end: snapEnd
      }
    });
    
  } catch (error) {
    console.error('Route error:', error);
    return NextResponse.json(
      { error: 'Routing failed', details: String(error) },
      { status: 500 }
    );
  }
}

async function snapToNode(lng: number, lat: number): Promise<{ node_id: string; snap_lng: number; snap_lat: number; gnis_name: string | null } | null> {
  const result = await query(`
    SELECT 
      CASE 
        WHEN ST_LineLocatePoint(geom, ST_SetSRID(ST_MakePoint($1, $2), 4326)) < 0.5 
        THEN from_node::text 
        ELSE to_node::text 
      END as node_id,
      ST_X(ST_ClosestPoint(geom, ST_SetSRID(ST_MakePoint($1, $2), 4326))) as snap_lng,
      ST_Y(ST_ClosestPoint(geom, ST_SetSRID(ST_MakePoint($1, $2), 4326))) as snap_lat,
      gnis_name,
      ST_Distance(geom::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) as dist_m
    FROM river_edges
    ORDER BY geom <-> ST_SetSRID(ST_MakePoint($1, $2), 4326)
    LIMIT 1
  `, [lng, lat]);
  
  if (result.rows.length === 0 || result.rows[0].dist_m > 5000) {
    return null;
  }
  
  return {
    node_id: result.rows[0].node_id,
    snap_lng: result.rows[0].snap_lng,
    snap_lat: result.rows[0].snap_lat,
    gnis_name: result.rows[0].gnis_name
  };
}
