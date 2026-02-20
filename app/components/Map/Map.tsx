'use client';

import { useEffect, useRef, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import { BasemapStyle, RouteResult } from '../../types';
import { MAP_CONFIG, BASEMAP_STYLES, COLORS } from '../../constants';
import { addAllLayers, updateRouteData, clearRouteData, updateProfileHighlight } from '../../layers';
import styles from '../../page.module.css';

interface MapProps {
  basemap: BasemapStyle;
  route: RouteResult | null;
  onMapClick: (lng: number, lat: number) => void;
  onMapReady: (map: mapboxgl.Map) => void;
}

export function Map({ basemap, route, onMapClick, onMapReady }: MapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const basemapRef = useRef<BasemapStyle>(basemap);

  // Initialize map
  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: BASEMAP_STYLES[basemap],
      center: MAP_CONFIG.center,
      zoom: MAP_CONFIG.zoom,
      pitch: MAP_CONFIG.pitch,
    });

    map.current.addControl(new mapboxgl.FullscreenControl());

    map.current.on('load', () => {
      if (map.current) {
        addAllLayers(map.current, basemapRef.current);
        map.current.getCanvas().style.cursor = 'crosshair';
        onMapReady(map.current);
      }
    });

    map.current.on('style.load', () => {
      if (map.current) {
        addAllLayers(map.current, basemapRef.current);
      }
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Handle click events
  useEffect(() => {
    if (!map.current) return;

    const handleClick = (e: mapboxgl.MapMouseEvent) => {
      onMapClick(e.lngLat.lng, e.lngLat.lat);
    };

    map.current.on('click', handleClick);
    return () => {
      map.current?.off('click', handleClick);
    };
  }, [onMapClick]);

  // Handle basemap changes
  useEffect(() => {
    if (!map.current || basemapRef.current === basemap) return;
    basemapRef.current = basemap;
    map.current.setStyle(BASEMAP_STYLES[basemap]);
  }, [basemap]);

  // Update route on map
  useEffect(() => {
    if (!map.current) return;

    if (route) {
      updateRouteData(map.current, route.route);

      // Fit map to route bounds
      if (route.route.features.length > 0) {
        const coords = route.route.features.flatMap(
          (f: any) => f.geometry.coordinates
        );
        const bounds = coords.reduce(
          (b: mapboxgl.LngLatBounds, c: [number, number]) => b.extend(c),
          new mapboxgl.LngLatBounds(coords[0], coords[0])
        );
        map.current.fitBounds(bounds, { padding: 80 });
      }
    } else {
      clearRouteData(map.current);
    }
  }, [route]);

  return <div ref={mapContainer} className={styles.map} />;
}
