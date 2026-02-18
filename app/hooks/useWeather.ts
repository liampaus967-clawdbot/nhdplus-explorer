'use client';

import { useState, useEffect } from 'react';
import { fetchWeather, WeatherData } from '../services/weather';

interface UseWeatherOptions {
  lat: number | null;
  lng: number | null;
  enabled?: boolean;
}

interface UseWeatherResult {
  data: WeatherData | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useWeather({ lat, lng, enabled = true }: UseWeatherOptions): UseWeatherResult {
  const [data, setData] = useState<WeatherData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetch = async () => {
    if (!lat || !lng || !enabled) return;

    setIsLoading(true);
    setError(null);

    try {
      const weather = await fetchWeather(lat, lng);
      setData(weather);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch weather'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetch();
    // Refresh weather every 10 minutes
    const interval = setInterval(fetch, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [lat, lng, enabled]);

  return { data, isLoading, error, refetch: fetch };
}
