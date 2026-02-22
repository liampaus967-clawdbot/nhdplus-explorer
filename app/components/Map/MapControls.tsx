'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Layers, Map, X, Check,
  LandPlot, TreePine, Waves, Droplets, Sparkles,
  MapPin, Tent, Zap, ArrowDownToLine, Gauge,
  Trees, Satellite, Moon,
} from 'lucide-react';
import { BasemapStyle } from '../../types';
import styles from './MapControls.module.css';

/* ─── Layer Visibility ─── */

export interface LayerVisibility {
  blmLands: boolean;
  wilderness: boolean;
  rivers: boolean;
  lakes: boolean;
  wildScenicRivers: boolean;
  accessPoints: boolean;
  campgrounds: boolean;
  rapids: boolean;
  waterfalls: boolean;
  gauges: boolean;
}

/* ─── Layer definitions ─── */

interface LayerDef {
  key: keyof LayerVisibility;
  label: string;
  icon: React.ReactNode;
  iconBg: string;
}

const PUBLIC_LANDS: LayerDef[] = [
  { key: 'blmLands', label: 'BLM Lands', icon: <LandPlot size={14} />, iconBg: 'rgba(201,162,39,0.15)' },
  { key: 'wilderness', label: 'Wilderness Areas', icon: <TreePine size={14} />, iconBg: 'rgba(26,93,26,0.25)' },
];

const WATER_FEATURES: LayerDef[] = [
  { key: 'rivers', label: 'Rivers & Streams', icon: <Waves size={14} />, iconBg: 'rgba(59,130,246,0.15)' },
  { key: 'lakes', label: 'Lakes', icon: <Droplets size={14} />, iconBg: 'rgba(96,165,250,0.15)' },
  { key: 'wildScenicRivers', label: 'Wild & Scenic Rivers', icon: <Sparkles size={14} />, iconBg: 'rgba(103,232,249,0.15)' },
];

const POINTS_OF_INTEREST: LayerDef[] = [
  { key: 'accessPoints', label: 'Access Points', icon: <MapPin size={14} />, iconBg: 'rgba(59,130,246,0.15)' },
  { key: 'campgrounds', label: 'Campgrounds', icon: <Tent size={14} />, iconBg: 'rgba(34,197,94,0.15)' },
  { key: 'rapids', label: 'Rapids', icon: <Zap size={14} />, iconBg: 'rgba(239,68,68,0.15)' },
  { key: 'waterfalls', label: 'Waterfalls', icon: <ArrowDownToLine size={14} />, iconBg: 'rgba(103,232,249,0.15)' },
  { key: 'gauges', label: 'Stream Gauges', icon: <Gauge size={14} />, iconBg: 'rgba(14,165,233,0.15)' },
];

/* ─── Basemap definitions ─── */

interface BasemapDef {
  key: BasemapStyle;
  label: string;
  icon: React.ReactNode;
}

const BASEMAPS: BasemapDef[] = [
  { key: 'outdoors', label: 'Outdoors', icon: <Trees size={16} /> },
  { key: 'satellite', label: 'Satellite', icon: <Satellite size={16} /> },
  { key: 'dark', label: 'Dark', icon: <Moon size={16} /> },
];

/* ─── Props ─── */

interface MapControlsProps {
  layers: LayerVisibility;
  onLayersChange: (layers: LayerVisibility) => void;
  basemap: BasemapStyle;
  onBasemapChange: (basemap: BasemapStyle) => void;
}

/* ─── Toggle Switch ─── */

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      className={`${styles.switch} ${checked ? styles.switchOn : ''}`}
      onClick={() => onChange(!checked)}
      role="switch"
      aria-checked={checked}
    >
      <span className={styles.knob} />
    </button>
  );
}

/* ─── Layer Row ─── */

