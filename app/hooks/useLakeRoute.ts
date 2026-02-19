'use client';

import { useState, useCallback, useRef } from 'react';
import { LakeDrawingMode, LakeRoute, LakeWaypoint } from '../types';
import * as turf from '@turf/turf';

// Generate unique IDs
const generateId = () => Math.random().toString(36).substr(2, 9);

// Smooth a line using Bezier curves - preserves endpoints
function smoothLine(coords: [number, number][], options?: { resolution?: number; sharpness?: number }): [number, number][] {
  if (coords.length < 3) return coords;
  
  const { resolution = 150, sharpness = 0.5 } = options || {};
  
  try {
    // Save original start and end points
    const startPoint = coords[0];
    const endPoint = coords[coords.length - 1];
    
    const line = turf.lineString(coords);
    
    // Use Bezier spline for smooth flowing curves
    // Lower sharpness = smoother, more curved lines
    const smoothed = turf.bezierSpline(line, { resolution, sharpness });
    const smoothedCoords = smoothed.geometry.coordinates as [number, number][];
    
    // Ensure the smoothed line includes original start and end points
    // Bezier splines can "pull back" from endpoints
    const result: [number, number][] = [startPoint];
    
    // Add smoothed points (skip first and last as we're adding originals)
    for (let i = 1; i < smoothedCoords.length - 1; i++) {
      result.push(smoothedCoords[i]);
    }
    
    // Always end at the exact end point
    result.push(endPoint);
    
    return result;
  } catch {
    return coords;
  }
}

// Calculate distance of a line in miles
function calculateDistanceMiles(coords: [number, number][]): number {
  if (coords.length < 2) return 0;
  
  try {
    const line = turf.lineString(coords);
    const length = turf.length(line, { units: 'miles' });
    return length;
  } catch {
    return 0;
  }
}

