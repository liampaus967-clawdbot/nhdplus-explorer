'use client';

import { Sun, CloudSun, Cloud, CloudRain, CloudSnow, CloudFog, CloudLightning, Sunrise, Sunset, Wind, Loader2 } from 'lucide-react';
import { useWeather } from '../../../hooks/useWeather';
import { getWeatherDescription, getWindDirection } from '../../../services/weather';
import styles from './shared.module.css';

interface WeatherConditionsProps {
  lat: number | null;
  lng: number | null;
}

const WEATHER_ICONS = {
  'sun': Sun,
  'cloud-sun': CloudSun,
  'cloud': Cloud,
  'cloud-rain': CloudRain,
  'cloud-snow': CloudSnow,
  'cloud-fog': CloudFog,
  'cloud-lightning': CloudLightning,
};

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });
}

function getTimeSinceUpdate(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `Updated ${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `Updated ${hours}h ago`;
}

export function WeatherConditions({ lat, lng }: WeatherConditionsProps) {
  const { data, isLoading, error } = useWeather({ lat, lng, enabled: !!(lat && lng) });

  // No coordinates - show zero state
  if (!lat || !lng) {
    return (
      <div className={styles.weatherCard}>
        <div className={styles.weatherHeader}>
          <span className={styles.weatherLabel}>WEATHER CONDITIONS</span>
        </div>
        <div className={styles.weatherZero}>
          <CloudSun size={28} color="var(--text-dim)" />
          <span className={styles.weatherZeroTitle}>Select a Location</span>
          <span className={styles.weatherZeroDesc}>
            Weather conditions will appear when you select a put-in point
          </span>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading && !data) {
    return (
      <div className={styles.weatherCard}>
        <div className={styles.weatherHeader}>
          <span className={styles.weatherLabel}>WEATHER CONDITIONS</span>
        </div>
        <div className={styles.weatherZero}>
          <Loader2 size={28} color="var(--text-dim)" className={styles.spinner} />
          <span className={styles.weatherZeroTitle}>Loading Weather...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !data) {
    return (
      <div className={styles.weatherCard}>
        <div className={styles.weatherHeader}>
          <span className={styles.weatherLabel}>WEATHER CONDITIONS</span>
        </div>
        <div className={styles.weatherZero}>
          <CloudSun size={28} color="var(--text-dim)" />
          <span className={styles.weatherZeroTitle}>Unable to Load Weather</span>
          <span className={styles.weatherZeroDesc}>{error.message}</span>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { label: conditionLabel, icon: iconKey } = getWeatherDescription(data.weatherCode);
  const WeatherIcon = WEATHER_ICONS[iconKey as keyof typeof WEATHER_ICONS] || CloudSun;
  const windDir = getWindDirection(data.windDirection);

  return (
    <div className={styles.weatherCard}>
      {/* Header */}
      <div className={styles.weatherHeader}>
        <span className={styles.weatherLabel}>WEATHER CONDITIONS</span>
        <span className={styles.weatherUpdated}>{getTimeSinceUpdate(data.updatedAt)}</span>
      </div>

      {/* Temperature Row */}
      <div className={styles.weatherTempRow}>
        <div className={styles.weatherTempIcon}>
          <WeatherIcon size={22} color="var(--warning)" />
        </div>
        <div className={styles.weatherTempInfo}>
          <div className={styles.weatherTempValue}>
            {data.temperature}°F · {conditionLabel}
          </div>
          <div className={styles.weatherFeelsLike}>
            Feels like {data.apparentTemperature}°F · Humidity {data.humidity}%
          </div>
        </div>
      </div>

      {/* Sunrise / Sunset */}
      <div className={styles.weatherRow}>
        <div className={styles.weatherMiniCard}>
          <div className={styles.weatherMiniTop}>
            <Sunrise size={16} color="var(--warning)" />
            <span className={styles.weatherMiniLabel}>Sunrise</span>
          </div>
          <span className={styles.weatherMiniValue}>{formatTime(data.sunrise)}</span>
        </div>
        <div className={styles.weatherMiniCard}>
          <div className={styles.weatherMiniTop}>
            <Sunset size={16} color="#fb923c" />
            <span className={styles.weatherMiniLabel}>Sunset</span>
          </div>
          <span className={styles.weatherMiniValue}>{formatTime(data.sunset)}</span>
        </div>
      </div>

      {/* Wind */}
      <div className={styles.weatherRow}>
        <div className={styles.weatherMiniCard}>
          <div className={styles.weatherMiniTop}>
            <Wind size={16} color="var(--accent)" />
            <span className={styles.weatherMiniLabel}>Wind</span>
          </div>
          <span className={styles.weatherMiniValue}>{data.windSpeed} mph {windDir}</span>
          <span className={styles.weatherMiniSub}>Gusts: {data.windGusts} mph</span>
        </div>
        <div className={styles.weatherMiniCard}>
          <div className={styles.weatherMiniTop}>
            <Cloud size={16} color="var(--text-muted)" />
            <span className={styles.weatherMiniLabel}>Humidity</span>
          </div>
          <span className={styles.weatherMiniValue}>{data.humidity}%</span>
        </div>
      </div>
    </div>
  );
}
