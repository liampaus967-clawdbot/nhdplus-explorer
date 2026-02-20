import mapboxgl from 'mapbox-gl';
import { TILESETS, SOURCE_LAYERS, COLORS } from '../constants';

/**
 * Add Lakes/Waterbodies source
 */
export function addLakesSource(map: mapboxgl.Map) {
  if (map.getSource('lakes')) return;
  
  map.addSource('lakes', {
    type: 'vector',
    url: TILESETS.lakes,
  });
}

/**
 * Add Lakes fill layer - blue, semi-transparent
 */
export function addLakesFill(map: mapboxgl.Map) {
  if (map.getLayer('lakes-fill')) return;
  
  map.addLayer({
    id: 'lakes-fill',
    type: 'fill',
    source: 'lakes',
    'source-layer': SOURCE_LAYERS.lakes,
    minzoom: 0,
    paint: {
      'fill-color': COLORS.lake,
      'fill-opacity': [
        'interpolate', ['linear'], ['zoom'],
        0, 0.6,
        8, 0.5,
        12, 0.4,
      ],
    },
  });
}

/**
 * Add Lakes outline layer
 */
export function addLakesOutline(map: mapboxgl.Map) {
  if (map.getLayer('lakes-outline')) return;
  
  map.addLayer({
    id: 'lakes-outline',
    type: 'line',
    source: 'lakes',
    'source-layer': SOURCE_LAYERS.lakes,
    minzoom: 0,
    paint: {
      'line-color': COLORS.lakeOutline,
      'line-width': [
        'interpolate', ['linear'], ['zoom'],
        0, 0.5,
        8, 1,
        12, 1.5,
      ],
      'line-opacity': 0.7,
    },
  });
}

/**
 * Add Lakes label layer
 */
export function addLakesLabels(map: mapboxgl.Map) {
  if (map.getLayer('lakes-labels')) return;
  
  map.addLayer({
    id: 'lakes-labels',
    type: 'symbol',
    source: 'lakes',
    'source-layer': SOURCE_LAYERS.lakes,
    minzoom: 8,
    filter: ['!=', ['get', 'name'], null],
    layout: {
      'text-field': ['get', 'name'],
      'text-font': ['DIN Pro Italic', 'Arial Unicode MS Regular'],
      'text-size': [
        'interpolate', ['linear'], ['zoom'],
        8, 10,
        12, 12,
        14, 14,
      ],
      'text-allow-overlap': false,
      'text-optional': true,
    },
    paint: {
      'text-color': COLORS.lakeLabel,
      'text-halo-color': 'rgba(255, 255, 255, 0.9)',
      'text-halo-width': 1.5,
    },
  });
}

/**
 * Add all Lakes layers
 */
export function addLakesLayers(map: mapboxgl.Map) {
  addLakesFill(map);
  addLakesOutline(map);
  addLakesLabels(map);
}
