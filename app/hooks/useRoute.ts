'use client';

import { useState, useCallback } from 'react';
import { SnapResult, RouteResult, FlowCondition } from '../types';

interface UseRouteReturn {
  putIn: SnapResult | null;
  takeOut: SnapResult | null;
  route: RouteResult | null;
  loading: boolean;
  error: string | null;
  flowCondition: FlowCondition;
  paddleSpeed: number;
  setPutIn: (snap: SnapResult | null) => void;
  setTakeOut: (snap: SnapResult | null) => void;
  setFlowCondition: (flow: FlowCondition) => void;
  setPaddleSpeed: (speed: number) => void;
  snapToRiver: (lng: number, lat: number) => Promise<SnapResult | null>;
  calculateRoute: (start: SnapResult, end: SnapResult, flow?: FlowCondition, speed?: number) => Promise<void>;
  clearRoute: () => void;
  swapPoints: () => void;
}

export function useRoute(): UseRouteReturn {
  const [putIn, setPutIn] = useState<SnapResult | null>(null);
  const [takeOut, setTakeOut] = useState<SnapResult | null>(null);
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flowCondition, setFlowCondition] = useState<FlowCondition>('normal');
  const [paddleSpeed, setPaddleSpeed] = useState(0);  // Default to pure float

  const snapToRiver = useCallback(async (lng: number, lat: number): Promise<SnapResult | null> => {
    try {
      const res = await fetch(`/api/snap?lng=${lng}&lat=${lat}`);
      if (!res.ok) {
        const err = await res.json();
        setError(err.error || 'Failed to snap to river');
        return null;
      }
      return await res.json();
    } catch (e) {
      setError('Network error');
      return null;
    }
  }, []);

  const calculateRoute = useCallback(async (
    start: SnapResult,
    end: SnapResult,
    flow: FlowCondition = flowCondition,
    speed: number = paddleSpeed
  ) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/route?start_lng=${start.snap_point.lng}&start_lat=${start.snap_point.lat}` +
        `&end_lng=${end.snap_point.lng}&end_lat=${end.snap_point.lat}` +
        `&flow=${flow}&paddle_speed=${speed}`
      );
      
      if (!res.ok) {
        const err = await res.json();
        setError(err.error || 'Failed to calculate route');
        setRoute(null);
        return;
      }

      const data: RouteResult = await res.json();
      setRoute(data);
    } catch (e) {
      setError('Network error calculating route');
    } finally {
      setLoading(false);
    }
  }, [flowCondition, paddleSpeed]);

  const clearRoute = useCallback(() => {
    setPutIn(null);
    setTakeOut(null);
    setRoute(null);
    setError(null);
    setFlowCondition('normal');
    setPaddleSpeed(0);  // Reset to pure float
  }, []);

  const swapPoints = useCallback(() => {
    if (putIn && takeOut) {
      const temp = putIn;
      setPutIn(takeOut);
      setTakeOut(temp);
      setError(null);
    }
  }, [putIn, takeOut]);

  return {
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
  };
}
