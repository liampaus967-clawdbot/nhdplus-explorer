'use client';

import styles from './ExposureBar.module.css';

interface ExposureData {
  sheltered: number;
  moderate: number;
  exposed: number;
}

interface ExposureBarProps {
  exposure: ExposureData;
}

export function ExposureBar({ exposure }: ExposureBarProps) {
  return (
    <div className={styles.card}>
      <div className={styles.label}>ROUTE EXPOSURE</div>
      
      <div className={styles.bar}>
        <div 
          className={`${styles.segment} ${styles.sheltered}`} 
          style={{ width: `${exposure.sheltered}%` }} 
        />
        <div 
          className={`${styles.segment} ${styles.moderate}`} 
          style={{ width: `${exposure.moderate}%` }} 
        />
        <div 
          className={`${styles.segment} ${styles.exposed}`} 
          style={{ width: `${exposure.exposed}%` }} 
        />
      </div>
      
      <div className={styles.legend}>
        <div className={styles.legendItem}>
          <div className={`${styles.dot} ${styles.sheltered}`} />
          <span className={styles.legendText}>Sheltered {exposure.sheltered}%</span>
        </div>
        <div className={styles.legendItem}>
          <div className={`${styles.dot} ${styles.moderate}`} />
          <span className={styles.legendText}>Moderate {exposure.moderate}%</span>
        </div>
        <div className={styles.legendItem}>
          <div className={`${styles.dot} ${styles.exposed}`} />
          <span className={styles.legendText}>Exposed {exposure.exposed}%</span>
        </div>
      </div>
    </div>
  );
}
