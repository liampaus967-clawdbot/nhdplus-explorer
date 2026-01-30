'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import styles from './page.module.css';

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
}

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
  const [paddleSpeed, setPaddleSpeed] = useState(0);
  
  const putInMarker = useRef<mapboxgl.Marker | null>(null);
  const takeOutMarker = useRef<mapboxgl.Marker | null>(null);

  // Format time display
  const formatTime = (seconds: number, paddleMph: number = 0): string => {
    // Adjust for paddle speed (convert mph to m/s and reduce time proportionally)
    const paddleMs = paddleMph * 0.44704;
    const baseSpeed = 0.89; // 2 mph default
    const effectiveSpeed = baseSpeed + paddleMs;
    const adjustedSeconds = seconds * (baseSpeed / effectiveSpeed);
    
    const hours = Math.floor(adjustedSeconds / 3600);
    const mins = Math.round((adjustedSeconds % 3600) / 60);
    
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
  const calculateRoute = async (startSnap: SnapResult, endSnap: SnapResult) => {
    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch(`/api/route?start_lng=${startSnap.snap_point.lng}&start_lat=${startSnap.snap_point.lat}&end_lng=${endSnap.snap_point.lng}&end_lat=${endSnap.snap_point.lat}`);
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

  // Clear route
  const clearRoute = () => {
    setPutIn(null);
    setTakeOut(null);
    setRoute(null);
    setError(null);
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
            </>
          )}
          
          {/* Info */}
          <div className={styles.section}>
            <h3>ℹ️ About</h3>
            <p className={styles.info}>
              Route data from NHDPlus. Float times estimated at ~2 mph base current. 
              Adjust paddle speed for faster travel.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
