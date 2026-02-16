import mapboxgl from 'mapbox-gl';
import { TILESETS, SOURCE_LAYERS, COLORS } from '../constants';

export function addWaterfallsSource(map: mapboxgl.Map) {
  map.addSource('waterfalls', {
    type: 'vector',
    url: TILESETS.waterfalls,
  });
}

export function addWaterfallsLayers(map: mapboxgl.Map) {
  // Light blue circles at low zoom
  map.addLayer({
    id: 'waterfalls-circles',
    type: 'circle',
    source: 'waterfalls',
    'source-layer': SOURCE_LAYERS.waterfalls,
    maxzoom: 6,
    paint: {
      'circle-radius': [
        'interpolate', ['linear'], ['zoom'],
        0, 1,
        4, 2,
        6, 2,
      ],
      'circle-color': COLORS.waterfall,
      'circle-stroke-width': .2,
      'circle-stroke-color': '#000000',
    },
  });

  // Circle backdrop at zoom 6+
  map.addLayer({
    id: 'waterfalls-backdrop',
    type: 'circle',
    source: 'waterfalls',
    'source-layer': SOURCE_LAYERS.waterfalls,
    minzoom: 6,
    paint: {
      'circle-radius': [
        'interpolate', ['linear'], ['zoom'],
        6, 8,
        10, 12,
        14, 18,
      ],
      'circle-color': '#ffffff',
      'circle-stroke-width': 2,
      'circle-stroke-color': COLORS.waterfall,
    },
  });

  // Waterfall icon at zoom 6+
  map.addLayer({
    id: 'waterfalls-layer',
    type: 'symbol',
    source: 'waterfalls',
    'source-layer': SOURCE_LAYERS.waterfalls,
    minzoom: 6,
    layout: {
      'icon-image': 'waterfall-sdf',  // Custom SDF icon - edit /public/icons/waterfall.svg to customize
      'icon-size': [
        'interpolate', ['linear'], ['zoom'],
        6, 0.8,
        10, 1.0,
        14, 1.2,
      ],
      'icon-allow-overlap': false,
      'icon-ignore-placement': false,
      'text-field': ['step', ['zoom'], '', 10, ['get', 'name']],
      'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'],
      'text-size': 11,
      'text-offset': [0, 1.2],
      'text-anchor': 'top',
      'text-optional': true,
    },
    paint: {
      'icon-color': COLORS.waterfall,
      'text-color': '#1f2937',
      'text-halo-color': '#ffffff',
      'text-halo-width': 1.5,
    },
  });
}
