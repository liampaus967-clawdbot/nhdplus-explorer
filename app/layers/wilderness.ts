import mapboxgl from 'mapbox-gl';
import { TILESETS, SOURCE_LAYERS, COLORS } from '../constants';

/**
 * Add Wilderness Areas source
 */
export function addWildernessSource(map: mapboxgl.Map) {
  if (map.getSource('wilderness')) return;
  
  map.addSource('wilderness', {
    type: 'vector',
    url: TILESETS.wilderness,
  });
}

/**
 * Add Wilderness Areas fill layer - deep green, semi-transparent
 */
export function addWildernessFill(map: mapboxgl.Map) {
  if (map.getLayer('wilderness-fill')) return;
  
  map.addLayer({
    id: 'wilderness-fill',
    type: 'fill',
    source: 'wilderness',
    'source-layer': SOURCE_LAYERS.wilderness,
    minzoom: 0,
    paint: {
      'fill-color': COLORS.wilderness,
      'fill-opacity': 0.3,
    },
  });
}

/**
 * Add Wilderness Areas outline layer
 */
export function addWildernessOutline(map: mapboxgl.Map) {
  if (map.getLayer('wilderness-outline')) return;
  
  map.addLayer({
    id: 'wilderness-outline',
    type: 'line',
    source: 'wilderness',
    'source-layer': SOURCE_LAYERS.wilderness,
    minzoom: 0,
    paint: {
      'line-color': COLORS.wilderness,
      'line-width': 1.5,
      'line-opacity': 0.7,
    },
  });
}

/**
 * Add all Wilderness layers
 */
export function addWildernessLayers(map: mapboxgl.Map) {
  addWildernessFill(map);
  addWildernessOutline(map);
}
