import mapboxgl from 'mapbox-gl';
import { TILESETS, SOURCE_LAYERS, COLORS } from '../constants';

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
    type: 'circle',
    source: 'access-points',
    'source-layer': SOURCE_LAYERS.accessPoints,
    paint: {
      'circle-radius': [
        'interpolate', ['linear'], ['zoom'],
        0, 1,
        6, 3,
        10, 6,
        14, 10,
        18, 16,
        22, 24,
      ],
      'circle-color': COLORS.accessPoint,
      'circle-stroke-width': 0.5,
      'circle-stroke-color': '#000000',
    },
  });
}

// No symbols - just circles
export function addAccessPointsSymbols(_map: mapboxgl.Map) {
  // Removed - using circles only
}

export function addAccessPointsLayers(map: mapboxgl.Map) {
  addAccessPointsBackdrop(map);
}
