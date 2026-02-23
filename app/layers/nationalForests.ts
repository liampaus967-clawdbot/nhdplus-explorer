import mapboxgl from 'mapbox-gl';
import { TILESETS, SOURCE_LAYERS, COLORS } from '../constants';

/**
 * Add National Forests source
 */
export function addNationalForestsSource(map: mapboxgl.Map) {
  if (map.getSource('national-forests')) return;
  
  map.addSource('national-forests', {
    type: 'vector',
    url: TILESETS.nationalForests,
  });
}

/**
 * Add National Forests fill layer - forest green, semi-transparent
 */
export function addNationalForestsFill(map: mapboxgl.Map) {
  if (map.getLayer('national-forests-fill')) return;
  
  map.addLayer({
    id: 'national-forests-fill',
    type: 'fill',
    source: 'national-forests',
    'source-layer': SOURCE_LAYERS.nationalForests,
    minzoom: 0,
    paint: {
      'fill-color': COLORS.nationalForests,
      'fill-opacity': 0.25,
    },
  });
}

/**
 * Add National Forests outline layer
 */
export function addNationalForestsOutline(map: mapboxgl.Map) {
  if (map.getLayer('national-forests-outline')) return;
  
  map.addLayer({
    id: 'national-forests-outline',
    type: 'line',
    source: 'national-forests',
    'source-layer': SOURCE_LAYERS.nationalForests,
    minzoom: 0,
    paint: {
      'line-color': COLORS.nationalForests,
      'line-width': 1.5,
      'line-opacity': 0.6,
    },
  });
}

/**
 * Add all National Forests layers
 */
export function addNationalForestsLayers(map: mapboxgl.Map) {
  addNationalForestsFill(map);
  addNationalForestsOutline(map);
}
