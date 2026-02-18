'use client';

import { Tent, Bird, Fish, AlertTriangle } from 'lucide-react';
import { RouteResult, SnapResult, ElevationPoint, SteepSection } from '../../types';
import { ModeTag } from './shared/ModeTag';
import { WeatherConditions } from './shared/WeatherConditions';
import { ElevationProfile } from '../Panel/ElevationProfile';
import styles from './ExplorerSidebar.module.css';
import sharedStyles from './shared/shared.module.css';

interface ExplorerSidebarProps {
  route: RouteResult;
  putIn: SnapResult | null;
  takeOut: SnapResult | null;
  paddleSpeed: number;
  onPaddleSpeedChange: (speed: number) => void;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  profileSelection: { startM: number; endM: number } | null;
  onClearSelection: () => void;
  onClearRoute: () => void;
  drawProfile: (profile: ElevationPoint[], steepSections: SteepSection[]) => void;
  onMouseDown: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onMouseMove: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onMouseUp: () => void;
  onMouseLeave: () => void;
}

const POI_CATEGORIES = [
  {
    icon: <Tent size={16} color="#22c55e" />,
    name: 'Campgrounds',
    desc: '3 sites along route',
    bg: 'rgba(34, 197, 94, 0.06)',
    border: 'rgba(34, 197, 94, 0.15)',
  },
  {
    icon: <Bird size={16} color="#6366f1" />,
    name: 'Wildlife Areas',
    desc: '2 sanctuaries nearby',
    bg: 'rgba(99, 102, 241, 0.06)',
    border: 'rgba(99, 102, 241, 0.15)',
  },
  {
    icon: <Fish size={16} color="#fbbf24" />,
    name: 'Fishing Spots',
    desc: '5 popular areas',
    bg: 'rgba(251, 191, 36, 0.06)',
    border: 'rgba(251, 191, 36, 0.15)',
  },
  {
    icon: <AlertTriangle size={16} color="#ef4444" />,
    name: 'Hazard Zones',
    desc: '1 low-head dam',
    bg: 'rgba(239, 68, 68, 0.06)',
    border: 'rgba(239, 68, 68, 0.15)',
  },
];

function getDifficulty(gradient: number): { label: string; desc: string } {
  if (gradient < 5) return { label: 'Easy', desc: 'Suitable for beginners' };
  if (gradient < 15) return { label: 'Moderate', desc: 'Some experience recommended' };
  return { label: 'Difficult', desc: 'Experienced paddlers only' };
}

