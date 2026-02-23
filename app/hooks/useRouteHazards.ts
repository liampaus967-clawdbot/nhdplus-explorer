import { useState, useEffect } from 'react';

export interface Hazard {
  id: number;
  type: 'dam' | 'waterfall' | 'rapid';
  name: string;
  latitude: number;
  longitude: number;
  distance_m?: number;
  // Dam-specific
  dam_height_ft?: number;
  hazard_potential?: string;
  river_name?: string;
  // Waterfall-specific
  height?: string;
  description?: string;
  // Rapid-specific
  rapid_class?: string;
  comid?: number;
}

interface HazardsResponse {
  hazard_count: number;
  hazards: Hazard[];
}

/**
 * Hook to fetch hazards along a route by COMIDs
 */
export function useRouteHazards(comids: number[] | null) {
  const [hazards, setHazards] = useState<Hazard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!comids || comids.length === 0) {
      setHazards([]);
      return;
    }

    setLoading(true);
    setError(null);

    const comidStr = comids.join(',');
    
    fetch(`/api/hazards?comids=${comidStr}&buffer=500`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<HazardsResponse>;
      })
      .then(data => {
        setHazards(data.hazards || []);
      })
      .catch(err => {
        console.error('Failed to fetch hazards:', err);
        setError(err.message);
        setHazards([]);
      })
      .finally(() => setLoading(false));
  }, [comids?.join(',')]);

  return { hazards, loading, error };
}

/**
 * Get hazard severity color
 */
export function getHazardColor(hazard: Hazard): string {
  if (hazard.type === 'dam') {
    switch (hazard.hazard_potential?.toLowerCase()) {
      case 'high':
        return '#dc2626'; // Red
      case 'significant':
        return '#f97316'; // Orange
      case 'low':
        return '#eab308'; // Yellow
      default:
        return '#6b7280'; // Gray
    }
  }
  if (hazard.type === 'waterfall') return '#67e8f9'; // Cyan
  if (hazard.type === 'rapid') return '#ef4444'; // Red
  return '#6b7280';
}

/**
 * Get hazard icon
 */
export function getHazardIcon(hazard: Hazard): string {
  switch (hazard.type) {
    case 'dam': return '🚧';
    case 'waterfall': return '💧';
    case 'rapid': return '🌊';
    default: return '⚠️';
  }
}
