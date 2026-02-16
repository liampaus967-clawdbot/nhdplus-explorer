import mapboxgl from 'mapbox-gl';
import { COLORS } from '../constants';

export function addRouteSource(map: mapboxgl.Map) {
  map.addSource('route', {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] },
  });

  map.addSource('profile-highlight', {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] },
  });
}

export function addRouteLayers(map: mapboxgl.Map) {
  // Route glow
  map.addLayer({
    id: 'route-glow',
    type: 'line',
    source: 'route',
    paint: {
      'line-color': COLORS.routeGlow,
      'line-width': 14,
      'line-opacity': 0.3,
    },
    layout: {
      'line-cap': 'round',
      'line-join': 'round',
    },
  });

  // Route line
  map.addLayer({
    id: 'route-line',
    type: 'line',
    source: 'route',
    paint: {
      'line-color': COLORS.route,
      'line-width': 5,
      'line-opacity': 0.95,
    },
    layout: {
      'line-cap': 'round',
      'line-join': 'round',
    },
  });

  // Profile highlight start point
  map.addLayer({
    id: 'profile-highlight-start',
    type: 'circle',
    source: 'profile-highlight',
    filter: ['==', ['get', 'type'], 'start'],
    paint: {
      'circle-radius': 10,
      'circle-color': COLORS.putIn,
      'circle-stroke-width': 3,
      'circle-stroke-color': '#ffffff',
    },
  });

  // Profile highlight end point
  map.addLayer({
    id: 'profile-highlight-end',
    type: 'circle',
    source: 'profile-highlight',
    filter: ['==', ['get', 'type'], 'end'],
    paint: {
      'circle-radius': 10,
      'circle-color': COLORS.takeOut,
      'circle-stroke-width': 3,
      'circle-stroke-color': '#ffffff',
    },
  });

  // Profile highlight line
  map.addLayer(
    {
      id: 'profile-highlight-line',
      type: 'line',
      source: 'profile-highlight',
      filter: ['==', ['get', 'type'], 'line'],
      paint: {
        'line-color': '#ffffff',
        'line-width': 4,
        'line-dasharray': [2, 2],
      },
    },
    'route-line'
  );
}

export function updateRouteData(map: mapboxgl.Map, geojson: GeoJSON.FeatureCollection) {
  const source = map.getSource('route') as mapboxgl.GeoJSONSource;
  if (source) {
    source.setData(geojson);
  }
}

export function clearRouteData(map: mapboxgl.Map) {
  updateRouteData(map, { type: 'FeatureCollection', features: [] });
}

export function updateProfileHighlight(map: mapboxgl.Map, geojson: GeoJSON.FeatureCollection) {
  const source = map.getSource('profile-highlight') as mapboxgl.GeoJSONSource;
  if (source) {
    source.setData(geojson);
  }
}
