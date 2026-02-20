import mapboxgl from 'mapbox-gl';
import { TILESETS, SOURCE_LAYERS } from '../constants';

export function addAccessPointsSource(map: mapboxgl.Map) {
  if (map.getSource('access-points')) return;
  map.addSource('access-points', {
    type: 'vector',
    url: TILESETS.accessPoints,
  });
}

export function addAccessPointsBackdrop(map: mapboxgl.Map) {
  if (map.getLayer('access-points-backdrop')) return;
  map.addLayer({
    id: 'access-points-backdrop',
    type: 'symbol',
    source: 'access-points',
    'source-layer': SOURCE_LAYERS.accessPoints,
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
      'icon-opacity': 1,
    },
  });
}

export function addAccessPointsSymbols(_map: mapboxgl.Map) {
  // Icons handled by backdrop symbol layer
}

export function addAccessPointsLayers(map: mapboxgl.Map) {
  addAccessPointsBackdrop(map);
}
