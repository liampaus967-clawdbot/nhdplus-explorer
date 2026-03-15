'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import { BwcaRouteResult } from '../types';
import { useMapContext } from './MapContext';
import { usePersonaModeContext } from './PersonaModeContext';
import { updateBwcaRoute } from '../layers/bwca';

interface BwcaContextType {
  startPoint: { lng: number; lat: number } | null;
  endPoint: { lng: number; lat: number } | null;
  route: BwcaRouteResult | null;
  loading: boolean;
  error: string | null;
  setStartPoint: (point: { lng: number; lat: number } | null) => void;
  setEndPoint: (point: { lng: number; lat: number } | null) => void;
  clearRoute: () => void;
  handleMapClick: (lng: number, lat: number) => void;
}

const BwcaContext = createContext<BwcaContextType | null>(null);

export function BwcaProvider({ children }: { children: React.ReactNode }) {
  const { map } = useMapContext();
  const { mode } = usePersonaModeContext();
  const [startPoint, setStartPoint] = useState<{ lng: number; lat: number } | null>(null);
  const [endPoint, setEndPoint] = useState<{ lng: number; lat: number } | null>(null);
  const [route, setRoute] = useState<BwcaRouteResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate route when both points are set
  const calculateRoute = useCallback(async (start: { lng: number; lat: number }, end: { lng: number; lat: number }) => {
    setLoading(true);
    setError(null);
    setRoute(null);

    try {
      const response = await fetch('/api/bwca/route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start: { lng: start.lng, lat: start.lat },
          end: { lng: end.lng, lat: end.lat },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to calculate route');
      }

      const data = await response.json();
      setRoute(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to calculate route');
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle map click - set start, then end, then calculate
  const handleMapClick = useCallback((lng: number, lat: number) => {
    if (!startPoint) {
      setStartPoint({ lng, lat });
      setEndPoint(null);
      setRoute(null);
      setError(null);
    } else if (!endPoint) {
      setEndPoint({ lng, lat });
      calculateRoute(startPoint, { lng, lat });
    } else {
      // Both set, start fresh
      setStartPoint({ lng, lat });
      setEndPoint(null);
      setRoute(null);
      setError(null);
    }
  }, [startPoint, endPoint, calculateRoute]);

  const clearRoute = useCallback(() => {
    setStartPoint(null);
    setEndPoint(null);
    setRoute(null);
    setError(null);
    
    // Clear route from map
    if (map.current) {
      updateBwcaRoute(map.current, null);
    }
  }, [map]);

  // Note: BWCA layer visibility is now controlled via the Map Layers panel
  // The layers will show when the user toggles "BWCA Paddle Routes" in the layers menu

  // Update route on map when route changes
  useEffect(() => {
    if (map.current && route?.route) {
      updateBwcaRoute(map.current, route.route);
      
      // Fly to route bounds
      const features = route.route.features;
      if (features.length > 0) {
        const bounds = new mapboxgl.LngLatBounds();
        features.forEach((feature: any) => {
          if (feature.geometry?.type === 'LineString' && feature.geometry.coordinates) {
            feature.geometry.coordinates.forEach((coord: [number, number]) => {
              bounds.extend(coord);
            });
          }
        });
        if (!bounds.isEmpty()) {
          map.current.fitBounds(bounds, { padding: 50 });
        }
      }
    }
  }, [map, route]);

  return (
    <BwcaContext.Provider
      value={{
        startPoint,
        endPoint,
        route,
        loading,
        error,
        setStartPoint,
        setEndPoint,
        clearRoute,
        handleMapClick,
      }}
    >
      {children}
    </BwcaContext.Provider>
  );
}

export function useBwcaContext() {
  const context = useContext(BwcaContext);
  if (!context) {
    throw new Error('useBwcaContext must be used within a BwcaProvider');
  }
  return context;
}
