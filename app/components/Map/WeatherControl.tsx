"use client";

import { useState, useMemo } from "react";
import { Cloud, Thermometer, ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
import { WeatherMetadata, WeatherVariable } from "@/app/hooks/useWeatherMetadata";

interface WeatherControlProps {
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
}

export function WeatherControl({
  metadata,
  loading,
  error,
  enabled,
  onToggle,
  selectedVariable,
  onVariableChange,
  selectedForecast,
  onForecastChange,
  opacity,
  onOpacityChange,
  onRefresh,
}: WeatherControlProps) {
  const [expanded, setExpanded] = useState(false);

  // Get selected variable details
  const variable = useMemo(() => {
    if (!metadata || !selectedVariable) return null;
    return metadata.variables.find((v) => v.id === selectedVariable) || null;
  }, [metadata, selectedVariable]);

  // Format age text
  const ageText = useMemo(() => {
    if (!metadata?.data_freshness) return "";
    const minutes = metadata.data_freshness.age_minutes;
    if (minutes < 60) return `${minutes}m ago`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
    return `${Math.floor(minutes / 1440)}d ago`;
  }, [metadata]);

  // Build gradient for legend
  const gradient = useMemo(() => {
    const colorStops = variable?.color_stops || [];
    if (colorStops.length < 2) return "linear-gradient(to right, #333, #666)";
    const stops = colorStops
      .map((stop, i) => {
        const percent = (i / (colorStops.length - 1)) * 100;
        return `${stop.color} ${percent}%`;
      })
      .join(", ");
    return `linear-gradient(to right, ${stops})`;
  }, [variable]);

  return (
    <div className="weather-control">
      {/* Header - always visible */}
      <div className="weather-header" onClick={() => setExpanded(!expanded)}>
        <div className="weather-title">
          <Cloud size={16} />
          <span>Weather</span>
        </div>
        <div className="weather-actions">
          <button
            className={`toggle-btn ${enabled ? "active" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              onToggle(!enabled);
            }}
          >
            {enabled ? "ON" : "OFF"}
          </button>
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="weather-content">
          {loading && !metadata && (
            <div className="weather-loading">Loading weather data...</div>
          )}

          {error && !metadata && (
            <div className="weather-error">
              <span>Error loading weather</span>
              <button onClick={onRefresh} className="refresh-btn">
                <RefreshCw size={14} />
              </button>
            </div>
          )}

          {metadata && (
            <>
              {/* Model info */}
              <div className="weather-info">
                <span className="model-label">
                  HRRR {metadata.model_run?.cycle_formatted || "..."}
                </span>
                <span className={`freshness ${metadata.data_freshness?.status}`}>
                  {ageText}
                </span>
              </div>

              {/* Variable selector */}
              <div className="variable-selector">
                {metadata.variables.map((v) => (
                  <button
                    key={v.id}
                    className={`variable-btn ${selectedVariable === v.id ? "selected" : ""}`}
                    onClick={() => onVariableChange(v.id)}
                    title={v.description}
                  >
                    <Thermometer size={14} />
                    <span>{v.name}</span>
                  </button>
                ))}
              </div>

              {/* Forecast slider */}
              {metadata.forecast_hours.length > 1 && enabled && (
                <div className="forecast-slider">
                  <div className="forecast-header">
                    <span>Forecast</span>
                    <span className="forecast-value">+{selectedForecast}h</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={metadata.forecast_hours.length - 1}
                    value={metadata.forecast_hours.indexOf(selectedForecast)}
                    onChange={(e) =>
                      onForecastChange(metadata.forecast_hours[parseInt(e.target.value)])
                    }
                  />
                </div>
              )}

              {/* Opacity slider */}
              {enabled && (
                <div className="opacity-slider">
                  <div className="opacity-header">
                    <span>Opacity</span>
                    <span className="opacity-value">{Math.round(opacity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={opacity * 100}
                    onChange={(e) => onOpacityChange(parseInt(e.target.value) / 100)}
                  />
                </div>
              )}

              {/* Legend */}
              {enabled && variable && variable.color_stops && (
                <div className="weather-legend">
                  <div className="legend-title">{variable.name}</div>
                  <div className="legend-gradient" style={{ background: gradient }} />
                  <div className="legend-labels">
                    <span>{variable.color_stops[0].value}{variable.units}</span>
                    <span>{variable.color_stops[variable.color_stops.length - 1].value}{variable.units}</span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      <style jsx>{`
        .weather-control {
          background: rgba(30, 30, 40, 0.95);
          border-radius: 8px;
          overflow: hidden;
          min-width: 200px;
          font-size: 13px;
        }

        .weather-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 12px;
          cursor: pointer;
          user-select: none;
        }

        .weather-header:hover {
          background: rgba(255, 255, 255, 0.05);
        }

        .weather-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 500;
          color: #fff;
        }

        .weather-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .toggle-btn {
          padding: 4px 10px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
          border: none;
          cursor: pointer;
          background: rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.6);
          transition: all 0.15s;
        }

        .toggle-btn.active {
          background: #10b981;
          color: white;
        }

        .weather-content {
          padding: 0 12px 12px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .weather-loading,
        .weather-error {
          padding: 10px;
          text-align: center;
          color: rgba(255, 255, 255, 0.6);
          font-size: 12px;
        }

        .weather-error {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          color: #f87171;
        }

        .refresh-btn {
          background: rgba(255, 255, 255, 0.1);
          border: none;
          border-radius: 4px;
          padding: 4px;
          cursor: pointer;
          color: inherit;
          display: flex;
        }

        .weather-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 6px 10px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 6px;
        }

        .model-label {
          color: rgba(255, 255, 255, 0.8);
          font-size: 12px;
        }

        .freshness {
          font-size: 11px;
          padding: 2px 6px;
          border-radius: 4px;
        }

        .freshness.fresh {
          background: rgba(16, 185, 129, 0.2);
          color: #10b981;
        }

        .freshness.stale {
          background: rgba(245, 158, 11, 0.2);
          color: #f59e0b;
        }

        .freshness.old {
          background: rgba(239, 68, 68, 0.2);
          color: #ef4444;
        }

        .variable-selector {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .variable-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 10px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid transparent;
          border-radius: 6px;
          color: rgba(255, 255, 255, 0.7);
          cursor: pointer;
          transition: all 0.15s;
          text-align: left;
        }

        .variable-btn:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .variable-btn.selected {
          background: rgba(59, 130, 246, 0.2);
          border-color: rgba(59, 130, 246, 0.5);
          color: #60a5fa;
        }

        .forecast-slider,
        .opacity-slider {
          padding: 8px 0;
        }

        .forecast-header,
        .opacity-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 6px;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.6);
        }

        .forecast-value,
        .opacity-value {
          color: #60a5fa;
          font-weight: 500;
        }

        input[type="range"] {
          width: 100%;
          -webkit-appearance: none;
          background: rgba(255, 255, 255, 0.1);
          height: 4px;
          border-radius: 2px;
          cursor: pointer;
        }

        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 14px;
          height: 14px;
          background: #60a5fa;
          border-radius: 50%;
          cursor: pointer;
        }

        .weather-legend {
          padding: 8px 0;
        }

        .legend-title {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.5);
          margin-bottom: 6px;
        }

        .legend-gradient {
          height: 12px;
          border-radius: 4px;
          margin-bottom: 4px;
        }

        .legend-labels {
          display: flex;
          justify-content: space-between;
          font-size: 10px;
          color: rgba(255, 255, 255, 0.5);
        }
      `}</style>
    </div>
  );
}

export default WeatherControl;
