import mapboxgl from 'mapbox-gl';
import { TILESETS, SOURCE_LAYERS } from '../constants';

export function addWaterfallsSource(map: mapboxgl.Map) {
  if (map.getSource('waterfalls')) return;
  map.addSource('waterfalls', {
    type: 'vector',
    url: TILESETS.waterfalls,
  });
}

export function addWaterfallsBackdrop(map: mapboxgl.Map) {
  if (map.getLayer('waterfalls-backdrop')) return;
  map.addLayer({
    id: 'waterfalls-backdrop',
    type: 'symbol',
    source: 'waterfalls',
    'source-layer': SOURCE_LAYERS.waterfalls,
    layout: {
      'icon-image': 'poi-waterfall',
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

export function addWaterfallsSymbols(_map: mapboxgl.Map) {
  // Icons handled by backdrop symbol layer
}

export function addWaterfallsLayers(map: mapboxgl.Map) {
  addWaterfallsBackdrop(map);
}
