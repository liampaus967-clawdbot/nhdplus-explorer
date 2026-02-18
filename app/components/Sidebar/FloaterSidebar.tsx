'use client';

import { MapPin, Flag } from 'lucide-react';
import { RouteResult, SnapResult } from '../../types';
import { ModeTag } from './shared/ModeTag';
import { WeatherConditions } from './shared/WeatherConditions';
import styles from './FloaterSidebar.module.css';
import sharedStyles from './shared/shared.module.css';

interface FloaterSidebarProps {
  route: RouteResult;
  putIn: SnapResult | null;
  takeOut: SnapResult | null;
  onClearRoute: () => void;
}

export function FloaterSidebar({ route, putIn, takeOut, onClearRoute }: FloaterSidebarProps) {
  const { stats } = route;
  const riverName = stats.waterways?.[0] || 'Unknown River';

  const hours = Math.floor(stats.float_time_h);
  const minutes = Math.round((stats.float_time_h - hours) * 60);

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={`${styles.card} ${styles.headerCard}`}>
        <ModeTag mode="floater" />
        <div className={styles.riverName}>{riverName}</div>
      </div>

      {/* Clear Route */}
      <button className={sharedStyles.clearRouteBtn} onClick={onClearRoute}>
        Clear Route
      </button>

      {/* Float Time */}
      <div className={`${styles.card} ${styles.floatTimeCard}`}>
        <span className={styles.sectionLabel}>FLOAT TIME</span>
        <div className={styles.floatTimeDisplay}>
          <span className={styles.floatTimeNum}>{hours}</span>
          <span className={styles.floatTimeUnit}>h</span>
          <span className={styles.floatTimeNum}>{minutes.toString().padStart(2, '0')}</span>
          <span className={styles.floatTimeUnit}>m</span>
        </div>
        <span className={styles.floatTimeSubtext}>at current river conditions</span>
      </div>

      {/* Route A/B Points */}
      <div className={`${styles.card} ${styles.routeCard}`}>
        <span className={styles.sectionLabel}>ROUTE</span>
        <div className={styles.routePoint}>
          <div className={styles.routeIconBg}>
            <MapPin size={18} color="var(--accent)" />
          </div>
          <div className={styles.routePointInfo}>
            <div className={styles.routePointLabel}>Put-in</div>
            <div className={styles.routePointName}>
              {putIn?.gnis_name || (putIn ? `${putIn.snap_point.lat.toFixed(4)}, ${putIn.snap_point.lng.toFixed(4)}` : '—')}
            </div>
          </div>
        </div>
        <div className={styles.routeConnector} />
        <div className={styles.routePoint}>
          <div className={styles.routeIconBg}>
            <Flag size={18} color="var(--accent)" />
          </div>
          <div className={styles.routePointInfo}>
            <div className={styles.routePointLabel}>Take-out</div>
            <div className={styles.routePointName}>
              {takeOut?.gnis_name || (takeOut ? `${takeOut.snap_point.lat.toFixed(4)}, ${takeOut.snap_point.lng.toFixed(4)}` : '—')}
            </div>
          </div>
        </div>
      </div>

      {/* Trip Info */}
      <div className={`${styles.card} ${styles.tripInfoCard}`}>
        <span className={styles.sectionLabel}>TRIP INFO</span>
        <div className={styles.tripInfoRow}>
          <span className={styles.tripInfoLabel}>Distance</span>
          <span className={styles.tripInfoValue}>{stats.distance_mi.toFixed(1)} miles</span>
        </div>
      </div>

      {/* Conditions - Zero States */}
      <div className={`${styles.card} ${styles.conditionsCard}`}>
        <span className={styles.sectionLabel}>CONDITIONS</span>

        {/* Water Level */}
        <div className={styles.conditionItem}>
          <div className={styles.conditionHeader}>
            <span className={styles.conditionName}>Water Level</span>
            <span className={`${styles.conditionBadge} ${styles.conditionGood}`}>Normal</span>
          </div>
          <div className={styles.conditionTrack}>
            <div className={styles.conditionFill} style={{ width: '50%', background: 'var(--success)' }} />
          </div>
          <div className={styles.conditionLabels}>
            <span>Low</span>
            <span>Normal</span>
            <span>High</span>
          </div>
        </div>

        {/* Hazards */}
        <div className={styles.conditionItem}>
          <div className={styles.conditionHeader}>
            <span className={styles.conditionName}>Hazards</span>
            <span className={`${styles.conditionBadge} ${styles.conditionGood}`}>Clear</span>
          </div>
          <div className={styles.hazardRow}>
            <span className={styles.hazardChip}>No advisories</span>
          </div>
        </div>

        {/* Difficulty */}
        <div className={styles.conditionItem}>
          <div className={styles.conditionHeader}>
            <span className={styles.conditionName}>Difficulty</span>
            <span className={`${styles.conditionBadge} ${styles.conditionGood}`}>
              {stats.gradient_ft_mi < 5 ? 'Easy' : stats.gradient_ft_mi < 15 ? 'Moderate' : 'Difficult'}
            </span>
          </div>
          <div className={styles.conditionTrack}>
            <div
              className={styles.conditionFill}
              style={{
                width: `${Math.min(stats.gradient_ft_mi / 30 * 100, 100)}%`,
                background: stats.gradient_ft_mi < 5 ? 'var(--success)' : stats.gradient_ft_mi < 15 ? 'var(--warning)' : 'var(--danger)',
              }}
            />
          </div>
          <div className={styles.conditionLabels}>
            <span>Easy</span>
            <span>Moderate</span>
            <span>Difficult</span>
          </div>
        </div>
      </div>

      {/* Weather */}
      <WeatherConditions 
        lat={putIn?.snap_point.lat ?? null} 
        lng={putIn?.snap_point.lng ?? null} 
      />
    </div>
  );
}
