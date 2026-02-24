/**
 * Preloaded Weather Layers Hook
 *
 * For instant forecast transitions:
 * - Creates a separate layer for EACH forecast hour upfront
 * - All layers load in background with opacity 0
 * - Switching forecasts is just an opacity toggle (instant, no network)
 *
 * Adapted from hrrr-weather-viz for mapbox-gl direct usage
 */

import { useRef, useCallback, useState, useEffect } from "react";
import mapboxgl from "mapbox-gl";
import { WeatherMetadata } from "./useWeatherMetadata";

interface UsePreloadedWeatherLayersOptions {
  map: mapboxgl.Map | null;
  metadata: WeatherMetadata | null;
  variableId: string | null;
  enabled: boolean;
  baseOpacity?: number;
}

interface UsePreloadedWeatherLayersResult {
  /** Initialize all layers (call when map/metadata ready) */
  initialize: () => void;
  /** Switch to a different forecast hour (instant) */
  setActiveForecast: (forecastHour: string) => void;
  /** Current active forecast hour */
  activeForecast: string | null;
  /** Whether all layers are loaded and ready */
  isReady: boolean;
  /** Loading progress (0-100) */
  loadProgress: number;
  /** Number of layers loaded */
  loadedCount: number;
  /** Total layers to load */
  totalCount: number;
  /** Clean up all sources and layers */
  cleanup: () => void;
  /** Set opacity for the active layer */
  setOpacity: (opacity: number) => void;
  /** Re-initialize (e.g., when variable changes) */
  reinitialize: () => void;
}

const SOURCE_PREFIX = "weather-preload-";
const LAYER_PREFIX = "weather-layer-";

