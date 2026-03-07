"use client";

import { useCallback, useRef } from 'react';
import mapboxgl from 'mapbox-gl';

/**
 * Hook for tracking and clearing POI highlights on the map
 */
export function usePoiHighlight() {
  const highlightedPoi = useRef<{
    source: string;
    sourceLayer: string;
    id: number;
  } | null>(null);

  const highlightPoi = useCallback(
    (
      map: mapboxgl.Map | null,
      poiType: "campground" | "access_point",
      id: number
    ) => {
      if (!map) return;

      // Clear previous highlight
      if (highlightedPoi.current) {
        map.removeFeatureState({
          source: highlightedPoi.current.source,
          sourceLayer: highlightedPoi.current.sourceLayer,
          id: highlightedPoi.current.id,
        });
      }

      // Map POI type to source/layer names
      const sourceMap = {
        campground: { source: "campgrounds", sourceLayer: "campgrounds" },
        access_point: { source: "access-points", sourceLayer: "access_points_clean" },
      };

      const { source, sourceLayer } = sourceMap[poiType];

      // Set new highlight
      map.setFeatureState(
        { source, sourceLayer, id },
        { highlighted: true }
      );

      // Track for cleanup
      highlightedPoi.current = { source, sourceLayer, id };

      // Auto-clear after 4 seconds
      setTimeout(() => {
        if (
          highlightedPoi.current?.source === source &&
          highlightedPoi.current?.id === id
        ) {
          map?.removeFeatureState({ source, sourceLayer, id });
          highlightedPoi.current = null;
        }
      }, 4000);
    },
    []
  );

  const clearHighlight = useCallback((map: mapboxgl.Map | null) => {
    if (!map || !highlightedPoi.current) return;
    
    map.removeFeatureState({
      source: highlightedPoi.current.source,
      sourceLayer: highlightedPoi.current.sourceLayer,
      id: highlightedPoi.current.id,
    });
    highlightedPoi.current = null;
  }, []);

  return {
    highlightPoi,
    clearHighlight,
    highlightedPoi,
  };
}
