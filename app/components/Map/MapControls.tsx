'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import {
  Layers, Map, X, Check, Cloud, Thermometer, Wind, CloudRain, Snowflake, Flame, RefreshCw,
  LandPlot, TreePine, Waves, Droplets, Sparkles,
  MapPin, Tent, Zap, ArrowDownToLine, Gauge, Construction,
  Trees, Mountain, Satellite, Moon, CloudSun,
} from 'lucide-react';
import { BasemapStyle } from '../../types';
import { WeatherMetadata, WeatherVariable } from '../../hooks/useWeatherMetadata';
import styles from './MapControls.module.css';

/* ─── Layer Visibility ─── */

export interface LayerVisibility {
  blmLands: boolean;
  wilderness: boolean;
  nationalForests: boolean;
  nationalParks: boolean;
  rivers: boolean;
  lakes: boolean;
  wildScenicRivers: boolean;
  accessPoints: boolean;
  campgrounds: boolean;
  rapids: boolean;
  waterfalls: boolean;
  dams: boolean;
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
  { key: 'nationalForests', label: 'National Forests', icon: <Trees size={14} />, iconBg: 'rgba(34,139,34,0.2)' },
  { key: 'nationalParks', label: 'National Parks', icon: <Mountain size={14} />, iconBg: 'rgba(139,69,19,0.2)' },
];

const WATER_FEATURES: LayerDef[] = [
  { key: 'rivers', label: 'Rivers & Streams', icon: <Waves size={14} />, iconBg: 'rgba(59,130,246,0.15)' },
  { key: 'lakes', label: 'Lakes', icon: <Droplets size={14} />, iconBg: 'rgba(96,165,250,0.15)' },
  { key: 'wildScenicRivers', label: 'Wild & Scenic Rivers', icon: <Sparkles size={14} />, iconBg: 'rgba(103,232,249,0.15)' },
];

const POINTS_OF_INTEREST: LayerDef[] = [
  { key: 'accessPoints', label: 'Access Points', icon: <MapPin size={14} />, iconBg: 'rgba(59,130,246,0.15)' },
  { key: 'campgrounds', label: 'Campgrounds', icon: <Tent size={14} />, iconBg: 'rgba(34,197,94,0.15)' },
  { key: 'rapids', label: 'Predicted Rapids', icon: <Zap size={14} />, iconBg: 'rgba(239,68,68,0.15)' },
  { key: 'waterfalls', label: 'Waterfalls', icon: <ArrowDownToLine size={14} />, iconBg: 'rgba(103,232,249,0.15)' },
  { key: 'dams', label: 'Dams', icon: <Construction size={14} />, iconBg: 'rgba(217,119,6,0.15)' },
];