export function usePreloadedWeatherLayers(
  options: UsePreloadedWeatherLayersOptions
): UsePreloadedWeatherLayersResult {
  const { map, metadata, variableId, enabled, baseOpacity = 0.7 } = options;

  const [activeForecast, setActiveForecastState] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [loadedCount, setLoadedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const isInitializedRef = useRef(false);
  const opacityRef = useRef(baseOpacity);
  const loadedSourcesRef = useRef<Set<string>>(new Set());
  const activeForecastRef = useRef<string | null>(null);
  const cleanupListenersRef = useRef<(() => void)[]>([]);

  const getSourceId = (forecastHour: string) => `${SOURCE_PREFIX}${forecastHour}`;
  const getLayerId = (forecastHour: string) => `${LAYER_PREFIX}${forecastHour}`;

  const cleanup = useCallback(() => {
    if (!map) return;

    // Remove event listeners
    cleanupListenersRef.current.forEach((cleanup) => cleanup());
    cleanupListenersRef.current = [];

    // Get forecast hours from metadata or use empty array
    const forecastHours = metadata?.forecast_hours || [];

    // Remove all layers and sources
    forecastHours.forEach((hour) => {
      const layerId = getLayerId(hour);
      const sourceId = getSourceId(hour);

      if (map.getLayer(layerId)) {
        map.removeLayer(layerId);
      }
      if (map.getSource(sourceId)) {
        map.removeSource(sourceId);
      }
    });

    isInitializedRef.current = false;
    loadedSourcesRef.current.clear();
    setIsReady(false);
    setLoadedCount(0);
    setTotalCount(0);
    setActiveForecastState(null);
    activeForecastRef.current = null;
  }, [map, metadata]);

  // Cleanup on unmount or when disabled
  useEffect(() => {
    if (!enabled) {
      cleanup();
    }
    return () => {
      cleanup();
    };
  }, [enabled, cleanup]);

  const setOpacity = useCallback(
    (opacity: number) => {
      opacityRef.current = opacity;
      if (!map || !activeForecastRef.current) return;

      const activeLayerId = getLayerId(activeForecastRef.current);
      if (map.getLayer(activeLayerId)) {
        map.setPaintProperty(activeLayerId, "raster-opacity", opacity);
      }
    },
    [map]
  );

  const setActiveForecast = useCallback(
    (forecastHour: string) => {
      if (!map || !isReady) return;

      const previousForecast = activeForecastRef.current;

      // Show new layer FIRST (prevents flash)
      const newLayerId = getLayerId(forecastHour);
      if (map.getLayer(newLayerId)) {
        map.setPaintProperty(newLayerId, "raster-opacity", opacityRef.current);
      }

      // THEN hide previous layer
      if (previousForecast && previousForecast !== forecastHour) {
        const prevLayerId = getLayerId(previousForecast);
        if (map.getLayer(prevLayerId)) {
          map.setPaintProperty(prevLayerId, "raster-opacity", 0);
        }
      }

      activeForecastRef.current = forecastHour;
      setActiveForecastState(forecastHour);
    },
    [map, isReady]
  );

  const initialize = useCallback(() => {
    if (!map || !metadata || !variableId || !enabled || isInitializedRef.current) {
      return;
    }

    const variable = metadata.variables.find((v) => v.id === variableId);
    if (!variable?.latest_timestamp) return;

    const forecastHours = metadata.forecast_hours;
    if (forecastHours.length === 0) return;

    // Clean up any existing layers first
    cleanup();

    const total = forecastHours.length;
    setTotalCount(total);
    setLoadedCount(0);
    loadedSourcesRef.current.clear();

    const checkAllLoaded = () => {
      const loaded = loadedSourcesRef.current.size;
      setLoadedCount(loaded);

      if (loaded >= total) {
        setIsReady(true);
        // Set initial active forecast
        if (forecastHours.length > 0 && !activeForecastRef.current) {
          const initialForecast = forecastHours[0];
          activeForecastRef.current = initialForecast;
          setActiveForecastState(initialForecast);

          // Make initial layer visible
          const initialLayerId = getLayerId(initialForecast);
          if (map.getLayer(initialLayerId)) {
            map.setPaintProperty(initialLayerId, "raster-opacity", opacityRef.current);
          }
        }
      }
    };

    // Find insertion point (before rivers/features)
    let beforeLayer: string | undefined;
    const candidates = ["rivers-casing", "rivers-line", "lakes-fill", "blm-fill"];
    for (const layerId of candidates) {
      if (map.getLayer(layerId)) {
        beforeLayer = layerId;
        break;
      }
    }

    // Create a source and layer for each forecast hour
    forecastHours.forEach((hour) => {
      const tileUrl = metadata.tiles.url_template
        .replace("{variable}", variableId)
        .replace("{timestamp}", variable.latest_timestamp!)
        .replace("{forecast}", hour);

      const sourceId = getSourceId(hour);
      const layerId = getLayerId(hour);

      // Create source
      map.addSource(sourceId, {
        type: "raster",
        tiles: [tileUrl],
        tileSize: metadata.tiles.tile_size || 256,
        minzoom: metadata.tiles.min_zoom || 0,
        maxzoom: metadata.tiles.max_zoom || 8,
        bounds: metadata.tiles.bounds,
      });

      // Create layer (all start hidden)
      map.addLayer(
        {
          id: layerId,
          type: "raster",
          source: sourceId,
          paint: {
            "raster-opacity": 0,
            "raster-fade-duration": 0,
          },
        },
        beforeLayer
      );

      // Listen for source load
      const onSourceData = (e: mapboxgl.MapSourceDataEvent) => {
        if (e.sourceId === sourceId && e.isSourceLoaded && !loadedSourcesRef.current.has(hour)) {
          loadedSourcesRef.current.add(hour);
          checkAllLoaded();
        }
      };

      map.on("sourcedata", onSourceData);
      cleanupListenersRef.current.push(() => map.off("sourcedata", onSourceData));

      // Check immediately in case already cached
      if (map.isSourceLoaded(sourceId)) {
        loadedSourcesRef.current.add(hour);
        checkAllLoaded();
      }
    });

    isInitializedRef.current = true;
  }, [map, metadata, variableId, enabled, cleanup]);

  const reinitialize = useCallback(() => {
    cleanup();
    setTimeout(() => {
      initialize();
    }, 50);
  }, [cleanup, initialize]);

  const loadProgress = totalCount > 0 ? Math.round((loadedCount / totalCount) * 100) : 0;

  return {
    initialize,
    setActiveForecast,
    activeForecast,
    isReady,
    loadProgress,
    loadedCount,
    totalCount,
    cleanup,
    setOpacity,
    reinitialize,
  };
}

export default usePreloadedWeatherLayers;
