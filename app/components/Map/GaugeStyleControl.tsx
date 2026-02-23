'use client';

import React from 'react';
import {
  Gauge,
  TrendingUp,
  Minus,
  TrendingDown,
  ThermometerSnowflake,
  Thermometer,
  Sun,
} from 'lucide-react';
import styles from './GaugeStyleControl.module.css';

export type GaugeStyleMode = 'percentile' | 'trend' | 'temperature' | 'temp_trend';

interface GaugeStyleControlProps {
  mode: GaugeStyleMode;
  onModeChange: (mode: GaugeStyleMode) => void;
  visible?: boolean;
}

const MODES: { id: GaugeStyleMode; label: string; shortLabel: string }[] = [
  { id: 'percentile', label: 'Flow Level', shortLabel: 'Level' },
  { id: 'trend', label: 'Flow Trend', shortLabel: 'Trend' },
  { id: 'temperature', label: 'Water Temp', shortLabel: 'Temp' },
  { id: 'temp_trend', label: 'Temp Trend', shortLabel: 'T-Trend' },
];

export function GaugeStyleControl({ mode, onModeChange, visible = true }: GaugeStyleControlProps) {
  if (!visible) return null;

  const modeIndex = MODES.findIndex(m => m.id === mode);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <svg className={styles.headerIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2v6m0 8v6M4.93 4.93l4.24 4.24m5.66 5.66l4.24 4.24M2 12h6m8 0h6M4.93 19.07l4.24-4.24m5.66-5.66l4.24-4.24" />
        </svg>
        <span>Flow Gauges</span>
      </div>

      {/* 4-way Segmented Toggle */}
      <div className={styles.toggle4}>
        <div
          className={styles.toggleSlider4}
          style={{ transform: `translateX(${modeIndex * 100}%)` }}
        />
        <button
          className={`${styles.toggleButton4} ${mode === 'percentile' ? styles.toggleActive : ''}`}
          onClick={() => onModeChange('percentile')}
          title="Flow Level"
        >
          <Gauge size={14} />
          <span>Level</span>
        </button>
        <button
          className={`${styles.toggleButton4} ${mode === 'trend' ? styles.toggleActive : ''}`}
          onClick={() => onModeChange('trend')}
          title="Flow Trend"
        >
          <TrendingUp size={14} />
          <span>Trend</span>
        </button>
        <button
          className={`${styles.toggleButton4} ${mode === 'temperature' ? styles.toggleActive : ''}`}
          onClick={() => onModeChange('temperature')}
          title="Water Temperature"
        >
          <Thermometer size={14} />
          <span>Temp</span>
        </button>
        <button
          className={`${styles.toggleButton4} ${mode === 'temp_trend' ? styles.toggleActive : ''}`}
          onClick={() => onModeChange('temp_trend')}
          title="Temperature Trend"
        >
          <Sun size={14} />
          <span>T-Trend</span>
        </button>
      </div>

      {/* Legend */}
      <div className={styles.legend}>
        {mode === 'percentile' && (
          <div className={styles.iconLegend}>
            <div className={styles.iconLegendItem}>
              <div className={styles.iconSquare} data-variant="pctl-low">
                <Gauge size={18} strokeWidth={2.5} />
              </div>
              <span>Low</span>
            </div>
            <div className={styles.iconLegendItem}>
              <div className={styles.iconSquare} data-variant="pctl-normal">
                <Gauge size={18} strokeWidth={2.5} />
              </div>
              <span>Normal</span>
            </div>
            <div className={styles.iconLegendItem}>
              <div className={styles.iconSquare} data-variant="pctl-high">
                <Gauge size={18} strokeWidth={2.5} />
              </div>
              <span>High</span>
            </div>
          </div>
        )}

        {mode === 'trend' && (
          <div className={styles.iconLegend}>
            <div className={styles.iconLegendItem}>
              <div className={styles.iconSquare} data-variant="trend-rising">
                <TrendingUp size={18} strokeWidth={2.5} />
              </div>
              <span>Rising</span>
            </div>
            <div className={styles.iconLegendItem}>
              <div className={styles.iconSquare} data-variant="trend-stable">
                <Minus size={18} strokeWidth={2.5} />
              </div>
              <span>Stable</span>
            </div>
            <div className={styles.iconLegendItem}>
              <div className={styles.iconSquare} data-variant="trend-falling">
                <TrendingDown size={18} strokeWidth={2.5} />
              </div>
              <span>Falling</span>
            </div>
          </div>
        )}

        {mode === 'temperature' && (
          <div className={styles.iconLegend}>
            <div className={styles.iconLegendItem}>
              <div className={styles.iconSquare} data-variant="temp-cold">
                <ThermometerSnowflake size={18} strokeWidth={2.5} />
              </div>
              <span>Cold</span>
            </div>
            <div className={styles.iconLegendItem}>
              <div className={styles.iconSquare} data-variant="temp-moderate">
                <Thermometer size={18} strokeWidth={2.5} />
              </div>
              <span>Moderate</span>
            </div>
            <div className={styles.iconLegendItem}>
              <div className={styles.iconSquare} data-variant="temp-hot">
                <Sun size={18} strokeWidth={2.5} />
              </div>
              <span>Hot</span>
            </div>
          </div>
        )}

        {mode === 'temp_trend' && (
          <div className={styles.iconLegend}>
            <div className={styles.iconLegendItem}>
              <div className={styles.iconSquare} data-variant="ttrend-cooling">
                <TrendingDown size={18} strokeWidth={2.5} />
              </div>
              <span>Cooling</span>
            </div>
            <div className={styles.iconLegendItem}>
              <div className={styles.iconSquare} data-variant="ttrend-stable">
                <Minus size={18} strokeWidth={2.5} />
              </div>
              <span>Stable</span>
            </div>
            <div className={styles.iconLegendItem}>
              <div className={styles.iconSquare} data-variant="ttrend-warming">
                <TrendingUp size={18} strokeWidth={2.5} />
              </div>
              <span>Warming</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
