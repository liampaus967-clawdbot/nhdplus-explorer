'use client';

import React from 'react';
import { FlowData, formatFlow, getStatusColor, getStatusLabel } from '../../../hooks/useFlowData';
import styles from './FlowGaugeCard.module.css';

interface FlowGaugeCardProps {
  flowData: FlowData | null;
  loading?: boolean;
  error?: string | null;
  compact?: boolean;
}

/**
 * Flow Gauge Card
 * 
 * Displays current flow conditions for a river reach/gauge.
 * Shows CFS, percentile, status badge, and data source.
 */
export function FlowGaugeCard({ flowData, loading, error, compact = false }: FlowGaugeCardProps) {
  if (loading) {
    return (
      <div className={`${styles.card} ${compact ? styles.compact : ''}`}>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <span>Loading flow data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${styles.card} ${compact ? styles.compact : ''}`}>
        <div className={styles.error}>
          <span>⚠️ {error}</span>
        </div>
      </div>
    );
  }

  if (!flowData || flowData.source === 'none') {
    return (
      <div className={`${styles.card} ${compact ? styles.compact : ''}`}>
        <div className={styles.noData}>
          <span>No flow data available</span>
        </div>
      </div>
    );
  }

  const statusColor = getStatusColor(flowData.status);
  const statusLabel = getStatusLabel(flowData.status);

  return (
    <div className={`${styles.card} ${compact ? styles.compact : ''}`}>
      {/* Header with gauge name */}
      {flowData.gauge_name && !compact && (
        <div className={styles.header}>
          <span className={styles.gaugeIcon}>📍</span>
          <div className={styles.gaugeName}>{flowData.gauge_name}</div>
        </div>
      )}

      {/* Main flow display */}
      <div className={styles.flowDisplay}>
        <div className={styles.flowValue}>
          <span className={styles.flowNumber}>{formatFlow(flowData.flow_cfs)}</span>
          <span className={styles.flowUnit}>CFS</span>
        </div>

        {/* Status badge */}
        <div 
          className={styles.statusBadge}
          style={{ backgroundColor: statusColor }}
        >
          {statusLabel}
        </div>
      </div>

      {/* Percentile bar */}
      {flowData.percentile !== null && (
        <div className={styles.percentileSection}>
          <div className={styles.percentileBar}>
            <div 
              className={styles.percentileFill}
              style={{ 
                width: `${flowData.percentile}%`,
                backgroundColor: statusColor,
              }}
            />
            <div 
              className={styles.percentileMarker}
              style={{ left: `${flowData.percentile}%` }}
            />
          </div>
          <div className={styles.percentileLabels}>
            <span>0%</span>
            <span className={styles.percentileValue}>
              {flowData.percentile.toFixed(0)}th percentile
            </span>
            <span>100%</span>
          </div>
        </div>
      )}

      {/* Source and confidence */}
      <div className={styles.footer}>
        <div className={styles.source}>
          {flowData.source === 'usgs' ? '🎯 USGS Gauge' : '🌊 NWM Model'}
        </div>
        <div className={styles.confidence}>
          {Math.round(flowData.confidence * 100)}% confidence
        </div>
      </div>

      {/* Velocity if available */}
      {flowData.velocity_fps && !compact && (
        <div className={styles.velocity}>
          Velocity: {flowData.velocity_fps.toFixed(1)} ft/s
        </div>
      )}

      {/* Last updated */}
      {flowData.updated_at && !compact && (
        <div className={styles.updated}>
          Updated: {new Date(flowData.updated_at).toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}

/**
 * Mini flow badge for inline display
 */
export function FlowBadge({ flowData }: { flowData: FlowData | null }) {
  if (!flowData || flowData.source === 'none') {
    return <span className={styles.badge}>—</span>;
  }

  const statusColor = getStatusColor(flowData.status);

  return (
    <span 
      className={styles.badge}
      style={{ backgroundColor: statusColor }}
    >
      {formatFlow(flowData.flow_cfs)} CFS
    </span>
  );
}

export default FlowGaugeCard;
