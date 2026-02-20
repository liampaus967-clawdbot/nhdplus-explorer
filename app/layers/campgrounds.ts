import mapboxgl from 'mapbox-gl';
import { TILESETS, SOURCE_LAYERS } from '../constants';

export function addCampgroundsSource(map: mapboxgl.Map) {
  if (map.getSource('campgrounds')) return;
  map.addSource('campgrounds', {
    type: 'vector',
    url: TILESETS.campgrounds,
  });
}

export function addCampgroundsBackdrop(map: mapboxgl.Map) {
  if (map.getLayer('campgrounds-backdrop')) return;
  map.addLayer({
    id: 'campgrounds-backdrop',
    type: 'symbol',
    source: 'campgrounds',
    'source-layer': SOURCE_LAYERS.campgrounds,
    layout: {
      'icon-image': 'poi-campground',
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

export function addCampgroundsSymbols(_map: mapboxgl.Map) {
  // Icons handled by backdrop symbol layer
}

export function addCampgroundsLayers(map: mapboxgl.Map) {
  addCampgroundsBackdrop(map);
}
