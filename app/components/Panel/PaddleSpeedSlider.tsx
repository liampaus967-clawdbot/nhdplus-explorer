'use client';

import { RouteStats } from '../../types';
import styles from '../../page.module.css';

interface PaddleSpeedSliderProps {
  speed: number;
  onChange: (speed: number) => void;
  stats?: RouteStats;
}

export function PaddleSpeedSlider({ speed, onChange, stats }: PaddleSpeedSliderProps) {
  const isUpstream = stats?.direction?.is_upstream;
  const impossibleSegments = stats?.direction?.impossible_segments || 0;

  return (
    <div className={styles.section}>
      <h3>🚣 Paddle Speed</h3>
      <div className={styles.sliderContainer}>
        <input
          type="range"
          min="0"
          max="6"
          step="0.1"
          value={speed}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className={styles.slider}
        />
        <div className={styles.sliderLabels}>
          <span>0 mph</span>
          <span>
            <strong>{speed} mph</strong>
          </span>
          <span>6 mph</span>
        </div>
      </div>
      {isUpstream && (
        <div className={styles.upstreamInfo}>
          ⬆️ Paddling upstream at {speed} mph against{' '}
          {stats?.live_conditions?.avg_velocity_mph || '~0.5'} mph current
        </div>
      )}
      {impossibleSegments > 0 && (
        <div className={styles.impossibleWarning}>
          ⚠️ {impossibleSegments} segments have currents faster than your paddle speed!
        </div>
      )}
    </div>
  );
}