function LayerRow({ def, checked, onChange }: { def: LayerDef; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className={styles.layerRow} onClick={() => onChange(!checked)}>
      <div className={styles.layerLeft}>
        <span className={styles.layerIcon} style={{ background: def.iconBg }}>
          {def.icon}
        </span>
        <span className={styles.layerLabel}>{def.label}</span>
      </div>
      <ToggleSwitch checked={checked} onChange={onChange} />
    </div>
  );
}

/* ─── Section ─── */

function Section({ title, layers, visibility, onToggle }: {
  title: string;
  layers: LayerDef[];
  visibility: LayerVisibility;
  onToggle: (key: keyof LayerVisibility, value: boolean) => void;
}) {
  return (
    <div className={styles.section}>
      <span className={styles.sectionLabel}>{title}</span>
      {layers.map((l) => (
        <LayerRow
          key={l.key}
          def={l}
          checked={visibility[l.key]}
          onChange={(v) => onToggle(l.key, v)}
        />
      ))}
    </div>
  );
}

/* ─── Main Component ─── */

type OpenPanel = 'layers' | 'basemap' | null;

export function MapControls({ layers, onLayersChange, basemap, onBasemapChange }: MapControlsProps) {
  const [openPanel, setOpenPanel] = useState<OpenPanel>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const togglePanel = (panel: OpenPanel) => {
    setOpenPanel((prev) => (prev === panel ? null : panel));
  };

  const updateLayer = (key: keyof LayerVisibility, value: boolean) => {
    onLayersChange({ ...layers, [key]: value });
  };

  // Close on click outside
  useEffect(() => {
    if (!openPanel) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpenPanel(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openPanel]);

  return (
    <div className={styles.container} ref={containerRef}>
      {/* Toggle Buttons */}
      <div className={styles.buttons}>
        <button
          className={`${styles.iconBtn} ${openPanel === 'layers' ? styles.iconBtnActive : ''}`}
          onClick={() => togglePanel('layers')}
          title="Map Layers"
        >
          <Layers size={20} />
        </button>
        <button
          className={`${styles.iconBtn} ${openPanel === 'basemap' ? styles.iconBtnActive : ''}`}
          onClick={() => togglePanel('basemap')}
          title="Basemap"
        >
          <Map size={20} />
        </button>
      </div>

      {/* Layer Panel */}
      {openPanel === 'layers' && (
        <div className={styles.panel} style={{ width: 280 }}>
          <div className={styles.panelHeader}>
            <span className={styles.panelTitle}>Map Layers</span>
            <button className={styles.closeBtn} onClick={() => setOpenPanel(null)}>
              <X size={16} />
            </button>
          </div>
          <div className={styles.panelContent}>
            <Section title="PUBLIC LANDS" layers={PUBLIC_LANDS} visibility={layers} onToggle={updateLayer} />
            <Section title="WATER FEATURES" layers={WATER_FEATURES} visibility={layers} onToggle={updateLayer} />
            <Section title="POINTS OF INTEREST" layers={POINTS_OF_INTEREST} visibility={layers} onToggle={updateLayer} />
          </div>
        </div>
      )}

      {/* Basemap Panel */}
      {openPanel === 'basemap' && (
        <div className={styles.panel} style={{ width: 220 }}>
          <div className={styles.panelHeader}>
            <span className={styles.panelTitle}>Basemap</span>
            <button className={styles.closeBtn} onClick={() => setOpenPanel(null)}>
              <X size={16} />
            </button>
          </div>
          <div className={styles.basemapContent}>
            {BASEMAPS.map((b) => {
              const active = basemap === b.key;
              return (
                <button
                  key={b.key}
                  className={`${styles.basemapOption} ${active ? styles.basemapOptionActive : ''}`}
                  onClick={() => onBasemapChange(b.key)}
                >
                  <span className={`${styles.basemapIcon} ${active ? styles.basemapIconActive : ''}`}>
                    {b.icon}
                  </span>
                  <span className={`${styles.basemapLabel} ${active ? styles.basemapLabelActive : ''}`}>
                    {b.label}
                  </span>
                  {active && (
                    <span className={styles.basemapCheck}>
                      <Check size={14} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
