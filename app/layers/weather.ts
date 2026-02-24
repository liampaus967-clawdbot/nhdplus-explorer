import mapboxgl from "mapbox-gl";
import { WeatherMetadata } from "@/app/hooks/useWeatherMetadata";

const WEATHER_SOURCE_ID = "weather-tiles";
const WEATHER_LAYER_ID = "weather-layer";

/**
 * Add or update the weather raster source
 */
export function updateWeatherSource(
  map: mapboxgl.Map,
  metadata: WeatherMetadata,
  variableId: string,
  forecast: string = "00"
): void {
  const variable = metadata.variables.find((v) => v.id === variableId);
  if (!variable || !variable.latest_timestamp) {
    console.warn("Weather variable not found:", variableId);
    return;
  }

  // Build tile URL
  const tileUrl = metadata.tiles.url_template
    .replace("{variable}", variableId)
    .replace("{timestamp}", variable.latest_timestamp)
    .replace("{forecast}", forecast);

  // Check if source exists
  const existingSource = map.getSource(WEATHER_SOURCE_ID) as mapboxgl.RasterTileSource;

  if (existingSource) {
    // Update existing source tiles
    existingSource.setTiles([tileUrl]);
  } else {
    // Add new source
    map.addSource(WEATHER_SOURCE_ID, {
      type: "raster",
      tiles: [tileUrl],
      tileSize: metadata.tiles.tile_size || 256,
      minzoom: metadata.tiles.min_zoom || 0,
      maxzoom: metadata.tiles.max_zoom || 8,
      bounds: metadata.tiles.bounds,
    });
  }
}

/**
 * Add the weather raster layer
 */
export function addWeatherLayer(map: mapboxgl.Map, opacity: number = 0.7): void {
  // Only add if source exists and layer doesn't
  if (!map.getSource(WEATHER_SOURCE_ID)) {
    return;
  }

  if (map.getLayer(WEATHER_LAYER_ID)) {
    return;
  }

  // Find a good layer to insert before (rivers or similar)
  const beforeLayer = findInsertionPoint(map);

  map.addLayer(
    {
      id: WEATHER_LAYER_ID,
      type: "raster",
      source: WEATHER_SOURCE_ID,
      paint: {
        "raster-opacity": opacity,
        "raster-fade-duration": 200,
      },
    },
    beforeLayer
  );
}

/**
 * Find the right layer to insert weather beneath
 */
function findInsertionPoint(map: mapboxgl.Map): string | undefined {
  // Try to insert before rivers or other feature layers
  const candidates = [
    "rivers-casing",
    "rivers-line",
    "lakes-fill",
    "blm-fill",
    "wilderness-fill",
  ];

  for (const layerId of candidates) {
    if (map.getLayer(layerId)) {
      return layerId;
    }
  }

  return undefined;
}

/**
 * Remove weather layer and source
 */
export function removeWeatherLayer(map: mapboxgl.Map): void {
  if (map.getLayer(WEATHER_LAYER_ID)) {
    map.removeLayer(WEATHER_LAYER_ID);
  }
  if (map.getSource(WEATHER_SOURCE_ID)) {
    map.removeSource(WEATHER_SOURCE_ID);
  }
}

/**
 * Set weather layer opacity
 */
export function setWeatherOpacity(map: mapboxgl.Map, opacity: number): void {
  if (map.getLayer(WEATHER_LAYER_ID)) {
    map.setPaintProperty(WEATHER_LAYER_ID, "raster-opacity", opacity);
  }
}

/**
 * Show/hide weather layer
 */
export function setWeatherVisibility(map: mapboxgl.Map, visible: boolean): void {
  if (map.getLayer(WEATHER_LAYER_ID)) {
    map.setLayoutProperty(
      WEATHER_LAYER_ID,
      "visibility",
      visible ? "visible" : "none"
    );
  }
}

/**
 * Check if weather layer is currently visible
 */
export function isWeatherLayerVisible(map: mapboxgl.Map): boolean {
  if (!map.getLayer(WEATHER_LAYER_ID)) {
    return false;
  }
  return map.getLayoutProperty(WEATHER_LAYER_ID, "visibility") !== "none";
}
