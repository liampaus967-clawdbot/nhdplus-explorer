'use client';

import { AlertTriangle } from 'lucide-react';
import { RouteResult } from '../../types';
import { ElevationPoint, SteepSection } from '../../types';
import { ModeTag } from './shared/ModeTag';
import { WeatherConditions } from './shared/WeatherConditions';
import { FlowGaugeCard } from './shared/FlowGaugeCard';
import { ElevationProfile } from '../Panel/ElevationProfile';
import { useBestFlowForRoute } from '../../hooks/useFlowData';
import { useRouteHazards } from '../../hooks/useRouteHazards';
import { useRouteDiscovery } from '../../hooks/useRouteDiscovery';
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
  
  // Get best flow data from ALL COMIDs on the route (finds nearest gauge)
  const routeComids = path?.comids ?? null;
  const { data: flowData, loading: flowLoading, error: flowError } = useBestFlowForRoute(routeComids);
  
  // Get hazards (dams are dangerous for whitewater too!)
  const { hazards } = useRouteHazards(routeComids);
  const damHazards = hazards.filter(h => h.type === 'dam');
  
  // Get real rapids data from database
  const { discovery } = useRouteDiscovery(routeComids, 500);
  const dbRapids = discovery.hazards.items.filter(h => h.type === 'rapid');

  // Combine DB rapids with steep section analysis
  const steepSectionRapids = (stats.steep_sections || []).map((s, i) => {
    const mileMark = (s.start_m / 1609.34).toFixed(1);
    const className = s.gradient_ft_mi > 30 ? 'III+' : s.gradient_ft_mi > 15 ? 'II' : 'I';
    return { id: `steep-${i}`, name: `Drop at mi ${mileMark}`, class: className, mile: mileMark, gradient: s.gradient_ft_mi, isDbRapid: false };
  });
  
  // Prioritize DB rapids (they have real names and class ratings)
  const rapids = [
    ...dbRapids.map((r, i) => ({
      id: `db-${r.id}`,
      name: r.name,
      class: r.rapid_class || 'Unknown',
      mile: null,
      gradient: null,
      isDbRapid: true,
    })),
    ...steepSectionRapids,
  ];

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

      {/* Dam Hazards - Critical for whitewater safety */}
      {damHazards.length > 0 && (
        <div className={`${styles.card}`} style={{ borderColor: 'rgba(239, 68, 68, 0.3)', background: 'rgba(239, 68, 68, 0.05)' }}>
          <div className={styles.sectionLabel} style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={14} />
            HAZARDS — PORTAGE REQUIRED
          </div>
          <div className={styles.rapidsItems}>
            {damHazards.map((dam) => (
              <div key={dam.id} className={styles.rapidItem} style={{ borderColor: 'rgba(239, 68, 68, 0.2)' }}>
                <div>
                  <span className={styles.rapidName}>🚧 {dam.name}</span>
                  <span className={styles.rapidMile}>
                    {dam.dam_height_ft && ` · ${Math.round(dam.dam_height_ft)}ft`}
                    {dam.hazard_potential && ` · ${dam.hazard_potential} hazard`}
                  </span>
                </div>
                <span className={styles.rapidClass} style={{ background: '#ef4444', color: 'white' }}>
                  PORTAGE
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Key Rapids - The fun stuff! */}
      <div className={`${styles.card} ${styles.rapidsList}`}>
        <div className={sharedStyles.sectionHeader}>
          <span className={styles.sectionLabel}>🌊 KEY RAPIDS</span>
          {dbRapids.length > 0 && (
            <span style={{ fontSize: 11, color: 'var(--success)', fontWeight: 600 }}>
              {dbRapids.length} known
            </span>
          )}
        </div>
        {rapids.length > 0 ? (
          <div className={styles.rapidsItems}>
            {rapids.slice(0, 8).map((r) => (
              <div
                key={r.id}
                className={styles.rapidItem}
                style={r.isDbRapid ? { borderColor: 'rgba(34, 197, 94, 0.3)', background: 'rgba(34, 197, 94, 0.05)' } : {}}
              >
                <div>
                  <span className={styles.rapidName}>
                    {r.isDbRapid ? '📍 ' : '📊 '}{r.name}
                  </span>
                  {r.mile && <span className={styles.rapidMile}> · mi {r.mile}</span>}
                </div>
                <span
                  className={styles.rapidClass}
                  style={{
                    background: r.class?.includes('III') || r.class?.includes('IV') || r.class?.includes('V') 
                      ? '#f97316' 
                      : r.class?.includes('II') 
                        ? '#eab308'
                        : '#22c55e',
                    color: 'white'
                  }}
                >
                  {r.class}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className={sharedStyles.zeroState}>
            <span className={sharedStyles.zeroStateTitle}>Smooth Paddling</span>
            <span className={sharedStyles.zeroStateDesc}>
              No significant rapids detected — enjoy the float!
            </span>
          </div>
        )}
        {dbRapids.length === 0 && steepSectionRapids.length > 0 && (
          <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 8, fontStyle: 'italic' }}>
            📊 = Detected from elevation profile
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
