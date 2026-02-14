/**
 * River Routing API v2
 * Uses edge snapping with pseudo-nodes for accurate start/end positioning
 * Velocity data from USGS NHDPlus EROM + real-time NWM
 */
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { checkRateLimit, getClientIP } from '@/lib/rateLimit';
import { validateCoordinate, validateFlowCondition } from '@/lib/validation';

const FLOW_MULTIPLIERS: Record<string, number> = {
  low: 1.0,
  normal: 1.5,
  high: 2.0,
};

const DEFAULT_VELOCITY_FPS = 1.0;

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
  nwm_velocity_ms: number | null;
  nwm_streamflow_cms: number | null;
  // For virtual edges
  is_virtual?: boolean;
  original_comid?: number;
  fraction_start?: number;
  fraction_end?: number;
}

interface SnapResult {
  edge_comid: number;
  from_node: string;
  to_node: string;
  fraction: number;  // 0-1 position along edge
  snap_lng: number;
  snap_lat: number;
  gnis_name: string | null;
  lengthkm: number;
  velocity_fps: number | null;
  min_elev_m: number | null;
  max_elev_m: number | null;
  stream_order: number;
  dist_m: number;
}

interface GraphNode {
  edges: { target: string; edge: Edge }[];
}

/**
 * Snap point to nearest edge and return edge info + fraction
 */
async function snapToEdge(lng: number, lat: number): Promise<SnapResult | null> {
  const result = await query(`
    SELECT 
      comid as edge_comid,
      from_node::text as from_node,
      to_node::text as to_node,
      ST_LineLocatePoint(geom, ST_SetSRID(ST_MakePoint($1, $2), 4326)) as fraction,
      ST_X(ST_ClosestPoint(geom, ST_SetSRID(ST_MakePoint($1, $2), 4326))) as snap_lng,
      ST_Y(ST_ClosestPoint(geom, ST_SetSRID(ST_MakePoint($1, $2), 4326))) as snap_lat,
      gnis_name,
      lengthkm,
      velocity_fps,
      min_elev_m,
      max_elev_m,
      stream_order,
      ST_Distance(geom::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) as dist_m
    FROM river_edges
    WHERE from_node IS NOT NULL AND to_node IS NOT NULL
    ORDER BY geom <-> ST_SetSRID(ST_MakePoint($1, $2), 4326)
    LIMIT 1
  `, [lng, lat]);
  
  if (result.rows.length === 0 || result.rows[0].dist_m > 5000) {
    return null;
  }
  
  return result.rows[0];
}

/**
 * Build graph with virtual start/end nodes for edge snapping
 */
