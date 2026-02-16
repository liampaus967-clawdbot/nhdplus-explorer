import mapboxgl from 'mapbox-gl';
import { TILESETS, SOURCE_LAYERS, COLORS } from '../constants';

export function addRapidsSource(map: mapboxgl.Map) {
  map.addSource('rapids', {
    type: 'vector',
    url: TILESETS.rapids,
  });
}

export function addRapidsBackdrop(map: mapboxgl.Map) {
  // Red circles at low zoom
  map.addLayer({
    id: 'rapids-circles',
    type: 'circle',
    source: 'rapids',
    'source-layer': SOURCE_LAYERS.rapids,
    maxzoom: 6,
    paint: {
      'circle-radius': [
        'interpolate', ['linear'], ['zoom'],
        0, 1,
        4, 2,
        6, 2,
      ],
      'circle-color': COLORS.rapid,
      'circle-stroke-width': .2,
      'circle-stroke-color': '#000000',
    },
  });

  // Circle backdrop at zoom 6+
  map.addLayer({
    id: 'rapids-backdrop',
    type: 'circle',
    source: 'rapids',
    'source-layer': SOURCE_LAYERS.rapids,
    minzoom: 6,
    paint: {
      'circle-radius': [
        'interpolate', ['linear'], ['zoom'],
        6, 6,
        10, 10,
        14, 24,
      ],
      'circle-color': COLORS.rapid,
      'circle-stroke-width': .5,
      'circle-stroke-color': 'black',
    },
  });
}

export function addRapidsSymbols(map: mapboxgl.Map) {
  // Danger icon at zoom 6+
  map.addLayer({
    id: 'rapids-symbols',
    type: 'symbol',
    source: 'rapids',
    'source-layer': SOURCE_LAYERS.rapids,
    minzoom: 6,
    layout: {
      'icon-image': 'danger-sdf',  // Custom SDF icon - edit /public/icons/danger.svg to customize
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
      'icon-color': 'black',
      'text-color': '#1f2937',
      'text-halo-color': '#ffffff',
      'text-halo-width': 1.5,
    },
  });
}

// Legacy function for backwards compatibility
export function addRapidsLayers(map: mapboxgl.Map) {
  addRapidsBackdrop(map);
  addRapidsSymbols(map);
}
