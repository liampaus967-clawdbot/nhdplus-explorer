'use client';

import { useMemo } from 'react';
import { MapPin, Flag, Tent, Anchor, Waves, TriangleAlert, Gauge } from 'lucide-react';
import { RouteResult, SnapResult } from '../../types';
import { ModeTag } from './shared/ModeTag';
import { WeatherConditions } from './shared/WeatherConditions';
import { useBestFlowForRoute, getStatusLabel, getStatusColor } from '../../hooks/useFlowData';
import { useRouteHazards, getHazardIcon, getHazardColor } from '../../hooks/useRouteHazards';
import { useRouteDiscovery } from '../../hooks/useRouteDiscovery';
import styles from './FloaterSidebar.module.css';
import sharedStyles from './shared/shared.module.css';

interface FloaterSidebarProps {
  route: RouteResult;
  putIn: SnapResult | null;
  takeOut: SnapResult | null;
  onClearRoute: () => void;
}

export function FloaterSidebar({ route, putIn, takeOut, onClearRoute }: FloaterSidebarProps) {
  const { stats, path } = route;
  const riverName = stats.waterways?.[0] || 'Unknown River';
  
  // Get best flow data from ALL COMIDs on the route (finds nearest gauge)
  const routeComids = path?.comids ?? null;
  const { data: flowData, loading: flowLoading } = useBestFlowForRoute(routeComids);
  
  // Get hazards along the route
  const { hazards, loading: hazardsLoading } = useRouteHazards(routeComids);
  
  // Get POI discoveries for multi-day trip planning
  const { discovery, loading: discoveryLoading } = useRouteDiscovery(routeComids, 1500);

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

      {/* Conditions */}
      <div className={`${styles.card} ${styles.conditionsCard}`}>
        <span className={styles.sectionLabel}>CONDITIONS</span>

        {/* Water Level */}
        <div className={styles.conditionItem}>
          <div className={styles.conditionHeader}>
            <div className={styles.conditionLabelGroup}>
              <Waves size={16} className={styles.conditionIcon} />
              <span className={styles.conditionName}>Water Level</span>
            </div>
            <span className={styles.statusBadge}>
              {flowLoading ? 'Loading...' : flowData ? getStatusLabel(flowData.status) : 'Normal'}
            </span>
          </div>
          <div className={styles.waterLevelTrack}>
            <div 
              className={styles.waterLevelFill} 
              style={{ width: `${flowData?.percentile ?? 50}%` }} 
            />
            <div 
              className={styles.trackThumb}
              style={{ left: `${flowData?.percentile ?? 50}%` }}
            />
          </div>
          <div className={styles.conditionLabels}>
            <span>Low</span>
            <span className={styles.labelActive}>Normal</span>
            <span>High</span>
          </div>
        </div>

        {/* Hazards Along Route */}
        <div className={styles.conditionItem}>
          <div className={styles.conditionHeader}>
            <div className={styles.conditionLabelGroup}>
              <TriangleAlert size={16} className={styles.hazardIcon} />
              <span className={styles.conditionName}>Hazards Along Route</span>
            </div>
          </div>
          <div className={styles.hazardStats}>
            <div className={`${styles.hazardStatBox} ${styles.hazardStatGreen}`}>
              <span className={styles.hazardStatNum}>
                {hazards.filter(h => h.type === 'dam').length}
              </span>
              <span className={styles.hazardStatLabel}>Dams (Portage)</span>
            </div>
            <div className={`${styles.hazardStatBox} ${styles.hazardStatYellow}`}>
              <span className={styles.hazardStatNum}>
                {hazards.filter(h => h.type === 'waterfall').length}
              </span>
              <span className={styles.hazardStatLabel}>Waterfalls (Portage)</span>
            </div>
            <div className={`${styles.hazardStatBox} ${styles.hazardStatGreen}`}>
              <span className={styles.hazardStatNum}>
                {hazards.filter(h => h.type === 'rapid').length}
              </span>
              <span className={styles.hazardStatLabel}>Rapids</span>
            </div>
          </div>
        </div>

        {/* Difficulty Rating */}
        <div className={styles.conditionItem}>
          <div className={styles.conditionHeader}>
            <div className={styles.conditionLabelGroup}>
              <Gauge size={16} className={styles.difficultyIcon} />
              <span className={styles.conditionName}>Difficulty Rating</span>
            </div>
            <span className={styles.statusBadge}>
              {stats.gradient_ft_mi < 5 ? 'Beginner' : stats.gradient_ft_mi < 15 ? 'Intermediate' : 'Advanced'}
            </span>
          </div>
          <div className={styles.difficultyTrackWrapper}>
            <div 
              className={styles.difficultyFill} 
              style={{ 
                width: `${Math.min(stats.gradient_ft_mi / 30 * 100, 100)}%`,
                background: stats.gradient_ft_mi < 5 
                  ? 'var(--success)' 
                  : stats.gradient_ft_mi < 15 
                    ? 'var(--warning)' 
                    : 'var(--danger)'
              }} 
            />
            <div 
              className={styles.trackThumb}
              style={{ left: `${Math.min(stats.gradient_ft_mi / 30 * 100, 97)}%` }}
            />
          </div>
          <div className={styles.conditionLabels}>
            <span className={stats.gradient_ft_mi < 5 ? styles.labelActive : ''}>Beginner</span>
            <span className={stats.gradient_ft_mi >= 5 && stats.gradient_ft_mi < 15 ? styles.labelActive : ''}>Intermediate</span>
            <span className={stats.gradient_ft_mi >= 15 ? styles.labelActive : ''}>Advanced</span>
          </div>
        </div>
      </div>

      {/* Trip Planning - Campgrounds & Access Points */}
      {(discovery.campgrounds.count > 0 || discovery.access_points.count > 0) && (
        <div className={`${styles.card} ${styles.conditionsCard}`}>
          <span className={styles.sectionLabel}>TRIP PLANNING</span>
          
          {discovery.campgrounds.count > 0 && (
            <div className={styles.conditionItem}>
              <div className={styles.conditionHeader}>
                <span className={styles.conditionName}>
                  <Tent size={14} style={{ marginRight: 6, color: '#22c55e' }} />
                  Campgrounds
                </span>
                <span className={styles.conditionBadge} style={{ backgroundColor: '#22c55e', color: 'white' }}>
                  {discovery.campgrounds.count} nearby
                </span>
              </div>
              <div className={styles.hazardList}>
                {discovery.campgrounds.items.slice(0, 3).map((camp) => (
                  <div key={camp.id} className={styles.hazardItem}>
                    <span className={styles.hazardIcon}>🏕️</span>
                    <div className={styles.hazardInfo}>
                      <span className={styles.hazardName}>{camp.name}</span>
                      <span className={styles.hazardDetail}>
                        {camp.distance_m ? `${(camp.distance_m / 1000).toFixed(1)}km from route` : 'Along route'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {discovery.access_points.count > 0 && (
            <div className={styles.conditionItem}>
              <div className={styles.conditionHeader}>
                <span className={styles.conditionName}>
                  <Anchor size={14} style={{ marginRight: 6, color: '#3b82f6' }} />
                  Put-in/Take-out Options
                </span>
                <span className={styles.conditionBadge} style={{ backgroundColor: '#3b82f6', color: 'white' }}>
                  {discovery.access_points.count} nearby
                </span>
              </div>
              <div className={styles.hazardList}>
                {discovery.access_points.items.slice(0, 3).map((ap) => (
                  <div key={ap.id} className={styles.hazardItem}>
                    <span className={styles.hazardIcon}>🚣</span>
                    <div className={styles.hazardInfo}>
                      <span className={styles.hazardName}>{ap.name}</span>
                      <span className={styles.hazardDetail}>
                        {ap.distance_m ? `${(ap.distance_m / 1000).toFixed(1)}km from route` : 'Along route'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Weather */}
      <WeatherConditions 
        lat={putIn?.snap_point.lat ?? null} 
        lng={putIn?.snap_point.lng ?? null} 
      />
    </div>
  );
}
