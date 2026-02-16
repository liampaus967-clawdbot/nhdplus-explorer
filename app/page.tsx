'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import styles from './page.module.css';

interface ElevationPoint {
  dist_m: number;
  elev_m: number;
  gradient_ft_mi?: number;
  classification?: string;
}

interface SteepSection {
  start_m: number;
  end_m: number;
  gradient_ft_mi: number;
  classification: string;
}

interface RouteStats {
  distance_m: number;
  distance_mi: number;
  float_time_h: number;
  float_time_s: number;
  has_impossible_segments?: boolean;
  elev_start_m: number | null;
  elev_end_m: number | null;
  elev_drop_ft: number;
  elev_gain_ft?: number;
  gradient_ft_mi: number;
  segment_count: number;
  waterways: string[];
  flow_condition: string;
  flow_multiplier: number;
  elevation_profile: ElevationPoint[];
  steep_sections: SteepSection[];
  direction?: {
    is_upstream: boolean;
    upstream_segments: number;
    impossible_segments: number;
    paddle_speed_mph: number;
    paddle_speed_ms: number;
  };
  live_conditions: {
    nwm_segments: number;
    erom_segments: number;
    nwm_coverage_percent: number;
    data_timestamp: string | null;
    avg_velocity_mph: number | null;
    avg_streamflow_cfs: number | null;
    baseline_velocity_mph: number;
    baseline_float_time_s: number;
    baseline_float_time_h: number;
    time_diff_s: number;
    time_diff_percent: number;
    flow_status: 'low' | 'normal' | 'high' | null;
  };
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
  warnings?: string[];
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
  const [paddleSpeed, setPaddleSpeed] = useState(3); // Default 3 mph
  const [basemap, setBasemap] = useState<'outdoors' | 'satellite' | 'dark'>('outdoors');
  const basemapRef = useRef<'outdoors' | 'satellite' | 'dark'>('outdoors');

  // Basemap style URLs
  const BASEMAP_STYLES = {
    outdoors: 'mapbox://styles/mapbox/outdoors-v12',
    satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
    dark: 'mapbox://styles/mapbox/dark-v11'
  };
  
  const putInMarker = useRef<mapboxgl.Marker | null>(null);
  const takeOutMarker = useRef<mapboxgl.Marker | null>(null);
  const elevationCanvas = useRef<HTMLCanvasElement | null>(null);
  
  // Elevation profile interaction state
  const [profileSelection, setProfileSelection] = useState<{ startM: number; endM: number } | null>(null);
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const profileBounds = useRef<{ maxDist: number; padLeft: number; chartW: number } | null>(null);

  // Classification colors
  const GRADIENT_COLORS: Record<string, string> = {
    pool: 'rgba(96, 165, 250, 0.3)',      // Blue - calm
    riffle: 'rgba(250, 204, 21, 0.5)',    // Yellow - riffles
    rapid_mild: 'rgba(251, 146, 60, 0.6)', // Orange - Class I-II
    rapid_steep: 'rgba(239, 68, 68, 0.7)'  // Red - Class III+
  };

