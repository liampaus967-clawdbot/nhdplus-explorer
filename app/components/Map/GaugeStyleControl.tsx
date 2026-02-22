'use client';

import React from 'react';
import styles from './GaugeStyleControl.module.css';

export type GaugeStyleMode = 'percentile' | 'trend' | 'temperature';

interface GaugeStyleControlProps {
  mode: GaugeStyleMode;
  onModeChange: (mode: GaugeStyleMode) => void;
  visible?: boolean;
}

const MODES: { id: GaugeStyleMode; label: string; shortLabel: string }[] = [
  { id: 'percentile', label: 'Flow Level', shortLabel: 'Level' },
  { id: 'trend', label: 'Flow Trend', shortLabel: 'Trend' },
  { id: 'temperature', label: 'Water Temp', shortLabel: 'Temp' },
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

      {/* 3-way Segmented Toggle */}
      <div className={styles.toggle3}>
        <div 
          className={styles.toggleSlider3} 
          style={{ transform: `translateX(${modeIndex * 100}%)` }} 
        />
        <button
          className={`${styles.toggleButton3} ${mode === 'percentile' ? styles.toggleActive : ''}`}
          onClick={() => onModeChange('percentile')}
          title="Flow Level"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
          </svg>
          <span>Level</span>
        </button>
        <button
          className={`${styles.toggleButton3} ${mode === 'trend' ? styles.toggleActive : ''}`}
          onClick={() => onModeChange('trend')}
          title="Flow Trend"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
            <polyline points="16 7 22 7 22 13" />
          </svg>
          <span>Trend</span>
        </button>
        <button
          className={`${styles.toggleButton3} ${mode === 'temperature' ? styles.toggleActive : ''}`}
          onClick={() => onModeChange('temperature')}
          title="Water Temperature"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0z" />
          </svg>
          <span>Temp</span>
        </button>
      </div>

      {/* Legend */}
      <div className={styles.legend}>
        {mode === 'percentile' && (
          <>
            <div className={styles.gradientBar}>
              <div className={styles.gradientTrack} />
            </div>
            <div className={styles.gradientLabels}>
              <span>Very Low</span>
              <span>Low</span>
              <span>Normal</span>
              <span>High</span>
              <span>Very High</span>
            </div>
            <div className={styles.percentileHint}>
              Based on historical percentile
            </div>
          </>
        )}

        {mode === 'trend' && (
          <div className={styles.trendLegend}>
            <div className={styles.trendItem}>
              <div className={styles.trendIcon} data-trend="rising">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 19V5M5 12l7-7 7 7" />
                </svg>
              </div>
              <span>Rising</span>
            </div>
            <div className={styles.trendItem}>
              <div className={styles.trendIcon} data-trend="stable">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12h14" />
                </svg>
              </div>
              <span>Stable</span>
            </div>
            <div className={styles.trendItem}>
              <div className={styles.trendIcon} data-trend="falling">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 5v14M5 12l7 7 7-7" />
                </svg>
              </div>
              <span>Falling</span>
            </div>
          </div>
        )}

        {mode === 'temperature' && (
          <>
            <div className={styles.gradientBar}>
              <div className={styles.tempGradientTrack} />
            </div>
            <div className={styles.gradientLabels}>
              <span>Cold</span>
              <span>Cool</span>
              <span>Moderate</span>
              <span>Warm</span>
              <span>Hot</span>
            </div>
            <div className={styles.percentileHint}>
              Water temperature (°F)
            </div>
          </>
        )}
      </div>
    </div>
  );
}
