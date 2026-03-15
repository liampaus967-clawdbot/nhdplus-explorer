'use client';

import { MapPin, Navigation, Trash2, TreePine } from 'lucide-react';
import { BwcaRouteResult } from '../../types';
import styles from './BwcaSidebar.module.css';

interface BwcaSidebarProps {
  startPoint: { lng: number; lat: number } | null;
  endPoint: { lng: number; lat: number } | null;
  route: BwcaRouteResult | null;
  loading: boolean;
  error: string | null;
  onClearRoute: () => void;
}

export function BwcaSidebar({
  startPoint,
  endPoint,
  route,
  loading,
  error,
  onClearRoute,
}: BwcaSidebarProps) {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <TreePine size={24} />
        <h2>Boundary Waters</h2>
      </div>

      <div className={styles.instructions}>
        <p>Click on the map to set your start and end points for paddle routing through the BWCA.</p>
      </div>

      <div className={styles.points}>
        <div className={styles.point}>
          <MapPin size={18} className={styles.startIcon} />
          <span className={styles.label}>Start:</span>
          <span className={styles.value}>
            {startPoint 
              ? `${startPoint.lat.toFixed(4)}, ${startPoint.lng.toFixed(4)}`
              : 'Click to set'}
          </span>
        </div>
        <div className={styles.point}>
          <Navigation size={18} className={styles.endIcon} />
          <span className={styles.label}>End:</span>
          <span className={styles.value}>
            {endPoint
              ? `${endPoint.lat.toFixed(4)}, ${endPoint.lng.toFixed(4)}`
              : 'Click to set'}
          </span>
        </div>
      </div>

      {loading && (
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <span>Calculating route...</span>
        </div>
      )}

      {error && (
        <div className={styles.error}>
          {error}
        </div>
      )}

      {route && (
        <div className={styles.routeInfo}>
          <h3>Route Details</h3>
          <div className={styles.stats}>
            <div className={styles.stat}>
              <span className={styles.statLabel}>Distance</span>
              <span className={styles.statValue}>
                {(route.distance_km * 0.621371).toFixed(1)} mi
              </span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statLabel}>Paddle Segments</span>
              <span className={styles.statValue}>{route.paddle_segments}</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statLabel}>Portages</span>
              <span className={styles.statValue}>{route.portage_count}</span>
            </div>
          </div>
          
          <button className={styles.clearBtn} onClick={onClearRoute}>
            <Trash2 size={16} />
            Clear Route
          </button>
        </div>
      )}

      {!route && !loading && startPoint && endPoint && (
        <div className={styles.noRoute}>
          <p>No route found between these points. Try selecting points closer to the trail network.</p>
        </div>
      )}
    </div>
  );
}
