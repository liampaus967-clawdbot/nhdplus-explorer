import mapboxgl from 'mapbox-gl';
import { TILESETS, SOURCE_LAYERS, COLORS } from '../constants';

/**
 * USGS Stream Gauges Layer
 * 
 * Displays 11,144 USGS stream gauges across the US.
 * Colored by flow status when live data is available.
 */

export function addGaugesSource(map: mapboxgl.Map) {
  if (map.getSource('gauges')) return;
  map.addSource('gauges', {
    type: 'vector',
    url: TILESETS.gauges,
  });
}

export function addGaugesCircles(map: mapboxgl.Map) {
  if (map.getLayer('gauges-circles')) return;
  
  map.addLayer({
    id: 'gauges-circles',
    type: 'circle',
    source: 'gauges',
    'source-layer': SOURCE_LAYERS.gauges,
    minzoom: 6,
    paint: {
      'circle-radius': [
        'interpolate', ['linear'], ['zoom'],
        6, 4,
        10, 6,
        14, 9,
      ],
      'circle-color': COLORS.gauge,
      'circle-stroke-color': '#1e3a5f', // Dark navy stroke for visibility
      'circle-stroke-width': [
        'interpolate', ['linear'], ['zoom'],
        6, 1.5,
        10, 2,
        14, 2.5,
      ],
      'circle-opacity': 1,
    },
  });
}

export function addGaugesLabels(map: mapboxgl.Map) {
  if (map.getLayer('gauges-labels')) return;
  
  map.addLayer({
    id: 'gauges-labels',
    type: 'symbol',
    source: 'gauges',
    'source-layer': SOURCE_LAYERS.gauges,
    minzoom: 10,
    layout: {
      'text-field': ['get', 'site_name'],
      'text-size': [
        'interpolate', ['linear'], ['zoom'],
        10, 9,
        14, 12,
      ],
      'text-offset': [0, 1.2],
      'text-anchor': 'top',
      'text-max-width': 10,
      'text-optional': true,
    },
    paint: {
      'text-color': '#1e3a5f',
      'text-halo-color': '#ffffff',
      'text-halo-width': 1.5,
    },
  });
}

export function addGaugesLayers(map: mapboxgl.Map) {
  addGaugesSource(map);
  addGaugesCircles(map);
  addGaugesLabels(map);
}

/**
 * Update gauge colors based on live flow status.
 * 
 * @param map - Mapbox map instance
 * @param flowData - Map of site_no to flow status ('very_low', 'low', 'normal', 'high', 'very_high')
 */
export function updateGaugeColors(
  map: mapboxgl.Map, 
  flowData: Record<string, string>
) {
  if (!map.getLayer('gauges-circles')) return;
  
  // Build match expression for colors
  const colorMatch: (string | string[])[] = ['match', ['get', 'site_no']];
  
  for (const [siteNo, status] of Object.entries(flowData)) {
    colorMatch.push(siteNo);
    switch (status) {
      case 'very_low':
        colorMatch.push(COLORS.gaugeVeryLow);
        break;
      case 'low':
        colorMatch.push(COLORS.gaugeLow);
        break;
      case 'normal':
        colorMatch.push(COLORS.gaugeNormal);
        break;
      case 'high':
        colorMatch.push(COLORS.gaugeHigh);
        break;
      case 'very_high':
        colorMatch.push(COLORS.gaugeVeryHigh);
        break;
      default:
        colorMatch.push(COLORS.gauge);
    }
  }
  
  // Default color for gauges without status
  colorMatch.push(COLORS.gauge);
  
  map.setPaintProperty('gauges-circles', 'circle-color', colorMatch as mapboxgl.Expression);
}

/**
 * Get gauge at a point (for click handling)
 */
export function getGaugeAtPoint(
  map: mapboxgl.Map, 
  point: mapboxgl.Point
): mapboxgl.MapboxGeoJSONFeature | null {
  const features = map.queryRenderedFeatures(point, {
    layers: ['gauges-circles'],
  });
  return features.length > 0 ? features[0] : null;
}
