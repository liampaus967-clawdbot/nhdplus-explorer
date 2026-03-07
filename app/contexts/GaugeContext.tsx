"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useGaugeStatus } from '../hooks/useGaugeStatus';
import { GaugeStyleMode } from '../components/Map/GaugeStyleControl';
import { useMapContext } from './MapContext';
import {
  updateGaugeColors,
  updateGaugeTrendColors,
  updateGaugeTemperatureColors,
  updateGaugeTempTrendColors,
} from '../layers';

type GaugeStatusType = 'very_low' | 'low' | 'normal' | 'high' | 'very_high';
type TrendType = 'rising' | 'falling' | 'stable' | 'unknown';

interface GaugeContextValue {
  // Status data
  statusMap: Record<string, GaugeStatusType> | null;
  trendMap: Record<string, TrendType> | null;
  temperatureMap: Record<string, number> | null;
  tempTrendMap: Record<string, TrendType> | null;
  
  // Style mode
  styleMode: GaugeStyleMode;
  setStyleMode: (mode: GaugeStyleMode) => void;
}

const GaugeContext = createContext<GaugeContextValue | null>(null);

export function useGaugeContext() {
  const context = useContext(GaugeContext);
  if (!context) {
    throw new Error('useGaugeContext must be used within a GaugeProvider');
  }
  return context;
}

interface GaugeProviderProps {
  children: ReactNode;
}

export function GaugeProvider({ children }: GaugeProviderProps) {
  const { map, styleVersion } = useMapContext();
  const [styleMode, setStyleMode] = useState<GaugeStyleMode>("percentile");

  // Gauge status from hook
  const {
    statusMap,
    trendMap,
    temperatureMap,
    tempTrendMap,
  } = useGaugeStatus();

  // Update gauge colors when flow status data loads, mode changes, or style reloads
  useEffect(() => {
    if (!map.current) return;

    if (styleMode === "percentile" && statusMap) {
      updateGaugeColors(map.current, statusMap);
    } else if (styleMode === "trend" && trendMap) {
      updateGaugeTrendColors(map.current, trendMap);
    } else if (styleMode === "temperature" && temperatureMap) {
      updateGaugeTemperatureColors(map.current, temperatureMap);
    } else if (styleMode === "temp_trend" && tempTrendMap) {
      updateGaugeTempTrendColors(map.current, tempTrendMap);
    }
  }, [statusMap, trendMap, temperatureMap, tempTrendMap, styleMode, styleVersion, map]);

  const value: GaugeContextValue = {
    statusMap,
    trendMap,
    temperatureMap,
    tempTrendMap,
    styleMode,
    setStyleMode,
  };

  return (
    <GaugeContext.Provider value={value}>
      {children}
    </GaugeContext.Provider>
  );
}
