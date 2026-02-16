import mapboxgl from 'mapbox-gl';
import { TILESETS, SOURCE_LAYERS, COLORS } from '../constants';

export function addRiversSource(map: mapboxgl.Map) {
  if (map.getSource('rivers')) return;
  map.addSource('rivers', {
    type: 'vector',
    url: TILESETS.rivers,
  });
}

export function addRiversLayers(map: mapboxgl.Map, basemap: string) {
  if (map.getLayer('rivers-line')) return;
  
  // River lines - styled by stream order
  map.addLayer({
    id: 'rivers-line',
    type: 'line',
    source: 'rivers',
    'source-layer': SOURCE_LAYERS.rivers,
    layout: {
      'line-cap': 'round',
      'line-join': 'round',
    },
    paint: {
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
    },
  });

  // Create and add flow arrow icon
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

  const arrowColor = basemap === 'outdoors' ? COLORS.riverLabel : '#ffffff';

  // Flow direction arrows
  map.addLayer({
    id: 'rivers-arrows',
    type: 'symbol',
    source: 'rivers',
    'source-layer': SOURCE_LAYERS.rivers,
    minzoom: 10,
    layout: {
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
    },
    paint: {
      'icon-opacity': 0.8,
      'icon-color': arrowColor,
    },
  });

  // River labels
  map.addLayer({
    id: 'rivers-labels',
    type: 'symbol',
    source: 'rivers',
    'source-layer': SOURCE_LAYERS.rivers,
    filter: ['!=', ['get', 'gnis_name'], null],
    layout: {
      'symbol-placement': 'line-center',
      'text-field': ['get', 'gnis_name'],
      'text-font': ['DIN Pro Italic', 'Arial Unicode MS Regular'],
      'text-size': 11,
      'text-allow-overlap': false,
      'text-optional': true,
    },
    paint: {
      'text-color': COLORS.riverLabel,
      'text-halo-color': 'rgba(255, 255, 255, 0.9)',
      'text-halo-width': 1.5,
    },
  });
}
