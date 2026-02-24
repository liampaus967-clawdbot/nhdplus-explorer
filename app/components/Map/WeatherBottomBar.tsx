'use client';

import { useMemo } from 'react';
import { X } from 'lucide-react';
import { WeatherMetadata, WeatherVariable } from '../../hooks/useWeatherMetadata';
import styles from './WeatherBottomBar.module.css';

interface WeatherBottomBarProps {
  metadata: WeatherMetadata;
  selectedVariable: string;
  selectedForecast: string;
  onForecastChange: (forecast: string) => void;
  opacity: number;
  onOpacityChange: (opacity: number) => void;
  onClose: () => void;
}

export function WeatherBottomBar({
  metadata,
  selectedVariable,
  selectedForecast,
  onForecastChange,
  opacity,
  onOpacityChange,
  onClose,
}: WeatherBottomBarProps) {
  const variable = useMemo(
    () => metadata.variables.find((v) => v.id === selectedVariable),
    [metadata.variables, selectedVariable],
  );

  const gradient = useMemo(() => {
    if (!variable?.color_stops || variable.color_stops.length < 2) return '';
    return `linear-gradient(to right, ${variable.color_stops.map((s) => s.color).join(', ')})`;
  }, [variable]);

  if (!variable) return null;

  const hasForecastHours = metadata.forecast_hours.length > 1;

  return (
    <div className={styles.container}>
      <button className={styles.closeBtn} onClick={onClose} title="Close weather layer">
        <X size={14} />
      </button>
      {/* Color Legend */}
      {variable.color_stops && variable.color_stops.length > 0 && (
        <div className={styles.legend}>
          <div className={styles.legendTitle}>{variable.name}</div>
          <div className={styles.legendBar} style={{ background: gradient }} />
          <div className={styles.legendLabels}>
            <span>{variable.color_stops[0].value}{variable.units}</span>
            <span>{variable.color_stops[variable.color_stops.length - 1].value}{variable.units}</span>
          </div>
        </div>
      )}

      {/* Sliders */}
      <div className={styles.sliders}>
        {hasForecastHours && (
          <div className={styles.sliderGroup}>
            <div className={styles.sliderHeader}>
              <span>Forecast Hour</span>
              <span className={styles.sliderValue}>+{selectedForecast}h</span>
            </div>
            <input
              type="range"
              className={styles.rangeSlider}
              min="0"
              max={metadata.forecast_hours.length - 1}
              value={metadata.forecast_hours.indexOf(selectedForecast)}
              onChange={(e) =>
                onForecastChange(metadata.forecast_hours[parseInt(e.target.value)])
              }
            />
          </div>
        )}

        <div className={styles.sliderGroup}>
          <div className={styles.sliderHeader}>
            <span>Opacity</span>
            <span className={styles.sliderValue}>{Math.round(opacity * 100)}%</span>
          </div>
          <input
            type="range"
            className={styles.rangeSlider}
            min="0"
            max="100"
            value={opacity * 100}
            onChange={(e) => onOpacityChange(parseInt(e.target.value) / 100)}
          />
        </div>
      </div>
    </div>
  );
}
