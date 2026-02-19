'use client';

import { Undo2, Trash2, Check, MapPin, Pencil } from 'lucide-react';
import { LakeDrawingMode } from '../../types';
import styles from './DrawingControls.module.css';

interface DrawingControlsProps {
  visible: boolean;
  drawingMode: LakeDrawingMode;
  waypointCount: number;
  hasRoute: boolean;
  isDrawing: boolean;
  onUndo: () => void;
  onClear: () => void;
  onSubmit: () => void;
}

export function DrawingControls({
  visible,
  drawingMode,
  waypointCount,
  hasRoute,
  isDrawing,
  onUndo,
  onClear,
  onSubmit,
}: DrawingControlsProps) {
  if (!visible) return null;

  return (
    <div className={styles.controls}>
      {/* Mode indicator */}
      <div className={styles.modeIndicator}>
        <span className={styles.dot} />
        {drawingMode === 'waypoint' ? (
          <>
            <MapPin size={14} />
            Waypoint
          </>
        ) : (
          <>
            <Pencil size={14} />
            {isDrawing ? 'Drawing...' : 'Freehand'}
          </>
        )}
        {waypointCount > 0 && (
          <span className={styles.badge}>{waypointCount}</span>
        )}
      </div>

      {/* Undo */}
      <button
        className={`${styles.btn} ${styles.undoBtn}`}
        onClick={onUndo}
        disabled={waypointCount === 0 && !hasRoute}
        title="Undo last point"
      >
        <Undo2 size={16} />
        Undo
      </button>

      {/* Clear */}
      <button
        className={`${styles.btn} ${styles.clearBtn}`}
        onClick={onClear}
        disabled={waypointCount === 0 && !hasRoute}
        title="Clear route"
      >
        <Trash2 size={16} />
        Clear
      </button>

      {/* Submit */}
      <button
        className={`${styles.btn} ${styles.submitBtn}`}
        onClick={onSubmit}
        disabled={waypointCount < 2}
        title="Finish route"
      >
        <Check size={16} />
        Done
      </button>
    </div>
  );
}
