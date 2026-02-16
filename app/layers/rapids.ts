import mapboxgl from 'mapbox-gl';
import { TILESETS, SOURCE_LAYERS, COLORS } from '../constants';

export function addRapidsSource(map: mapboxgl.Map) {
  map.addSource('rapids', {
    type: 'vector',
    url: TILESETS.rapids,
  });
}

export function addRapidsBackdrop(map: mapboxgl.Map) {
  map.addLayer({
    id: 'rapids-backdrop',
    type: 'circle',
    source: 'rapids',
    'source-layer': SOURCE_LAYERS.rapids,
    paint: {
      'circle-radius': [
        'interpolate', ['linear'], ['zoom'],
        0, 1,
        6, 3,
        10, 6,
        14, 10,
      ],
      'circle-color': COLORS.rapid,
      'circle-stroke-width': [
        'interpolate', ['linear'], ['zoom'],
        0, 0.2,
        10, 1,
      ],
      'circle-stroke-color': '#ffffff',
    },
  });
}

// No symbols - just circles
export function addRapidsSymbols(_map: mapboxgl.Map) {
  // Removed - using circles only
}

export function addRapidsLayers(map: mapboxgl.Map) {
  addRapidsBackdrop(map);
}
