'use client';

import { useState } from 'react';
import styles from './LayerControl.module.css';

export interface LayerVisibility {
  // Public Lands
  blmLands: boolean;
  wilderness: boolean;
  // Water
  rivers: boolean;
  // Points of Interest
  accessPoints: boolean;
  campgrounds: boolean;
  rapids: boolean;
  waterfalls: boolean;
}

interface LayerControlProps {
  layers: LayerVisibility;
  onChange: (layers: LayerVisibility) => void;
}

interface LayerToggleProps {
  label: string;
  color: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function LayerToggle({ label, color, checked, onChange }: LayerToggleProps) {
  return (
    <label className={styles.layerToggle}>
      <div className={styles.layerInfo}>
        <span className={styles.layerColor} style={{ backgroundColor: color }} />
        <span className={styles.layerLabel}>{label}</span>
      </div>
      <div className={`${styles.toggle} ${checked ? styles.toggleOn : ''}`}>
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className={styles.toggleInput}
        />
        <span className={styles.toggleSlider} />
      </div>
    </label>
  );
}

interface CategoryProps {
  title: string;
  icon: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function Category({ title, icon, children, defaultOpen = true }: CategoryProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={styles.category}>
      <button 
        className={styles.categoryHeader}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={styles.categoryIcon}>{icon}</span>
        <span className={styles.categoryTitle}>{title}</span>
        <span className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`}>
          ▸
        </span>
      </button>
      {isOpen && (
        <div className={styles.categoryContent}>
          {children}
        </div>
      )}
    </div>
  );
}

export function LayerControl({ layers, onChange }: LayerControlProps) {
  const updateLayer = (key: keyof LayerVisibility, value: boolean) => {
    onChange({ ...layers, [key]: value });
  };

  return (
    <div className={styles.container}>
      <Category title="Public Lands" icon="🏛️">
        <LayerToggle
          label="BLM Lands"
          color="#c9a227"
          checked={layers.blmLands}
          onChange={(v) => updateLayer('blmLands', v)}
        />
        <LayerToggle
          label="Wilderness Areas"
          color="#1a5d1a"
          checked={layers.wilderness}
          onChange={(v) => updateLayer('wilderness', v)}
        />
      </Category>

      <Category title="Water Features" icon="💧">
        <LayerToggle
          label="Rivers & Streams"
          color="#3b82f6"
          checked={layers.rivers}
          onChange={(v) => updateLayer('rivers', v)}
        />
      </Category>

      <Category title="Points of Interest" icon="📍">
        <LayerToggle
          label="Access Points"
          color="#3b82f6"
          checked={layers.accessPoints}
          onChange={(v) => updateLayer('accessPoints', v)}
        />
        <LayerToggle
          label="Campgrounds"
          color="#22c55e"
          checked={layers.campgrounds}
          onChange={(v) => updateLayer('campgrounds', v)}
        />
        <LayerToggle
          label="Rapids"
          color="#ef4444"
          checked={layers.rapids}
          onChange={(v) => updateLayer('rapids', v)}
        />
        <LayerToggle
          label="Waterfalls"
          color="#67e8f9"
          checked={layers.waterfalls}
          onChange={(v) => updateLayer('waterfalls', v)}
        />
      </Category>
    </div>
  );
}
