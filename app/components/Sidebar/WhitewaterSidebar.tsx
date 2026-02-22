'use client';

import { RouteResult } from '../../types';
import { ElevationPoint, SteepSection } from '../../types';
import { ModeTag } from './shared/ModeTag';
import { WeatherConditions } from './shared/WeatherConditions';
import { FlowGaugeCard } from './shared/FlowGaugeCard';
import { ElevationProfile } from '../Panel/ElevationProfile';
import { useFlowStatus } from '../../hooks/useFlowData';
import styles from './WhitewaterSidebar.module.css';
import sharedStyles from './shared/shared.module.css';

interface WhitewaterSidebarProps {
  route: RouteResult;
  putInCoords: { lat: number; lng: number } | null;
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

export function WhitewaterSidebar({
  route,
  putInCoords,
  canvasRef,
  profileSelection,
  onClearSelection,
  onClearRoute,
  drawProfile,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onMouseLeave,
}: WhitewaterSidebarProps) {
  const { stats, path } = route;
  const riverName = stats.waterways?.[0] || 'Unknown River';
  
  // Get flow data for the first COMID on the route
  const primaryComid = path?.comids?.[0] ?? null;
  const { data: flowData, loading: flowLoading, error: flowError } = useFlowStatus(primaryComid);

  // Approximate rapids from steep sections
  const rapids = (stats.steep_sections || []).map((s, i) => {
    const mileMark = (s.start_m / 1609.34).toFixed(1);
    const isDanger = s.gradient_ft_mi > 30;
    const className = s.gradient_ft_mi > 30 ? 'III+' : s.gradient_ft_mi > 15 ? 'II' : 'I';
    return { id: i, name: `Rapid at mi ${mileMark}`, class: className, mile: mileMark, isDanger };
  });

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={`${styles.card} ${styles.headerCard}`}>
        <ModeTag mode="whitewater" />
        <div>
          <div className={styles.riverName}>{riverName}</div>
          {stats.steep_sections && stats.steep_sections.length > 0 && (
            <div className={styles.riverSubtitle}>
              {stats.steep_sections.length} rapid section{stats.steep_sections.length > 1 ? 's' : ''} detected
            </div>
          )}
        </div>
      </div>

      {/* Clear Route */}
      <button className={sharedStyles.clearRouteBtn} onClick={onClearRoute}>
        Clear Route
      </button>

      {/* Flow Gauge Card */}
      <FlowGaugeCard 
        flowData={flowData} 
        loading={flowLoading} 
        error={flowError} 
      />

      {/* Trip Stats */}
      <div className={`${styles.card} ${styles.statsCard}`}>
        <span className={styles.sectionLabel}>TRIP STATS</span>
        <div className={styles.statsRow}>
          <div className={styles.statBox}>
            <span className={styles.statValue}>{stats.distance_mi.toFixed(1)}</span>
            <span className={styles.statLabel}>Miles</span>
          </div>
          <div className={styles.statBox}>
            <span className={styles.statValue}>{Math.round(stats.elev_drop_ft)}</span>
            <span className={styles.statLabel}>Ft Drop</span>
          </div>
          <div className={styles.statBox}>
            <span className={styles.statValue}>{stats.steep_sections?.length || 0}</span>
            <span className={styles.statLabel}>Rapids</span>
          </div>
        </div>
        <div className={styles.statsRow}>
          <div className={styles.statBox}>
            <span className={styles.statValue}>{stats.gradient_ft_mi.toFixed(0)}</span>
            <span className={styles.statLabel}>Ft/Mi</span>
          </div>
          <div className={styles.statBox}>
            <span className={styles.statValue}>
              {stats.distance_mi > 0 ? ((stats.elev_drop_ft / stats.distance_mi) * 0.019).toFixed(1) : '0'}%
            </span>
            <span className={styles.statLabel}>Avg Slope</span>
          </div>
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

      {/* Key Rapids - derived from steep sections */}
      <div className={`${styles.card} ${styles.rapidsList}`}>
        <div className={sharedStyles.sectionHeader}>
          <span className={styles.sectionLabel}>KEY RAPIDS</span>
          <span className={sharedStyles.comingSoonBadge}>Coming Soon</span>
        </div>
        {rapids.length > 0 ? (
          <div className={styles.rapidsItems}>
            {rapids.slice(0, 6).map((r) => (
              <div
                key={r.id}
                className={`${styles.rapidItem} ${r.isDanger ? styles.rapidItemDanger : ''}`}
              >
                <div>
                  <span className={styles.rapidName}>{r.name}</span>
                  <span className={styles.rapidMile}> &middot; Class {r.class}</span>
                </div>
                <span
                  className={`${styles.rapidClass} ${r.isDanger ? styles.rapidClassDanger : styles.rapidClassNormal}`}
                >
                  {r.isDanger ? 'III+' : r.class}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className={sharedStyles.zeroState}>
            <span className={sharedStyles.zeroStateTitle}>No Significant Rapids</span>
            <span className={sharedStyles.zeroStateDesc}>
              This route has a gentle gradient with no steep sections detected
            </span>
          </div>
        )}
      </div>

      {/* Weather */}
      <WeatherConditions 
        lat={putInCoords?.lat ?? null} 
        lng={putInCoords?.lng ?? null} 
      />
    </div>
  );
}
