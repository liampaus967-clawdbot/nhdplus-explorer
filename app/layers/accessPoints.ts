import mapboxgl from 'mapbox-gl';
import { TILESETS, SOURCE_LAYERS } from '../constants';

export function addAccessPointsSource(map: mapboxgl.Map) {
  if (map.getSource('access-points')) return;
  map.addSource('access-points', {
    type: 'vector',
    url: TILESETS.accessPoints,
    promoteId: 'id',
  });
}

export function addAccessPointsBackdrop(map: mapboxgl.Map) {
  if (map.getLayer('access-points-backdrop')) return;
  
  // Base layer (normal size)
  map.addLayer({
    id: 'access-points-backdrop',
    type: 'symbol',
    source: 'access-points',
    'source-layer': SOURCE_LAYERS.accessPoints,
    minzoom: 8,
    layout: {
      'icon-image': 'poi-access-point',
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
      'icon-opacity': [
        'case',
        ['boolean', ['feature-state', 'highlighted'], false],
        0,  // Hide when highlighted (larger version shows instead)
        1
      ],
    },
  });
  
  // Highlighted layer (larger size)
  map.addLayer({
    id: 'access-points-highlight',
    type: 'symbol',
    source: 'access-points',
    'source-layer': SOURCE_LAYERS.accessPoints,
    minzoom: 8,
    layout: {
      'icon-image': 'poi-access-point',
      'icon-size': [
        'interpolate', ['linear'], ['zoom'],
        6, 0.5,
        10, 1.0,
        14, 2.5,
        18, 3.5,
      ],
      'icon-allow-overlap': true,
      'icon-anchor': 'bottom',
    },
    paint: {
      'icon-opacity': [
        'case',
        ['boolean', ['feature-state', 'highlighted'], false],
        1,  // Show when highlighted
        0
      ],
    },
  });
}

export function addAccessPointsSymbols(_map: mapboxgl.Map) {
  // Icons handled by backdrop symbol layer
}

export function addAccessPointsLayers(map: mapboxgl.Map) {
  addAccessPointsBackdrop(map);
}
