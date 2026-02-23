import mapboxgl from 'mapbox-gl';
import { TILESETS, SOURCE_LAYERS, COLORS } from '../constants';

export function addRapidsSource(map: mapboxgl.Map) {
  if (map.getSource('rapids')) return;
  map.addSource('rapids', {
    type: 'vector',
    url: TILESETS.rapids,
  });
}

export function addRapidsCircles(map: mapboxgl.Map) {
  if (map.getLayer('rapids-circles')) return;
  map.addLayer({
    id: 'rapids-circles',
    type: 'circle',
    source: 'rapids',
    'source-layer': SOURCE_LAYERS.rapids,
    minzoom: 7,
    paint: {
      'circle-radius': [
        'interpolate', ['linear'], ['zoom'],
        7, 3,
        10, 4,
        14, 6,
      ],
      'circle-color': COLORS.rapid,
      'circle-stroke-color': '#ffffff',
      'circle-stroke-width': 1,
      'circle-opacity': 0.9,
    },
  });
}

export function addRapidsLayers(map: mapboxgl.Map) {
  addRapidsCircles(map);
}
