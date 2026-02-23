import mapboxgl from 'mapbox-gl';
import { TILESETS, SOURCE_LAYERS, COLORS } from '../constants';
import { addGaugeIcons } from './gaugeIcons';

/**
 * USGS Stream Gauges Layer
 *
 * Displays 11,144 USGS stream gauges across the US.
 * Uses custom square gradient icons matching Iteration 6 design.
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

  // Register custom gauge icons
  addGaugeIcons(map);

  map.addLayer({
    id: 'gauges-circles',
    type: 'symbol',
    source: 'gauges',
    'source-layer': SOURCE_LAYERS.gauges,
    minzoom: 6,
    layout: {
      'icon-image': 'gauge-default',
      'icon-size': [
        'interpolate', ['linear'], ['zoom'],
        6, 0.35,
        10, 0.55,
        14, 0.75,
      ],
      'icon-allow-overlap': true,
      'icon-ignore-placement': true,
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
 * Update gauge icons based on live flow status.
 * Only shows gauges that have FGP data.
 */
export function updateGaugeColors(
  map: mapboxgl.Map,
  flowData: Record<string, string>
) {
  if (!map.getLayer('gauges-circles')) return;

  const siteNos = Object.keys(flowData);

  // Filter to only show gauges with FGP data
  map.setFilter('gauges-circles', ['in', ['get', 'site_no'], ['literal', siteNos]]);
  if (map.getLayer('gauges-labels')) {
    map.setFilter('gauges-labels', ['in', ['get', 'site_no'], ['literal', siteNos]]);
  }

  // Build match expression for icons
  const iconMatch: (string | string[])[] = ['match', ['get', 'site_no']];

  for (const [siteNo, status] of Object.entries(flowData)) {
    iconMatch.push(siteNo);
    switch (status) {
      case 'very_low':
      case 'low':
        iconMatch.push('gauge-pctl-low');
        break;
      case 'normal':
        iconMatch.push('gauge-pctl-normal');
        break;
      case 'high':
      case 'very_high':
        iconMatch.push('gauge-pctl-high');
        break;
      default:
        iconMatch.push('gauge-default');
    }
  }

  // Default icon
  iconMatch.push('gauge-default');

  map.setLayoutProperty('gauges-circles', 'icon-image', iconMatch as mapboxgl.Expression);
}

/**
 * Update gauge icons based on trend (rising/falling/stable).
 * Only shows gauges that have known trend data (hides unknown).
 */
export function updateGaugeTrendColors(
  map: mapboxgl.Map,
  trendData: Record<string, string>
) {
  if (!map.getLayer('gauges-circles')) return;

  // Filter out unknown trends
  const knownTrends = Object.entries(trendData).filter(([, trend]) => trend !== 'unknown');
  const siteNos = knownTrends.map(([siteNo]) => siteNo);

  map.setFilter('gauges-circles', ['in', ['get', 'site_no'], ['literal', siteNos]]);
  if (map.getLayer('gauges-labels')) {
    map.setFilter('gauges-labels', ['in', ['get', 'site_no'], ['literal', siteNos]]);
  }

  const iconMatch: (string | string[])[] = ['match', ['get', 'site_no']];

  for (const [siteNo, trend] of knownTrends) {
    iconMatch.push(siteNo);
    switch (trend) {
      case 'rising':
        iconMatch.push('gauge-trend-rising');
        break;
      case 'falling':
        iconMatch.push('gauge-trend-falling');
        break;
      case 'stable':
        iconMatch.push('gauge-trend-stable');
        break;
      default:
        iconMatch.push('gauge-default');
    }
  }

  iconMatch.push('gauge-default');
  map.setLayoutProperty('gauges-circles', 'icon-image', iconMatch as mapboxgl.Expression);
}

/**
 * Update gauge icons based on water temperature.
 * Only shows gauges that have temperature data.
 */
export function updateGaugeTemperatureColors(
  map: mapboxgl.Map,
  tempData: Record<string, number>
) {
  if (!map.getLayer('gauges-circles')) return;

  const siteNos = Object.keys(tempData);

  map.setFilter('gauges-circles', ['in', ['get', 'site_no'], ['literal', siteNos]]);
  if (map.getLayer('gauges-labels')) {
    map.setFilter('gauges-labels', ['in', ['get', 'site_no'], ['literal', siteNos]]);
  }

  const iconMatch: (string | number | string[])[] = ['match', ['get', 'site_no']];

  for (const [siteNo, tempF] of Object.entries(tempData)) {
    iconMatch.push(siteNo);
    if (tempF < 55) {
      iconMatch.push('gauge-temp-cold');
    } else if (tempF < 65) {
      iconMatch.push('gauge-temp-moderate');
    } else {
      iconMatch.push('gauge-temp-hot');
    }
  }

  iconMatch.push('gauge-default');
  map.setLayoutProperty('gauges-circles', 'icon-image', iconMatch as mapboxgl.Expression);
}

/**
 * Update gauge icons based on temperature trend (warming/cooling).
 * Only shows gauges that have known temperature trend data.
 */
export function updateGaugeTempTrendColors(
  map: mapboxgl.Map,
  tempTrendData: Record<string, string>
) {
  if (!map.getLayer('gauges-circles')) return;

  const knownTrends = Object.entries(tempTrendData).filter(([, trend]) => trend !== 'unknown');
  const siteNos = knownTrends.map(([siteNo]) => siteNo);

  map.setFilter('gauges-circles', ['in', ['get', 'site_no'], ['literal', siteNos]]);
  if (map.getLayer('gauges-labels')) {
    map.setFilter('gauges-labels', ['in', ['get', 'site_no'], ['literal', siteNos]]);
  }

  const iconMatch: (string | string[])[] = ['match', ['get', 'site_no']];

  for (const [siteNo, trend] of knownTrends) {
    iconMatch.push(siteNo);
    switch (trend) {
      case 'rising':
        iconMatch.push('gauge-ttrend-warming');
        break;
      case 'falling':
        iconMatch.push('gauge-ttrend-cooling');
        break;
      case 'stable':
        iconMatch.push('gauge-ttrend-stable');
        break;
      default:
        iconMatch.push('gauge-default');
    }
  }

  iconMatch.push('gauge-default');
  map.setLayoutProperty('gauges-circles', 'icon-image', iconMatch as mapboxgl.Expression);
}

/**
 * Reset gauge icons to default (amber).
 */
export function resetGaugeColors(map: mapboxgl.Map) {
  if (!map.getLayer('gauges-circles')) return;
  map.setLayoutProperty('gauges-circles', 'icon-image', 'gauge-default');
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
