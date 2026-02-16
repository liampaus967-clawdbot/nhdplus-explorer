import mapboxgl from 'mapbox-gl';
import { TILESETS, SOURCE_LAYERS, COLORS } from '../constants';

export function addWaterfallsSource(map: mapboxgl.Map) {
  if (map.getSource('waterfalls')) return;
  map.addSource('waterfalls', {
    type: 'vector',
    url: TILESETS.waterfalls,
  });
}

export function addWaterfallsBackdrop(map: mapboxgl.Map) {
  map.addLayer({
    id: 'waterfalls-backdrop',
    type: 'circle',
    source: 'waterfalls',
    'source-layer': SOURCE_LAYERS.waterfalls,
    paint: {
      'circle-radius': [
        'interpolate', ['linear'], ['zoom'],
        0, 1,
        6, 3,
        10, 6,
        14, 10,
      ],
      'circle-color': COLORS.waterfall,
      'circle-stroke-width': 0.5,
      'circle-stroke-color': '#000000',
    },
  });
}

// No symbols - just circles
export function addWaterfallsSymbols(_map: mapboxgl.Map) {
  // Removed - using circles only
}

export function addWaterfallsLayers(map: mapboxgl.Map) {
  addWaterfallsBackdrop(map);
}
