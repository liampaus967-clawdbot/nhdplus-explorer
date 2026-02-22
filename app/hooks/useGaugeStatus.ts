/**
 * Hook to fetch and manage gauge flow statuses
 */
import { useState, useEffect, useCallback } from 'react';

interface GaugeStatus {
  status: 'very_low' | 'low' | 'normal' | 'high' | 'very_high';
  percentile: number | null;
  flow: number | null;
  trend: 'rising' | 'falling' | 'stable' | 'unknown';
  trend_rate: number | null;
}

interface GaugeStatusResponse {
  generated_at: string;
  site_count: number;
  sites: Record<string, GaugeStatus>;
}

export function useGaugeStatus() {
  const [data, setData] = useState<GaugeStatusResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatuses = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/gauge-status');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on mount
  useEffect(() => {
    fetchStatuses();
    
    // Refresh every 5 minutes
    const interval = setInterval(fetchStatuses, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchStatuses]);

  // Convert to simple status map for percentile coloring
  const statusMap = data?.sites 
    ? Object.fromEntries(
        Object.entries(data.sites).map(([siteNo, info]) => [siteNo, info.status])
      )
    : null;

  // Convert to trend map for rising/falling coloring
  const trendMap = data?.sites
    ? Object.fromEntries(
        Object.entries(data.sites).map(([siteNo, info]) => [siteNo, info.trend])
      )
    : null;

  return { data, statusMap, trendMap, loading, error, refresh: fetchStatuses };
}
