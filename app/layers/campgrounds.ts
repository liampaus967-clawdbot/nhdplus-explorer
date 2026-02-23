import mapboxgl from 'mapbox-gl';
import { TILESETS, SOURCE_LAYERS } from '../constants';

export function addCampgroundsSource(map: mapboxgl.Map) {
  if (map.getSource('campgrounds')) return;
  map.addSource('campgrounds', {
    type: 'vector',
    url: TILESETS.campgrounds,
    promoteId: 'id',
  });
}

export function addCampgroundsBackdrop(map: mapboxgl.Map) {
  if (map.getLayer('campgrounds-backdrop')) return;
  
  // Base layer (normal size)
  map.addLayer({
    id: 'campgrounds-backdrop',
    type: 'symbol',
    source: 'campgrounds',
    'source-layer': SOURCE_LAYERS.campgrounds,
    minzoom: 8,
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
      'icon-opacity': [
        'case',
        ['boolean', ['feature-state', 'highlighted'], false],
        0,  // Hide when highlighted (larger version shows instead)
        1
      ],
    },
  });
  
  // Highlighted layer (larger size)
  map.addLayer({
    id: 'campgrounds-highlight',
    type: 'symbol',
    source: 'campgrounds',
    'source-layer': SOURCE_LAYERS.campgrounds,
    minzoom: 8,
    layout: {
      'icon-image': 'poi-campground',
      'icon-size': [
        'interpolate', ['linear'], ['zoom'],
        6, 0.5,
        10, 1.0,
        14, 2.5,
        18, 3.5,
      ],
      'icon-allow-overlap': true,
      'icon-anchor': 'bottom',
    },
    paint: {
      'icon-opacity': [
        'case',
        ['boolean', ['feature-state', 'highlighted'], false],
        1,  // Show when highlighted
        0
      ],
    },
  });
}

export function addCampgroundsSymbols(_map: mapboxgl.Map) {
  // Icons handled by backdrop symbol layer
}

export function addCampgroundsLayers(map: mapboxgl.Map) {
  addCampgroundsBackdrop(map);
}
