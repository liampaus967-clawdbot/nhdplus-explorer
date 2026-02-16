import mapboxgl from 'mapbox-gl';
import { TILESETS, SOURCE_LAYERS, COLORS } from '../constants';

export function addAccessPointsSource(map: mapboxgl.Map) {
  map.addSource('access-points', {
    type: 'vector',
    url: TILESETS.accessPoints,
  });
}

export function addAccessPointsLayers(map: mapboxgl.Map) {
  // Circles at low zoom (below 6)
  map.addLayer({
    id: 'access-points-circles-low',
    type: 'circle',
    source: 'access-points',
    'source-layer': SOURCE_LAYERS.accessPoints,
    maxzoom: 6,
    paint: {
      'circle-radius': [
        'interpolate', ['linear'], ['zoom'],
        0, 1,
        4, 2,
        6, 2,
      ],
      'circle-color': COLORS.accessPoint,
      'circle-stroke-width': .2,
      'circle-stroke-color': '#000000',
    },
  });

  // Circle backdrop at zoom 6+
  map.addLayer({
    id: 'access-points-backdrop',
    type: 'circle',
    source: 'access-points',
    'source-layer': SOURCE_LAYERS.accessPoints,
    minzoom: 6,
    paint: {
      'circle-radius': [
        'interpolate', ['linear'], ['zoom'],
        6, 8,
        10, 12,
        14, 18,
      ],
      'circle-color': COLORS.accessPoint,
      'circle-stroke-width': 2,
      'circle-stroke-color': 'black',
    },
  });

  // Pitch icon at zoom 6+
  map.addLayer({
    id: 'access-points-layer',
    type: 'symbol',
    source: 'access-points',
    'source-layer': SOURCE_LAYERS.accessPoints,
    minzoom: 6,
    layout: {
      'icon-image': 'pitch-sdf',  // Custom SDF icon - edit /public/icons/pitch.svg to customize
      'icon-size': [
        'interpolate', ['linear'], ['zoom'],
        6, 0.6,
        10, 1,
        14, 2.0,
      ],
      'icon-allow-overlap': true,
      'icon-ignore-placement': false,
      'text-field': ['step', ['zoom'], '', 10, ['get', 'name']],
      'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'],
      'text-size': 11,
      'text-offset': [0, 1.5],
      'text-anchor': 'top',
      'text-optional': true,
    },
    paint: {
      'icon-color': 'black',
      'text-color': '#1f2937',
      'text-halo-color': '#ffffff',
      'text-halo-width': 1.5,
    },
  });
}
