import mapboxgl from 'mapbox-gl';
import { TILESETS, SOURCE_LAYERS, COLORS } from '../constants';

/**
 * Add BLM Lands source
 */
export function addBlmLandsSource(map: mapboxgl.Map) {
  if (map.getSource('blm-lands')) return;
  
  map.addSource('blm-lands', {
    type: 'vector',
    url: TILESETS.blmLands,
  });
}

/**
 * Add BLM Lands fill layer - semi-transparent tan/yellow
 */
export function addBlmLandsFill(map: mapboxgl.Map) {
  if (map.getLayer('blm-lands-fill')) return;
  
  map.addLayer({
    id: 'blm-lands-fill',
    type: 'fill',
    source: 'blm-lands',
    'source-layer': SOURCE_LAYERS.blmLands,
    paint: {
      'fill-color': COLORS.blmLands,
      'fill-opacity': 0.25,
    },
  });
}

/**
 * Add BLM Lands outline layer
 */
export function addBlmLandsOutline(map: mapboxgl.Map) {
  if (map.getLayer('blm-lands-outline')) return;
  
  map.addLayer({
    id: 'blm-lands-outline',
    type: 'line',
    source: 'blm-lands',
    'source-layer': SOURCE_LAYERS.blmLands,
    paint: {
      'line-color': COLORS.blmLands,
      'line-width': 1,
      'line-opacity': 0.6,
    },
  });
}

/**
 * Add all BLM lands layers
 */
export function addBlmLandsLayers(map: mapboxgl.Map) {
  addBlmLandsFill(map);
  addBlmLandsOutline(map);
}
