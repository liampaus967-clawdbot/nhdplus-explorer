import mapboxgl from 'mapbox-gl';
import { TILESETS, SOURCE_LAYERS } from '../constants';

export function addDamsSource(map: mapboxgl.Map) {
  if (map.getSource('dams')) return;
  map.addSource('dams', {
    type: 'vector',
    url: TILESETS.dams,
  });
}

export function addDamsBackdrop(map: mapboxgl.Map) {
  if (map.getLayer('dams-backdrop')) return;
  map.addLayer({
    id: 'dams-backdrop',
    type: 'symbol',
    source: 'dams',
    'source-layer': SOURCE_LAYERS.dams,
    minzoom: 8,
    layout: {
      // Color icon based on hazard_potential: Low (green), Significant (orange), High (red)
      'icon-image': [
        'match',
        ['downcase', ['coalesce', ['get', 'hazard_potential'], '']],
        'low', 'poi-dam-low',
        'significant', 'poi-dam-significant',
        'high', 'poi-dam-high',
        'poi-dam', // default (undetermined)
      ],
      'icon-size': [
        'interpolate', ['linear'], ['zoom'],
        6, 0.3,
        10, 0.6,
        14, 1.5,
        18, 2,
      ],
      'icon-allow-overlap': false,
      'icon-anchor': 'bottom',
    },
    paint: {
      'icon-opacity': 1,
    },
  });
}

export function addDamsSymbols(_map: mapboxgl.Map) {
  // Icons handled by backdrop symbol layer
}

export function addDamsLayers(map: mapboxgl.Map) {
  addDamsBackdrop(map);
}
