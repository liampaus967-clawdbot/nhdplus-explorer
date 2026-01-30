'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import styles from './page.module.css';

interface ElevationPoint {
  dist_m: number;
  elev_m: number;
}

interface RouteStats {
  distance_m: number;
  distance_mi: number;
  float_time_h: number;
  float_time_s: number;
  elev_start_m: number | null;
  elev_end_m: number | null;
  elev_drop_ft: number;
  gradient_ft_mi: number;
  segment_count: number;
  waterways: string[];
  flow_condition: string;
  flow_multiplier: number;
  elevation_profile: ElevationPoint[];
}

const FLOW_CONDITIONS = {
  low: { label: 'Low Water', description: 'Late summer, drought conditions' },
  normal: { label: 'Normal', description: 'Typical paddling conditions' },
  high: { label: 'High Water', description: 'Spring runoff, after rain' }
};

interface SnapResult {
  node_id: string;
  comid: number;
  gnis_name: string | null;
  stream_order: number;
  distance_m: number;
  snap_point: { lng: number; lat: number };
  node_point: { lng: number; lat: number };
}

interface RouteResult {
  route: GeoJSON.FeatureCollection;
  stats: RouteStats;
  path: { nodes: string[]; comids: number[] };
}

export default function Home() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  
  const [putIn, setPutIn] = useState<SnapResult | null>(null);
  const [takeOut, setTakeOut] = useState<SnapResult | null>(null);
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flowCondition, setFlowCondition] = useState<'low' | 'normal' | 'high'>('normal');
  const [paddleSpeed, setPaddleSpeed] = useState(0);
  
  const putInMarker = useRef<mapboxgl.Marker | null>(null);
  const takeOutMarker = useRef<mapboxgl.Marker | null>(null);
  const elevationCanvas = useRef<HTMLCanvasElement | null>(null);

  // Draw elevation profile on canvas
  const drawElevationProfile = useCallback((profile: ElevationPoint[]) => {
    const canvas = elevationCanvas.current;
    if (!canvas || profile.length < 2) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // High DPI support
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    
    const W = rect.width;
    const H = rect.height;
    const pad = { top: 20, right: 15, bottom: 30, left: 45 };
    const chartW = W - pad.left - pad.right;
    const chartH = H - pad.top - pad.bottom;
    
    // Clear
    ctx.clearRect(0, 0, W, H);
    
    // Data bounds
    const maxDist = profile[profile.length - 1].dist_m;
    const elevs = profile.map(p => p.elev_m);
    const minElev = Math.min(...elevs) - 5;
    const maxElev = Math.max(...elevs) + 5;
    const elevRange = maxElev - minElev || 1;
    
    // Coordinate transforms
    const toX = (d: number) => pad.left + (d / maxDist) * chartW;
    const toY = (e: number) => pad.top + (1 - (e - minElev) / elevRange) * chartH;
    
    // Fill gradient
    const grad = ctx.createLinearGradient(0, pad.top, 0, H - pad.bottom);
    grad.addColorStop(0, 'rgba(96, 165, 250, 0.3)');
    grad.addColorStop(1, 'rgba(96, 165, 250, 0.05)');
    
    ctx.beginPath();
    ctx.moveTo(toX(profile[0].dist_m), H - pad.bottom);
    profile.forEach(p => ctx.lineTo(toX(p.dist_m), toY(p.elev_m)));
    ctx.lineTo(toX(profile[profile.length - 1].dist_m), H - pad.bottom);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();
    
    // Line
    ctx.beginPath();
    profile.forEach((p, i) => {
      const x = toX(p.dist_m);
      const y = toY(p.elev_m);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.strokeStyle = '#60a5fa';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Axes
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.left, pad.top);
    ctx.lineTo(pad.left, H - pad.bottom);
    ctx.lineTo(W - pad.right, H - pad.bottom);
    ctx.stroke();
    
    // Y-axis labels (elevation in ft)
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'right';
    
    for (let i = 0; i <= 4; i++) {
      const elevM = minElev + (elevRange * i / 4);
      const elevFt = Math.round(elevM * 3.28084);
      const y = toY(elevM);
      ctx.fillText(`${elevFt}'`, pad.left - 5, y + 3);
      
      // Grid line
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(W - pad.right, y);
      ctx.stroke();
    }
    
    // X-axis labels (distance in miles)
    ctx.textAlign = 'center';
    for (let i = 0; i <= 4; i++) {
      const d = (maxDist * i) / 4;
      const mi = (d / 1609.34).toFixed(1);
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fillText(`${mi} mi`, toX(d), H - pad.bottom + 15);
    }
  }, []);

  // Format time display
  const formatTime = (seconds: number, paddleMph: number = 0): string => {
    // Paddle speed reduces time (adds to current velocity)
    // Assume ~2 mph average current from flow-adjusted EROM
    if (paddleMph > 0) {
      const baseSpeedMph = 2.0;
      const effectiveSpeed = baseSpeedMph + paddleMph;
      seconds = seconds * (baseSpeedMph / effectiveSpeed);
    }
    
    const hours = Math.floor(seconds / 3600);
    const mins = Math.round((seconds % 3600) / 60);
    
    if (hours > 0) return `${hours}h ${mins.toString().padStart(2, '0')}m`;
    return `${mins}m`;
  };

  // Snap a click to the river network
  const snapToRiver = async (lng: number, lat: number): Promise<SnapResult | null> => {
    try {
      const res = await fetch(`/api/snap?lng=${lng}&lat=${lat}`);
      if (!res.ok) {
        const err = await res.json();
        setError(err.error || 'Failed to snap to river');
        return null;
      }
      return await res.json();
    } catch (e) {
      setError('Network error');
      return null;
    }
  };

  // Calculate route between two points
  const calculateRoute = async (startSnap: SnapResult, endSnap: SnapResult, flow: string = flowCondition) => {
    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch(`/api/route?start_lng=${startSnap.snap_point.lng}&start_lat=${startSnap.snap_point.lat}&end_lng=${endSnap.snap_point.lng}&end_lat=${endSnap.snap_point.lat}&flow=${flow}`);
      if (!res.ok) {
        const err = await res.json();
        setError(err.error || 'Failed to calculate route');
        setRoute(null);
        return;
      }
      
      const data: RouteResult = await res.json();
      setRoute(data);
      
      // Draw route on map
      const source = map.current?.getSource('route') as mapboxgl.GeoJSONSource;
      if (source) {
        source.setData(data.route);
      }
      
      // Fit map to route
      if (data.route.features.length > 0) {
        const coords = data.route.features.flatMap((f: any) => f.geometry.coordinates);
        const bounds = coords.reduce(
          (b: mapboxgl.LngLatBounds, c: [number, number]) => b.extend(c),
          new mapboxgl.LngLatBounds(coords[0], coords[0])
        );
        map.current?.fitBounds(bounds, { padding: 80 });
      }
      
    } catch (e) {
      setError('Network error calculating route');
    } finally {
      setLoading(false);
    }
  };

  // Handle map click
  const handleMapClick = useCallback(async (e: mapboxgl.MapMouseEvent) => {
    const { lng, lat } = e.lngLat;
    setError(null);
    
    if (!putIn) {
      // Set put-in point
      setLoading(true);
      const snap = await snapToRiver(lng, lat);
      setLoading(false);
      
      if (snap) {
        setPutIn(snap);
        
        // Add marker
        if (putInMarker.current) putInMarker.current.remove();
        putInMarker.current = new mapboxgl.Marker({ color: '#22c55e' })
          .setLngLat([snap.snap_point.lng, snap.snap_point.lat])
          .addTo(map.current!);
      }
    } else if (!takeOut) {
      // Set take-out point
      setLoading(true);
      const snap = await snapToRiver(lng, lat);
      
      if (snap) {
        setTakeOut(snap);
        
        // Add marker
        if (takeOutMarker.current) takeOutMarker.current.remove();
        takeOutMarker.current = new mapboxgl.Marker({ color: '#ef4444' })
          .setLngLat([snap.snap_point.lng, snap.snap_point.lat])
          .addTo(map.current!);
        
        // Calculate route
        await calculateRoute(putIn, snap);
      }
      setLoading(false);
    }
  }, [putIn, takeOut]);

  // Handle flow condition change - recalculate route
  const handleFlowChange = async (newFlow: 'low' | 'normal' | 'high') => {
    setFlowCondition(newFlow);
    if (putIn && takeOut) {
      await calculateRoute(putIn, takeOut, newFlow);
    }
  };

  // Clear route
  const clearRoute = () => {
    setPutIn(null);
    setTakeOut(null);
    setRoute(null);
    setError(null);
    setFlowCondition('normal');
    setPaddleSpeed(0);
    
    if (putInMarker.current) {
      putInMarker.current.remove();
      putInMarker.current = null;
    }
    if (takeOutMarker.current) {
      takeOutMarker.current.remove();
      takeOutMarker.current = null;
    }
    
    const source = map.current?.getSource('route') as mapboxgl.GeoJSONSource;
    if (source) {
      source.setData({ type: 'FeatureCollection', features: [] });
    }
  };

  // Initialize map
  useEffect(() => {
    if (map.current || !mapContainer.current) return;
    
    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/outdoors-v12',
      center: [-72.70, 44.0], // Vermont
      zoom: 9,
      pitch: 0
    });
    
    map.current.addControl(new mapboxgl.NavigationControl());
    map.current.addControl(new mapboxgl.FullscreenControl());
    
    map.current.on('load', () => {
      // Add Vermont rivers tileset
      map.current!.addSource('vt-rivers', {
        type: 'vector',
        url: 'mapbox://lman967.9hfg3bbo'
      });
      
      // River lines - styled by stream order
      map.current!.addLayer({
        id: 'rivers-line',
        type: 'line',
        source: 'vt-rivers',
        'source-layer': 'vtRivers-3bijjc',
        paint: {
          'line-color': '#3b82f6',
          'line-width': [
            'interpolate', ['linear'], ['get', 'stream_order'],
            1, 1,
            2, 1.5,
            3, 2,
            4, 3,
            5, 4,
            6, 6,
            7, 8
          ],
          'line-opacity': 0.7
        }
      });
      
      // River labels
      map.current!.addLayer({
        id: 'rivers-labels',
        type: 'symbol',
        source: 'vt-rivers',
        'source-layer': 'vtRivers-3bijjc',
        filter: ['!=', ['get', 'gnis_name'], null],
        layout: {
          'symbol-placement': 'line-center',
          'text-field': ['get', 'gnis_name'],
          'text-font': ['DIN Pro Italic', 'Arial Unicode MS Regular'],
          'text-size': 11,
          'text-allow-overlap': false,
          'text-optional': true
        },
        paint: {
          'text-color': '#1e40af',
          'text-halo-color': 'rgba(255, 255, 255, 0.9)',
          'text-halo-width': 1.5
        }
      });
      
      // Route layer (empty initially)
      map.current!.addSource('route', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });
      
      // Route glow
      map.current!.addLayer({
        id: 'route-glow',
        type: 'line',
        source: 'route',
        paint: {
          'line-color': '#fbbf24',
          'line-width': 14,
          'line-opacity': 0.3
        },
        layout: {
          'line-cap': 'round',
          'line-join': 'round'
        }
      });
      
      // Route line
      map.current!.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route',
        paint: {
          'line-color': '#f59e0b',
          'line-width': 5,
          'line-opacity': 0.95
        },
        layout: {
          'line-cap': 'round',
          'line-join': 'round'
        }
      });
      
      // Click handler
      map.current!.getCanvas().style.cursor = 'crosshair';
    });
    
    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Update click handler when putIn/takeOut changes
  useEffect(() => {
    if (!map.current) return;
    
    const handler = (e: mapboxgl.MapMouseEvent) => handleMapClick(e);
    map.current.on('click', handler);
    
    return () => {
      map.current?.off('click', handler);
    };
  }, [handleMapClick]);

  // Draw elevation profile when route changes
  useEffect(() => {
    if (route?.stats.elevation_profile) {
      // Small delay to ensure canvas is rendered
      setTimeout(() => drawElevationProfile(route.stats.elevation_profile), 100);
    }
  }, [route, drawElevationProfile]);

  return (
    <main className={styles.main}>
      <div className={styles.header}>
        <h1>🛶 River Router</h1>
        <p>Click to set a put-in and take-out, then get your float route with estimated times</p>
      </div>
      
      <div className={styles.container}>
        <div ref={mapContainer} className={styles.map} />
        
        <div className={styles.panel}>
          {/* Route points */}
          <div className={styles.section}>
            <h3>📍 Route</h3>
            <div className={styles.routeInputs}>
              <div className={styles.inputRow}>
                <span className={`${styles.dot} ${styles.putInDot}`}></span>
                <span className={putIn ? styles.inputSet : styles.inputLabel}>
                  {putIn 
                    ? `${putIn.gnis_name || 'River'} (${putIn.snap_point.lat.toFixed(4)}, ${putIn.snap_point.lng.toFixed(4)})`
                    : 'Click map to set put-in'
                  }
                </span>
              </div>
              <div className={styles.inputRow}>
                <span className={`${styles.dot} ${styles.takeOutDot}`}></span>
                <span className={takeOut ? styles.inputSet : styles.inputLabel}>
                  {takeOut 
                    ? `${takeOut.gnis_name || 'River'} (${takeOut.snap_point.lat.toFixed(4)}, ${takeOut.snap_point.lng.toFixed(4)})`
                    : putIn ? 'Click map to set take-out' : 'Then click to set take-out'
                  }
                </span>
              </div>
            </div>
            {(putIn || loading) && (
              <button 
                className={styles.clearBtn} 
                onClick={clearRoute}
                disabled={loading}
              >
                {loading ? 'Loading...' : 'Clear Route'}
              </button>
            )}
          </div>
          
          {/* Error display */}
          {error && (
            <div className={styles.error}>
              ⚠️ {error}
            </div>
          )}
          
          {/* Flow condition selector - always visible */}
          <div className={styles.section}>
            <h3>🌊 Water Conditions</h3>
            <div className={styles.flowButtons}>
              {(Object.keys(FLOW_CONDITIONS) as Array<keyof typeof FLOW_CONDITIONS>).map((key) => (
                <button
                  key={key}
                  className={`${styles.flowBtn} ${flowCondition === key ? styles.flowBtnActive : ''}`}
                  onClick={() => handleFlowChange(key)}
                  disabled={loading}
                >
                  {FLOW_CONDITIONS[key].label}
                </button>
              ))}
            </div>
            <p className={styles.flowDesc}>
              {FLOW_CONDITIONS[flowCondition].description}
            </p>
          </div>

          {/* Route stats */}
          {route && (
            <>
              <div className={styles.section}>
                <h3>📊 Trip Stats</h3>
                <div className={styles.statGrid}>
                  <div className={styles.stat}>
                    <span className={styles.statValue}>{route.stats.distance_mi}</span>
                    <span className={styles.statLabel}>miles</span>
                  </div>
                  <div className={styles.stat}>
                    <span className={styles.statValue}>{formatTime(route.stats.float_time_s, 0)}</span>
                    <span className={styles.statLabel}>float time</span>
                  </div>
                  <div className={styles.stat}>
                    <span className={styles.statValue}>{route.stats.elev_drop_ft}</span>
                    <span className={styles.statLabel}>ft drop</span>
                  </div>
                  <div className={styles.stat}>
                    <span className={styles.statValue}>{route.stats.gradient_ft_mi}</span>
                    <span className={styles.statLabel}>ft/mi</span>
                  </div>
                </div>
                {route.stats.waterways.length > 0 && (
                  <div className={styles.waterways}>
                    Via: {route.stats.waterways.join(' → ')}
                  </div>
                )}
              </div>
              
              {/* Paddle speed */}
              <div className={styles.section}>
                <h3>🏋️ Paddle Speed</h3>
                <div className={styles.sliderContainer}>
                  <input 
                    type="range" 
                    min="0" 
                    max="5" 
                    step="0.5"
                    value={paddleSpeed}
                    onChange={(e) => setPaddleSpeed(parseFloat(e.target.value))}
                    className={styles.slider}
                  />
                  <div className={styles.sliderLabels}>
                    <span>Float</span>
                    <span>+{paddleSpeed} mph</span>
                    <span>+5 mph</span>
                  </div>
                </div>
                <div className={styles.paddleTime}>
                  Paddle time: <strong>{formatTime(route.stats.float_time_s, paddleSpeed)}</strong>
                </div>
              </div>

              {/* Elevation profile */}
              {route.stats.elevation_profile && route.stats.elevation_profile.length > 0 && (
                <div className={styles.section}>
                  <h3>📈 Elevation Profile</h3>
                  <canvas 
                    ref={elevationCanvas} 
                    className={styles.elevationChart}
                  />
                </div>
              )}
            </>
          )}
          
          {/* Info */}
          <div className={styles.section}>
            <h3>ℹ️ About</h3>
            <p className={styles.info}>
              Velocity data from USGS NHDPlus EROM (Extended Reach Output Model). 
              Flow conditions adjust baseflow estimates per Leopold & Maddock (1953) 
              hydraulic geometry relationships.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