function buildGraphWithVirtualNodes(
  edges: Edge[], 
  startSnap: SnapResult, 
  endSnap: SnapResult
): Map<string, GraphNode> {
  const graph = new Map<string, GraphNode>();
  const VIRTUAL_START = 'virtual_start';
  const VIRTUAL_END = 'virtual_end';
  
  // Track which edges need to be split
  const startEdgeComid = startSnap.edge_comid;
  const endEdgeComid = endSnap.edge_comid;
  
  for (const edge of edges) {
    const from = edge.from_node;
    const to = edge.to_node;
    
    // Initialize nodes if needed
    if (!graph.has(from)) graph.set(from, { edges: [] });
    if (!graph.has(to)) graph.set(to, { edges: [] });
    
    // Check if this edge needs virtual node insertion
    if (edge.comid === startEdgeComid && edge.comid === endEdgeComid) {
      // SPECIAL CASE: Start and end on same edge
      // Create: from → virtual_start → virtual_end → to
      // But we only need virtual_start → virtual_end for routing
      
      if (!graph.has(VIRTUAL_START)) graph.set(VIRTUAL_START, { edges: [] });
      if (!graph.has(VIRTUAL_END)) graph.set(VIRTUAL_END, { edges: [] });
      
      const startFrac = startSnap.fraction;
      const endFrac = endSnap.fraction;
      
      if (startFrac < endFrac) {
        // Downstream: start is upstream of end
        const segmentFraction = endFrac - startFrac;
        const segmentLength = edge.lengthkm * segmentFraction;
        
        // Interpolate elevation
        const elevDrop = (edge.max_elev_m && edge.min_elev_m) 
          ? (edge.max_elev_m - edge.min_elev_m) * segmentFraction 
          : null;
        const startElev = edge.max_elev_m 
          ? edge.max_elev_m - (edge.max_elev_m - (edge.min_elev_m || edge.max_elev_m)) * startFrac
          : null;
        const endElev = startElev && elevDrop ? startElev - elevDrop : null;
        
        const virtualEdge: Edge = {
          ...edge,
          is_virtual: true,
          original_comid: edge.comid,
          from_node: VIRTUAL_START,
          to_node: VIRTUAL_END,
          lengthkm: segmentLength,
          max_elev_m: startElev,
          min_elev_m: endElev,
          fraction_start: startFrac,
          fraction_end: endFrac,
        };
        
        graph.get(VIRTUAL_START)!.edges.push({ target: VIRTUAL_END, edge: virtualEdge });
      }
      // If endFrac < startFrac, it's upstream (no route in downstream-only mode)
      
    } else if (edge.comid === startEdgeComid) {
      // Start point on this edge - create virtual_start → to_node
      if (!graph.has(VIRTUAL_START)) graph.set(VIRTUAL_START, { edges: [] });
      
      const remainingFraction = 1 - startSnap.fraction;
      const remainingLength = edge.lengthkm * remainingFraction;
      
      // Interpolate elevation from snap point to end
      const startElev = edge.max_elev_m 
        ? edge.max_elev_m - (edge.max_elev_m - (edge.min_elev_m || edge.max_elev_m)) * startSnap.fraction
        : null;
      
      const virtualEdge: Edge = {
        ...edge,
        is_virtual: true,
        original_comid: edge.comid,
        from_node: VIRTUAL_START,
        lengthkm: remainingLength,
        max_elev_m: startElev,
        fraction_start: startSnap.fraction,
        fraction_end: 1,
      };
      
      graph.get(VIRTUAL_START)!.edges.push({ target: to, edge: virtualEdge });
      
      // Also add the original edge for other routing paths
      graph.get(from)!.edges.push({ target: to, edge });
      
    } else if (edge.comid === endEdgeComid) {
      // End point on this edge - create from_node → virtual_end
      if (!graph.has(VIRTUAL_END)) graph.set(VIRTUAL_END, { edges: [] });
      
      const usedFraction = endSnap.fraction;
      const usedLength = edge.lengthkm * usedFraction;
      
      // Interpolate elevation from start to snap point
      const endElev = edge.max_elev_m 
        ? edge.max_elev_m - (edge.max_elev_m - (edge.min_elev_m || edge.max_elev_m)) * endSnap.fraction
        : null;
      
      const virtualEdge: Edge = {
        ...edge,
        is_virtual: true,
        original_comid: edge.comid,
        to_node: VIRTUAL_END,
        lengthkm: usedLength,
        min_elev_m: endElev,
        fraction_start: 0,
        fraction_end: endSnap.fraction,
      };
      
      graph.get(from)!.edges.push({ target: VIRTUAL_END, edge: virtualEdge });
      
      // Also add the original edge for other routing paths
      graph.get(from)!.edges.push({ target: to, edge });
      
    } else {
      // Normal edge - add as-is (downstream only: from → to)
      graph.get(from)!.edges.push({ target: to, edge });
    }
  }
  
  return graph;
}

/**
 * Dijkstra's algorithm
 */
