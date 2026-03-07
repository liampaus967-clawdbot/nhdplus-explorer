"use client";

import { createContext, useContext, useRef, useCallback, ReactNode, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import { useRoute, useElevationProfile } from '../hooks';
import { SnapResult, RouteResult, FlowCondition, ElevationPoint, SteepSection } from '../types';
import { COLORS } from '../constants';
import { updateRouteData, clearRouteData, updateProfileHighlight } from '../layers';
import { useMapContext } from './MapContext';
import { getPointAtDistance, buildLineCoordsBetweenDistances } from '../utils';

interface RouteContextValue {
  // Route state from hook
  putIn: SnapResult | null;
  takeOut: SnapResult | null;
  route: RouteResult | null;
  loading: boolean;
  error: string | null;
  flowCondition: FlowCondition;
  paddleSpeed: number;
  
  // Actions
  setPutIn: (snap: SnapResult | null) => void;
  setTakeOut: (snap: SnapResult | null) => void;
  setFlowCondition: (condition: FlowCondition) => void;
  setPaddleSpeed: (speed: number) => void;
  snapToRiver: (lng: number, lat: number) => Promise<SnapResult | null>;
  calculateRoute: (putIn: SnapResult, takeOut: SnapResult, flowCondition?: FlowCondition, paddleSpeed?: number) => Promise<void>;
  clearRoute: () => void;
  swapPoints: () => Promise<void>;
  handlePaddleSpeedChange: (speed: number) => Promise<void>;
  
  // Elevation profile state and handlers
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  profileSelection: { startM: number; endM: number } | null;
  setProfileSelection: (sel: { startM: number; endM: number } | null) => void;
  drawProfile: (profile: ElevationPoint[], steepSections: SteepSection[]) => void;
  handleMouseDown: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  handleMouseMove: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  handleMouseUp: () => void;
  handleMouseLeave: () => void;
  
  // Marker refs (needed for external manipulation)
  putInMarker: React.MutableRefObject<mapboxgl.Marker | null>;
  takeOutMarker: React.MutableRefObject<mapboxgl.Marker | null>;
}

const RouteContext = createContext<RouteContextValue | null>(null);

export function useRouteContext() {
  const context = useContext(RouteContext);
  if (!context) {
    throw new Error('useRouteContext must be used within a RouteProvider');
  }
  return context;
}

interface RouteProviderProps {
  children: ReactNode;
}

export function RouteProvider({ children }: RouteProviderProps) {
  const { map } = useMapContext();
  
  // Marker refs
  const putInMarker = useRef<mapboxgl.Marker | null>(null);
  const takeOutMarker = useRef<mapboxgl.Marker | null>(null);

  // Custom hooks
  const {
    putIn,
    takeOut,
    route,
    loading,
    error,
    flowCondition,
    paddleSpeed,
    setPutIn,
    setTakeOut,
    setFlowCondition,
    setPaddleSpeed,
    snapToRiver,
    calculateRoute,
    clearRoute: clearRouteState,
    swapPoints: swapPointsHook,
  } = useRoute();

  const {
    canvasRef,
    profileSelection,
    setProfileSelection,
    drawProfile,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
  } = useElevationProfile();

  // Clear route and markers
  const clearRoute = useCallback(() => {
    clearRouteState();
    setProfileSelection(null);

    if (putInMarker.current) {
      putInMarker.current.remove();
      putInMarker.current = null;
    }
    if (takeOutMarker.current) {
      takeOutMarker.current.remove();
      takeOutMarker.current = null;
    }

    if (map.current) {
      clearRouteData(map.current);
    }
  }, [clearRouteState, setProfileSelection, map]);

  // Handle paddle speed change with recalculation
  const handlePaddleSpeedChange = useCallback(async (newSpeed: number) => {
    setPaddleSpeed(newSpeed);
    if (putIn && takeOut) {
      await calculateRoute(putIn, takeOut, flowCondition, newSpeed);
    }
  }, [putIn, takeOut, flowCondition, setPaddleSpeed, calculateRoute]);

  // Handle swap points
  const swapPoints = useCallback(async () => {
    if (putIn && takeOut) {
      if (putInMarker.current && takeOutMarker.current) {
        const putInPos = putInMarker.current.getLngLat();
        const takeOutPos = takeOutMarker.current.getLngLat();
        putInMarker.current.setLngLat(takeOutPos);
        takeOutMarker.current.setLngLat(putInPos);
      }
      const tempPutIn = putIn;
      setPutIn(takeOut);
      setTakeOut(tempPutIn);
      await calculateRoute(takeOut, tempPutIn, flowCondition, paddleSpeed);
    }
  }, [putIn, takeOut, flowCondition, paddleSpeed, setPutIn, setTakeOut, calculateRoute]);

  // Update route on map
  useEffect(() => {
    if (!map.current) return;

    if (route) {
      updateRouteData(map.current, route.route);

      if (route.route.features.length > 0) {
        const coords = route.route.features.flatMap(
          (f: GeoJSON.Feature) => (f.geometry as GeoJSON.LineString).coordinates
        );
        const bounds = coords.reduce(
          (b: mapboxgl.LngLatBounds, c: GeoJSON.Position) => b.extend(c as [number, number]),
          new mapboxgl.LngLatBounds(coords[0] as [number, number], coords[0] as [number, number])
        );
        map.current.fitBounds(bounds, { padding: 80 });
      }
    }
  }, [route, map]);

  // Update profile highlight on map
  useEffect(() => {
    if (!map.current || !route) return;

    if (profileSelection) {
      const startPoint = getPointAtDistance(
        route,
        Math.min(profileSelection.startM, profileSelection.endM)
      );
      const endPoint = getPointAtDistance(
        route,
        Math.max(profileSelection.startM, profileSelection.endM)
      );

      if (startPoint && endPoint) {
        const lineCoords = buildLineCoordsBetweenDistances(
          route,
          Math.min(profileSelection.startM, profileSelection.endM),
          Math.max(profileSelection.startM, profileSelection.endM)
        );

        updateProfileHighlight(map.current, {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              properties: { type: "start" },
              geometry: { type: "Point", coordinates: startPoint },
            },
            {
              type: "Feature",
              properties: { type: "end" },
              geometry: { type: "Point", coordinates: endPoint },
            },
            {
              type: "Feature",
              properties: { type: "line" },
              geometry: {
                type: "LineString",
                coordinates: lineCoords.length > 1 ? lineCoords : [startPoint, endPoint],
              },
            },
          ],
        });
      }
    } else {
      updateProfileHighlight(map.current, {
        type: "FeatureCollection",
        features: [],
      });
    }
  }, [profileSelection, route, map]);

  const value: RouteContextValue = {
    putIn,
    takeOut,
    route,
    loading,
    error,
    flowCondition,
    paddleSpeed,
    setPutIn,
    setTakeOut,
    setFlowCondition,
    setPaddleSpeed,
    snapToRiver,
    calculateRoute,
    clearRoute,
    swapPoints,
    handlePaddleSpeedChange,
    canvasRef,
    profileSelection,
    setProfileSelection,
    drawProfile,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
    putInMarker,
    takeOutMarker,
  };

  return (
    <RouteContext.Provider value={value}>
      {children}
    </RouteContext.Provider>
  );
}
