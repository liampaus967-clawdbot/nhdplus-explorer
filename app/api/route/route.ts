/**
 * River Routing API v2 + Upstream Support
 * Uses edge snapping with pseudo-nodes for accurate start/end positioning
 * Supports both downstream and upstream routing with velocity adjustments
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
  // For upstream routing
  is_upstream_segment?: boolean;
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
  
  return result.rows[0] as SnapResult;
}

/**
 * Build graph with virtual start/end nodes for edge snapping
 * Supports bidirectional routing (upstream and downstream)
 */
function buildGraphWithVirtualNodes(
  edges: Edge[], 
  startSnap: SnapResult, 
  endSnap: SnapResult,
  allowUpstream: boolean = true
): Map<string, GraphNode> {
  const graph = new Map<string, GraphNode>();
  const VIRTUAL_START = 'virtual_start';
  const VIRTUAL_END = 'virtual_end';
  
  const startEdgeComid = startSnap.edge_comid;
  const endEdgeComid = endSnap.edge_comid;
  
  for (const edge of edges) {
    const from = edge.from_node;
    const to = edge.to_node;
    
    if (!graph.has(from)) graph.set(from, { edges: [] });
    if (!graph.has(to)) graph.set(to, { edges: [] });
    
    if (edge.comid === startEdgeComid && edge.comid === endEdgeComid) {
      // SPECIAL CASE: Start and end on same edge
      if (!graph.has(VIRTUAL_START)) graph.set(VIRTUAL_START, { edges: [] });
      if (!graph.has(VIRTUAL_END)) graph.set(VIRTUAL_END, { edges: [] });
      
      const startFrac = startSnap.fraction;
      const endFrac = endSnap.fraction;
      
      const segmentFraction = Math.abs(endFrac - startFrac);
      const segmentLength = edge.lengthkm * segmentFraction;
      
      // Determine direction
      const isUpstreamSegment = endFrac < startFrac;
      
      // Interpolate elevations
      const interpElev = (frac: number) => {
        if (!edge.max_elev_m || !edge.min_elev_m) return null;
        return edge.max_elev_m - (edge.max_elev_m - edge.min_elev_m) * frac;
      };
      
      const startElev = interpElev(startFrac);
      const endElev = interpElev(endFrac);
      
      const virtualEdge: Edge = {
        ...edge,
        is_virtual: true,
        original_comid: edge.comid,
        from_node: VIRTUAL_START,
        to_node: VIRTUAL_END,
        lengthkm: segmentLength,
        max_elev_m: isUpstreamSegment ? endElev : startElev,
        min_elev_m: isUpstreamSegment ? startElev : endElev,
        fraction_start: Math.min(startFrac, endFrac),
        fraction_end: Math.max(startFrac, endFrac),
        is_upstream_segment: isUpstreamSegment,
      };
      
      if (!isUpstreamSegment || allowUpstream) {
        graph.get(VIRTUAL_START)!.edges.push({ target: VIRTUAL_END, edge: virtualEdge });
      }
      
    } else if (edge.comid === startEdgeComid) {
      // Start point on this edge
      if (!graph.has(VIRTUAL_START)) graph.set(VIRTUAL_START, { edges: [] });
      
      // Downstream: virtual_start → to_node
      const downstreamFraction = 1 - startSnap.fraction;
      const downstreamLength = edge.lengthkm * downstreamFraction;
      const startElev = edge.max_elev_m 
        ? edge.max_elev_m - (edge.max_elev_m - (edge.min_elev_m || edge.max_elev_m)) * startSnap.fraction
        : null;
      
      const downstreamEdge: Edge = {
        ...edge,
        is_virtual: true,
        original_comid: edge.comid,
        from_node: VIRTUAL_START,
        lengthkm: downstreamLength,
        max_elev_m: startElev,
        fraction_start: startSnap.fraction,
        fraction_end: 1,
        is_upstream_segment: false,
      };
      
      graph.get(VIRTUAL_START)!.edges.push({ target: to, edge: downstreamEdge });
      
      // Upstream: virtual_start → from_node (if allowed)
      if (allowUpstream) {
        const upstreamFraction = startSnap.fraction;
        const upstreamLength = edge.lengthkm * upstreamFraction;
        
        const upstreamEdge: Edge = {
          ...edge,
          is_virtual: true,
          original_comid: edge.comid,
          from_node: VIRTUAL_START,
          to_node: from,
          lengthkm: upstreamLength,
          min_elev_m: startElev,
          max_elev_m: edge.max_elev_m,
          fraction_start: 0,
          fraction_end: startSnap.fraction,
          is_upstream_segment: true,
        };
        
        graph.get(VIRTUAL_START)!.edges.push({ target: from, edge: upstreamEdge });
      }
      
      // Also add original edge
      graph.get(from)!.edges.push({ target: to, edge });
      if (allowUpstream) {
        graph.get(to)!.edges.push({ target: from, edge: { ...edge, is_upstream_segment: true } });
      }
      
    } else if (edge.comid === endEdgeComid) {
      // End point on this edge
      if (!graph.has(VIRTUAL_END)) graph.set(VIRTUAL_END, { edges: [] });
      
      // Downstream arrival: from_node → virtual_end
      const usedFraction = endSnap.fraction;
      const usedLength = edge.lengthkm * usedFraction;
      const endElev = edge.max_elev_m 
        ? edge.max_elev_m - (edge.max_elev_m - (edge.min_elev_m || edge.max_elev_m)) * endSnap.fraction
        : null;
      
      const downstreamEndEdge: Edge = {
        ...edge,
        is_virtual: true,
        original_comid: edge.comid,
        to_node: VIRTUAL_END,
        lengthkm: usedLength,
        min_elev_m: endElev,
        fraction_start: 0,
        fraction_end: endSnap.fraction,
        is_upstream_segment: false,
      };
      
      graph.get(from)!.edges.push({ target: VIRTUAL_END, edge: downstreamEndEdge });
      
      // Upstream arrival: to_node → virtual_end (if allowed)
      if (allowUpstream) {
        const upstreamArrivalFraction = 1 - endSnap.fraction;
        const upstreamArrivalLength = edge.lengthkm * upstreamArrivalFraction;
        
        const upstreamEndEdge: Edge = {
          ...edge,
          is_virtual: true,
          original_comid: edge.comid,
          from_node: to,
          to_node: VIRTUAL_END,
          lengthkm: upstreamArrivalLength,
          // For upstream: we enter at min_elev (downstream end) and exit at endElev (snapped point)
          min_elev_m: edge.min_elev_m,
          max_elev_m: endElev,
          fraction_start: endSnap.fraction,
          fraction_end: 1,
          is_upstream_segment: true,
        };
        
        graph.get(to)!.edges.push({ target: VIRTUAL_END, edge: upstreamEndEdge });
      }
      
      // Also add original edge
      graph.get(from)!.edges.push({ target: to, edge });
      if (allowUpstream) {
        graph.get(to)!.edges.push({ target: from, edge: { ...edge, is_upstream_segment: true } });
      }
      
    } else {
      // Normal edge - add both directions if upstream allowed
      graph.get(from)!.edges.push({ target: to, edge });
      if (allowUpstream) {
        graph.get(to)!.edges.push({ target: from, edge: { ...edge, is_upstream_segment: true } });
      }
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
      
      const cost = edge.lengthkm * 1000;
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
  const paddleSpeedMph = parseFloat(searchParams.get('paddle_speed') || '3');
  const paddleSpeedMs = paddleSpeedMph * 0.44704;
  
  const startCheck = validateCoordinate(startLng, startLat);
  const endCheck = validateCoordinate(endLng, endLat);
  
  if (!startCheck.valid) {
    return NextResponse.json({ error: `Start point: ${startCheck.error}` }, { status: 400 });
  }
  if (!endCheck.valid) {
    return NextResponse.json({ error: `End point: ${endCheck.error}` }, { status: 400 });
  }
  
  // flowMultiplier reserved for future use (seasonal flow adjustments)
  // const flowMultiplier = FLOW_MULTIPLIERS[flowCondition] || FLOW_MULTIPLIERS.normal;
  
  try {
    const startSnap = await snapToEdge(startLng, startLat);
    const endSnap = await snapToEdge(endLng, endLat);
    
    if (!startSnap) {
      return NextResponse.json({ error: 'Start point too far from river network' }, { status: 400 });
    }
    if (!endSnap) {
      return NextResponse.json({ error: 'End point too far from river network' }, { status: 400 });
    }
    
    const buffer = 0.5;
    const minLng = Math.min(startLng, endLng) - buffer;
    const maxLng = Math.max(startLng, endLng) + buffer;
    const minLat = Math.min(startLat, endLat) - buffer;
    const maxLat = Math.max(startLat, endLat) + buffer;
    
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
    
    console.log(`Loaded ${edgesResult.rows.length} edges, snapped start @ ${(startSnap.fraction * 100).toFixed(1)}%, end @ ${(endSnap.fraction * 100).toFixed(1)}%`);
    
    // Build bidirectional graph
    const graph = buildGraphWithVirtualNodes(edgesResult.rows, startSnap, endSnap, true);
    let result = dijkstra(graph, 'virtual_start', 'virtual_end');
    
    if (!result) {
      return NextResponse.json(
        { error: 'No route found between these points. They may not be connected.' },
        { status: 404 }
      );
    }
    
    // Determine if route is predominantly upstream
    const upstreamSegmentCount = result.edges.filter(e => e.is_upstream_segment).length;
    const isUpstream = upstreamSegmentCount > result.edges.length / 2;
    
    // Debug: log route edges
    console.log(`Route has ${result.edges.length} edges:`);
    result.edges.forEach((e, i) => {
      console.log(`  ${i}: COMID ${e.comid}${e.is_virtual ? ` (virtual, orig=${e.original_comid}, frac=${e.fraction_start?.toFixed(2)}-${e.fraction_end?.toFixed(2)})` : ''} ${e.is_upstream_segment ? '[UPSTREAM]' : ''}`);
    });
    
    // Get geometries
    const realComids = result.edges
      .map(e => e.is_virtual ? e.original_comid : e.comid)
      .filter((c): c is number => c !== undefined);
    
    const geomResult = await query(`
      SELECT comid, ST_AsGeoJSON(geom)::json as geometry
      FROM river_edges
      WHERE comid = ANY($1::bigint[])
    `, [realComids]);
    
    const geomMap = new Map(geomResult.rows.map(r => [r.comid, r.geometry]));
    
    const getClippedGeometry = async (edge: Edge, index: number, totalEdges: number) => {
      // For virtual edges (first/last in route), clip the geometry
      if (edge.is_virtual && edge.original_comid !== undefined) {
        const fracStart = edge.fraction_start ?? 0;
        const fracEnd = edge.fraction_end ?? 1;
        
        console.log(`Edge ${index}/${totalEdges}: Virtual edge on COMID ${edge.original_comid}, clipping ${(fracStart*100).toFixed(1)}% to ${(fracEnd*100).toFixed(1)}%`);
        
        try {
          const clipResult = await query(`
            SELECT ST_AsGeoJSON(
              ST_LineSubstring(geom, $2, $3)
            )::json as geometry
            FROM river_edges
            WHERE comid = $1
          `, [edge.original_comid, fracStart, fracEnd]);
          
          if (clipResult.rows[0]?.geometry) {
            return clipResult.rows[0].geometry;
          }
        } catch (e) {
          console.error(`Failed to clip geometry for COMID ${edge.original_comid}:`, e);
        }
        
        // Fallback to full geometry
        return geomMap.get(edge.original_comid);
      }
      
      // Regular edges - return full geometry
      return geomMap.get(edge.comid);
    };
    
    const totalEdges = result.edges.length;
    const features = await Promise.all(result.edges.map(async (edge, index) => {
      const geometry = await getClippedGeometry(edge, index, totalEdges);
      return {
        type: 'Feature' as const,
        geometry: geometry || { type: 'LineString', coordinates: [] },
        properties: {
          comid: edge.is_virtual ? edge.original_comid : edge.comid,
          gnis_name: edge.gnis_name,
          stream_order: edge.stream_order,
          lengthkm: edge.lengthkm,
          is_virtual: edge.is_virtual || false,
          is_upstream: edge.is_upstream_segment || false,
          fraction_start: edge.fraction_start,
          fraction_end: edge.fraction_end
        }
      };
    }));
    
    // Calculate stats with velocity adjustments
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
    let waterOnlyFloatTime = 0;  // Pure water velocity (NWM or EROM), no paddle
    let impossibleSegments = 0;
    let totalStreamflowCms = 0;
    let streamflowCount = 0;
    
    for (const edge of result.edges) {
      const segmentStartDist = accumDist;
      
      let segmentGradient = 0;
      let classification = 'pool';
      if (edge.max_elev_m !== null && edge.min_elev_m !== null && edge.lengthkm > 0) {
        const dropM = edge.max_elev_m - edge.min_elev_m;
        const dropFt = dropM * 3.28084;
        const lengthMi = edge.lengthkm * 0.621371;
        segmentGradient = lengthMi > 0 ? Math.abs(dropFt / lengthMi) : 0;
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
      
      // For upstream segments, we traverse from min_elev to max_elev
      // For downstream segments, we traverse from max_elev to min_elev
      const segStartElev = edge.is_upstream_segment ? edge.min_elev_m : edge.max_elev_m;
      const segEndElev = edge.is_upstream_segment ? edge.max_elev_m : edge.min_elev_m;
      
      if (segStartElev !== null) {
        elevationProfile.push({ dist_m: accumDist, elev_m: segStartElev, gradient_ft_mi: Math.round(segmentGradient * 10) / 10, classification });
        if (elevStart === null) elevStart = segStartElev;
      }
      
      accumDist += edge.lengthkm * 1000;
      totalDistance += edge.lengthkm * 1000;
      
      if (segEndElev !== null) {
        elevationProfile.push({ dist_m: accumDist, elev_m: segEndElev, gradient_ft_mi: Math.round(segmentGradient * 10) / 10, classification });
        elevEnd = segEndElev;
      }
      
      // Calculate velocities
      const eromVelocityMs = Math.abs((edge.velocity_fps || DEFAULT_VELOCITY_FPS) * 0.3048);
      const nwmVelocityMs = edge.nwm_velocity_ms && edge.nwm_velocity_ms > 0.01 ? edge.nwm_velocity_ms : null;
      
      eromOnlyFloatTime += (edge.lengthkm * 1000) / eromVelocityMs;
      
      let streamVelocityMs = nwmVelocityMs || eromVelocityMs;
      if (nwmVelocityMs) {
        nwmVelocityCount++;
      } else {
        eromVelocityCount++;
      }
      
      // Track pure water-only float time (no paddle speed)
      waterOnlyFloatTime += (edge.lengthkm * 1000) / streamVelocityMs;
      
      // Track streamflow (NWM provides in cms)
      if (edge.nwm_streamflow_cms && edge.nwm_streamflow_cms > 0) {
        totalStreamflowCms += edge.nwm_streamflow_cms;
        streamflowCount++;
      }
      
      // Calculate effective speed based on direction
      let effectiveSpeedMs: number;
      if (edge.is_upstream_segment) {
        effectiveSpeedMs = paddleSpeedMs - streamVelocityMs;
        if (effectiveSpeedMs <= 0) {
          // Paddle speed not enough to overcome current - mark as impossible
          impossibleSegments++;
          // Don't add to float time - it will be shown as impossible
        } else {
          totalFloatTime += (edge.lengthkm * 1000) / effectiveSpeedMs;
        }
      } else {
        effectiveSpeedMs = paddleSpeedMs + streamVelocityMs;
        totalFloatTime += (edge.lengthkm * 1000) / effectiveSpeedMs;
      }
      if (edge.gnis_name) waterways.add(edge.gnis_name);
    }
    
    const distanceMiles = totalDistance / 1609.34;
    const elevDropFt = (elevStart && elevEnd) ? (elevStart - elevEnd) * 3.28084 : 0;
    const elevGainFt = elevDropFt < 0 ? Math.abs(elevDropFt) : 0;
    
    const nwmFreshnessResult = await query(`SELECT updated_at FROM nwm_velocity LIMIT 1`);
    const nwmTimestamp = nwmFreshnessResult.rows[0]?.updated_at || null;
    
    const geojson = { type: 'FeatureCollection' as const, features };
    
    // Build warnings
    const warnings: string[] = [];
    if (isUpstream) {
      warnings.push(`⚠️ You are paddling UPSTREAM. This route gains ${Math.round(elevGainFt)} ft in elevation.`);
    }
    if (impossibleSegments > 0) {
      warnings.push(`⚠️ ${impossibleSegments} segment(s) have currents faster than your paddle speed (${paddleSpeedMph} mph).`);
    }
    
    return NextResponse.json({
      route: geojson,
      stats: {
        distance_m: Math.round(totalDistance),
        distance_mi: Math.round(distanceMiles * 10) / 10,
        // Show calculated time (may be partial if some segments impossible)
        float_time_h: Math.round(totalFloatTime / 360) / 10,
        float_time_s: Math.round(totalFloatTime),
        // Flag if route has impossible segments (paddle speed < current)
        has_impossible_segments: impossibleSegments > 0,
        elev_start_m: elevStart,
        elev_end_m: elevEnd,
        elev_drop_ft: Math.round(elevDropFt),
        elev_gain_ft: Math.round(elevGainFt),
        gradient_ft_mi: distanceMiles > 0 ? Math.round(Math.abs(elevDropFt) / distanceMiles * 10) / 10 : 0,
        segment_count: result.edges.length,
        waterways: Array.from(waterways),
        flow_condition: flowCondition,
        elevation_profile: elevationProfile,
        steep_sections: steepSections,
        direction: {
          is_upstream: isUpstream,
          upstream_segments: upstreamSegmentCount,
          downstream_segments: result.edges.length - upstreamSegmentCount,
          impossible_segments: impossibleSegments,
          paddle_speed_mph: paddleSpeedMph,
        },
        live_conditions: {
          nwm_segments: nwmVelocityCount,
          erom_segments: eromVelocityCount,
          nwm_coverage_percent: Math.round((nwmVelocityCount / (nwmVelocityCount + eromVelocityCount || 1)) * 100),
          data_timestamp: nwmTimestamp,
          // Water speed (actual velocity from NWM or EROM, independent of paddle speed)
          avg_velocity_mph: waterOnlyFloatTime > 0 
            ? Math.round((totalDistance / waterOnlyFloatTime) * 2.237 * 10) / 10 
            : 0,
          // Average streamflow (CMS to CFS: multiply by 35.3147)
          avg_streamflow_cfs: streamflowCount > 0 
            ? Math.round((totalStreamflowCms / streamflowCount) * 35.3147 * 10) / 10 
            : null,
          // Baseline from EROM only
          baseline_velocity_mph: eromOnlyFloatTime > 0
            ? Math.round((totalDistance / eromOnlyFloatTime) * 2.237 * 10) / 10
            : 0,
          baseline_float_time_s: Math.round(eromOnlyFloatTime),
          baseline_float_time_h: Math.round(eromOnlyFloatTime / 360) / 10,
          // Time difference: water-only current vs water-only baseline (positive = faster than baseline)
          time_diff_s: Math.round(eromOnlyFloatTime - waterOnlyFloatTime),
          time_diff_percent: eromOnlyFloatTime > 0 
            ? Math.round(((eromOnlyFloatTime - waterOnlyFloatTime) / eromOnlyFloatTime) * 100)
            : 0,
          // Flow status based on water-only comparison (not affected by paddle speed)
          flow_status: waterOnlyFloatTime < eromOnlyFloatTime * 0.85 ? 'high' as const : 
                       waterOnlyFloatTime > eromOnlyFloatTime * 1.15 ? 'low' as const : 'normal' as const,
        }
      },
      warnings,
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
