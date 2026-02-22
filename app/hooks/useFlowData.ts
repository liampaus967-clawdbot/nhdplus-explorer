import { useState, useEffect, useCallback } from 'react';

/**
 * Flow status from the API
 */
export interface FlowData {
  comid: number;
  source: 'usgs' | 'nwm' | 'none';
  confidence: number;
  flow_cfs: number | null;
  flow_cms: number | null;
  velocity_fps: number | null;
  velocity_ms: number | null;
  status: 'very_low' | 'low' | 'normal' | 'high' | 'very_high' | 'unknown';
  percentile: number | null;
  gauge_id: string | null;
  gauge_name: string | null;
  updated_at: string | null;
}

/**
 * Gauge info from bbox query
 */
export interface GaugeInfo {
  site_no: string;
  site_name: string;
  comid: number;
  longitude: number;
  latitude: number;
  drain_area_sq_mi: number | null;
  flow_cfs: number | null;
  source: string;
  updated_at: string | null;
}

// API base URL - configure for production
const API_BASE = process.env.NEXT_PUBLIC_FLOW_API_URL || 'http://localhost:8000';

// S3 URL for FGP live data (via CloudFront when available)
const FGP_LIVE_URL = 'https://driftwise-flowgauge-data.s3.amazonaws.com/live_output/current_status.json';

/**
 * Hook to fetch flow data for a single COMID
 */
export function useFlowStatus(comid: number | null) {
  const [data, setData] = useState<FlowData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!comid) {
      setData(null);
      return;
    }

    setLoading(true);
    setError(null);

    fetch(`${API_BASE}/api/flow/${comid}`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [comid]);

  return { data, loading, error };
}

/**
 * Hook to fetch flow data for multiple COMIDs (e.g., a route)
 */
export function useRouteFlowData(comids: number[]) {
  const [data, setData] = useState<Record<number, FlowData>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!comids.length) {
      setData({});
      return;
    }

    setLoading(true);
    setError(null);

    const comidStr = comids.join(',');
    fetch(`${API_BASE}/api/flow/route?comids=${comidStr}`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [comids.join(',')]);

  return { data, loading, error };
}

/**
 * Hook to fetch gauges in a bounding box
 */
export function useGaugesInBbox(bounds: [number, number, number, number] | null) {
  const [gauges, setGauges] = useState<GaugeInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!bounds) {
      setGauges([]);
      return;
    }

    const [minLng, minLat, maxLng, maxLat] = bounds;
    
    // Skip if bounds too large
    if ((maxLng - minLng) > 10 || (maxLat - minLat) > 10) {
      return;
    }

    setLoading(true);
    setError(null);

    fetch(`${API_BASE}/api/flow/bbox?min_lng=${minLng}&min_lat=${minLat}&max_lng=${maxLng}&max_lat=${maxLat}`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => setGauges(data.gauges || []))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [bounds?.join(',')]);

  return { gauges, loading, error };
}

/**
 * FGP live status data structure
 */
interface FGPSiteStatus {
  flow: number;
  gage_height: number | null;
  percentile: number;
  flow_status: string;
  drought_status: string | null;
  flood_status: string | null;
  trend: string;
  trend_rate: number;
  state: string;
}

interface FGPLiveData {
  generated_at: string;
  site_count: number;
  sites: Record<string, FGPSiteStatus>;
}

/**
 * Hook to fetch FGP live status directly from S3
 * Updates every 15 minutes
 */
export function useFGPLiveData(autoRefresh = true) {
  const [data, setData] = useState<FGPLiveData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(() => {
    setLoading(true);
    setError(null);

    fetch(FGP_LIVE_URL)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        setData(data);
        setLastUpdated(new Date());
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh every 15 minutes
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchData, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchData]);

  /**
   * Convert FGP status to our standard status enum
   */
  const getGaugeStatus = useCallback((siteNo: string): FlowData['status'] => {
    if (!data?.sites[siteNo]) return 'unknown';
    
    const percentile = data.sites[siteNo].percentile;
    if (percentile < 10) return 'very_low';
    if (percentile < 25) return 'low';
    if (percentile < 75) return 'normal';
    if (percentile < 90) return 'high';
    return 'very_high';
  }, [data]);

  /**
   * Get status map for updating gauge colors
   */
  const getStatusMap = useCallback((): Record<string, string> => {
    if (!data?.sites) return {};
    
    const statusMap: Record<string, string> = {};
    for (const siteNo of Object.keys(data.sites)) {
      statusMap[siteNo] = getGaugeStatus(siteNo);
    }
    return statusMap;
  }, [data, getGaugeStatus]);

  return { 
    data, 
    loading, 
    error, 
    lastUpdated, 
    refresh: fetchData,
    getGaugeStatus,
    getStatusMap,
  };
}

/**
 * Format flow value for display
 */
export function formatFlow(cfs: number | null): string {
  if (cfs === null) return '—';
  if (cfs < 10) return cfs.toFixed(1);
  if (cfs < 1000) return Math.round(cfs).toString();
  return (cfs / 1000).toFixed(1) + 'k';
}

/**
 * Get status color
 */
export function getStatusColor(status: FlowData['status']): string {
  switch (status) {
    case 'very_low': return '#dc2626';
    case 'low': return '#f97316';
    case 'normal': return '#22c55e';
    case 'high': return '#3b82f6';
    case 'very_high': return '#7c3aed';
    default: return '#6b7280';
  }
}

/**
 * Get status label
 */
export function getStatusLabel(status: FlowData['status']): string {
  switch (status) {
    case 'very_low': return 'Very Low';
    case 'low': return 'Low';
    case 'normal': return 'Normal';
    case 'high': return 'High';
    case 'very_high': return 'Very High';
    default: return 'Unknown';
  }
}
