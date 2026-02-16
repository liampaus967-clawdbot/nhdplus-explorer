'use client';

import { RouteStats } from '../../types';
import { formatTime } from '../../utils';
import styles from '../../page.module.css';

interface StatsSectionProps {
  stats: RouteStats;
}

export function StatsSection({ stats }: StatsSectionProps) {
  const isUpstream = stats.direction?.is_upstream;

  return (
    <div className={styles.section}>
      <h3>
        📊 Trip Stats{' '}
        {isUpstream && <span className={styles.upstreamBadge}>⬆️ UPSTREAM</span>}
      </h3>
      <div className={styles.statGrid}>
        <div className={styles.stat}>
          <span className={styles.statValue}>{stats.distance_mi}</span>
          <span className={styles.statLabel}>miles</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>
            {formatTime(stats.float_time_s)}
            {stats.has_impossible_segments ? '+' : ''}
          </span>
          <span className={styles.statLabel}>
            {isUpstream ? 'paddle time' : 'float time'}
            {stats.has_impossible_segments ? ' ⚠️' : ''}
          </span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>
            {isUpstream ? `+${stats.elev_gain_ft || 0}` : stats.elev_drop_ft}
          </span>
          <span className={styles.statLabel}>
            {isUpstream ? 'ft gain ⬆️' : 'ft drop'}
          </span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{stats.gradient_ft_mi}</span>
          <span className={styles.statLabel}>ft/mi</span>
        </div>
      </div>
      {stats.waterways.length > 0 && (
        <div className={styles.waterways}>Via: {stats.waterways.join(' → ')}</div>
      )}
    </div>
  );
}
