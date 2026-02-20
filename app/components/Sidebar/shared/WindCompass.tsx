'use client';

import { memo } from 'react';
import { ArrowUp } from 'lucide-react';
import styles from './WindCompass.module.css';

interface WindCompassProps {
  /** Wind direction in meteorological degrees (where wind comes FROM) */
  windDirection: number;
  /** Size of the compass in pixels */
  size?: number;
}

/**
 * Visual compass showing wind direction
 * Displays an arrow pointing where the wind is GOING (opposite of meteorological direction)
 */
export const WindCompass = memo(function WindCompass({ 
  windDirection, 
  size = 80 
}: WindCompassProps) {
  // Convert meteorological direction to visual rotation (where wind is GOING)
  const arrowRotation = (windDirection + 180) % 360;

  return (
    <div 
      className={styles.compass} 
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Wind direction: ${Math.round(windDirection)} degrees`}
    >
      {/* Tick marks around compass edge */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
        <div 
          key={deg}
          className={`${styles.tick} ${deg % 90 === 0 ? styles.tickMajor : ''}`}
          style={{ transform: `rotate(${deg}deg)` }}
          aria-hidden="true"
        />
      ))}
      
      {/* Cardinal direction labels */}
      <span className={`${styles.label} ${styles.labelN}`} aria-hidden="true">N</span>
      <span className={`${styles.label} ${styles.labelS}`} aria-hidden="true">S</span>
      <span className={`${styles.label} ${styles.labelE}`} aria-hidden="true">E</span>
      <span className={`${styles.label} ${styles.labelW}`} aria-hidden="true">W</span>
      
      {/* Wind direction arrow */}
      <ArrowUp 
        size={24} 
        className={styles.arrow} 
        style={{ transform: `rotate(${arrowRotation}deg)` }}
        aria-hidden="true"
      />
    </div>
  );
});
