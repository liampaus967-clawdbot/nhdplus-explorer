'use client';

import { Anchor, MapPin, Pencil, Undo2, Save, X } from 'lucide-react';
import { LakeDrawingMode, LakeRoute, LakeWaypoint } from '../../types';
import { WeatherData, ChopAssessment } from '../../services/weather';
import { WindConditionsCard, ExposureBar } from './shared';
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
  windData: WeatherData | null;
  chopAssessment: ChopAssessment | null;
  windLoading: boolean;
  lakeName?: string | null;
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
  windData,
  chopAssessment,
  windLoading,
  lakeName,
}: LakeSidebarProps) {
  const hasRoute = lakeRoute && lakeRoute.distance_mi > 0;
  
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
        <h2 className={styles.lakeName}>{lakeName || 'Lake Route'}</h2>
      </div>

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

      {/* Drawing Mode Toggle */}
      <DrawingModeCard
        mode={drawingMode}
        onModeChange={onDrawingModeChange}
        isDrawing={isDrawing}
      />

      {/* Waypoint List */}
      {drawingMode === 'waypoint' && waypoints.length > 0 && (
        <WaypointList 
          waypoints={waypoints} 
          onDelete={onDeleteWaypoint} 
        />
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
      <PaddleSpeedCard
        speed={paddleSpeed}
        onChange={onPaddleSpeedChange}
      />

      {/* Trip Stats */}
      <TripStatsCard
        distance={hasRoute ? lakeRoute.distance_mi : 0}
        paddleTime={paddleTimeFormatted}
      />

      {/* Wind Conditions */}
      <WindConditionsCard
        windData={windData}
        chopAssessment={chopAssessment}
        loading={windLoading}
      />

      {/* Route Exposure */}
      {hasRoute && (
        <ExposureBar
          exposure={{ sheltered: 30, moderate: 40, exposed: 30 }}
        />
      )}
    </div>
  );
}

/* ─── Sub-components ─── */

function DrawingModeCard({ 
  mode, 
  onModeChange, 
  isDrawing 
}: { 
  mode: LakeDrawingMode; 
  onModeChange: (mode: LakeDrawingMode) => void;
  isDrawing: boolean;
}) {
  return (
    <div className={styles.card}>
      <div className={styles.sectionLabel}>DRAWING MODE</div>
      <div className={styles.drawingToggle}>
        <button
          className={`${styles.toggleBtn} ${mode === 'waypoint' ? styles.toggleBtnActive : ''}`}
          onClick={() => onModeChange('waypoint')}
        >
          <MapPin size={14} />
          Waypoint
        </button>
        <button
          className={`${styles.toggleBtn} ${mode === 'freehand' ? styles.toggleBtnActive : ''}`}
          onClick={() => onModeChange('freehand')}
        >
          <Pencil size={14} />
          Freehand
        </button>
      </div>
      
      <div className={styles.instructions} style={{ marginTop: '12px' }}>
        {mode === 'waypoint' ? (
          <>
            <strong>Waypoint Mode:</strong> Click on the map to add waypoints. 
            A route line will connect your points.
          </>
        ) : (
          <>
            <strong>Freehand Mode:</strong> Click to start drawing, move your mouse to trace your route, 
            then click again to finish.
          </>
        )}
      </div>
    </div>
  );
}

function WaypointList({ 
  waypoints, 
  onDelete 
}: { 
  waypoints: LakeWaypoint[]; 
  onDelete: (id: string) => void;
}) {
  return (
    <div className={`${styles.card} ${styles.waypointCard}`}>
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
              onClick={() => onDelete(wp.id)}
              title="Delete waypoint"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function PaddleSpeedCard({ 
  speed, 
  onChange 
}: { 
  speed: number; 
  onChange: (speed: number) => void;
}) {
  return (
    <div className={`${styles.card} ${styles.paddleCard}`}>
      <div className={styles.paddleHeader}>
        <div className={styles.sectionLabel}>PADDLE SPEED</div>
        <span className={styles.paddleValue}>{speed.toFixed(1)} mph</span>
      </div>
      <input
        type="range"
        min="1"
        max="5"
        step="0.1"
        value={speed}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className={styles.slider}
      />
      <div className={styles.sliderLabels}>
        <span>1 mph</span>
        <span>5 mph</span>
      </div>
      <div className={styles.hint}>Avg kayak: 3 mph • Avg canoe: 2.5 mph</div>
    </div>
  );
}

function TripStatsCard({ 
  distance, 
  paddleTime 
}: { 
  distance: number; 
  paddleTime: string;
}) {
  return (
    <div className={`${styles.card} ${styles.statsCard}`}>
      <div className={styles.sectionLabel}>TRIP STATS</div>
      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{distance.toFixed(1)}</span>
          <span className={styles.statLabel}>miles</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{paddleTime}</span>
          <span className={styles.statLabel}>paddle time</span>
        </div>
      </div>
    </div>
  );
}
