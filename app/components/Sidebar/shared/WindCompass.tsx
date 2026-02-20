'use client';

import { ArrowUp } from 'lucide-react';
import styles from './WindCompass.module.css';

interface WindCompassProps {
  /** Wind direction in meteorological degrees (where wind comes FROM) */
  windDirection: number;
  size?: number;
}

export function WindCompass({ windDirection, size = 80 }: WindCompassProps) {
  // Convert meteorological direction to visual rotation (where wind is GOING)
  const arrowRotation = (windDirection + 180) % 360;

  return (
    <div className={styles.compass} style={{ width: size, height: size }}>
      {/* Tick marks around compass edge */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
        <div 
          key={deg}
          className={`${styles.tick} ${deg % 90 === 0 ? styles.tickMajor : ''}`}
          style={{ transform: `rotate(${deg}deg)` }}
        />
      ))}
      
      {/* Cardinal direction labels */}
      <span className={`${styles.label} ${styles.labelN}`}>N</span>
      <span className={`${styles.label} ${styles.labelS}`}>S</span>
      <span className={`${styles.label} ${styles.labelE}`}>E</span>
      <span className={`${styles.label} ${styles.labelW}`}>W</span>
      
      {/* Wind direction arrow */}
      <ArrowUp 
        size={24} 
        className={styles.arrow} 
        style={{ transform: `rotate(${arrowRotation}deg)` }}
      />
    </div>
  );
}