const WATER_MONITORING: LayerDef[] = [
  { key: 'gauges', label: 'Flow Gauges', icon: <Gauge size={14} />, iconBg: 'rgba(14,165,233,0.15)' },
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

/* ─── Weather variable card defs ─── */

interface WeatherVarDef {
  id: string;
  icon: React.ReactNode;
  label: string;
  unit: string;
}

const WEATHER_VARS: WeatherVarDef[] = [
  { id: 'temperature_2m', icon: <Thermometer size={16} />, label: 'Temperature', unit: '°C' },
  { id: 'wind_gust', icon: <Wind size={16} />, label: 'Wind Gust', unit: 'mph' },
  { id: 'cloud_cover', icon: <Cloud size={16} />, label: 'Cloud Cover', unit: '%' },
  { id: 'precipitation', icon: <CloudRain size={16} />, label: 'Precipitation', unit: 'in' },
  { id: 'snow', icon: <Snowflake size={16} />, label: 'Snow', unit: 'in' },
  { id: 'smoke', icon: <Flame size={16} />, label: 'Smoke', unit: 'μg/m³' },
];

/* ─── Props ─── */

interface WeatherProps {
  metadata: WeatherMetadata | null;
  loading: boolean;
  error: Error | null;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  selectedVariable: string | null;
  onVariableChange: (variableId: string) => void;
  selectedForecast: string;
  onForecastChange: (forecast: string) => void;
  opacity: number;
  onOpacityChange: (opacity: number) => void;
  onRefresh: () => void;
  isReady?: boolean;
  loadProgress?: number;
}

interface MapControlsProps {
  layers: LayerVisibility;
  onLayersChange: (layers: LayerVisibility) => void;
  basemap: BasemapStyle;
  onBasemapChange: (basemap: BasemapStyle) => void;
  weather?: WeatherProps;
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

function Section({ title, layers, visibility, onToggle, onBatchToggle }: {
  title: string;
  layers: LayerDef[];
  visibility: LayerVisibility;
  onToggle: (key: keyof LayerVisibility, value: boolean) => void;
  onBatchToggle: (updates: Partial<LayerVisibility>) => void;
}) {
  const allOn = layers.every((l) => visibility[l.key]);
  const toggleAll = (value: boolean) => {
    const updates: Partial<LayerVisibility> = {};
    layers.forEach((l) => { updates[l.key] = value; });
    onBatchToggle(updates);
  };

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <span className={styles.sectionLabel}>{title}</span>
        <ToggleSwitch checked={allOn} onChange={toggleAll} />
      </div>
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

type OpenPanel = 'layers' | 'basemap' | 'weather' | null;
export function MapControls({ layers, onLayersChange, basemap, onBasemapChange, weather }: MapControlsProps) {
  const [openPanel, setOpenPanel] = useState<OpenPanel>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const togglePanel = (panel: OpenPanel) => {
    setOpenPanel((prev) => (prev === panel ? null : panel));
  };

  const updateLayer = (key: keyof LayerVisibility, value: boolean) => {
    onLayersChange({ ...layers, [key]: value });
  };

  const batchUpdateLayers = (updates: Partial<LayerVisibility>) => {
    onLayersChange({ ...layers, ...updates });
  };

  // Resolve weather variables from metadata, falling back to static defs
  const weatherVars = useMemo(() => {
    if (!weather?.metadata) return WEATHER_VARS;
    return weather.metadata.variables.map((v) => {
      const staticDef = WEATHER_VARS.find((w) => w.id === v.id);
      return {
        id: v.id,
        icon: staticDef?.icon ?? <Thermometer size={16} />,
        label: v.name,
        unit: v.units,
      };
    });
  }, [weather?.metadata]);

  // Format age text from metadata
  const ageText = useMemo(() => {
    if (!weather?.metadata?.data_freshness) return '';
    const minutes = weather.metadata.data_freshness.age_minutes;
    if (minutes < 60) return `${minutes}m ago`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
    return `${Math.floor(minutes / 1440)}d ago`;
  }, [weather?.metadata]);

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

        {weather && (
          <button
            className={`${styles.iconBtn} ${openPanel === 'weather' ? styles.iconBtnActive : ''} ${weather.enabled && weather.selectedVariable ? styles.iconBtnLive : ''}`}
            onClick={() => togglePanel('weather')}
            title="Weather"
          >
            <CloudSun size={20} />
          </button>
        )}
      </div>

      {/* Layer Panel */}
      {openPanel === 'layers' && (
        <div className={styles.panel} style={{ width: 320 }}>
          <div className={styles.panelHeader}>
            <span className={styles.panelTitle}>Map Layers</span>
            <button className={styles.closeBtn} onClick={() => setOpenPanel(null)}>
              <X size={16} />
            </button>
          </div>
          <div className={styles.panelContent}>
            <Section title="PUBLIC LANDS" layers={PUBLIC_LANDS} visibility={layers} onToggle={updateLayer} onBatchToggle={batchUpdateLayers} />
            <Section title="WATER FEATURES" layers={WATER_FEATURES} visibility={layers} onToggle={updateLayer} onBatchToggle={batchUpdateLayers} />
            <Section title="WATER MONITORING" layers={WATER_MONITORING} visibility={layers} onToggle={updateLayer} onBatchToggle={batchUpdateLayers} />
            <Section title="POINTS OF INTEREST" layers={POINTS_OF_INTEREST} visibility={layers} onToggle={updateLayer} onBatchToggle={batchUpdateLayers} />
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

      {/* Weather Panel (Option A) */}
      {openPanel === 'weather' && weather && (
        <div className={styles.panel} style={{ width: 320 }}>
          {/* Header */}
          <div className={styles.panelHeader}>
            <div className={styles.weatherTitle}>
              <Cloud size={18} className={styles.weatherTitleIcon} />
              <span className={styles.panelTitle}>Weather</span>
            </div>
            <button className={styles.closeBtn} onClick={() => setOpenPanel(null)}>
              <X size={16} />
            </button>
          </div>

          {/* Content */}
          <div className={styles.weatherContent}>
            {weather.loading && !weather.metadata && (
              <div className={styles.weatherLoading}>Loading weather data...</div>
            )}

            {weather.error && !weather.metadata && (
              <div className={styles.weatherError}>
                <span>Error loading weather</span>
                <button className={styles.weatherRefreshBtn} onClick={weather.onRefresh}>
                  <RefreshCw size={14} />
                </button>
              </div>
            )}

            {weather.metadata && (
              <>
                {/* Model badge */}
                <div className={styles.modelBadge}>
                  <span className={styles.modelDot} />
                  <span>HRRR {weather.metadata.model_run?.cycle_formatted || '...'}</span>
                  <span className={styles.modelAge}>{ageText}</span>
                </div>

                {/* Loading progress */}
                {weather.enabled && !weather.isReady && (weather.loadProgress ?? 100) < 100 && (
                  <div className={styles.weatherProgress}>
                    <div className={styles.weatherProgressText}>
                      Loading forecasts... {weather.loadProgress}%
                    </div>
                    <div className={styles.weatherProgressBar}>
                      <div
                        className={styles.weatherProgressFill}
                        style={{ width: `${weather.loadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Variable grid */}
                <div className={styles.variableGrid}>
                  {weatherVars.map((v) => {
                    const isSelected = weather.selectedVariable === v.id;
                    return (
                      <button
                        key={v.id}
                        className={`${styles.variableCard} ${isSelected ? styles.variableCardSelected : ''}`}
                        onClick={() => {
                          if (isSelected) {
                            weather.onVariableChange('');
                            weather.onToggle(false);
                          } else {
                            weather.onVariableChange(v.id);
                            weather.onToggle(true);
                          }
                        }}
                      >
                        <span className={`${styles.variableIcon} ${isSelected ? styles.variableIconSelected : ''}`}>
                          {v.icon}
                        </span>
                        <span className={styles.variableName}>{v.label}</span>
                        <span className={styles.variableUnit}>{v.unit}</span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
