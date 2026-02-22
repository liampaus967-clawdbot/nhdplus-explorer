/**
 * Flow Data API
 * 
 * Returns real-time flow data by cascading through sources:
 * 1. USGS gauge with FGP data (confidence: 1.0)
 * 2. NWM modeled data (confidence: 0.5)
 */
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// S3 URL for FGP live data
const FGP_LIVE_URL = 'https://driftwise-flowgauge-data.s3.amazonaws.com/live_output/current_status.json';

// Cache FGP data for 5 minutes
let fgpCache: { data: Record<string, any>; timestamp: number } | null = null;
const FGP_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

type FlowStatus = 'very_low' | 'low' | 'normal' | 'high' | 'very_high' | 'unknown';

interface FlowData {
  comid: number;
  source: 'usgs' | 'nwm' | 'none';
  confidence: number;
  flow_cfs: number | null;
  flow_cms: number | null;
  velocity_fps: number | null;
  velocity_ms: number | null;
  status: FlowStatus;
  percentile: number | null;
  gauge_id: string | null;
  gauge_name: string | null;
  updated_at: string | null;
}

// Conversion factors
const CMS_TO_CFS = 35.3147;
const MS_TO_FPS = 3.28084;

/**
 * Load FGP live data from S3
 */
async function loadFGPData(): Promise<Record<string, any>> {
  const now = Date.now();
  
  // Check cache
  if (fgpCache && (now - fgpCache.timestamp) < FGP_CACHE_TTL) {
    return fgpCache.data;
  }
  
  try {
    const response = await fetch(FGP_LIVE_URL, { 
      next: { revalidate: 300 } // Cache for 5 min
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    fgpCache = { data: data.sites || {}, timestamp: now };
    return fgpCache.data;
  } catch (error) {
    console.warn('Could not load FGP data:', error);
    return {};
  }
}

/**
 * Convert percentile to flow status
 */
function getFlowStatus(percentile: number | null): FlowStatus {
  if (percentile === null) return 'unknown';
  if (percentile < 10) return 'very_low';
  if (percentile < 25) return 'low';
  if (percentile < 75) return 'normal';
  if (percentile < 90) return 'high';
  return 'very_high';
}

/**
 * Calculate percentile and status from flow using reference thresholds
 */
async function calculatePercentile(siteNo: string, flowCfs: number): Promise<{ percentile: number | null; status: FlowStatus }> {
  const refResult = await query(`
    SELECT p10, p25, p50, p75, p90
    FROM flow_percentiles
    WHERE site_id = $1
  `, [siteNo]);
  
  const ref = refResult.rows[0];
  if (!ref) return { percentile: null, status: 'unknown' };
  
  // Determine percentile bucket and interpolate
  let percentile: number | null = null;
  let status: FlowStatus = 'unknown';
  
  if (ref.p10 !== null && flowCfs <= ref.p10) {
    percentile = Math.round((flowCfs / ref.p10) * 10);
    status = 'very_low';
  } else if (ref.p25 !== null && flowCfs <= ref.p25) {
    percentile = 10 + Math.round(((flowCfs - (ref.p10 || 0)) / (ref.p25 - (ref.p10 || 0))) * 15);
    status = 'low';
  } else if (ref.p50 !== null && flowCfs <= ref.p50) {
    percentile = 25 + Math.round(((flowCfs - (ref.p25 || 0)) / (ref.p50 - (ref.p25 || 0))) * 25);
    status = 'normal';
  } else if (ref.p75 !== null && flowCfs <= ref.p75) {
    percentile = 50 + Math.round(((flowCfs - (ref.p50 || 0)) / (ref.p75 - (ref.p50 || 0))) * 25);
    status = 'normal';
  } else if (ref.p90 !== null && flowCfs <= ref.p90) {
    percentile = 75 + Math.round(((flowCfs - (ref.p75 || 0)) / (ref.p90 - (ref.p75 || 0))) * 15);
    status = 'high';
  } else if (ref.p90 !== null) {
    percentile = 90 + Math.min(10, Math.round(((flowCfs - ref.p90) / ref.p90) * 10));
    status = 'very_high';
  }
  
  return { percentile: percentile !== null ? Math.max(0, Math.min(100, percentile)) : null, status };
}

/**
 * Get flow data for a single COMID
 */
async function getFlowForComid(comid: number): Promise<FlowData> {
  // Check for USGS gauge on this reach
  const gaugeResult = await query(`
    SELECT site_no, site_name, comid
    FROM usgs_gauges
    WHERE comid = $1
    LIMIT 1
  `, [comid]);
  
  const gauge = gaugeResult.rows[0];
  
  if (gauge) {
    // Check FGP for live data (has real-time percentiles)
    const fgpData = await loadFGPData();
    const fgp = fgpData[gauge.site_no];
    
    if (fgp) {
      return {
        comid,
        source: 'usgs',
        confidence: 1.0,
        flow_cfs: fgp.flow,
        flow_cms: fgp.flow ? fgp.flow / CMS_TO_CFS : null,
        velocity_fps: null,
        velocity_ms: null,
        status: getFlowStatus(fgp.percentile),
        percentile: fgp.percentile,
        gauge_id: gauge.site_no,
        gauge_name: gauge.site_name,
        updated_at: new Date().toISOString(),
      };
    }
  }
  
  // Fall back to NWM data
  const nwmResult = await query(`
    SELECT comid, velocity_ms, streamflow_cms, updated_at
    FROM nwm_velocity
    WHERE comid = $1
  `, [comid]);
  
  const nwm = nwmResult.rows[0];
  
  if (nwm) {
    const flow_cms = nwm.streamflow_cms;
    const flow_cfs = flow_cms ? flow_cms * CMS_TO_CFS : null;
    const velocity_ms = nwm.velocity_ms;
    
    // Calculate percentile from reference table if we have a gauge
    let percentile: number | null = null;
    let status: FlowStatus = 'unknown';
    
    if (gauge && flow_cfs !== null) {
      const calc = await calculatePercentile(gauge.site_no, flow_cfs);
      percentile = calc.percentile;
      status = calc.status;
    }
    
    return {
      comid,
      source: 'nwm',
      confidence: gauge ? 0.7 : 0.5,
      flow_cfs,
      flow_cms,
      velocity_fps: velocity_ms ? velocity_ms * MS_TO_FPS : null,
      velocity_ms,
      status,
      percentile,
      gauge_id: gauge?.site_no || null,
      gauge_name: gauge?.site_name || null,
      updated_at: nwm.updated_at?.toISOString() || null,
    };
  }
  
  // No data available
  return {
    comid,
    source: 'none',
    confidence: 0,
    flow_cfs: null,
    flow_cms: null,
    velocity_fps: null,
    velocity_ms: null,
    status: 'unknown',
    percentile: null,
    gauge_id: null,
    gauge_name: null,
    updated_at: null,
  };
}

/**
 * Find best gauge data from a list of COMIDs
 * Returns the one with highest confidence
 */
async function getBestFlowFromComids(comids: number[]): Promise<FlowData | null> {
  let bestData: FlowData | null = null;
  
  for (const comid of comids) {
    const data = await getFlowForComid(comid);
    
    // Prefer data with actual readings
    if (data.source !== 'none') {
      if (!bestData || data.confidence > bestData.confidence) {
        bestData = data;
      }
      // If we found USGS data, use it immediately
      if (data.source === 'usgs' && data.flow_cfs !== null) {
        return data;
      }
    }
  }
  
  return bestData;
}

/**
 * GET /api/flow?comid=123
 * GET /api/flow?comids=123,456,789
 * GET /api/flow?comids=123,456&best=true  (returns single best result)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const wantBest = searchParams.get('best') === 'true';
  
  // Single COMID
  const comidParam = searchParams.get('comid');
  if (comidParam) {
    const comid = parseInt(comidParam, 10);
    if (isNaN(comid)) {
      return NextResponse.json({ error: 'Invalid comid' }, { status: 400 });
    }
    
    const data = await getFlowForComid(comid);
    return NextResponse.json(data);
  }
  
  // Multiple COMIDs
  const comidsParam = searchParams.get('comids');
  if (comidsParam) {
    const comids = comidsParam.split(',').map(c => parseInt(c.trim(), 10));
    if (comids.some(isNaN)) {
      return NextResponse.json({ error: 'Invalid comids' }, { status: 400 });
    }
    if (comids.length > 100) {
      return NextResponse.json({ error: 'Max 100 COMIDs per request' }, { status: 400 });
    }
    
    // Return single best result for route
    if (wantBest) {
      const best = await getBestFlowFromComids(comids);
      return NextResponse.json(best || { source: 'none', confidence: 0 });
    }
    
    // Return all results
    const results: Record<number, FlowData> = {};
    for (const comid of comids) {
      results[comid] = await getFlowForComid(comid);
    }
    return NextResponse.json(results);
  }
  
  return NextResponse.json({ error: 'Missing comid or comids parameter' }, { status: 400 });
}
