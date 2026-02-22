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
  temperature_c: number | null;
  temperature_f: number | null;
  temp_trend: 'rising' | 'falling' | 'stable' | 'unknown';
  temp_trend_rate: number | null;
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

  // Convert to temperature trend map for warming/cooling coloring
  const tempTrendMap = data?.sites
    ? Object.fromEntries(
        Object.entries(data.sites).map(([siteNo, info]) => [siteNo, info.temp_trend])
      )
    : null;

  // Convert to temperature map (Fahrenheit for display)
  const temperatureMap = data?.sites
    ? Object.fromEntries(
        Object.entries(data.sites)
          .filter(([, info]) => info.temperature_f !== null)
          .map(([siteNo, info]) => [siteNo, info.temperature_f as number])
      )
    : null;

  return { 
    data, 
    statusMap, 
    trendMap, 
    tempTrendMap,
    temperatureMap,
    loading, 
    error, 
    refresh: fetchStatuses 
  };
}
