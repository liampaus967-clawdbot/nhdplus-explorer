'use client';

import { LiveConditions as LiveConditionsType } from '../../types';
import styles from '../../page.module.css';

interface LiveConditionsProps {
  conditions: LiveConditionsType;
}

export function LiveConditions({ conditions }: LiveConditionsProps) {
  if (conditions.nwm_coverage_percent <= 0) return null;

  const flowStatusClass = conditions.flow_status
    ? `flow${conditions.flow_status.charAt(0).toUpperCase()}${conditions.flow_status.slice(1)}`
    : '';

  return (
    <div className={styles.section}>
      <h3>
        <span className={styles.liveIndicator}>●</span> Live Conditions
      </h3>

      <div className={styles.liveStats}>
        {/* Current Flow Status */}
        <div className={styles.flowStatusRow}>
          <span className={styles.flowStatusLabel}>Flow Status</span>
          <span className={`${styles.flowStatusBadge} ${styles[flowStatusClass]}`}>
            {conditions.flow_status === 'high'
              ? '↑ High'
              : conditions.flow_status === 'low'
              ? '↓ Low'
              : '~ Normal'}
          </span>
        </div>

        {/* Water Speed & Flow */}
        <div className={styles.comparisonGrid}>
          <div className={styles.comparisonItem}>
            <span className={styles.comparisonValue}>
              {conditions.avg_velocity_mph || '—'}
            </span>
            <span className={styles.comparisonLabel}>Water Speed</span>
            {conditions.min_velocity_mph !== undefined && conditions.max_velocity_mph !== undefined && (
              <span className={styles.velocityRange}>
                ({conditions.min_velocity_mph}–{conditions.max_velocity_mph})
              </span>
            )}
          </div>
          <div className={styles.comparisonItem}>
            <span className={styles.comparisonValue}>
              {conditions.baseline_velocity_mph || '—'}
            </span>
            <span className={styles.comparisonLabel}>Avg (EROM)</span>
          </div>
          <div className={styles.comparisonItem}>
            <span className={styles.comparisonValue}>
              {conditions.avg_streamflow_cfs ? `${conditions.avg_streamflow_cfs}` : '—'}
            </span>
            <span className={styles.comparisonLabel}>Flow (CFS)</span>
          </div>
        </div>

        {/* Time Difference */}
        {conditions.time_diff_s !== 0 && (
          <div className={styles.timeDiff}>
            {conditions.time_diff_s > 0 ? (
              <span className={styles.timeFaster}>
                🎉 {Math.abs(Math.round(conditions.time_diff_s / 60))} min faster than average!
              </span>
            ) : (
              <span className={styles.timeSlower}>
                ⏱️ {Math.abs(Math.round(conditions.time_diff_s / 60))} min slower than average
              </span>
            )}
          </div>
        )}

        {/* Data Source */}
        <div className={styles.dataSource}>
          <span>NOAA NWM • {conditions.nwm_coverage_percent}% coverage</span>
          {conditions.data_timestamp && (
            <span> • {new Date(conditions.data_timestamp).toLocaleTimeString()}</span>
          )}
        </div>
      </div>
    </div>
  );
}
