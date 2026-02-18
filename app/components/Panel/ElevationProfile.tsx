'use client';

import { useEffect } from 'react';
import { ElevationPoint, SteepSection } from '../../types';
import styles from '../../page.module.css';

interface ProfileSelection {
  startM: number;
  endM: number;
}

interface ElevationProfileProps {
  profile: ElevationPoint[];
  steepSections: SteepSection[];
  canvasRef: React.RefObject<HTMLCanvasElement>;
  drawProfile: (profile: ElevationPoint[], steepSections: SteepSection[]) => void;
  selection: ProfileSelection | null;
  onClearSelection: () => void;
  onMouseDown: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onMouseMove: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onMouseUp: () => void;
  onMouseLeave: () => void;
}

export function ElevationProfile({
  profile,
  steepSections,
  canvasRef,
  drawProfile,
  selection,
  onClearSelection,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onMouseLeave,
}: ElevationProfileProps) {
  // Draw the profile when the component mounts or profile data changes
  useEffect(() => {
    if (!profile || profile.length < 2) return;

    // Use requestAnimationFrame to ensure the canvas is laid out
    const frameId = requestAnimationFrame(() => {
      drawProfile(profile, steepSections);
    });

    return () => cancelAnimationFrame(frameId);
  }, [profile, steepSections, drawProfile]);

  if (!profile || profile.length === 0) return null;

  return (
    <div className={styles.section}>
      <h3>Elevation Profile</h3>
      <canvas
        ref={canvasRef}
        className={styles.elevationChart}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
      />
      {selection && Math.abs(selection.endM - selection.startM) > 100 && (
        <div className={styles.selectionInfo}>
          Selection: {((Math.abs(selection.endM - selection.startM)) / 1609.34).toFixed(2)} mi
          <button className={styles.clearSelectionBtn} onClick={onClearSelection}>
            Clear
          </button>
        </div>
      )}
      <div className={styles.legend}>
        <span className={styles.legendItem}>
          <span className={styles.legendColor} style={{ background: '#60a5fa' }}></span>
          Pool (&lt;5 ft/mi)
        </span>
        <span className={styles.legendItem}>
          <span className={styles.legendColor} style={{ background: '#facc15' }}></span>
          Riffle (5-15)
        </span>
        <span className={styles.legendItem}>
          <span className={styles.legendColor} style={{ background: '#fb923c' }}></span>
          Rapid I-II (15-30)
        </span>
        <span className={styles.legendItem}>
          <span className={styles.legendColor} style={{ background: '#ef4444' }}></span>
          Rapid III+ (&gt;30)
        </span>
      </div>
      {steepSections && steepSections.length > 0 && (
        <div className={styles.steepWarning}>
          {steepSections.length} potential rapid/riffle section
          {steepSections.length > 1 ? 's' : ''} detected
        </div>
      )}
    </div>
  );
}
