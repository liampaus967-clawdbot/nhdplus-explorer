'use client';

import { useEffect, useRef, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import { BasemapStyle } from '../types';
import { BASEMAP_STYLES, MAP_CONFIG } from '../constants';
import { addAllLayers } from '../layers';

interface UseMapInstanceOptions {
  onMapReady?: (map: mapboxgl.Map) => void;
}

export function useMapInstance(options: UseMapInstanceOptions = {}) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const basemapRef = useRef<BasemapStyle>('outdoors');

  // Initialize map
  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: BASEMAP_STYLES.outdoors,
      center: MAP_CONFIG.center,
      zoom: MAP_CONFIG.zoom,
      pitch: MAP_CONFIG.pitch,
    });

    map.current.addControl(new mapboxgl.NavigationControl());
    map.current.addControl(new mapboxgl.FullscreenControl());

    const setupLayers = () => {
      if (map.current) {
        addAllLayers(map.current, basemapRef.current);
        
        // Add lake route source and layers
        if (!map.current.getSource('lake-route')) {
          map.current.addSource('lake-route', {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] }
          });
          
          // Glow layer for submitted routes
          map.current.addLayer({
            id: 'lake-route-glow',
            type: 'line',
            source: 'lake-route',
            filter: ['==', ['get', 'submitted'], true],
            paint: {
              'line-color': '#f59e0b',
              'line-width': 12,
              'line-opacity': 0.3,
              'line-blur': 8
            }
          });
          
          // Main route line
          map.current.addLayer({
            id: 'lake-route-line',
            type: 'line',
            source: 'lake-route',
            paint: {
              'line-color': [
                'case',
                ['==', ['get', 'submitted'], true], '#f59e0b',
                '#006BF7'
              ],
              'line-width': 4,
              'line-opacity': 0.9
            }
          });
        }
        
        map.current.getCanvas().style.cursor = 'crosshair';
        options.onMapReady?.(map.current);
      }
    };

    map.current.on('load', setupLayers);
    map.current.on('style.load', setupLayers);

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Change basemap
  const setBasemap = useCallback((newBasemap: BasemapStyle) => {
    if (!map.current || newBasemap === basemapRef.current) return;
    basemapRef.current = newBasemap;
    map.current.setStyle(BASEMAP_STYLES[newBasemap]);
  }, []);

  // Fit bounds helper
  const fitBounds = useCallback((coords: [number, number][], padding = 80) => {
    if (!map.current || coords.length === 0) return;
    
    const bounds = coords.reduce(
      (b, c) => b.extend(c),
      new mapboxgl.LngLatBounds(coords[0], coords[0])
    );
    map.current.fitBounds(bounds, { padding });
  }, []);

  return {
    mapContainer,
    map,
    basemapRef,
    setBasemap,
    fitBounds,
  };
}