  // Draw elevation profile on canvas with steep section highlighting
  const drawElevationProfile = useCallback((profile: ElevationPoint[], steepSections: SteepSection[]) => {
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
    
    // Draw steep section highlights first (behind the line)
    for (const section of steepSections) {
      const x1 = toX(section.start_m);
      const x2 = toX(section.end_m);
      const color = GRADIENT_COLORS[section.classification] || GRADIENT_COLORS.riffle;
      
      ctx.fillStyle = color;
      ctx.fillRect(x1, pad.top, x2 - x1, chartH);
    }
    
    // Fill gradient for main profile
    const grad = ctx.createLinearGradient(0, pad.top, 0, H - pad.bottom);
    grad.addColorStop(0, 'rgba(96, 165, 250, 0.25)');
    grad.addColorStop(1, 'rgba(96, 165, 250, 0.05)');
    
    ctx.beginPath();
    ctx.moveTo(toX(profile[0].dist_m), H - pad.bottom);
    profile.forEach(p => ctx.lineTo(toX(p.dist_m), toY(p.elev_m)));
    ctx.lineTo(toX(profile[profile.length - 1].dist_m), H - pad.bottom);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();
    
    // Draw line with color segments based on gradient
    for (let i = 1; i < profile.length; i++) {
      const p1 = profile[i - 1];
      const p2 = profile[i];
      const classification = p1.classification || 'pool';
      
      ctx.beginPath();
      ctx.moveTo(toX(p1.dist_m), toY(p1.elev_m));
      ctx.lineTo(toX(p2.dist_m), toY(p2.elev_m));
      
      // Color based on classification
      if (classification === 'rapid_steep') {
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 3;
      } else if (classification === 'rapid_mild') {
        ctx.strokeStyle = '#fb923c';
        ctx.lineWidth = 2.5;
      } else if (classification === 'riffle') {
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 2;
      } else {
        ctx.strokeStyle = '#60a5fa';
        ctx.lineWidth = 2;
      }
      ctx.stroke();
    }
    
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
    
    // Store bounds for interaction
    profileBounds.current = { maxDist, padLeft: pad.left, chartW };
  }, []);

