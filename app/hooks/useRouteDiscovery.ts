import { useState, useEffect } from 'react';

export interface DiscoveryPOI {
  id: number;
  type: 'campground' | 'dam' | 'waterfall' | 'rapid' | 'access_point';
  name: string;
  latitude: number;
  longitude: number;
  distance_m?: number;
  operator?: string;
  website?: string;
  has_water?: boolean;
  has_toilets?: boolean;
  dam_height_ft?: number;
  hazard_potential?: string;
  rapid_class?: string;
  height?: string;
}

export interface DiscoverySummary {
  campgrounds: { count: number; items: DiscoveryPOI[] };
  hazards: { 
    count: number; 
    dams: number;
    waterfalls: number;
    rapids: number;
    items: DiscoveryPOI[] 
  };
  access_points: { count: number; items: DiscoveryPOI[] };
}

const EMPTY_RESULT: DiscoverySummary = {
  campgrounds: { count: 0, items: [] },
  hazards: { count: 0, dams: 0, waterfalls: 0, rapids: 0, items: [] },
  access_points: { count: 0, items: [] },
};

/**
 * Hook to fetch POIs along a route by COMIDs
 */
export function useRouteDiscovery(comids: number[] | null, bufferM: number = 1000) {
  const [discovery, setDiscovery] = useState<DiscoverySummary>(EMPTY_RESULT);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!comids || comids.length === 0) {
      setDiscovery(EMPTY_RESULT);
      return;
    }

    setLoading(true);
    setError(null);

    const comidStr = comids.join(',');
    
    fetch(`/api/discover?comids=${comidStr}&buffer=${bufferM}`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<DiscoverySummary>;
      })
      .then(data => {
        setDiscovery(data);
      })
      .catch(err => {
        console.error('Failed to fetch discoveries:', err);
        setError(err.message);
        setDiscovery(EMPTY_RESULT);
      })
      .finally(() => setLoading(false));
  }, [comids?.join(','), bufferM]);

  return { discovery, loading, error };
}

/**
 * Format hazard summary text
 */
export function formatHazardSummary(hazards: DiscoverySummary['hazards']): string {
  const parts: string[] = [];
  if (hazards.dams > 0) parts.push(`${hazards.dams} dam${hazards.dams > 1 ? 's' : ''}`);
  if (hazards.waterfalls > 0) parts.push(`${hazards.waterfalls} waterfall${hazards.waterfalls > 1 ? 's' : ''}`);
  if (hazards.rapids > 0) parts.push(`${hazards.rapids} rapid${hazards.rapids > 1 ? 's' : ''}`);
  return parts.length > 0 ? parts.join(', ') : 'None detected';
}