function dijkstra(
  graph: Map<string, GraphNode>, 
  start: string, 
  end: string
): { path: string[]; edges: Edge[] } | null {
  const dist = new Map<string, number>();
  const prev = new Map<string, { node: string; edge: Edge }>();
  const visited = new Set<string>();
  const queue: { node: string; dist: number }[] = [];
  
  dist.set(start, 0);
  queue.push({ node: start, dist: 0 });
  
  while (queue.length > 0) {
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
  const ip = getClientIP(request);
  const rateLimit = checkRateLimit(ip);
  
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Try again later.' },
      { status: 429, headers: { 'Retry-After': Math.ceil(rateLimit.resetIn / 1000).toString() } }
    );
  }

  const { searchParams } = new URL(request.url);
  
  const startLng = parseFloat(searchParams.get('start_lng') || '');
  const startLat = parseFloat(searchParams.get('start_lat') || '');
  const endLng = parseFloat(searchParams.get('end_lng') || '');
  const endLat = parseFloat(searchParams.get('end_lat') || '');
  const flowCondition = validateFlowCondition(searchParams.get('flow'));
  
  const startCheck = validateCoordinate(startLng, startLat);
  const endCheck = validateCoordinate(endLng, endLat);
  
  if (!startCheck.valid) {
    return NextResponse.json({ error: `Start point: ${startCheck.error}` }, { status: 400 });
  }
  if (!endCheck.valid) {
    return NextResponse.json({ error: `End point: ${endCheck.error}` }, { status: 400 });
  }
  
  const flowMultiplier = FLOW_MULTIPLIERS[flowCondition] || FLOW_MULTIPLIERS.normal;
  
  try {
    // Snap to edges (not nodes)
    const startSnap = await snapToEdge(startLng, startLat);
    const endSnap = await snapToEdge(endLng, endLat);
    
    if (!startSnap) {
      return NextResponse.json({ error: 'Start point too far from river network' }, { status: 400 });
    }
    if (!endSnap) {
      return NextResponse.json({ error: 'End point too far from river network' }, { status: 400 });
    }
    
    // Calculate bbox
    const buffer = 0.5;
    const minLng = Math.min(startLng, endLng) - buffer;
    const maxLng = Math.max(startLng, endLng) + buffer;
    const minLat = Math.min(startLat, endLat) - buffer;
    const maxLat = Math.max(startLat, endLat) + buffer;
    
    // Load edges
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
    
    console.log(`Loaded ${edgesResult.rows.length} edges, snapped start to edge ${startSnap.edge_comid} @ ${(startSnap.fraction * 100).toFixed(1)}%, end to edge ${endSnap.edge_comid} @ ${(endSnap.fraction * 100).toFixed(1)}%`);
    
    // Build graph with virtual nodes for edge snapping
    const graph = buildGraphWithVirtualNodes(edgesResult.rows, startSnap, endSnap);
    
    // Route from virtual_start to virtual_end
    let result = dijkstra(graph, 'virtual_start', 'virtual_end');
    
    if (!result) {
      // Check reverse direction
      const reverseGraph = buildGraphWithVirtualNodes(edgesResult.rows, endSnap, startSnap);
      const reverseResult = dijkstra(reverseGraph, 'virtual_start', 'virtual_end');
      
      if (reverseResult) {
        return NextResponse.json({
          error: 'Upstream routing not available. Your take-out appears to be upstream of your put-in.',
          suggestion: 'swap_points'
        }, { status: 400 });
      }
      
      return NextResponse.json(
        { error: 'No route found between these points. They may not be connected.' },
        { status: 404 }
      );
    }
    
    // Get geometries - need to handle virtual edges specially
    const realComids = result.edges
      .map(e => e.is_virtual ? e.original_comid : e.comid)
      .filter((c): c is number => c !== undefined);
    
    const geomResult = await query(`
      SELECT comid, ST_AsGeoJSON(geom)::json as geometry, geom
      FROM river_edges
      WHERE comid = ANY($1::bigint[])
    `, [realComids]);
    
    const geomMap = new Map(geomResult.rows.map(r => [r.comid, r.geometry]));
    
    // For virtual edges, we need to clip the geometry
    const getClippedGeometry = async (edge: Edge) => {
      if (!edge.is_virtual || !edge.original_comid) {
        return geomMap.get(edge.comid);
      }
      
      // Get clipped geometry using ST_LineSubstring
      const clipResult = await query(`
        SELECT ST_AsGeoJSON(
          ST_LineSubstring(geom, $2, $3)
        )::json as geometry
        FROM river_edges
        WHERE comid = $1
      `, [edge.original_comid, edge.fraction_start || 0, edge.fraction_end || 1]);
      
      return clipResult.rows[0]?.geometry;
    };
    
    // Build route geometry with clipped virtual edges
    const features = await Promise.all(result.edges.map(async (edge) => {
      const geometry = await getClippedGeometry(edge);
      return {
        type: 'Feature' as const,
        geometry: geometry || { type: 'LineString', coordinates: [] },
        properties: {
          comid: edge.is_virtual ? edge.original_comid : edge.comid,
          gnis_name: edge.gnis_name,
          stream_order: edge.stream_order,
          lengthkm: edge.lengthkm,
          is_virtual: edge.is_virtual || false
        }
      };
    }));
    
    // Calculate stats
    const classifyGradient = (ftPerMi: number): string => {
      if (ftPerMi < 5) return 'pool';
      if (ftPerMi < 15) return 'riffle';
      if (ftPerMi < 30) return 'rapid_mild';
      return 'rapid_steep';
    };

    let totalDistance = 0;
    let totalFloatTime = 0;
    let elevStart: number | null = null;
    let elevEnd: number | null = null;
    const waterways = new Set<string>();
    const elevationProfile: any[] = [];
    const steepSections: any[] = [];
    let accumDist = 0;
    let nwmVelocityCount = 0;
    let eromVelocityCount = 0;
    let eromOnlyFloatTime = 0;
    
    for (const edge of result.edges) {
      const segmentStartDist = accumDist;
      
      let segmentGradient = 0;
      let classification = 'pool';
      if (edge.max_elev_m !== null && edge.min_elev_m !== null && edge.lengthkm > 0) {
        const dropM = edge.max_elev_m - edge.min_elev_m;
        const dropFt = dropM * 3.28084;
        const lengthMi = edge.lengthkm * 0.621371;
        segmentGradient = lengthMi > 0 ? dropFt / lengthMi : 0;
        classification = classifyGradient(segmentGradient);
        
        if (classification !== 'pool') {
          steepSections.push({
            start_m: segmentStartDist,
            end_m: segmentStartDist + edge.lengthkm * 1000,
            gradient_ft_mi: Math.round(segmentGradient * 10) / 10,
            classification
          });
        }
      }
      
      if (edge.max_elev_m !== null) {
        elevationProfile.push({ dist_m: accumDist, elev_m: edge.max_elev_m, gradient_ft_mi: Math.round(segmentGradient * 10) / 10, classification });
        if (elevStart === null) elevStart = edge.max_elev_m;
      }
      
      accumDist += edge.lengthkm * 1000;
      totalDistance += edge.lengthkm * 1000;
      
      if (edge.min_elev_m !== null) {
        elevationProfile.push({ dist_m: accumDist, elev_m: edge.min_elev_m, gradient_ft_mi: Math.round(segmentGradient * 10) / 10, classification });
        elevEnd = edge.min_elev_m;
      }
      
      const eromVelocityMs = (edge.velocity_fps || DEFAULT_VELOCITY_FPS) * 0.3048;
      const nwmVelocityMs = edge.nwm_velocity_ms && edge.nwm_velocity_ms > 0.01 ? edge.nwm_velocity_ms : null;
      
      eromOnlyFloatTime += (edge.lengthkm * 1000) / eromVelocityMs;
      
      const velocityMs = nwmVelocityMs || eromVelocityMs;
      if (nwmVelocityMs) nwmVelocityCount++; else eromVelocityCount++;
      
      totalFloatTime += (edge.lengthkm * 1000) / velocityMs;
      if (edge.gnis_name) waterways.add(edge.gnis_name);
    }
    
    const distanceMiles = totalDistance / 1609.34;
    const elevDropFt = (elevStart && elevEnd) ? (elevStart - elevEnd) * 3.28084 : 0;
    
    const nwmFreshnessResult = await query(`SELECT updated_at FROM nwm_velocity LIMIT 1`);
    const nwmTimestamp = nwmFreshnessResult.rows[0]?.updated_at || null;
    
    const geojson = {
      type: 'FeatureCollection' as const,
      features
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
        elevation_profile: elevationProfile,
        steep_sections: steepSections,
        live_conditions: {
          nwm_segments: nwmVelocityCount,
          erom_segments: eromVelocityCount,
          nwm_coverage_percent: Math.round((nwmVelocityCount / (nwmVelocityCount + eromVelocityCount || 1)) * 100),
          data_timestamp: nwmTimestamp,
          avg_velocity_mph: Math.round((totalDistance / totalFloatTime) * 2.237 * 10) / 10,
          baseline_float_time_h: Math.round(eromOnlyFloatTime / 360) / 10,
          time_diff_percent: Math.round(((eromOnlyFloatTime - totalFloatTime) / eromOnlyFloatTime) * 100),
        }
      },
      snap: {
        start: {
          edge_comid: startSnap.edge_comid,
          fraction: startSnap.fraction,
          snap_lng: startSnap.snap_lng,
          snap_lat: startSnap.snap_lat,
          gnis_name: startSnap.gnis_name,
          distance_m: Math.round(startSnap.dist_m)
        },
        end: {
          edge_comid: endSnap.edge_comid,
          fraction: endSnap.fraction,
          snap_lng: endSnap.snap_lng,
          snap_lat: endSnap.snap_lat,
          gnis_name: endSnap.gnis_name,
          distance_m: Math.round(endSnap.dist_m)
        }
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
