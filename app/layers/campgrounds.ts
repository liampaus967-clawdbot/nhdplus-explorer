import mapboxgl from 'mapbox-gl';
import { TILESETS, SOURCE_LAYERS, COLORS } from '../constants';

export function addCampgroundsSource(map: mapboxgl.Map) {
  map.addSource('campgrounds', {
    type: 'vector',
    url: TILESETS.campgrounds,
  });
}

export function addCampgroundsLayers(map: mapboxgl.Map) {
  // Circles at low zoom (below 6)
  map.addLayer({
    id: 'campgrounds-circles',
    type: 'circle',
    source: 'campgrounds',
    'source-layer': SOURCE_LAYERS.campgrounds,
    maxzoom: 6,
    paint: {
      'circle-radius': [
        'interpolate', ['linear'], ['zoom'],
        0, 1,
        4, 2,
        6, 2,
      ],
      'circle-color': COLORS.campground,
      'circle-stroke-width': .2,
      'circle-stroke-color': '#000000',
    },
  });

  // Campsite icon at zoom 6+
  map.addLayer({
    id: 'campgrounds-layer',
    type: 'symbol',
    source: 'campgrounds',
    'source-layer': SOURCE_LAYERS.campgrounds,
    minzoom: 6,
    layout: {
      'icon-image': 'campsite-sdf',  // Custom SDF icon - edit /public/icons/campsite.svg to customize
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
      'icon-color': COLORS.campground,
      'text-color': '#1f2937',
      'text-halo-color': '#ffffff',
      'text-halo-width': 1.5,
    },
  });
}
