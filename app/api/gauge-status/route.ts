/**
 * Gauge Status API
 * 
 * Returns flow status for all gauges from FGP live data.
 * Used to color gauge markers on the map.
 */
import { NextResponse } from 'next/server';

const FGP_LIVE_URL = 'https://driftwise-flowgauge-data.s3.amazonaws.com/live_output/current_status.json';

// Cache for 5 minutes
let cache: { data: any; timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000;

type FlowStatus = 'very_low' | 'low' | 'normal' | 'high' | 'very_high';

/**
 * Map FGP percentile to our status
 */
function mapFlowStatus(fgpStatus: string | null, percentile: number | null): FlowStatus {
  if (percentile !== null) {
    if (percentile < 10) return 'very_low';
    if (percentile < 25) return 'low';
    if (percentile < 75) return 'normal';
    if (percentile < 90) return 'high';
    return 'very_high';
  }
  
  // Fallback to text status
  switch (fgpStatus) {
    case 'Much Below Normal':
      return 'very_low';
    case 'Below Normal':
      return 'low';
    case 'Normal':
      return 'normal';
    case 'Above Normal':
      return 'high';
    case 'Much Above Normal':
      return 'very_high';
    default:
      return 'normal';
  }
}

export async function GET() {
  const now = Date.now();
  
  // Check cache
  if (cache && (now - cache.timestamp) < CACHE_TTL) {
    return NextResponse.json(cache.data);
  }
  
  try {
    const response = await fetch(FGP_LIVE_URL, { 
      next: { revalidate: 300 }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const fgpData = await response.json();
    const sites = fgpData.sites || {};
    
    // Transform to our format: { site_no: { status, trend, ... } }
    const result: Record<string, { 
      status: FlowStatus; 
      percentile: number | null; 
      flow: number | null;
      trend: 'rising' | 'falling' | 'stable' | 'unknown';
      trend_rate: number | null;
    }> = {};
    
    for (const [siteNo, data] of Object.entries(sites) as [string, any][]) {
      // Map trend
      let trend: 'rising' | 'falling' | 'stable' | 'unknown' = 'unknown';
      if (data.trend === 'rising' || data.trend_rate > 0.1) trend = 'rising';
      else if (data.trend === 'falling' || data.trend_rate < -0.1) trend = 'falling';
      else if (data.trend === 'stable' || (data.trend_rate !== null && Math.abs(data.trend_rate) <= 0.1)) trend = 'stable';
      
      result[siteNo] = {
        status: mapFlowStatus(data.flow_status, data.percentile),
        percentile: data.percentile,
        flow: data.flow,
        trend,
        trend_rate: data.trend_rate,
      };
    }
    
    const responseData = {
      generated_at: fgpData.generated_at,
      site_count: Object.keys(result).length,
      sites: result,
    };
    
    cache = { data: responseData, timestamp: now };
    
    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Failed to fetch gauge status:', error);
    return NextResponse.json({ error: 'Failed to fetch gauge status', details: String(error) }, { status: 500 });
  }
}
