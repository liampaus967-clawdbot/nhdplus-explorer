'use client';

import { SnapResult } from '../../types';
import styles from '../../page.module.css';

interface RouteSectionProps {
  putIn: SnapResult | null;
  takeOut: SnapResult | null;
  loading: boolean;
  onClear: () => void;
}

export function RouteSection({ putIn, takeOut, loading, onClear }: RouteSectionProps) {
  return (
    <div className={styles.section}>
      <h3>📍 Route</h3>
      <div className={styles.routeInputs}>
        <div className={styles.inputRow}>
          <span className={`${styles.dot} ${styles.putInDot}`}></span>
          <span className={putIn ? styles.inputSet : styles.inputLabel}>
            {putIn
              ? `${putIn.gnis_name || 'River'} (${putIn.snap_point.lat.toFixed(4)}, ${putIn.snap_point.lng.toFixed(4)})`
              : 'Click map to set put-in'}
          </span>
        </div>
        <div className={styles.inputRow}>
          <span className={`${styles.dot} ${styles.takeOutDot}`}></span>
          <span className={takeOut ? styles.inputSet : styles.inputLabel}>
            {takeOut
              ? `${takeOut.gnis_name || 'River'} (${takeOut.snap_point.lat.toFixed(4)}, ${takeOut.snap_point.lng.toFixed(4)})`
              : putIn
              ? 'Click map to set take-out'
              : 'Then click to set take-out'}
          </span>
        </div>
      </div>
      {(putIn || loading) && (
        <button className={styles.clearBtn} onClick={onClear} disabled={loading}>
          {loading ? 'Loading...' : 'Clear Route'}
        </button>
      )}
    </div>
  );
}
