'use client';

import { useState, useRef, useEffect } from 'react';
import styles from './LayerControl.module.css';

export interface LayerVisibility {
  blmLands: boolean;
  wilderness: boolean;
  rivers: boolean;
  accessPoints: boolean;
  campgrounds: boolean;
  rapids: boolean;
  waterfalls: boolean;
}

interface MapLayerControlProps {
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

export function MapLayerControl({ layers, onChange }: MapLayerControlProps) {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const updateLayer = (key: keyof LayerVisibility, value: boolean) => {
    onChange({ ...layers, [key]: value });
  };

  // Close panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className={styles.container} ref={panelRef}>
      <button 
        className={`${styles.toggleButton} ${isOpen ? styles.toggleButtonActive : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title="Map Layers"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="12 2 2 7 12 12 22 7 12 2" />
          <polyline points="2 17 12 22 22 17" />
          <polyline points="2 12 12 17 22 12" />
        </svg>
      </button>

      {isOpen && (
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <span>Map Layers</span>
            <button className={styles.closeBtn} onClick={() => setIsOpen(false)}>×</button>
          </div>
          
          <div className={styles.panelContent}>
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
        </div>
      )}
    </div>
  );
}
