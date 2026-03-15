"use client";

import { createContext, useContext, useRef, useState, useCallback, useEffect, ReactNode } from 'react';
import mapboxgl from 'mapbox-gl';
import { BasemapStyle } from '../types';
import { LayerVisibility } from '../components/Map/MapControls';
import { BASEMAP_STYLES, MAP_CONFIG } from '../constants';
import { addAllLayers } from '../layers';

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
  bwcaTrails: ["bwca-edges-line"],
};

interface MapContextValue {
  // Refs
  mapContainer: React.RefObject<HTMLDivElement>;
  map: React.MutableRefObject<mapboxgl.Map | null>;
  
  // State
  basemap: BasemapStyle;
  theme: 'light' | 'dark';
  styleVersion: number;
  layerVisibility: LayerVisibility;
  
  // Actions
  setBasemap: (basemap: BasemapStyle) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
  setLayerVisibility: (visibility: LayerVisibility) => void;
  
  // Map helpers
  isMapReady: () => boolean;
}

const MapContext = createContext<MapContextValue | null>(null);

export function useMapContext() {
  const context = useContext(MapContext);
  if (!context) {
    throw new Error('useMapContext must be used within a MapProvider');
  }
  return context;
}

interface MapProviderProps {
  children: ReactNode;
}

const DEFAULT_LAYER_VISIBILITY: LayerVisibility = {
  blmLands: true,
  wilderness: true,
  nationalForests: true,
  nationalParks: true,
  rivers: true,
  lakes: true,
  wildScenicRivers: false,
  accessPoints: true,
  campgrounds: true,
  rapids: false,
  waterfalls: true,
  dams: true,
  gauges: false,
  bwcaTrails: false,
};

export function MapProvider({ children }: MapProviderProps) {
  // Refs
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const basemapRef = useRef<BasemapStyle>("outdoors");
  
  // State
  const [basemap, setBasemapState] = useState<BasemapStyle>("outdoors");
  const [theme, setTheme] = useState<'light' | 'dark'>("dark");
  const [styleVersion, setStyleVersion] = useState(0);
  const [layerVisibility, setLayerVisibilityState] = useState<LayerVisibility>(DEFAULT_LAYER_VISIBILITY);

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // Toggle theme
  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === "dark" ? "light" : "dark");
  }, []);

  // Set basemap with map update
  const setBasemap = useCallback((newBasemap: BasemapStyle) => {
    if (!map.current || newBasemap === basemap) return;
    setBasemapState(newBasemap);
    basemapRef.current = newBasemap;
    map.current.setStyle(BASEMAP_STYLES[newBasemap]);
  }, [basemap]);

  // Set layer visibility with map update
  const setLayerVisibility = useCallback((newVisibility: LayerVisibility) => {
    setLayerVisibilityState(newVisibility);
    if (!map.current) return;

    Object.entries(newVisibility).forEach(([key, visible]) => {
      const layers = LAYER_MAPPING[key as keyof LayerVisibility];
      layers?.forEach((layerId) => {
        if (map.current?.getLayer(layerId)) {
          map.current.setLayoutProperty(
            layerId,
            "visibility",
            visible ? "visible" : "none"
          );
        }
      });
    });
  }, []);

  // Check if map is ready
  const isMapReady = useCallback(() => {
    return map.current !== null && map.current.loaded();
  }, []);

  // Initialize map
  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: BASEMAP_STYLES.outdoors,
      center: MAP_CONFIG.center,
      zoom: MAP_CONFIG.zoom,
      pitch: MAP_CONFIG.pitch,
    });

    const setupLayers = () => {
      if (map.current) {
        addAllLayers(map.current, basemapRef.current);

        // Add lake route source and layers
        if (!map.current.getSource("lake-route")) {
          map.current.addSource("lake-route", {
            type: "geojson",
            data: { type: "FeatureCollection", features: [] },
          });

          // Glow layer for submitted routes (animated pulse)
          map.current.addLayer({
            id: "lake-route-glow",
            type: "line",
            source: "lake-route",
            filter: ["==", ["get", "submitted"], true],
            paint: {
              "line-color": "#f59e0b",
              "line-width": 12,
              "line-opacity": 0.3,
              "line-blur": 8,
            },
          });

          // Main route line - cyan while drawing, orange when submitted
          map.current.addLayer({
            id: "lake-route-line",
            type: "line",
            source: "lake-route",
            paint: {
              "line-color": [
                "case",
                ["==", ["get", "submitted"], true],
                "#f59e0b", // Orange when submitted
                "#006BF7", // Cyan while drawing
              ],
              "line-width": 4,
              "line-opacity": 0.9,
            },
          });
        }
      }
    };

    map.current.on("load", setupLayers);
    map.current.on("style.load", () => {
      setupLayers();
      // Increment styleVersion to trigger re-application of settings
      setStyleVersion(v => v + 1);
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Reapply layer visibility after style changes
  useEffect(() => {
    if (!map.current || styleVersion === 0) return;

    const timeout = setTimeout(() => {
      if (!map.current) return;

      Object.entries(layerVisibility).forEach(([key, visible]) => {
        const layers = LAYER_MAPPING[key as keyof LayerVisibility];
        layers?.forEach((layerId) => {
          if (map.current?.getLayer(layerId)) {
            map.current.setLayoutProperty(
              layerId,
              "visibility",
              visible ? "visible" : "none"
            );
          }
        });
      });
    }, 50);

    return () => clearTimeout(timeout);
  }, [styleVersion, layerVisibility]);

  const value: MapContextValue = {
    mapContainer: mapContainer as React.RefObject<HTMLDivElement>,
    map,
    basemap,
    theme,
    styleVersion,
    layerVisibility,
    setBasemap,
    setTheme,
    toggleTheme,
    setLayerVisibility,
    isMapReady,
  };

  return (
    <MapContext.Provider value={value}>
      {children}
    </MapContext.Provider>
  );
}