  // Draw selection overlay on canvas
  const drawSelectionOverlay = useCallback((startM: number, endM: number) => {
    const canvas = elevationCanvas.current;
    if (!canvas || !profileBounds.current || !route) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const { maxDist, padLeft, chartW } = profileBounds.current;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const H = rect.height;
    const pad = { top: 20, bottom: 30 };
    const chartH = H - pad.top - pad.bottom;
    
    // Redraw the profile first
    drawElevationProfile(route.stats.elevation_profile, route.stats.steep_sections || []);
    
    // Draw selection highlight
    const toX = (d: number) => padLeft + (d / maxDist) * chartW;
    const x1 = toX(Math.min(startM, endM));
    const x2 = toX(Math.max(startM, endM));
    
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fillRect(x1, pad.top, x2 - x1, chartH);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x1, pad.top, x2 - x1, chartH);
    ctx.restore();
  }, [route, drawElevationProfile]);

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
  const calculateRoute = async (startSnap: SnapResult, endSnap: SnapResult, flow: string = flowCondition, speed: number = paddleSpeed) => {
    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch(`/api/route?start_lng=${startSnap.snap_point.lng}&start_lat=${startSnap.snap_point.lat}&end_lng=${endSnap.snap_point.lng}&end_lat=${endSnap.snap_point.lat}&flow=${flow}&paddle_speed=${speed}`);
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
        await calculateRoute(putIn, snap, flowCondition, paddleSpeed);
      }
      setLoading(false);
    }
  }, [putIn, takeOut, flowCondition, paddleSpeed]);

  // Handle flow condition change - recalculate route
  const handleFlowChange = async (newFlow: 'low' | 'normal' | 'high') => {
    setFlowCondition(newFlow);
    if (putIn && takeOut) {
      await calculateRoute(putIn, takeOut, newFlow, paddleSpeed);
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
    setProfileSelection(null);
    
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
      style: BASEMAP_STYLES.outdoors,
      center: [-111.73, 45.35], // Ennis, Montana
      zoom: 10,
      pitch: 0
    });
    
    map.current.addControl(new mapboxgl.NavigationControl());
    map.current.addControl(new mapboxgl.FullscreenControl());
    
    // Function to add all river layers (called on load and style change)
    const addRiverLayers = () => {
      if (!map.current) return;
      // Add Vermont rivers tileset
      map.current!.addSource('vt-rivers', {
        type: 'vector',
        url: 'mapbox://lman967.9hfg3bbo'
      });
      
      // Add 5-state rivers tileset (PA, UT, MT, WA, NC)
      map.current!.addSource('test-rivers', {
        type: 'vector',
        url: 'mapbox://lman967.d0g758s3'
      });
      
      // River lines - styled by stream order (VT)
      map.current!.addLayer({
        id: 'rivers-line',
        type: 'line',
        source: 'vt-rivers',
        'source-layer': 'vtRivers-3bijjc',
        layout: {
          'line-cap': 'round',
          'line-join': 'round'
        },
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
      
      // River lines - 5 states
      map.current!.addLayer({
        id: 'test-rivers-line',
        type: 'line',
        source: 'test-rivers',
        'source-layer': 'testRiversSet-cr53z3',
        layout: {
          'line-cap': 'round',
          'line-join': 'round'
        },
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
      
      // Create arrow icon for flow direction (white for SDF coloring)
      const arrowSize = 24;
      const arrowCanvas = document.createElement('canvas');
      arrowCanvas.width = arrowSize;
      arrowCanvas.height = arrowSize;
      const ctx = arrowCanvas.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(arrowSize * 0.15, arrowSize * 0.25);
      ctx.lineTo(arrowSize * 0.85, arrowSize * 0.5);
      ctx.lineTo(arrowSize * 0.15, arrowSize * 0.75);
      ctx.closePath();
      ctx.fill();
      
      // Convert canvas to ImageData for Mapbox (SDF mode for dynamic coloring)
      const imageData = ctx.getImageData(0, 0, arrowSize, arrowSize);
      map.current!.addImage('flow-arrow', imageData, { sdf: true });
      
      // Arrow color based on basemap
      const arrowColor = basemapRef.current === 'outdoors' ? '#1e40af' : '#ffffff';
      
      // Flow direction arrows (5 states)
      map.current!.addLayer({
        id: 'test-rivers-arrows',
        type: 'symbol',
        source: 'test-rivers',
        'source-layer': 'testRiversSet-cr53z3',
        minzoom: 10,
        layout: {
          'symbol-placement': 'line',
          'symbol-spacing': 150,
          'icon-image': 'flow-arrow',
          'icon-size': [
            'interpolate', ['linear'], ['get', 'stream_order'],
            1, 0.4,
            3, 0.6,
            5, 0.8,
            7, 1.0
          ],
          'icon-rotation-alignment': 'map',
          'icon-allow-overlap': false,
          'icon-ignore-placement': false
        },
        paint: {
          'icon-opacity': 0.8,
          'icon-color': arrowColor
        }
      });

      // River labels (VT)
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
      
      // River labels (5 states)
      map.current!.addLayer({
        id: 'test-rivers-labels',
        type: 'symbol',
        source: 'test-rivers',
        'source-layer': 'testRiversSet-cr53z3',
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
      
      // Access points layer
      map.current!.addSource('access-points', {
        type: 'vector',
        url: 'mapbox://lman967.access-points-clean'
      });
      
      // Campgrounds near water layer
      map.current!.addSource('campgrounds', {
        type: 'vector',
        url: 'mapbox://lman967.campgrounds-near-water'
      });
      
      // Campgrounds - circles at low zoom (below 6)
      map.current!.addLayer({
        id: 'campgrounds-circles',
        type: 'circle',
        source: 'campgrounds',
        'source-layer': 'campgrounds',
        maxzoom: 6,
        paint: {
          'circle-radius': [
            'interpolate', ['linear'], ['zoom'],
            0, 2,
            4, 3,
            6, 4
          ],
          'circle-color': '#22c55e',
          'circle-stroke-width': 1,
          'circle-stroke-color': '#ffffff'
        }
      });
      
      // Campgrounds - symbol layer at zoom 6+
      map.current!.addLayer({
        id: 'campgrounds-layer',
        type: 'symbol',
        source: 'campgrounds',
        'source-layer': 'campgrounds',
        minzoom: 6,
        layout: {
          'icon-image': 'campsite',
          'icon-size': [
            'interpolate', ['linear'], ['zoom'],
            6, 0.8,
            10, 1.0,
            14, 1.2
          ],
          'icon-allow-overlap': false,
          'icon-ignore-placement': false,
          'text-field': ['step', ['zoom'], '', 10, ['get', 'name']],
          'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'],
          'text-size': 11,
          'text-offset': [0, 1.2],
          'text-anchor': 'top',
          'text-optional': true
        },
        paint: {
          'icon-color': '#22c55e',
          'text-color': '#1f2937',
          'text-halo-color': '#ffffff',
          'text-halo-width': 1.5
        }
      });
      
      // Access points - circles at low zoom (below 6)
      map.current!.addLayer({
        id: 'access-points-circles-low',
        type: 'circle',
        source: 'access-points',
        'source-layer': 'access_points_clean',
        maxzoom: 6,
        paint: {
          'circle-radius': [
            'interpolate', ['linear'], ['zoom'],
            0, 2,
            4, 3,
            6, 4
          ],
          'circle-color': '#3b82f6',
          'circle-stroke-width': 1,
          'circle-stroke-color': '#ffffff'
        }
      });
      
      // Access points - blue circle background at zoom 6+
      map.current!.addLayer({
        id: 'access-points-circles',
        type: 'circle',
        source: 'access-points',
        'source-layer': 'access_points_clean',
        minzoom: 6,
        paint: {
          'circle-radius': [
            'interpolate', ['linear'], ['zoom'],
            6, 10,
            10, 12,
            14, 14
          ],
          'circle-color': '#3b82f6',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff'
        }
      });
      
      // Access points - pitch icon on top of circle at zoom 6+
      map.current!.addLayer({
        id: 'access-points-layer',
        type: 'symbol',
        source: 'access-points',
        'source-layer': 'access_points_clean',
        minzoom: 6,
        layout: {
          'icon-image': 'pitch',
          'icon-size': [
            'interpolate', ['linear'], ['zoom'],
            6, 0.6,
            10, 0.8,
            14, 1.0
          ],
          'icon-allow-overlap': false,
          'icon-ignore-placement': false,
          'text-field': ['step', ['zoom'], '', 10, ['get', 'name']],
          'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'],
          'text-size': 11,
          'text-offset': [0, 1.5],
          'text-anchor': 'top',
          'text-optional': true
        },
        paint: {
          'icon-color': '#ffffff',
          'text-color': '#1f2937',
          'text-halo-color': '#ffffff',
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
    };
    
    // Add layers on initial load
    map.current.on('load', addRiverLayers);
    
    // Re-add layers after style change
    map.current.on('style.load', addRiverLayers);
    
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
      setTimeout(() => drawElevationProfile(
        route.stats.elevation_profile, 
        route.stats.steep_sections || []
      ), 100);
    }
  }, [route, drawElevationProfile]);

  // Handle basemap change
  const handleBasemapChange = useCallback((newBasemap: 'outdoors' | 'satellite' | 'dark') => {
    if (!map.current || newBasemap === basemap) return;
    setBasemap(newBasemap);
    basemapRef.current = newBasemap;
    map.current.setStyle(BASEMAP_STYLES[newBasemap]);
    
    // Re-add route data after style loads (if there's an active route)
    if (route) {
      map.current.once('style.load', () => {
        const source = map.current?.getSource('route') as mapboxgl.GeoJSONSource;
        if (source) {
          source.setData(route.route);
        }
      });
    }
  }, [basemap, route]);

  // Convert distance to point on route
  const getPointAtDistance = useCallback((targetDist: number): [number, number] | null => {
    if (!route) return null;
    
    let accumDist = 0;
    for (const feature of route.route.features) {
      const coords = (feature.geometry as any).coordinates as [number, number][];
      
      for (let i = 1; i < coords.length; i++) {
        const [lng1, lat1] = coords[i - 1];
        const [lng2, lat2] = coords[i];
        
        // Approximate distance (good enough for this purpose)
        const segDist = Math.sqrt(
          Math.pow((lng2 - lng1) * 111000 * Math.cos(lat1 * Math.PI / 180), 2) +
          Math.pow((lat2 - lat1) * 111000, 2)
        );
        
        if (accumDist + segDist >= targetDist) {
          // Interpolate point along segment
          const ratio = segDist > 0 ? (targetDist - accumDist) / segDist : 0;
          return [
            lng1 + (lng2 - lng1) * ratio,
            lat1 + (lat2 - lat1) * ratio
          ];
        }
        
        accumDist += segDist;
      }
    }
    
    // Return last point if distance exceeds route
    const lastFeature = route.route.features[route.route.features.length - 1];
    const lastCoords = (lastFeature.geometry as any).coordinates as [number, number][];
    return lastCoords[lastCoords.length - 1];
  }, [route]);

  // Update map highlight when selection changes
  useEffect(() => {
    if (!map.current || !route) return;
    
    // Add highlight source if it doesn't exist
    if (!map.current.getSource('profile-highlight')) {
      map.current.addSource('profile-highlight', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });
      
      // Highlight circle at start of selection
      map.current.addLayer({
        id: 'profile-highlight-start',
        type: 'circle',
        source: 'profile-highlight',
        filter: ['==', ['get', 'type'], 'start'],
        paint: {
          'circle-radius': 10,
          'circle-color': '#22c55e',
          'circle-stroke-width': 3,
          'circle-stroke-color': '#ffffff'
        }
      });
      
      // Highlight circle at end of selection
      map.current.addLayer({
        id: 'profile-highlight-end',
        type: 'circle',
        source: 'profile-highlight',
        filter: ['==', ['get', 'type'], 'end'],
        paint: {
          'circle-radius': 10,
          'circle-color': '#ef4444',
          'circle-stroke-width': 3,
          'circle-stroke-color': '#ffffff'
        }
      });
      
      // Line connecting the points
      map.current.addLayer({
        id: 'profile-highlight-line',
        type: 'line',
        source: 'profile-highlight',
        filter: ['==', ['get', 'type'], 'line'],
        paint: {
          'line-color': '#ffffff',
          'line-width': 4,
          'line-dasharray': [2, 2]
        }
      }, 'route-line');
    }
    
    const source = map.current.getSource('profile-highlight') as mapboxgl.GeoJSONSource;
    
    if (profileSelection) {
      const startPoint = getPointAtDistance(Math.min(profileSelection.startM, profileSelection.endM));
      const endPoint = getPointAtDistance(Math.max(profileSelection.startM, profileSelection.endM));
      
      if (startPoint && endPoint) {
        // Build line between points following the route
        const lineCoords: [number, number][] = [];
        let accumDist = 0;
        const minDist = Math.min(profileSelection.startM, profileSelection.endM);
        const maxDist = Math.max(profileSelection.startM, profileSelection.endM);
        let recording = false;
        
        for (const feature of route.route.features) {
          const coords = (feature.geometry as any).coordinates as [number, number][];
          for (let i = 0; i < coords.length; i++) {
            if (i > 0) {
              const [lng1, lat1] = coords[i - 1];
              const [lng2, lat2] = coords[i];
              const segDist = Math.sqrt(
                Math.pow((lng2 - lng1) * 111000 * Math.cos(lat1 * Math.PI / 180), 2) +
                Math.pow((lat2 - lat1) * 111000, 2)
              );
              
              if (accumDist >= minDist && !recording) {
                recording = true;
                lineCoords.push(coords[i - 1]);
              }
              
              if (recording) {
                lineCoords.push(coords[i]);
              }
              
              if (accumDist + segDist >= maxDist && recording) {
                recording = false;
                break;
              }
              
              accumDist += segDist;
            }
          }
          if (!recording && lineCoords.length > 0) break;
        }
        
        source.setData({
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              properties: { type: 'start' },
              geometry: { type: 'Point', coordinates: startPoint }
            },
            {
              type: 'Feature',
              properties: { type: 'end' },
              geometry: { type: 'Point', coordinates: endPoint }
            },
            {
              type: 'Feature',
              properties: { type: 'line' },
              geometry: { type: 'LineString', coordinates: lineCoords.length > 1 ? lineCoords : [startPoint, endPoint] }
            }
          ]
        });
      }
    } else {
      // Clear highlights
      source.setData({ type: 'FeatureCollection', features: [] });
    }
  }, [profileSelection, route, getPointAtDistance]);

  // Canvas mouse handlers for profile selection
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!profileBounds.current) return;
    
    const canvas = elevationCanvas.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const { maxDist, padLeft, chartW } = profileBounds.current;
    
    // Convert x to distance
    const dist = Math.max(0, Math.min(maxDist, ((x - padLeft) / chartW) * maxDist));
    
    isDragging.current = true;
    dragStartX.current = dist;
    setProfileSelection({ startM: dist, endM: dist });
  }, []);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging.current || !profileBounds.current) return;
    
    const canvas = elevationCanvas.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const { maxDist, padLeft, chartW } = profileBounds.current;
    
    const dist = Math.max(0, Math.min(maxDist, ((x - padLeft) / chartW) * maxDist));
    
    setProfileSelection({ startM: dragStartX.current, endM: dist });
    drawSelectionOverlay(dragStartX.current, dist);
  }, [drawSelectionOverlay]);

  const handleCanvasMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  const handleCanvasMouseLeave = useCallback(() => {
    if (isDragging.current) {
      isDragging.current = false;
    }
  }, []);

  return (
    <main className={styles.main}>
      <div className={styles.header}>
        <h1>River Router</h1>
        <p>Click to set a put-in and take-out, then get your float route with estimated times</p>
      </div>
      
      <div className={styles.container}>
        <div ref={mapContainer} className={styles.map} />
        
        <div className={styles.panel}>
          {/* Basemap selector */}
          <div className={styles.section}>
            <h3>🗺️ Basemap</h3>
            <div className={styles.basemapButtons}>
              <button
                className={`${styles.basemapBtn} ${basemap === 'outdoors' ? styles.basemapBtnActive : ''}`}
                onClick={() => handleBasemapChange('outdoors')}
              >
                Outdoors
              </button>
              <button
                className={`${styles.basemapBtn} ${basemap === 'satellite' ? styles.basemapBtnActive : ''}`}
                onClick={() => handleBasemapChange('satellite')}
              >
                Satellite
              </button>
              <button
                className={`${styles.basemapBtn} ${basemap === 'dark' ? styles.basemapBtnActive : ''}`}
                onClick={() => handleBasemapChange('dark')}
              >
                Dark
              </button>
            </div>
          </div>

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
              {error.includes('Upstream') && (
                <button 
                  className={styles.swapBtn}
                  onClick={() => {
                    // Swap put-in and take-out
                    if (putIn && takeOut) {
                      const temp = putIn;
                      setPutIn(takeOut);
                      setTakeOut(temp);
                      setError(null);
                      
                      // Swap markers
                      if (putInMarker.current && takeOutMarker.current) {
                        const putInPos = putInMarker.current.getLngLat();
                        const takeOutPos = takeOutMarker.current.getLngLat();
                        putInMarker.current.setLngLat(takeOutPos);
                        takeOutMarker.current.setLngLat(putInPos);
                      }
                      
                      // Recalculate with swapped points
                      calculateRoute(takeOut, temp, flowCondition, paddleSpeed);
                    }
                  }}
                >
                  🔄 Swap Points
                </button>
              )}
            </div>
          )}
          
          {/* Upstream warnings */}
          {route?.warnings && route.warnings.length > 0 && (
            <div className={styles.section}>
              <div className={styles.upstreamWarning}>
                {route.warnings.map((warning, i) => (
                  <div key={i} className={styles.warningItem}>{warning}</div>
                ))}
              </div>
            </div>
          )}
          
          {/* Route stats */}
          {route && (
            <>
              <div className={styles.section}>
                <h3>📊 Trip Stats {route.stats.direction?.is_upstream && <span className={styles.upstreamBadge}>⬆️ UPSTREAM</span>}</h3>
                <div className={styles.statGrid}>
                  <div className={styles.stat}>
                    <span className={styles.statValue}>{route.stats.distance_mi}</span>
                    <span className={styles.statLabel}>miles</span>
                  </div>
                  <div className={styles.stat}>
                    <span className={styles.statValue}>
                      {formatTime(route.stats.float_time_s, 0)}
                      {route.stats.has_impossible_segments ? '+' : ''}
                    </span>
                    <span className={styles.statLabel}>
                      {route.stats.direction?.is_upstream ? 'paddle time' : 'float time'}
                      {route.stats.has_impossible_segments ? ' ⚠️' : ''}
                    </span>
                  </div>
                  <div className={styles.stat}>
                    <span className={styles.statValue}>
                      {route.stats.direction?.is_upstream 
                        ? `+${route.stats.elev_gain_ft || 0}` 
                        : route.stats.elev_drop_ft}
                    </span>
                    <span className={styles.statLabel}>
                      {route.stats.direction?.is_upstream ? 'ft gain ⬆️' : 'ft drop'}
                    </span>
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
              
              {/* Live Conditions Panel */}
              {route.stats.live_conditions && route.stats.live_conditions.nwm_coverage_percent > 0 && (
                <div className={styles.section}>
                  <h3><span className={styles.liveIndicator}>●</span> Live Conditions</h3>
                  
                  <div className={styles.liveStats}>
                    {/* Current Flow Status */}
                    <div className={styles.flowStatusRow}>
                      <span className={styles.flowStatusLabel}>Flow Status</span>
                      <span className={`${styles.flowStatusBadge} ${styles[`flow${route.stats.live_conditions.flow_status?.charAt(0).toUpperCase()}${route.stats.live_conditions.flow_status?.slice(1)}`]}`}>
                        {route.stats.live_conditions.flow_status === 'high' ? '↑ High' : 
                         route.stats.live_conditions.flow_status === 'low' ? '↓ Low' : '~ Normal'}
                      </span>
                    </div>
                    
                    {/* Water Speed & Flow */}
                    <div className={styles.comparisonGrid}>
                      <div className={styles.comparisonItem}>
                        <span className={styles.comparisonValue}>
                          {route.stats.live_conditions.avg_velocity_mph || '—'}
                        </span>
                        <span className={styles.comparisonLabel}>Water Speed</span>
                      </div>
                      <div className={styles.comparisonItem}>
                        <span className={styles.comparisonValue}>
                          {route.stats.live_conditions.baseline_velocity_mph || '—'}
                        </span>
                        <span className={styles.comparisonLabel}>Avg (EROM)</span>
                      </div>
                      <div className={styles.comparisonItem}>
                        <span className={styles.comparisonValue}>
                          {route.stats.live_conditions.avg_streamflow_cfs 
                            ? `${route.stats.live_conditions.avg_streamflow_cfs}` 
                            : '—'}
                        </span>
                        <span className={styles.comparisonLabel}>Flow (CFS)</span>
                      </div>
                    </div>
                    
                    {/* Time Difference */}
                    {route.stats.live_conditions.time_diff_s !== 0 && (
                      <div className={styles.timeDiff}>
                        {route.stats.live_conditions.time_diff_s > 0 ? (
                          <span className={styles.timeFaster}>
                            🎉 {Math.abs(Math.round(route.stats.live_conditions.time_diff_s / 60))} min faster than average!
                          </span>
                        ) : (
                          <span className={styles.timeSlower}>
                            ⏱️ {Math.abs(Math.round(route.stats.live_conditions.time_diff_s / 60))} min slower than average
                          </span>
                        )}
                      </div>
                    )}
                    
                    {/* Data Source */}
                    <div className={styles.dataSource}>
                      <span>NOAA NWM • {route.stats.live_conditions.nwm_coverage_percent}% coverage</span>
                      {route.stats.live_conditions.data_timestamp && (
                        <span> • {new Date(route.stats.live_conditions.data_timestamp).toLocaleTimeString()}</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Paddle speed */}
              <div className={styles.section}>
                <h3>🚣 Paddle Speed</h3>
                <div className={styles.sliderContainer}>
                  <input 
                    type="range" 
                    min="1" 
                    max="6" 
                    step="0.5"
                    value={paddleSpeed}
                    onChange={(e) => {
                      const newSpeed = parseFloat(e.target.value);
                      setPaddleSpeed(newSpeed);
                      // Recalculate route with new paddle speed
                      if (putIn && takeOut) {
                        calculateRoute(putIn, takeOut, flowCondition, newSpeed);
                      }
                    }}
                    className={styles.slider}
                  />
                  <div className={styles.sliderLabels}>
                    <span>1 mph</span>
                    <span><strong>{paddleSpeed} mph</strong></span>
                    <span>6 mph</span>
                  </div>
                </div>
                {route.stats.direction?.is_upstream && (
                  <div className={styles.upstreamInfo}>
                    ⬆️ Paddling upstream at {paddleSpeed} mph against {route.stats.live_conditions?.avg_velocity_mph || '~0.5'} mph current
                  </div>
                )}
                {route.stats.direction?.impossible_segments && route.stats.direction.impossible_segments > 0 && (
                  <div className={styles.impossibleWarning}>
                    ⚠️ {route.stats.direction.impossible_segments} segments have currents faster than your paddle speed!
                  </div>
                )}
              </div>

              {/* Elevation profile */}
              {route.stats.elevation_profile && route.stats.elevation_profile.length > 0 && (
                <div className={styles.section}>
                  <h3>📈 Elevation Profile</h3>
                  <canvas 
                    ref={elevationCanvas} 
                    className={styles.elevationChart}
                    onMouseDown={handleCanvasMouseDown}
                    onMouseMove={handleCanvasMouseMove}
                    onMouseUp={handleCanvasMouseUp}
                    onMouseLeave={handleCanvasMouseLeave}
                  />
                  {profileSelection && Math.abs(profileSelection.endM - profileSelection.startM) > 100 && (
                    <div className={styles.selectionInfo}>
                      📍 Selection: {((Math.abs(profileSelection.endM - profileSelection.startM)) / 1609.34).toFixed(2)} mi
                      <button 
                        className={styles.clearSelectionBtn}
                        onClick={() => setProfileSelection(null)}
                      >
                        Clear
                      </button>
                    </div>
                  )}
                  <div className={styles.legend}>
                    <span className={styles.legendItem}>
                      <span className={styles.legendColor} style={{ background: '#60a5fa' }}></span>
                      Pool (&lt;5 ft/mi)
                    </span>
                    <span className={styles.legendItem}>
                      <span className={styles.legendColor} style={{ background: '#facc15' }}></span>
                      Riffle (5-15)
                    </span>
                    <span className={styles.legendItem}>
                      <span className={styles.legendColor} style={{ background: '#fb923c' }}></span>
                      Rapid I-II (15-30)
                    </span>
                    <span className={styles.legendItem}>
                      <span className={styles.legendColor} style={{ background: '#ef4444' }}></span>
                      Rapid III+ (&gt;30)
                    </span>
                  </div>
                  {route.stats.steep_sections && route.stats.steep_sections.length > 0 && (
                    <div className={styles.steepWarning}>
                      ⚠️ {route.stats.steep_sections.length} potential rapid/riffle section{route.stats.steep_sections.length > 1 ? 's' : ''} detected
                    </div>
                  )}
                </div>
              )}
            </>
          )}
          
          {/* Info */}
          <div className={styles.section}>
            <h3>ℹ️ About</h3>
            <p className={styles.info}>
              <strong>Real-time data:</strong> NOAA National Water Model (NWM) — 
              hourly velocity & streamflow forecasts for 2.7M river reaches.
            </p>
            <p className={styles.info}>
              <strong>Historical baseline:</strong> USGS NHDPlus EROM (Extended Reach Output Model) — 
              mean annual velocity estimates.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
