'use client';

import { Anchor, MapPin, Pencil, Undo2, Save, ArrowUp, X } from 'lucide-react';
import { LakeDrawingMode, LakeRoute, LakeWaypoint } from '../../types';
import styles from './LakeSidebar.module.css';

interface LakeSidebarProps {
  drawingMode: LakeDrawingMode;
  onDrawingModeChange: (mode: LakeDrawingMode) => void;
  paddleSpeed: number;
  onPaddleSpeedChange: (speed: number) => void;
  lakeRoute: LakeRoute | null;
  waypoints: LakeWaypoint[];
  onDeleteWaypoint: (id: string) => void;
  onUndo: () => void;
  onSaveRoute: () => void;
  isDrawing: boolean;
}

export function LakeSidebar({
  drawingMode,
  onDrawingModeChange,
  paddleSpeed,
  onPaddleSpeedChange,
  lakeRoute,
  waypoints,
  onDeleteWaypoint,
  onUndo,
  onSaveRoute,
  isDrawing,
}: LakeSidebarProps) {
  const hasRoute = lakeRoute && lakeRoute.distance_mi > 0;
  
  // Calculate paddle time based on distance and speed
  const paddleTimeMin = hasRoute ? (lakeRoute.distance_mi / paddleSpeed) * 60 : 0;
  const paddleTimeFormatted = paddleTimeMin > 0 
    ? `${Math.floor(paddleTimeMin / 60)}:${String(Math.floor(paddleTimeMin % 60)).padStart(2, '0')}`
    : '0:00';

  return (
    <div className={styles.sidebar}>
      {/* Header Card */}
      <div className={`${styles.card} ${styles.headerCard}`}>
        <div className={styles.modeTag}>
          <Anchor size={16} />
          Lake Mode
        </div>
        <h2 className={styles.lakeName}>Lake Route</h2>
      </div>

      {/* Drawing Mode */}
      <div className={styles.card}>
        <div className={styles.sectionLabel}>DRAWING MODE</div>
        <div className={styles.drawingToggle}>
          <button
            className={`${styles.toggleBtn} ${drawingMode === 'waypoint' ? styles.toggleBtnActive : ''}`}
            onClick={() => onDrawingModeChange('waypoint')}
          >
            <MapPin size={14} />
            Waypoint
          </button>
          <button
            className={`${styles.toggleBtn} ${drawingMode === 'freehand' ? styles.toggleBtnActive : ''}`}
            onClick={() => onDrawingModeChange('freehand')}
          >
            <Pencil size={14} />
            Freehand
          </button>
        </div>
        
        {/* Mode-specific instructions */}
        <div className={styles.instructions} style={{ marginTop: '12px' }}>
          {drawingMode === 'waypoint' ? (
            <>
              <strong>Waypoint Mode:</strong> Click on the map to add waypoints. 
              A route line will connect your points. Click waypoints to select and delete them.
            </>
          ) : (
            <>
              <strong>Freehand Mode:</strong> Click to start drawing, move your mouse to trace your route, 
              then click again to finish. The line will be smoothed automatically.
            </>
          )}
        </div>
      </div>

      {/* Waypoint List (only in waypoint mode) */}
      {drawingMode === 'waypoint' && waypoints.length > 0 && (
        <div className={styles.card}>
          <div className={styles.sectionLabel}>WAYPOINTS ({waypoints.length})</div>
          <div className={styles.waypointList}>
            {waypoints.map((wp, idx) => (
              <div key={wp.id} className={styles.waypointItem}>
                <div className={styles.waypointInfo}>
                  <span className={styles.waypointIndex}>{idx + 1}</span>
                  <span className={styles.waypointCoords}>
                    {wp.lat.toFixed(4)}, {wp.lng.toFixed(4)}
                  </span>
                </div>
                <button
                  className={styles.waypointDelete}
                  onClick={() => onDeleteWaypoint(wp.id)}
                  title="Delete waypoint"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Freehand drawing state */}
      {drawingMode === 'freehand' && isDrawing && (
        <div className={styles.card}>
          <div className={styles.instructions}>
            <strong>Drawing...</strong> Click again to finish your route.
          </div>
        </div>
      )}

      {/* Paddle Speed */}
      <div className={styles.card}>
        <div className={styles.paddleHeader}>
          <div className={styles.sectionLabel}>PADDLE SPEED</div>
          <span className={styles.paddleValue}>{paddleSpeed.toFixed(1)} mph</span>
        </div>
        <input
          type="range"
          min="1"
          max="5"
          step="0.1"
          value={paddleSpeed}
          onChange={(e) => onPaddleSpeedChange(parseFloat(e.target.value))}
          className={styles.slider}
        />
        <div className={styles.sliderLabels}>
          <span>1 mph</span>
          <span>5 mph</span>
        </div>
        <div className={styles.hint}>Avg kayak: 3 mph • Avg canoe: 2.5 mph</div>
      </div>

      {/* Trip Stats */}
      <div className={styles.card}>
        <div className={styles.sectionLabel}>TRIP STATS</div>
        <div className={styles.statsRow}>
          <div className={styles.statCard}>
            <span className={styles.statValue}>
              {hasRoute ? lakeRoute.distance_mi.toFixed(1) : '0.0'}
            </span>
            <span className={styles.statLabel}>miles</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{paddleTimeFormatted}</span>
            <span className={styles.statLabel}>paddle time</span>
          </div>
        </div>
      </div>

      {/* Wind Conditions (placeholder - would be live data) */}
      <div className={styles.card}>
        <div className={styles.paddleHeader}>
          <div className={styles.sectionLabel}>WIND CONDITIONS</div>
          <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>Live</span>
        </div>
        <div className={styles.windRow}>
          <div className={styles.compass}>
            <span className={`${styles.compassLabel} ${styles.compassN}`}>N</span>
            <span className={`${styles.compassLabel} ${styles.compassS}`}>S</span>
            <span className={`${styles.compassLabel} ${styles.compassE}`}>E</span>
            <span className={`${styles.compassLabel} ${styles.compassW}`}>W</span>
            <ArrowUp size={24} className={styles.windArrow} />
          </div>
          <div className={styles.windInfo}>
            <span className={styles.windSpeed}>12 mph SW</span>
            <span className={styles.windGusts}>Gusts to 18 mph</span>
            <span className={styles.windWarning}>Moderate chop expected</span>
          </div>
        </div>
      </div>

      {/* Route Exposure (placeholder) */}
      {hasRoute && (
        <div className={styles.card}>
          <div className={styles.sectionLabel}>ROUTE EXPOSURE</div>
          <div className={styles.exposureBar}>
            <div className={`${styles.exposureSegment} ${styles.sheltered}`} style={{ width: '30%' }} />
            <div className={`${styles.exposureSegment} ${styles.moderate}`} style={{ width: '40%' }} />
            <div className={`${styles.exposureSegment} ${styles.exposed}`} style={{ width: '30%' }} />
          </div>
          <div className={styles.exposureLegend}>
            <div className={styles.legendItem}>
              <div className={`${styles.legendDot} ${styles.sheltered}`} />
              <span className={styles.legendText}>Sheltered 30%</span>
            </div>
            <div className={styles.legendItem}>
              <div className={`${styles.legendDot} ${styles.moderate}`} />
              <span className={styles.legendText}>Moderate 40%</span>
            </div>
            <div className={styles.legendItem}>
              <div className={`${styles.legendDot} ${styles.exposed}`} />
              <span className={styles.legendText}>Exposed 30%</span>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className={styles.actionButtons}>
        <button
          className={styles.actionBtn}
          onClick={onUndo}
          disabled={waypoints.length === 0 && !hasRoute}
        >
          <Undo2 size={16} />
          Undo
        </button>
        <button
          className={`${styles.actionBtn} ${styles.saveBtn}`}
          onClick={onSaveRoute}
          disabled={!hasRoute}
        >
          <Save size={16} />
          Save Route
        </button>
      </div>
    </div>
  );
}
