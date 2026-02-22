'use client';

import React from 'react';
import styles from './GaugeStyleControl.module.css';

export type GaugeStyleMode = 'percentile' | 'trend';

interface GaugeStyleControlProps {
  mode: GaugeStyleMode;
  onModeChange: (mode: GaugeStyleMode) => void;
  visible?: boolean;
}

export function GaugeStyleControl({ mode, onModeChange, visible = true }: GaugeStyleControlProps) {
  if (!visible) return null;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <svg className={styles.headerIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2v6m0 8v6M4.93 4.93l4.24 4.24m5.66 5.66l4.24 4.24M2 12h6m8 0h6M4.93 19.07l4.24-4.24m5.66-5.66l4.24-4.24" />
        </svg>
        <span>Flow Gauges</span>
      </div>

      {/* Segmented Toggle */}
      <div className={styles.toggle}>
        <div 
          className={styles.toggleSlider} 
          style={{ transform: mode === 'trend' ? 'translateX(100%)' : 'translateX(0)' }} 
        />
        <button
          className={`${styles.toggleButton} ${mode === 'percentile' ? styles.toggleActive : ''}`}
          onClick={() => onModeChange('percentile')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
          </svg>
          <span>Level</span>
        </button>
        <button
          className={`${styles.toggleButton} ${mode === 'trend' ? styles.toggleActive : ''}`}
          onClick={() => onModeChange('trend')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
            <polyline points="17 6 23 6 23 12" />
          </svg>
          <span>Trend</span>
        </button>
      </div>

      {/* Legend */}
      <div className={styles.legend}>
        {mode === 'percentile' ? (
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
        ) : (
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
      </div>
    </div>
  );
}
