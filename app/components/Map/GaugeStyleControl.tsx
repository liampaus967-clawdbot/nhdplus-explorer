'use client';

import React from 'react';
import styles from './GaugeStyleControl.module.css';

export type GaugeStyleMode = 'percentile' | 'trend';

interface GaugeStyleControlProps {
  mode: GaugeStyleMode;
  onModeChange: (mode: GaugeStyleMode) => void;
  visible?: boolean;
}

const MODES: { id: GaugeStyleMode; label: string; icon: string }[] = [
  { id: 'percentile', label: 'Flow Level', icon: '💧' },
  { id: 'trend', label: 'Rising/Falling', icon: '📈' },
];

export function GaugeStyleControl({ mode, onModeChange, visible = true }: GaugeStyleControlProps) {
  if (!visible) return null;

  return (
    <div className={styles.container}>
      <div className={styles.label}>Gauge Display</div>
      <div className={styles.buttons}>
        {MODES.map((m) => (
          <button
            key={m.id}
            className={`${styles.button} ${mode === m.id ? styles.active : ''}`}
            onClick={() => onModeChange(m.id)}
            title={m.label}
          >
            <span className={styles.icon}>{m.icon}</span>
            <span className={styles.text}>{m.label}</span>
          </button>
        ))}
      </div>
      <div className={styles.legend}>
        {mode === 'percentile' ? (
          <>
            <div className={styles.legendItem}>
              <span className={styles.dot} style={{ background: '#dc2626' }} />
              <span>Very Low</span>
            </div>
            <div className={styles.legendItem}>
              <span className={styles.dot} style={{ background: '#f97316' }} />
              <span>Low</span>
            </div>
            <div className={styles.legendItem}>
              <span className={styles.dot} style={{ background: '#22c55e' }} />
              <span>Normal</span>
            </div>
            <div className={styles.legendItem}>
              <span className={styles.dot} style={{ background: '#3b82f6' }} />
              <span>High</span>
            </div>
            <div className={styles.legendItem}>
              <span className={styles.dot} style={{ background: '#7c3aed' }} />
              <span>Very High</span>
            </div>
          </>
        ) : (
          <>
            <div className={styles.legendItem}>
              <span className={styles.dot} style={{ background: '#3b82f6' }} />
              <span>Rising</span>
            </div>
            <div className={styles.legendItem}>
              <span className={styles.dot} style={{ background: '#22c55e' }} />
              <span>Stable</span>
            </div>
            <div className={styles.legendItem}>
              <span className={styles.dot} style={{ background: '#ef4444' }} />
              <span>Falling</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
