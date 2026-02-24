/**
 * Weather Metadata Hook
 * 
 * Fetches weather metadata from Driftwise S3 bucket.
 * Provides typed access to available variables, timestamps, and tile URLs.
 */

import { useState, useEffect, useCallback } from "react";

// =============================================================================
// Types
// =============================================================================

export interface ModelRun {
  date: string;
  cycle: string;
  cycle_formatted: string;
  timestamp: string;
  unix_timestamp: number;
  display: string;
}

export interface ColorStop {
  value: number;
  color: string;
}

export interface WeatherVariable {
  id: string;
  name: string;
  description: string;
  units: string;
  color_ramp: string;
  color_stops?: ColorStop[];
  latest_timestamp?: string;
  timestamps?: string[];
}

export interface TileConfig {
  url_template: string;
  format: string;
  tile_size: number;
  min_zoom: number;
  max_zoom: number;
  bounds: [number, number, number, number];
}

export interface AvailableRun {
  timestamp: string;
  forecast_hours: string[];
  forecast_count: number;
}

export interface DataFreshness {
  age_minutes: number;
  status: "fresh" | "stale" | "old";
  generated_at: string;
}

export interface WeatherMetadata {
  version: string;
  model: string;
  product: string;
  model_run: ModelRun;
  data_freshness: DataFreshness;
  variables: WeatherVariable[];
  variable_ids: string[];
  forecast_hours: string[];
  available_runs: AvailableRun[];
  available_runs_count: number;
  tiles: TileConfig;
  endpoints: {
    metadata: string;
    tiles: string;
    colored_cogs: string;
  };
  generated_at: string;
  pipeline_version: string;
}

export interface UseWeatherMetadataResult {
  metadata: WeatherMetadata | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  getTileUrl: (variable: string, timestamp?: string, forecast?: string) => string | null;
  getVariable: (id: string) => WeatherVariable | undefined;
  isDataFresh: boolean;
}

// =============================================================================
// Configuration - Driftwise S3 bucket
// =============================================================================

const METADATA_URL = "https://driftwise-weather-data.s3.us-east-1.amazonaws.com/metadata/latest.json";
const REFRESH_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

// =============================================================================
// Hook
// =============================================================================

export function useWeatherMetadata(
  autoRefresh: boolean = true
): UseWeatherMetadataResult {
  const [metadata, setMetadata] = useState<WeatherMetadata | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchMetadata = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(METADATA_URL, {
        cache: "no-cache",
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch metadata: ${response.status}`);
      }

      const data: WeatherMetadata = await response.json();
      setMetadata(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchMetadata();
  }, [fetchMetadata]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchMetadata, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchMetadata]);

  // Build tile URL for a specific variable/timestamp/forecast
  const getTileUrl = useCallback(
    (variable: string, timestamp?: string, forecast: string = "00"): string | null => {
      if (!metadata) return null;

      const varData = metadata.variables.find((v) => v.id === variable);
      const ts = timestamp || varData?.latest_timestamp;

      if (!ts) return null;

      return metadata.tiles.url_template
        .replace("{variable}", variable)
        .replace("{timestamp}", ts)
        .replace("{forecast}", forecast);
    },
    [metadata]
  );

  // Get variable by ID
  const getVariable = useCallback(
    (id: string): WeatherVariable | undefined => {
      return metadata?.variables.find((v) => v.id === id);
    },
    [metadata]
  );

  // Check if data is fresh
  const isDataFresh =
    metadata?.data_freshness?.status === "fresh" ||
    (metadata?.data_freshness?.age_minutes ?? 999) < 120;

  return {
    metadata,
    loading,
    error,
    refresh: fetchMetadata,
    getTileUrl,
    getVariable,
    isDataFresh,
  };
}

export default useWeatherMetadata;