export function ExplorerSidebar({
  route,
  putIn,
  takeOut,
  paddleSpeed,
  onPaddleSpeedChange,
  canvasRef,
  profileSelection,
  onClearSelection,
  onClearRoute,
  drawProfile,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onMouseLeave,
}: ExplorerSidebarProps) {
  const { stats } = route;
  const riverName = stats.waterways?.[0] || 'Unknown River';
  const difficulty = getDifficulty(stats.gradient_ft_mi);

  const formatTime = (h: number) => {
    const hrs = Math.floor(h);
    const mins = Math.round((h - hrs) * 60);
    return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={`${styles.card} ${styles.headerCard}`}>
        <ModeTag mode="explorer" />
        <div>
          <div className={styles.riverName}>{riverName}</div>
          {putIn && takeOut && (
            <div className={styles.riverSubtitle}>
              {putIn.gnis_name || 'Put-in'} → {takeOut.gnis_name || 'Take-out'}
            </div>
          )}
        </div>
      </div>

      {/* Clear Route */}
      <button className={sharedStyles.clearRouteBtn} onClick={onClearRoute}>
        Clear Route
      </button>

      {/* Route Section */}
      <div className={`${styles.card} ${styles.routeCard}`}>
        <span className={styles.sectionLabel}>ROUTE</span>
        <div className={styles.routePoint}>
          <div className={`${styles.routeDot} ${styles.putInDot}`} />
          <div className={styles.routePointInfo}>
            <div className={styles.routePointLabel}>
              {putIn?.gnis_name || 'Put-in'}
            </div>
            <div className={styles.routePointCoords}>
              {putIn ? `${putIn.snap_point.lat.toFixed(4)}, ${putIn.snap_point.lng.toFixed(4)}` : '—'}
            </div>
          </div>
        </div>
        <div className={styles.routePoint}>
          <div className={`${styles.routeDot} ${styles.takeOutDot}`} />
          <div className={styles.routePointInfo}>
            <div className={styles.routePointLabel}>
              {takeOut?.gnis_name || 'Take-out'}
            </div>
            <div className={styles.routePointCoords}>
              {takeOut ? `${takeOut.snap_point.lat.toFixed(4)}, ${takeOut.snap_point.lng.toFixed(4)}` : '—'}
            </div>
          </div>
        </div>
      </div>

      {/* Paddle Speed */}
      <div className={`${styles.card} ${styles.paddleCard}`}>
        <div className={styles.paddleHeader}>
          <span className={styles.sectionLabel}>PADDLE SPEED</span>
          <span className={styles.paddleValue}>{paddleSpeed} mph</span>
        </div>
        <div className={styles.sliderContainer}>
          <input
            type="range"
            min="0"
            max="6"
            step="0.1"
            value={paddleSpeed}
            onChange={(e) => onPaddleSpeedChange(parseFloat(e.target.value))}
            className={styles.slider}
          />
          <div className={styles.sliderLabels}>
            <span>0</span>
            <span>6 mph</span>
          </div>
        </div>
        <span className={styles.paddleHint}>Adjusts estimated float time below</span>
      </div>

      {/* Trip Stats */}
      <div className={`${styles.card} ${styles.statsCard}`}>
        <span className={styles.sectionLabel}>TRIP STATS</span>
        <div className={styles.statsRow}>
          <div className={styles.statBox}>
            <span className={styles.statValue}>{stats.distance_mi.toFixed(1)}</span>
            <span className={styles.statLabel}>Miles</span>
          </div>
          <div className={styles.statBox}>
            <span className={styles.statValue}>{formatTime(stats.float_time_h)}</span>
            <span className={styles.statLabel}>Float Time</span>
          </div>
        </div>
        <div className={styles.statsRow}>
          <div className={styles.statBox}>
            <span className={styles.statValue}>{Math.round(stats.elev_drop_ft)}</span>
            <span className={styles.statLabel}>Elev Drop (ft)</span>
          </div>
          <div className={styles.statBox}>
            <span className={styles.statValue}>{stats.gradient_ft_mi.toFixed(1)}</span>
            <span className={styles.statLabel}>Gradient (ft/mi)</span>
          </div>
        </div>
        <div className={styles.difficultyBar}>
          <span className={styles.diffBadge}>{difficulty.label}</span>
          <span className={styles.diffDesc}>{difficulty.desc}</span>
        </div>
      </div>

      {/* Elevation Profile */}
      <ElevationProfile
        profile={stats.elevation_profile}
        steepSections={stats.steep_sections || []}
        canvasRef={canvasRef}
        drawProfile={drawProfile}
        selection={profileSelection}
        onClearSelection={onClearSelection}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
      />

      {/* Discover Along The Way */}
      <div className={`${styles.card} ${styles.discoverCard}`}>
        <div className={sharedStyles.sectionHeader}>
          <span className={styles.sectionLabel}>DISCOVER ALONG THE WAY</span>
          <span className={sharedStyles.comingSoonBadge}>Coming Soon</span>
        </div>
        <div className={styles.poiList}>
          {POI_CATEGORIES.map((poi) => (
            <div
              key={poi.name}
              className={styles.poiItem}
              style={{ background: poi.bg, border: `1px solid ${poi.border}`, borderRadius: 10 }}
            >
              <span className={styles.poiIcon}>{poi.icon}</span>
              <div className={styles.poiInfo}>
                <div className={styles.poiName}>{poi.name}</div>
                <div className={styles.poiDesc}>{poi.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Weather */}
      <WeatherConditions />
    </div>
  );
}
