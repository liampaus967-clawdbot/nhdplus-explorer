'use client';

import { BasemapStyle } from '../../types';
import styles from '../../page.module.css';

interface BasemapSelectorProps {
  basemap: BasemapStyle;
  onChange: (basemap: BasemapStyle) => void;
}

export function BasemapSelector({ basemap, onChange }: BasemapSelectorProps) {
  return (
    <div className={styles.section}>
      <h3>🗺️ Basemap</h3>
      <div className={styles.basemapButtons}>
        <button
          className={`${styles.basemapBtn} ${basemap === 'outdoors' ? styles.basemapBtnActive : ''}`}
          onClick={() => onChange('outdoors')}
        >
          Outdoors
        </button>
        <button
          className={`${styles.basemapBtn} ${basemap === 'satellite' ? styles.basemapBtnActive : ''}`}
          onClick={() => onChange('satellite')}
        >
          Satellite
        </button>
        <button
          className={`${styles.basemapBtn} ${basemap === 'dark' ? styles.basemapBtnActive : ''}`}
          onClick={() => onChange('dark')}
        >
          Dark
        </button>
      </div>
    </div>
  );
}
