'use client';

import { BasemapStyle } from '../../types';
import styles from './MapBasemapControl.module.css';

interface MapBasemapControlProps {
  basemap: BasemapStyle;
  onChange: (basemap: BasemapStyle) => void;
}

const BASEMAPS: { key: BasemapStyle; label: string }[] = [
  { key: 'outdoors', label: 'Outdoors' },
  { key: 'satellite', label: 'Satellite' },
  { key: 'dark', label: 'Dark' },
];

export function MapBasemapControl({ basemap, onChange }: MapBasemapControlProps) {
  return (
    <div className={styles.container}>
      {BASEMAPS.map((b) => (
        <button
          key={b.key}
          className={`${styles.btn} ${basemap === b.key ? styles.btnActive : ''}`}
          onClick={() => onChange(b.key)}
        >
          {b.label}
        </button>
      ))}
    </div>
  );
}
