import mapboxgl from 'mapbox-gl';
import { TILESETS, SOURCE_LAYERS } from '../constants';

export function addRapidsSource(map: mapboxgl.Map) {
  if (map.getSource('rapids')) return;
  map.addSource('rapids', {
    type: 'vector',
    url: TILESETS.rapids,
  });
}

export function addRapidsBackdrop(map: mapboxgl.Map) {
  if (map.getLayer('rapids-backdrop')) return;
  map.addLayer({
    id: 'rapids-backdrop',
    type: 'symbol',
    source: 'rapids',
    'source-layer': SOURCE_LAYERS.rapids,
    layout: {
      'icon-image': 'poi-rapid',
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

export function addRapidsSymbols(_map: mapboxgl.Map) {
  // Icons handled by backdrop symbol layer
}

export function addRapidsLayers(map: mapboxgl.Map) {
  addRapidsBackdrop(map);
}
