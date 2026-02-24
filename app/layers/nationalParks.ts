import mapboxgl from 'mapbox-gl';
import { TILESETS, SOURCE_LAYERS, COLORS } from '../constants';

/**
 * Add National Parks source
 */
export function addNationalParksSource(map: mapboxgl.Map) {
  if (map.getSource('national-parks')) return;
  
  map.addSource('national-parks', {
    type: 'vector',
    url: TILESETS.nationalParks,
  });
}

/**
 * Add National Parks fill layer - brown, semi-transparent
 */
export function addNationalParksFill(map: mapboxgl.Map) {
  if (map.getLayer('national-parks-fill')) return;
  
  map.addLayer({
    id: 'national-parks-fill',
    type: 'fill',
    source: 'national-parks',
    'source-layer': SOURCE_LAYERS.nationalParks,
    minzoom: 0,
    paint: {
      'fill-color': COLORS.nationalParks,
      'fill-opacity': 0.25,
    },
  });
}

/**
 * Add National Parks outline layer
 */
export function addNationalParksOutline(map: mapboxgl.Map) {
  if (map.getLayer('national-parks-outline')) return;
  
  map.addLayer({
    id: 'national-parks-outline',
    type: 'line',
    source: 'national-parks',
    'source-layer': SOURCE_LAYERS.nationalParks,
    minzoom: 0,
    paint: {
      'line-color': COLORS.nationalParks,
      'line-width': 1.5,
      'line-opacity': 0.6,
    },
  });
}

/**
 * Add all National Parks layers
 */
export function addNationalParksLayers(map: mapboxgl.Map) {
  addNationalParksFill(map);
  addNationalParksOutline(map);
}
