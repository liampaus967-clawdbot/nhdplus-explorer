import mapboxgl from 'mapbox-gl';
import { TILESETS, SOURCE_LAYERS, COLORS } from '../constants';

// All river regions with their source and layer names
const RIVER_REGIONS = [
  { id: 'rivers', tileset: TILESETS.rivers, sourceLayer: SOURCE_LAYERS.rivers },
  { id: 'rivers-southeast', tileset: TILESETS.riversSoutheast, sourceLayer: SOURCE_LAYERS.riversSoutheast },
  { id: 'rivers-midwest', tileset: TILESETS.riversMidwest, sourceLayer: SOURCE_LAYERS.riversMidwest },
  { id: 'rivers-plains', tileset: TILESETS.riversPlains, sourceLayer: SOURCE_LAYERS.riversPlains },
  { id: 'rivers-west', tileset: TILESETS.riversWest, sourceLayer: SOURCE_LAYERS.riversWest },
];

export function addRiversSource(map: mapboxgl.Map) {
  // Add all river region sources
  for (const region of RIVER_REGIONS) {
    if (map.getSource(region.id)) continue;
    map.addSource(region.id, {
      type: 'vector',
      url: region.tileset,
    });
  }
}

export function addRiversLayers(map: mapboxgl.Map, basemap: string) {
  if (map.getLayer('rivers-line')) return;

  // Shared paint config for river lines
  const linePaint: mapboxgl.LinePaint = {
    'line-color': COLORS.river,
    'line-width': [
      'interpolate', ['linear'], ['get', 'stream_order'],
      1, 1,
      2, 1.5,
      3, 2,
      4, 3,
      5, 4,
      6, 6,
      7, 8,
    ],
    'line-opacity': ['interpolate', ['linear'], ['zoom'],
      6, 0,
      7, 0.7,
      10, 0.7,
      14, 0.7,
    ],
  };

  // Add line layers for all regions
  for (const region of RIVER_REGIONS) {
    const layerId = region.id === 'rivers' ? 'rivers-line' : `${region.id}-line`;
    if (map.getLayer(layerId)) continue;
    
    map.addLayer({
      id: layerId,
      type: 'line',
      source: region.id,
      'source-layer': region.sourceLayer,
      layout: {
        'line-cap': 'round',
        'line-join': 'round',
      },
      paint: linePaint,
    });
  }

  // Create and add flow arrow icon (only once)
  if (!map.hasImage('flow-arrow')) {
    const arrowSize = 24;
    const arrowCanvas = document.createElement('canvas');
    arrowCanvas.width = arrowSize;
    arrowCanvas.height = arrowSize;
    const ctx = arrowCanvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(arrowSize * 0.15, arrowSize * 0.25);
    ctx.lineTo(arrowSize * 0.85, arrowSize * 0.5);
    ctx.lineTo(arrowSize * 0.15, arrowSize * 0.75);
    ctx.closePath();
    ctx.fill();

    const imageData = ctx.getImageData(0, 0, arrowSize, arrowSize);
    map.addImage('flow-arrow', imageData, { sdf: true });
  }

  const arrowColor = basemap === 'outdoors' ? COLORS.riverLabel : '#ffffff';

  // Shared layout config for arrows
  const arrowLayout: mapboxgl.SymbolLayout = {
    'symbol-placement': 'line',
    'symbol-spacing': 150,
    'icon-image': 'flow-arrow',
    'icon-size': [
      'interpolate', ['linear'], ['get', 'stream_order'],
      1, 0.4,
      3, 0.6,
      5, 0.8,
      7, 1.0,
    ],
    'icon-rotation-alignment': 'map',
    'icon-allow-overlap': false,
    'icon-ignore-placement': false,
  };

  // Add arrow layers for all regions
  for (const region of RIVER_REGIONS) {
    const layerId = region.id === 'rivers' ? 'rivers-arrows' : `${region.id}-arrows`;
    if (map.getLayer(layerId)) continue;
    
    map.addLayer({
      id: layerId,
      type: 'symbol',
      source: region.id,
      'source-layer': region.sourceLayer,
      minzoom: 10,
      layout: arrowLayout,
      paint: {
        'icon-opacity': 0.8,
        'icon-color': arrowColor,
      },
    });
  }

  // Shared layout config for labels
  const labelLayout: mapboxgl.SymbolLayout = {
    'symbol-placement': 'line-center',
    'text-field': ['get', 'gnis_name'],
    'text-font': ['DIN Pro Italic', 'Arial Unicode MS Regular'],
    'text-size': 11,
    'text-allow-overlap': false,
    'text-optional': true,
  };

  // Add label layers for all regions
  for (const region of RIVER_REGIONS) {
    const layerId = region.id === 'rivers' ? 'rivers-labels' : `${region.id}-labels`;
    if (map.getLayer(layerId)) continue;
    
    map.addLayer({
      id: layerId,
      type: 'symbol',
      source: region.id,
      'source-layer': region.sourceLayer,
      filter: ['!=', ['get', 'gnis_name'], null],
      layout: labelLayout,
      paint: {
        'text-color': COLORS.riverLabel,
        'text-halo-color': 'rgba(255, 255, 255, 0.9)',
        'text-halo-width': 1.5,
      },
    });
  }
}

// Export list of all river layer IDs for visibility toggling
export const RIVER_LAYER_IDS = RIVER_REGIONS.flatMap(region => {
  const prefix = region.id === 'rivers' ? 'rivers' : region.id;
  return [`${prefix}-line`, `${prefix}-arrows`, `${prefix}-labels`];
});

// For backwards compatibility, also export the line layer IDs specifically
export const RIVER_LINE_LAYER_IDS = RIVER_REGIONS.map(region => 
  region.id === 'rivers' ? 'rivers-line' : `${region.id}-line`
);
