'use client';

import { CloudSun } from 'lucide-react';
import styles from './shared.module.css';

export function WeatherConditions() {
  return (
    <div className={styles.weatherCard}>
      <div className={styles.weatherHeader}>
        <span className={styles.weatherLabel}>WEATHER CONDITIONS</span>
      </div>
      <div className={styles.weatherZero}>
        <CloudSun size={28} color="var(--text-dim)" />
        <span className={styles.weatherZeroTitle}>Weather Coming Soon</span>
        <span className={styles.weatherZeroDesc}>
          Real-time weather data and forecasts will be available in a future update
        </span>
      </div>
    </div>
  );
}
