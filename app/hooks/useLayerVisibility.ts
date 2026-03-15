"use client";

import { useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import { LayerVisibility } from '../components/Map/MapControls';

// All river layer IDs for visibility toggling (all 6 regions)
const ALL_RIVER_LAYER_IDS = [
  "rivers-line", "rivers-arrows", "rivers-labels",
  "rivers-southeast-line", "rivers-southeast-arrows", "rivers-southeast-labels",
  "rivers-midwest-line", "rivers-midwest-arrows", "rivers-midwest-labels",
  "rivers-plains-line", "rivers-plains-arrows", "rivers-plains-labels",
  "rivers-west-line", "rivers-west-arrows", "rivers-west-labels",
  "rivers-midatlantic-line", "rivers-midatlantic-arrows", "rivers-midatlantic-labels",
];

// Layer mapping for visibility control
export const LAYER_MAPPING: Record<keyof LayerVisibility, string[]> = {
  blmLands: ["blm-lands-fill", "blm-lands-outline"],
  wilderness: ["wilderness-fill", "wilderness-outline"],
  nationalForests: ["national-forests-fill", "national-forests-outline"],
  nationalParks: ["national-parks-fill", "national-parks-outline"],
  rivers: ALL_RIVER_LAYER_IDS,
  lakes: ["lakes-fill", "lakes-outline", "lakes-labels"],
  wildScenicRivers: ["wsr-line", "wsr-labels"],
  accessPoints: ["access-points-backdrop"],
  campgrounds: ["campgrounds-backdrop"],
  rapids: ["rapids-circles"],
  waterfalls: ["waterfalls-backdrop"],
  dams: ["dams-backdrop"],
  gauges: ["gauges-circles", "gauges-labels"],
  bwcaTrails: ["bwca-routing-edges-paddle", "bwca-routing-edges-portage"],
};

/**
 * Hook to manage map layer visibility
 */
export function useLayerVisibility() {
  const applyVisibility = useCallback(
    (map: mapboxgl.Map | null, visibility: LayerVisibility) => {
      if (!map) return;

      Object.entries(visibility).forEach(([key, visible]) => {
        const layers = LAYER_MAPPING[key as keyof LayerVisibility];
        layers?.forEach((layerId) => {
          if (map.getLayer(layerId)) {
            map.setLayoutProperty(
              layerId,
              "visibility",
              visible ? "visible" : "none"
            );
          }
        });
      });
    },
    []
  );

  const toggleLayer = useCallback(
    (
      map: mapboxgl.Map | null,
      layerKey: keyof LayerVisibility,
      visible: boolean
    ) => {
      if (!map) return;

      const layers = LAYER_MAPPING[layerKey];
      layers?.forEach((layerId) => {
        if (map.getLayer(layerId)) {
          map.setLayoutProperty(
            layerId,
            "visibility",
            visible ? "visible" : "none"
          );
        }
      });
    },
    []
  );

  return {
    applyVisibility,
    toggleLayer,
    LAYER_MAPPING,
  };
}
