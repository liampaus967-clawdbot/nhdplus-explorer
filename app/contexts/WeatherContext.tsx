"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useWeatherMetadata, usePreloadedWeatherLayers, useWindData } from '../hooks';
import type { WeatherMetadata } from '../hooks/useWeatherMetadata';
import type { WindData } from '../hooks/useWindData';
import { useMapContext } from './MapContext';

interface WeatherContextValue {
  // Metadata
  metadata: WeatherMetadata | null;
  metadataLoading: boolean;
  metadataError: Error | null;
  refreshMetadata: () => Promise<void>;
  
  // Weather layer state
  weatherEnabled: boolean;
  setWeatherEnabled: (enabled: boolean) => void;
  selectedVariable: string | null;
  setSelectedVariable: (variable: string | null) => void;
  selectedForecast: string;
  setSelectedForecast: (forecast: string) => void;
  opacity: number;
  setOpacity: (opacity: number) => void;
  
  // Preloaded layers state
  isLayersReady: boolean;
  loadProgress: number;
  loadedCount: number;
  totalCount: number;
  
  // Wind particles
  windEnabled: boolean;
  setWindEnabled: (enabled: boolean) => void;
  windData: WindData | null;
  windLoading: boolean;
}

const WeatherContext = createContext<WeatherContextValue | null>(null);

export function useWeatherContext() {
  const context = useContext(WeatherContext);
  if (!context) {
    throw new Error('useWeatherContext must be used within a WeatherProvider');
  }
  return context;
}

interface WeatherProviderProps {
  children: ReactNode;
}

export function WeatherProvider({ children }: WeatherProviderProps) {
  const { map, styleVersion } = useMapContext();
  
  // Weather layer state
  const [weatherEnabled, setWeatherEnabled] = useState(false);
  const [selectedVariable, setSelectedVariable] = useState<string | null>(null);
  const [selectedForecast, setSelectedForecast] = useState("00");
  const [opacity, setOpacity] = useState(0.7);
  
  // Wind particle state
  const [windEnabled, setWindEnabled] = useState(false);

  // Weather metadata hook
  const {
    metadata,
    loading: metadataLoading,
    error: metadataError,
    refresh: refreshMetadata,
  } = useWeatherMetadata();

  // Wind data hook
  const { windData, loading: windLoading } = useWindData({
    forecastHour: selectedForecast,
    enabled: windEnabled,
  });

  // Preloaded weather layers hook
  const {
    initialize: initializeWeatherLayers,
    setActiveForecast: setWeatherForecast,
    isReady: weatherLayersReady,
    loadProgress,
    loadedCount,
    totalCount,
    cleanup: cleanupWeatherLayers,
    setOpacity: setWeatherLayerOpacity,
    reinitialize: reinitializeWeatherLayers,
  } = usePreloadedWeatherLayers({
    map: map.current,
    metadata,
    variableId: selectedVariable,
    enabled: weatherEnabled,
    baseOpacity: opacity,
  });

  // Initialize preloaded weather layers when map and metadata are ready
  useEffect(() => {
    if (map.current && metadata && selectedVariable && weatherEnabled) {
      initializeWeatherLayers();
    }
  }, [metadata, selectedVariable, weatherEnabled, initializeWeatherLayers, map]);

  // Switch active forecast when slider changes (instant - all layers pre-loaded)
  useEffect(() => {
    if (weatherLayersReady && weatherEnabled) {
      setWeatherForecast(selectedForecast);
    }
  }, [selectedForecast, weatherLayersReady, weatherEnabled, setWeatherForecast]);

  // Sync opacity changes with preloaded layers
  useEffect(() => {
    setWeatherLayerOpacity(opacity);
  }, [opacity, setWeatherLayerOpacity]);

  // Cleanup weather layers when disabled
  useEffect(() => {
    if (!weatherEnabled) {
      cleanupWeatherLayers();
    }
  }, [weatherEnabled, cleanupWeatherLayers]);

  // Reinitialize layers when variable changes OR when style reloads (basemap switch)
  useEffect(() => {
    if (weatherEnabled && selectedVariable && metadata) {
      reinitializeWeatherLayers();
    }
  }, [selectedVariable, styleVersion]);

  const value: WeatherContextValue = {
    metadata,
    metadataLoading,
    metadataError,
    refreshMetadata,
    weatherEnabled,
    setWeatherEnabled,
    selectedVariable,
    setSelectedVariable,
    selectedForecast,
    setSelectedForecast,
    opacity,
    setOpacity,
    isLayersReady: weatherLayersReady,
    loadProgress,
    loadedCount,
    totalCount,
    windEnabled,
    setWindEnabled,
    windData,
    windLoading,
  };

  return (
    <WeatherContext.Provider value={value}>
      {children}
    </WeatherContext.Provider>
  );
}
