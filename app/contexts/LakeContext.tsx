"use client";

import { createContext, useContext, useRef, useCallback, useState, useEffect, ReactNode } from 'react';
import mapboxgl from 'mapbox-gl';
import { useLakeRoute } from '../hooks';
import { LakeDrawingMode, LakeWaypoint, LakeRoute } from '../types';
import { useMapContext } from './MapContext';
import { WeatherData, ChopAssessment, fetchRouteWindConditions } from '../services/weather';

interface LakeContextValue {
  // Drawing state
  drawingMode: LakeDrawingMode;
  setDrawingMode: (mode: LakeDrawingMode) => void;
  waypoints: LakeWaypoint[];
  lakeRoute: LakeRoute | null;
  paddleSpeed: number;
  isDrawing: boolean;
  isSubmitted: boolean;
  
  // Actions
  addWaypoint: (lng: number, lat: number) => LakeWaypoint;
  deleteWaypoint: (id: string) => void;
  startFreehand: (lng: number, lat: number) => void;
  addFreehandPoint: (lng: number, lat: number) => void;
  finishFreehand: (lng: number, lat: number) => void;
  getFreehandPreview: () => [number, number][];
  submitRoute: () => void;
  undo: () => void;
  clear: () => void;
  updatePaddleSpeed: (speed: number) => void;
  
  // Wind data
  windData: WeatherData | null;
  chopAssessment: ChopAssessment | null;
  windLoading: boolean;
  lakeName: string | null;
  
  // Marker ref
  lakeMarkers: React.MutableRefObject<mapboxgl.Marker[]>;
}

const LakeContext = createContext<LakeContextValue | null>(null);

export function useLakeContext() {
  const context = useContext(LakeContext);
  if (!context) {
    throw new Error('useLakeContext must be used within a LakeProvider');
  }
  return context;
}

interface LakeProviderProps {
  children: ReactNode;
}

export function LakeProvider({ children }: LakeProviderProps) {
  const { map } = useMapContext();
  const lakeMarkers = useRef<mapboxgl.Marker[]>([]);
  
  // Lake wind data state
  const [windData, setWindData] = useState<WeatherData | null>(null);
  const [chopAssessment, setChopAssessment] = useState<ChopAssessment | null>(null);
  const [windLoading, setWindLoading] = useState(false);
  const [lakeName, setLakeName] = useState<string | null>(null);

  // Lake mode hook
  const {
    drawingMode,
    waypoints,
    lakeRoute,
    paddleSpeed,
    isDrawing,
    isSubmitted,
    setDrawingMode,
    addWaypoint: addWaypointBase,
    deleteWaypoint,
    startFreehand,
    addFreehandPoint,
    finishFreehand,
    getFreehandPreview,
    submitRoute: submitRouteBase,
    undo: undoBase,
    clearRoute: clearRouteBase,
    updatePaddleSpeed,
  } = useLakeRoute();

  // Clear lake markers helper
  const clearLakeMarkers = useCallback(() => {
    lakeMarkers.current.forEach((m) => m.remove());
    lakeMarkers.current = [];
  }, []);

  // Enhanced add waypoint with marker
  const addWaypoint = useCallback((lng: number, lat: number) => {
    const wp = addWaypointBase(lng, lat);
    
    // Add marker
    if (map.current) {
      const marker = new mapboxgl.Marker({ color: "#67e8f9" })
        .setLngLat([lng, lat])
        .addTo(map.current);
      lakeMarkers.current.push(marker);
    }
    
    return wp;
  }, [addWaypointBase, map]);

  // Enhanced undo with marker removal
  const undo = useCallback(() => {
    // Remove last marker first
    if (lakeMarkers.current.length > 0) {
      const lastMarker = lakeMarkers.current.pop();
      lastMarker?.remove();
    }

    // Call the undo from hook
    undoBase();
  }, [undoBase]);

  // Enhanced clear with marker removal
  const clear = useCallback(() => {
    clearRouteBase();
    clearLakeMarkers();
    if (map.current) {
      const source = map.current.getSource("lake-route") as mapboxgl.GeoJSONSource;
      if (source) {
        source.setData({ type: "FeatureCollection", features: [] });
      }
    }
  }, [clearRouteBase, clearLakeMarkers, map]);

  // Enhanced submit with marker removal
  const submitRoute = useCallback(() => {
    clearLakeMarkers();
    submitRouteBase();
  }, [clearLakeMarkers, submitRouteBase]);

  // Update lake route on map
  useEffect(() => {
    if (!map.current) return;

    const source = map.current.getSource("lake-route") as mapboxgl.GeoJSONSource;
    if (!source) return;

    // If no route or no geojson, clear the map
    if (!lakeRoute?.geojson) {
      source.setData({ type: "FeatureCollection", features: [] });
      return;
    }

    // Update with new route data
    source.setData(lakeRoute.geojson);

    // Fit bounds to lake route (only when route has meaningful length)
    const lineFeature = lakeRoute.geojson.features.find(
      (f) => f.geometry.type === "LineString"
    );
    if (lineFeature && lineFeature.geometry.type === "LineString") {
      const coords = lineFeature.geometry.coordinates as [number, number][];
      if (coords.length > 1) {
        const bounds = coords.reduce(
          (b: mapboxgl.LngLatBounds, c: [number, number]) => b.extend(c),
          new mapboxgl.LngLatBounds(coords[0], coords[0])
        );
        map.current.fitBounds(bounds, { padding: 80 });
      }
    }
  }, [lakeRoute, map]);

  // Detect lake name when waypoints change (using PostGIS)
  useEffect(() => {
    if (waypoints.length === 0) {
      setLakeName(null);
      return;
    }

    const firstWp = waypoints[0];

    fetch(`/api/lake-at-point?lng=${firstWp.lng}&lat=${firstWp.lat}`)
      .then((res) => {
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setLakeName(data.lake?.name || null);
      })
      .catch(() => {
        setLakeName(null);
      });
  }, [waypoints]);

  // Fetch wind data when lake route changes
  useEffect(() => {
    if (!lakeRoute?.geojson) {
      setWindData(null);
      setChopAssessment(null);
      return;
    }

    const lineFeature = lakeRoute.geojson.features.find(
      (f) => f.geometry.type === "LineString"
    );
    if (!lineFeature || lineFeature.geometry.type !== "LineString") return;

    const coords = lineFeature.geometry.coordinates as [number, number][];
    if (coords.length < 2) return;

    // Fetch wind conditions for the route
    setWindLoading(true);
    fetchRouteWindConditions(coords)
      .then((result) => {
        if (result) {
          setWindData(result.avgWind);
          setChopAssessment(result.chop);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch wind data:", err);
      })
      .finally(() => {
        setWindLoading(false);
      });
  }, [lakeRoute]);

  const value: LakeContextValue = {
    drawingMode,
    setDrawingMode,
    waypoints,
    lakeRoute,
    paddleSpeed,
    isDrawing,
    isSubmitted,
    addWaypoint,
    deleteWaypoint,
    startFreehand,
    addFreehandPoint,
    finishFreehand,
    getFreehandPreview,
    submitRoute,
    undo,
    clear,
    updatePaddleSpeed,
    windData,
    chopAssessment,
    windLoading,
    lakeName,
    lakeMarkers,
  };

  return (
    <LakeContext.Provider value={value}>
      {children}
    </LakeContext.Provider>
  );
}
