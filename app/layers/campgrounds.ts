import mapboxgl from 'mapbox-gl';
import { TILESETS, SOURCE_LAYERS, COLORS } from '../constants';

export function addCampgroundsSource(map: mapboxgl.Map) {
  map.addSource('campgrounds', {
    type: 'vector',
    url: TILESETS.campgrounds,
  });
}

export function addCampgroundsBackdrop(map: mapboxgl.Map) {
  map.addLayer({
    id: 'campgrounds-backdrop',
    type: 'circle',
    source: 'campgrounds',
    'source-layer': SOURCE_LAYERS.campgrounds,
    paint: {
      'circle-radius': [
        'interpolate', ['linear'], ['zoom'],
        0, 1,
        6, 3,
        10, 6,
        14, 10,
      ],
      'circle-color': COLORS.campground,
      'circle-stroke-width': 0.5,
      'circle-stroke-color': '#000000',
    },
  });
}

// No symbols - just circles
export function addCampgroundsSymbols(_map: mapboxgl.Map) {
  // Removed - using circles only
}

export function addCampgroundsLayers(map: mapboxgl.Map) {
  addCampgroundsBackdrop(map);
}