export function useLakeRoute() {
  const [drawingMode, setDrawingMode] = useState<LakeDrawingMode>('waypoint');
  const [waypoints, setWaypoints] = useState<LakeWaypoint[]>([]);
  const [lakeRoute, setLakeRoute] = useState<LakeRoute | null>(null);
  const [paddleSpeed, setPaddleSpeed] = useState(3.0); // Default 3 mph
  const [isDrawing, setIsDrawing] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  
  // Freehand drawing state
  const freehandCoords = useRef<[number, number][]>([]);

  // Build GeoJSON from waypoints
  const buildRouteFromWaypoints = useCallback((wps: LakeWaypoint[], submitted: boolean = false): LakeRoute => {
    if (wps.length < 2) {
      return {
        waypoints: wps,
        geojson: null,
        distance_mi: 0,
        paddle_time_min: 0,
      };
    }

    const coords: [number, number][] = wps.map(wp => [wp.lng, wp.lat]);
    const distance_mi = calculateDistanceMiles(coords);
    const paddle_time_min = (distance_mi / paddleSpeed) * 60;

    const geojson: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { 
            type: 'lake-route',
            submitted: submitted,
          },
          geometry: {
            type: 'LineString',
            coordinates: coords,
          },
        },
        // Add point features for each waypoint
        ...wps.map((wp, idx) => ({
          type: 'Feature' as const,
          properties: { 
            type: 'waypoint',
            index: idx,
            id: wp.id,
          },
          geometry: {
            type: 'Point' as const,
            coordinates: [wp.lng, wp.lat],
          },
        })),
      ],
    };

    return {
      waypoints: wps,
      geojson,
      distance_mi,
      paddle_time_min,
    };
  }, [paddleSpeed]);

  // Add waypoint (for waypoint mode)
  const addWaypoint = useCallback((lng: number, lat: number) => {
    const newWaypoint: LakeWaypoint = {
      id: generateId(),
      lng,
      lat,
      index: waypoints.length,
    };

    const newWaypoints = [...waypoints, newWaypoint];
    setWaypoints(newWaypoints);
    setIsSubmitted(false);
    
    const route = buildRouteFromWaypoints(newWaypoints);
    setLakeRoute(route);
    
    return newWaypoint;
  }, [waypoints, buildRouteFromWaypoints]);

  // Delete waypoint
  const deleteWaypoint = useCallback((id: string) => {
    const newWaypoints = waypoints
      .filter(wp => wp.id !== id)
      .map((wp, idx) => ({ ...wp, index: idx }));
    
    setWaypoints(newWaypoints);
    setIsSubmitted(false);
    
    if (newWaypoints.length >= 2) {
      const route = buildRouteFromWaypoints(newWaypoints);
      setLakeRoute(route);
    } else {
      setLakeRoute(null);
    }
  }, [waypoints, buildRouteFromWaypoints]);

  // Start freehand drawing
  const startFreehand = useCallback((lng: number, lat: number) => {
    setIsDrawing(true);
    setIsSubmitted(false);
    freehandCoords.current = [[lng, lat]];
  }, []);

  // Add point to freehand drawing (called on mouse move)
  const addFreehandPoint = useCallback((lng: number, lat: number) => {
    if (!isDrawing) return;
    
    // Only add if sufficiently different from last point
    const lastCoord = freehandCoords.current[freehandCoords.current.length - 1];
    if (lastCoord) {
      const dist = Math.sqrt(Math.pow(lng - lastCoord[0], 2) + Math.pow(lat - lastCoord[1], 2));
      // Increased minimum distance to reduce noise
      if (dist < 0.0002) return;
    }
    
    freehandCoords.current.push([lng, lat]);
  }, [isDrawing]);

  // Finish freehand drawing
  const finishFreehand = useCallback((lng: number, lat: number) => {
    if (!isDrawing) return null;
    
    freehandCoords.current.push([lng, lat]);
    setIsDrawing(false);
    
    // Smooth the line - preserve original path shape with flowing curves
    const smoothedCoords = smoothLine(freehandCoords.current, {
      resolution: 200,   // More points = smoother curves
      sharpness: 0.4,    // Lower = smoother, more flowing curves
    });
    
    const distance_mi = calculateDistanceMiles(smoothedCoords);
    const paddle_time_min = (distance_mi / paddleSpeed) * 60;

    // Convert to waypoints for consistency (keep more points for smoother route)
    const sampleRate = Math.max(1, Math.floor(smoothedCoords.length / 50));
    const newWaypoints: LakeWaypoint[] = smoothedCoords
      .filter((_, idx) => idx % sampleRate === 0 || idx === smoothedCoords.length - 1)
      .map((coord, idx) => ({
        id: generateId(),
        lng: coord[0],
        lat: coord[1],
        index: idx,
      }));

    setWaypoints(newWaypoints);

    const geojson: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { type: 'lake-route', submitted: false },
          geometry: {
            type: 'LineString',
            coordinates: smoothedCoords,
          },
        },
      ],
    };

    const route: LakeRoute = {
      waypoints: newWaypoints,
      geojson,
      distance_mi,
      paddle_time_min,
    };

    setLakeRoute(route);
    freehandCoords.current = [];
    
    return route;
  }, [isDrawing, paddleSpeed]);

  // Get current freehand preview (for drawing on map)
  const getFreehandPreview = useCallback((): [number, number][] => {
    return freehandCoords.current;
  }, []);

  // Submit route (mark as done, change to orange)
  const submitRoute = useCallback(() => {
    if (!lakeRoute?.geojson) return;
    
    setIsSubmitted(true);
    
    // Update geojson to mark as submitted
    const updatedGeojson: GeoJSON.FeatureCollection = {
      ...lakeRoute.geojson,
      features: lakeRoute.geojson.features.map(f => ({
        ...f,
        properties: {
          ...f.properties,
          submitted: true,
        },
      })),
    };
    
    setLakeRoute({
      ...lakeRoute,
      geojson: updatedGeojson,
    });
  }, [lakeRoute]);

  // Undo last action
  const undo = useCallback(() => {
    if (drawingMode === 'waypoint' && waypoints.length > 0) {
      const newWaypoints = waypoints.slice(0, -1);
      setWaypoints(newWaypoints);
      setIsSubmitted(false);
      
      if (newWaypoints.length >= 2) {
        const route = buildRouteFromWaypoints(newWaypoints);
        setLakeRoute(route);
      } else {
        setLakeRoute(null);
      }
    } else {
      // Clear everything
      clearRoute();
    }
  }, [drawingMode, waypoints, buildRouteFromWaypoints]);

  // Clear route completely
  const clearRoute = useCallback(() => {
    setWaypoints([]);
    setLakeRoute(null);
    setIsDrawing(false);
    setIsSubmitted(false);
    freehandCoords.current = [];
  }, []);

  // Update paddle speed and recalculate
  const updatePaddleSpeed = useCallback((speed: number) => {
    setPaddleSpeed(speed);
    
    if (lakeRoute && lakeRoute.distance_mi > 0) {
      setLakeRoute(prev => prev ? {
        ...prev,
        paddle_time_min: (prev.distance_mi / speed) * 60,
      } : null);
    }
  }, [lakeRoute]);

  return {
    // State
    drawingMode,
    waypoints,
    lakeRoute,
    paddleSpeed,
    isDrawing,
    isSubmitted,
    
    // Actions
    setDrawingMode,
    addWaypoint,
    deleteWaypoint,
    startFreehand,
    addFreehandPoint,
    finishFreehand,
    getFreehandPreview,
    submitRoute,
    undo,
    clearRoute,
    updatePaddleSpeed,
  };
}
