import mapboxgl from 'mapbox-gl';

// BWCA Tileset IDs
export const BWCA_EDGES_TILESET = 'mapbox://lman967.bwca-edges';
export const BWCA_NODES_TILESET = 'mapbox://lman967.bwca-nodes';

// Layer IDs
export const BWCA_EDGES_LAYER = 'bwca-edges';
export const BWCA_NODES_LAYER = 'bwca-nodes';
export const BWCA_ROUTE_LAYER = 'bwca-route';

// Source layer names (from tileset recipe)
export const BWCA_EDGES_SOURCE_LAYER = 'bwca_edges';
export const BWCA_NODES_SOURCE_LAYER = 'bwca_nodes';

/**
 * Add BWCA trail network layers to the map
 */
export function addBwcaLayers(map: mapboxgl.Map) {
  // Add edges source
  if (!map.getSource(BWCA_EDGES_LAYER)) {
    map.addSource(BWCA_EDGES_LAYER, {
      type: 'vector',
      url: BWCA_EDGES_TILESET,
    });
  }

  // Add nodes source
  if (!map.getSource(BWCA_NODES_LAYER)) {
    map.addSource(BWCA_NODES_LAYER, {
      type: 'vector',
      url: BWCA_NODES_TILESET,
    });
  }

  // Add route source (for calculated routes)
  if (!map.getSource(BWCA_ROUTE_LAYER)) {
    map.addSource(BWCA_ROUTE_LAYER, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    });
  }

  // Add edges layer - paddle trails
  if (!map.getLayer(`${BWCA_EDGES_LAYER}-line`)) {
    map.addLayer({
      id: `${BWCA_EDGES_LAYER}-line`,
      type: 'line',
      source: BWCA_EDGES_LAYER,
      'source-layer': BWCA_EDGES_SOURCE_LAYER,
      layout: {
        visibility: 'none',
        'line-join': 'round',
        'line-cap': 'round',
      },
      paint: {
        'line-color': '#3b82f6',
        'line-width': [
          'interpolate', ['linear'], ['zoom'],
          5, 1,
          10, 2,
          15, 4,
        ],
        'line-opacity': 0.7,
      },
    });
  }

  // Add calculated route layer
  if (!map.getLayer(BWCA_ROUTE_LAYER)) {
    map.addLayer({
      id: BWCA_ROUTE_LAYER,
      type: 'line',
      source: BWCA_ROUTE_LAYER,
      layout: {
        visibility: 'visible',
        'line-join': 'round',
        'line-cap': 'round',
      },
      paint: {
        'line-color': [
          'case',
          ['==', ['get', 'is_portage'], true], '#f97316',
          '#22c55e',
        ],
        'line-width': 4,
        'line-opacity': 0.9,
      },
    });
  }

  // Add route outline for visibility
  if (!map.getLayer(`${BWCA_ROUTE_LAYER}-outline`)) {
    map.addLayer(
      {
        id: `${BWCA_ROUTE_LAYER}-outline`,
        type: 'line',
        source: BWCA_ROUTE_LAYER,
        layout: {
          visibility: 'visible',
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#000000',
          'line-width': 6,
          'line-opacity': 0.3,
        },
      },
      BWCA_ROUTE_LAYER // Place below the main route layer
    );
  }
}

/**
 * Show/hide BWCA layers
 */
export function setBwcaLayersVisibility(map: mapboxgl.Map, visible: boolean) {
  const visibility = visible ? 'visible' : 'none';
  
  if (map.getLayer(`${BWCA_EDGES_LAYER}-line`)) {
    map.setLayoutProperty(`${BWCA_EDGES_LAYER}-line`, 'visibility', visibility);
  }
}

/**
 * Update the BWCA route layer with calculated route
 */
export function updateBwcaRoute(map: mapboxgl.Map, routeGeojson: GeoJSON.FeatureCollection | null) {
  const source = map.getSource(BWCA_ROUTE_LAYER) as mapboxgl.GeoJSONSource;
  if (source) {
    source.setData(routeGeojson || { type: 'FeatureCollection', features: [] });
  }
}
