/**
 * River Routing API
 * Uses bbox-constrained Dijkstra for efficient routing
 * Velocity data from USGS NHDPlus EROM (Extended Reach Output Model)
 */
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// Flow condition multipliers based on Leopold & Maddock (1953) hydraulic geometry
// EROM velocities represent baseflow; these adjust for actual conditions
const FLOW_MULTIPLIERS: Record<string, number> = {
  low: 1.0,      // Baseflow (late summer, drought) - EROM baseline
  normal: 1.5,   // Typical paddling conditions
  high: 2.0,     // High water (spring runoff, after rain)
};

const DEFAULT_VELOCITY_FPS = 1.0; // ~0.68 mph fallback if no EROM data

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
  nwm_velocity_ms: number | null;  // Real-time NWM velocity
  nwm_streamflow_cms: number | null;  // Real-time NWM streamflow
}

interface GraphNode {
  edges: { target: string; edge: Edge }[];
}

// Build adjacency graph from edges (downstream only)
function buildGraph(edges: Edge[], downstreamOnly: boolean = true): Map<string, GraphNode> {
  const graph = new Map<string, GraphNode>();
  
  for (const edge of edges) {
    const from = edge.from_node;
    const to = edge.to_node;
    
    // NHDPlus convention: from_node → to_node is downstream direction
    // We verify with elevation: max_elev (upstream) > min_elev (downstream)
    const isDownstream = !edge.max_elev_m || !edge.min_elev_m || edge.max_elev_m >= edge.min_elev_m;
    
    // Forward direction (downstream: from → to)
    if (!graph.has(from)) graph.set(from, { edges: [] });
    graph.get(from)!.edges.push({ target: to, edge });
    
    // Reverse direction only if not downstream-only mode
    if (!downstreamOnly) {
      if (!graph.has(to)) graph.set(to, { edges: [] });
      graph.get(to)!.edges.push({ target: from, edge });
    }
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
  const flowCondition = searchParams.get('flow') || 'normal';
  
  if (isNaN(startLng) || isNaN(startLat) || isNaN(endLng) || isNaN(endLat)) {
    return NextResponse.json(
      { error: 'Missing coordinates. Required: start_lng, start_lat, end_lng, end_lat' },
      { status: 400 }
    );
  }
  
  const flowMultiplier = FLOW_MULTIPLIERS[flowCondition] || FLOW_MULTIPLIERS.normal;
  
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
    
    // Load edges within bounding box, joined with NWM real-time velocities
    const edgesResult = await query<Edge>(`
      SELECT 
        r.comid,
        r.from_node::text as from_node,
        r.to_node::text as to_node,
        r.lengthkm,
        r.gnis_name,
        r.stream_order,
        r.velocity_fps,
        r.min_elev_m,
        r.max_elev_m,
        n.velocity_ms as nwm_velocity_ms,
        n.streamflow_cms as nwm_streamflow_cms
      FROM river_edges r
      LEFT JOIN nwm_velocity n ON r.comid = n.comid
      WHERE r.geom && ST_MakeEnvelope($1, $2, $3, $4, 4326)
        AND r.from_node IS NOT NULL 
        AND r.to_node IS NOT NULL
    `, [minLng, minLat, maxLng, maxLat]);
    
    if (edgesResult.rows.length === 0) {
      return NextResponse.json({ error: 'No rivers found in area' }, { status: 404 });
    }
    
    console.log(`Loaded ${edgesResult.rows.length} edges for routing`);
    
    // Build downstream-only graph and run Dijkstra
    const graph = buildGraph(edgesResult.rows, true);
    let result = dijkstra(graph, snapStart.node_id, snapEnd.node_id);
    
    if (!result) {
      // Check if reverse route exists (user clicked upstream → downstream)
      const reverseResult = dijkstra(graph, snapEnd.node_id, snapStart.node_id);
      
      if (reverseResult) {
        return NextResponse.json(
          { 
            error: 'Upstream routing not available. Try swapping your put-in and take-out — your take-out appears to be upstream of your put-in.',
            suggestion: 'swap_points'
          },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { error: 'No route found between these points. They may not be connected on the river network.' },
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
    
    // Gradient classifications (ft/mi)
    // Pool: < 5, Riffle: 5-15, Class I-II: 15-30, Class III+: > 30
    const classifyGradient = (ftPerMi: number): string => {
      if (ftPerMi < 5) return 'pool';
      if (ftPerMi < 15) return 'riffle';
      if (ftPerMi < 30) return 'rapid_mild';
      return 'rapid_steep';
    };

    // Calculate stats and build elevation profile with gradient data
    let totalDistance = 0;
    let totalFloatTime = 0;
    let elevStart: number | null = null;
    let elevEnd: number | null = null;
    const waterways = new Set<string>();
    const elevationProfile: { dist_m: number; elev_m: number; gradient_ft_mi?: number; classification?: string }[] = [];
    const steepSections: { start_m: number; end_m: number; gradient_ft_mi: number; classification: string }[] = [];
    let accumDist = 0;
    
    // Track velocity source usage
    let nwmVelocityCount = 0;
    let eromVelocityCount = 0;
    let totalStreamflow = 0;
    
    for (const edge of result.edges) {
      const segmentStartDist = accumDist;
      
      // Calculate segment gradient
      let segmentGradient = 0;
      let classification = 'pool';
      if (edge.max_elev_m !== null && edge.min_elev_m !== null && edge.lengthkm > 0) {
        const dropM = edge.max_elev_m - edge.min_elev_m;
        const dropFt = dropM * 3.28084;
        const lengthMi = edge.lengthkm * 0.621371;
        segmentGradient = lengthMi > 0 ? dropFt / lengthMi : 0;
        classification = classifyGradient(segmentGradient);
        
        // Track steep sections for highlighting
        if (classification === 'riffle' || classification === 'rapid_mild' || classification === 'rapid_steep') {
          steepSections.push({
            start_m: segmentStartDist,
            end_m: segmentStartDist + edge.lengthkm * 1000,
            gradient_ft_mi: Math.round(segmentGradient * 10) / 10,
            classification
          });
        }
      }
      
      // Add elevation point at start of segment
      if (edge.max_elev_m !== null) {
        elevationProfile.push({ 
          dist_m: accumDist, 
          elev_m: edge.max_elev_m,
          gradient_ft_mi: Math.round(segmentGradient * 10) / 10,
          classification
        });
        if (elevStart === null) elevStart = edge.max_elev_m;
      }
      
      accumDist += edge.lengthkm * 1000;
      totalDistance += edge.lengthkm * 1000;
      
      // Add elevation point at end of segment
      if (edge.min_elev_m !== null) {
        elevationProfile.push({ 
          dist_m: accumDist, 
          elev_m: edge.min_elev_m,
          gradient_ft_mi: Math.round(segmentGradient * 10) / 10,
          classification
        });
        elevEnd = edge.min_elev_m;
      }
      
      // Velocity priority: NWM real-time > EROM > default
      // NWM velocities are already current conditions, no flow multiplier needed
      let velocityMs: number;
      if (edge.nwm_velocity_ms && edge.nwm_velocity_ms > 0.01) {
        // Use NWM real-time velocity (already in m/s, no multiplier)
        velocityMs = edge.nwm_velocity_ms;
        nwmVelocityCount++;
        if (edge.nwm_streamflow_cms) totalStreamflow += edge.nwm_streamflow_cms;
      } else {
        // Fallback to EROM with flow condition multiplier
        const baseVelocityMs = (edge.velocity_fps || DEFAULT_VELOCITY_FPS) * 0.3048;
        velocityMs = baseVelocityMs * flowMultiplier;
        eromVelocityCount++;
      }
      
      totalFloatTime += (edge.lengthkm * 1000) / velocityMs;
      
      if (edge.gnis_name) waterways.add(edge.gnis_name);
    }
    
    const distanceMiles = totalDistance / 1609.34;
    const elevDropFt = (elevStart && elevEnd) ? (elevStart - elevEnd) * 3.28084 : 0;
    
    // Get NWM data freshness
    const nwmFreshnessResult = await query(`
      SELECT updated_at FROM nwm_velocity LIMIT 1
    `);
    const nwmTimestamp = nwmFreshnessResult.rows[0]?.updated_at || null;
    
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
        waterways: Array.from(waterways),
        flow_condition: flowCondition,
        flow_multiplier: flowMultiplier,
        elevation_profile: elevationProfile,
        steep_sections: steepSections,
        // NWM real-time velocity info
        velocity_source: {
          nwm_segments: nwmVelocityCount,
          erom_segments: eromVelocityCount,
          nwm_percent: Math.round((nwmVelocityCount / (nwmVelocityCount + eromVelocityCount)) * 100),
          nwm_timestamp: nwmTimestamp,
          avg_streamflow_cms: nwmVelocityCount > 0 ? Math.round(totalStreamflow / nwmVelocityCount * 100) / 100 : null
        }
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
