'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { MapboxOverlay } from '@deck.gl/mapbox';
import { PathLayer } from '@deck.gl/layers';
import type mapboxgl from 'mapbox-gl';
import type { WindData } from '@/app/hooks/useWindData';

interface Particle {
  id: number;
  x: number;
  y: number;
  age: number;
  maxAge: number;
  trail: { lng: number; lat: number; age: number }[];
}

interface ViewBounds {
  west: number;
  east: number;
  south: number;
  north: number;
}

interface DeckWindParticleLayerProps {
  map: mapboxgl.Map | null;
  windData: WindData | null;
  enabled?: boolean;
  baseParticleCount?: number;
  lineWidth?: number;
  speedFactor?: number;
  trailLength?: number;
  maxAge?: number;
  opacity?: number;
  styleVersion?: number; // Increment to reinitialize after basemap change
}

// Smoother color scale for wind speed (m/s)
const COLOR_SCALE: [number, number, number][] = [
  [100, 180, 200],  // 0-5 m/s - soft cyan
  [120, 200, 180],  // 5-10 m/s - teal
  [160, 210, 160],  // 10-15 m/s - soft green
  [200, 220, 140],  // 15-20 m/s - lime
  [230, 210, 120],  // 20-25 m/s - gold
  [240, 180, 100],  // 25-30 m/s - orange
  [240, 140, 90],   // 30-35 m/s - coral
  [230, 100, 80],   // 35-40 m/s - salmon
  [210, 70, 70],    // 40-45 m/s - red
  [180, 50, 60],    // 45+ m/s - dark red
];

function getColorForMagnitude(magnitude: number): [number, number, number] {
  const maxSpeed = 40;
  const normalized = Math.min(magnitude / maxSpeed, 1);
  const index = Math.min(Math.floor(normalized * (COLOR_SCALE.length - 1)), COLOR_SCALE.length - 1);
  return COLOR_SCALE[index];
}

export function DeckWindParticleLayer({
  map,
  windData,
  enabled = true,
  baseParticleCount = 4000,
  lineWidth = 1.5,
  speedFactor = 0.08,
  trailLength = 15,
  maxAge = 80,
  opacity = 0.7,
  styleVersion = 0,
}: DeckWindParticleLayerProps) {
  const overlayRef = useRef<MapboxOverlay | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const [viewBounds, setViewBounds] = useState<ViewBounds | null>(null);
  const [zoom, setZoom] = useState(3);
  const lastStyleVersionRef = useRef(styleVersion);

  // Calculate particle count based on zoom level
  // Higher counts at low zoom for better national-scale coverage
  const getParticleCount = useCallback((currentZoom: number) => {
    if (currentZoom < 3) return Math.floor(baseParticleCount * 2);    // National view - more particles
    if (currentZoom < 4) return Math.floor(baseParticleCount * 1.5);  // Wide regional
    if (currentZoom < 6) return baseParticleCount;
    if (currentZoom < 8) return Math.floor(baseParticleCount * 0.4);
    if (currentZoom < 10) return Math.floor(baseParticleCount * 0.15);
    if (currentZoom < 12) return Math.floor(baseParticleCount * 0.06);
    return Math.floor(baseParticleCount * 0.03);
  }, [baseParticleCount]);

  // Calculate speed factor based on zoom
  const getSpeedFactor = useCallback((currentZoom: number) => {
    if (currentZoom < 4) return speedFactor;
    if (currentZoom < 6) return speedFactor * 0.7;
    if (currentZoom < 8) return speedFactor * 0.4;
    if (currentZoom < 10) return speedFactor * 0.15;
    if (currentZoom < 12) return speedFactor * 0.06;
    return speedFactor * 0.02;
  }, [speedFactor]);

  // Calculate trail length based on zoom
  const getTrailLength = useCallback((currentZoom: number) => {
    if (currentZoom < 4) return trailLength;
    if (currentZoom < 6) return Math.floor(trailLength * 0.8);
    if (currentZoom < 8) return Math.floor(trailLength * 0.6);
    if (currentZoom < 10) return Math.floor(trailLength * 0.4);
    if (currentZoom < 12) return Math.floor(trailLength * 0.25);
    return Math.max(3, Math.floor(trailLength * 0.15));
  }, [trailLength]);

  // Helper to find a valid spawn position (where alpha > 0)
  const findValidSpawnPosition = useCallback((
    spawnBounds: ViewBounds,
    dataBounds: ViewBounds,
    imageData: ImageData,
    width: number,
    height: number,
    maxAttempts: number = 10
  ): { x: number; y: number; lng: number; lat: number } | null => {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const lng = spawnBounds.west + Math.random() * (spawnBounds.east - spawnBounds.west);
      const lat = spawnBounds.south + Math.random() * (spawnBounds.north - spawnBounds.south);
      
      const x = ((lng - dataBounds.west) / (dataBounds.east - dataBounds.west)) * width;
      const y = ((dataBounds.north - lat) / (dataBounds.north - dataBounds.south)) * height;
      
      const px = Math.floor(x);
      const py = Math.floor(y);
      
      if (px >= 0 && px < width && py >= 0 && py < height) {
        const idx = (py * width + px) * 4;
        const alpha = imageData.data[idx + 3];
        
        // Only spawn where we have valid wind data (alpha > 0)
        if (alpha > 0) {
          return { x, y, lng, lat };
        }
      }
    }
    // Fallback: return random position anyway (will respawn quickly if invalid)
    const lng = spawnBounds.west + Math.random() * (spawnBounds.east - spawnBounds.west);
    const lat = spawnBounds.south + Math.random() * (spawnBounds.north - spawnBounds.south);
    const x = ((lng - dataBounds.west) / (dataBounds.east - dataBounds.west)) * width;
    const y = ((dataBounds.north - lat) / (dataBounds.north - dataBounds.south)) * height;
    return { x, y, lng, lat };
  }, []);

  // Initialize particles within view bounds
  const initParticles = useCallback((forceViewBounds?: ViewBounds, forceZoom?: number) => {
    if (!windData) return;

    const { imageData, width, height, bounds: dataBounds } = windData;
    const currentZoom = forceZoom ?? zoom;
    const currentViewBounds = forceViewBounds ?? viewBounds;
    const particleCount = getParticleCount(currentZoom);
    
    // Always use intersection of view bounds and data bounds
    // This ensures particles cover the entire visible data area at all zoom levels
    let spawnBounds = dataBounds;
    if (currentViewBounds) {
      spawnBounds = {
        west: Math.max(dataBounds.west, currentViewBounds.west),
        east: Math.min(dataBounds.east, currentViewBounds.east),
        south: Math.max(dataBounds.south, currentViewBounds.south),
        north: Math.min(dataBounds.north, currentViewBounds.north),
      };
    }

    const particles: Particle[] = [];

    for (let i = 0; i < particleCount; i++) {
      const pos = findValidSpawnPosition(spawnBounds, dataBounds, imageData, width, height);
      if (!pos) continue;

      particles.push({
        id: i,
        x: pos.x,
        y: pos.y,
        age: Math.floor(Math.random() * maxAge),
        maxAge: maxAge + Math.floor(Math.random() * 30) - 15,
        trail: [{ lng: pos.lng, lat: pos.lat, age: 0 }],
      });
    }

    particlesRef.current = particles;
  }, [windData, zoom, viewBounds, maxAge, getParticleCount, findValidSpawnPosition]);

  // Update particle positions based on wind field
  const updateParticles = useCallback(() => {
    if (!windData) return;

    const { imageData, width, height, bounds } = windData;
    const particles = particlesRef.current;
    
    const currentSpeedFactor = getSpeedFactor(zoom);
    const currentTrailLength = getTrailLength(zoom);

    particles.forEach((particle) => {
      const px = Math.floor(particle.x);
      const py = Math.floor(particle.y);

      if (px >= 0 && px < width && py >= 0 && py < height) {
        const idx = (py * width + px) * 4;
        const r = imageData.data[idx];
        const g = imageData.data[idx + 1];
        const a = imageData.data[idx + 3];

        if (a > 0) {
          const u = ((r / 255) * 100 - 50);
          const v = ((g / 255) * 100 - 50);

          particle.x += u * currentSpeedFactor;
          particle.y -= v * currentSpeedFactor;

          const lng = bounds.west + (particle.x / width) * (bounds.east - bounds.west);
          const lat = bounds.north - (particle.y / height) * (bounds.north - bounds.south);

          particle.trail.unshift({ lng, lat, age: 0 });
          particle.trail.forEach(p => p.age++);
          
          if (particle.trail.length > currentTrailLength) {
            particle.trail = particle.trail.slice(0, currentTrailLength);
          }
        }
      }

      particle.age++;

      // Check if particle is in an invalid area (alpha = 0) - respawn immediately
      const checkPx = Math.floor(particle.x);
      const checkPy = Math.floor(particle.y);
      let isInvalidArea = false;
      if (checkPx >= 0 && checkPx < width && checkPy >= 0 && checkPy < height) {
        const checkIdx = (checkPy * width + checkPx) * 4;
        if (imageData.data[checkIdx + 3] === 0) {
          isInvalidArea = true;
        }
      }

      if (
        isInvalidArea ||
        particle.age > particle.maxAge ||
        particle.x < 0 || particle.x >= width ||
        particle.y < 0 || particle.y >= height
      ) {
        // Always respawn within visible data area (intersection of view and data bounds)
        let spawnBounds = bounds;
        if (viewBounds) {
          spawnBounds = {
            west: Math.max(bounds.west, viewBounds.west),
            east: Math.min(bounds.east, viewBounds.east),
            south: Math.max(bounds.south, viewBounds.south),
            north: Math.min(bounds.north, viewBounds.north),
          };
        }
        
        // Find a valid spawn position (where alpha > 0)
        const pos = findValidSpawnPosition(spawnBounds, bounds, imageData, width, height);
        if (pos) {
          particle.x = pos.x;
          particle.y = pos.y;
          particle.age = 0;
          particle.maxAge = maxAge + Math.floor(Math.random() * 30) - 15;
          particle.trail = [{ lng: pos.lng, lat: pos.lat, age: 0 }];
        }
      }
    });
  }, [windData, speedFactor, trailLength, maxAge, viewBounds, zoom, getSpeedFactor, getTrailLength, findValidSpawnPosition]);

  // Create deck.gl layers with fading trails
  const createLayers = useCallback(() => {
    if (!windData) return [];
    
    const particles = particlesRef.current;
    const { imageData, width, height } = windData;

    const segmentData: { path: [number, number][]; color: [number, number, number, number] }[] = [];

    particles.forEach((p) => {
      if (p.trail.length < 2) return;

      const px = Math.floor(p.x);
      const py = Math.floor(p.y);
      let magnitude = 5;
      
      if (px >= 0 && px < width && py >= 0 && py < height) {
        const idx = (py * width + px) * 4;
        const r = imageData.data[idx];
        const g = imageData.data[idx + 1];
        const u = ((r / 255) * 100 - 50);
        const v = ((g / 255) * 100 - 50);
        magnitude = Math.sqrt(u * u + v * v);
      }

      const baseColor = getColorForMagnitude(magnitude);
      const trailLen = p.trail.length;

      for (let i = 0; i < trailLen - 1; i++) {
        const t0 = p.trail[i];
        const t1 = p.trail[i + 1];
        const alpha = Math.floor(255 * Math.pow(1 - (i / trailLen), 1.5));
        
        segmentData.push({
          path: [[t0.lng, t0.lat], [t1.lng, t1.lat]],
          color: [baseColor[0], baseColor[1], baseColor[2], alpha],
        });
      }
    });

    return [
      new PathLayer({
        id: 'wind-trails',
        data: segmentData,
        getPath: (d: { path: [number, number][]; color: [number, number, number, number] }) => d.path,
        getColor: (d: { path: [number, number][]; color: [number, number, number, number] }) => d.color,
        getWidth: lineWidth,
        widthUnits: 'pixels',
        widthMinPixels: 1,
        widthMaxPixels: 3,
        capRounded: true,
        jointRounded: true,
        billboard: false,
        opacity: opacity,
        // @ts-ignore
        getPolygonOffset: () => [0, -100],
      }),
    ];
  }, [windData, lineWidth, opacity]);

  // Track map view changes
  useEffect(() => {
    if (!map) return;

    const updateView = () => {
      const bounds = map.getBounds();
      if (!bounds) return;
      const currentZoom = map.getZoom();
      
      setViewBounds({
        west: bounds.getWest(),
        east: bounds.getEast(),
        south: bounds.getSouth(),
        north: bounds.getNorth(),
      });
      setZoom(currentZoom);
    };

    updateView();

    map.on('moveend', updateView);
    map.on('zoomend', updateView);

    return () => {
      map.off('moveend', updateView);
      map.off('zoomend', updateView);
    };
  }, [map]);

  // Reinitialize particles when zoom changes or view moves significantly
  useEffect(() => {
    if (enabled && windData && viewBounds) {
      initParticles(viewBounds, zoom);
    }
  }, [Math.floor(zoom), enabled, windData, viewBounds?.west ? Math.floor(viewBounds.west) : 0]);

  // Animation loop (reinitializes when styleVersion changes, e.g., after basemap switch)
  useEffect(() => {
    if (!enabled || !windData || !map) return;

    // If style changed, remove old overlay and create new one
    if (styleVersion !== lastStyleVersionRef.current) {
      lastStyleVersionRef.current = styleVersion;
      if (overlayRef.current) {
        try {
          map.removeControl(overlayRef.current as unknown as mapboxgl.IControl);
        } catch (e) {
          // Ignore - may already be gone after style change
        }
        overlayRef.current = null;
      }
    }

    if (!overlayRef.current) {
      overlayRef.current = new MapboxOverlay({
        interleaved: true,
        layers: [],
      });
      map.addControl(overlayRef.current as unknown as mapboxgl.IControl);
    }

    const bounds = map.getBounds();
    if (!bounds) return;
    const currentZoom = map.getZoom();
    initParticles({
      west: bounds.getWest(),
      east: bounds.getEast(),
      south: bounds.getSouth(),
      north: bounds.getNorth(),
    }, currentZoom);

    let lastTime = 0;
    const targetFPS = 30;
    const frameInterval = 1000 / targetFPS;
    const MIN_ZOOM_FOR_WIND = 2;

    const animate = (currentTime: number) => {
      if (currentTime - lastTime >= frameInterval) {
        // Hide particles when zoom is below minimum threshold
        const currentMapZoom = map.getZoom();
        if (currentMapZoom < MIN_ZOOM_FOR_WIND) {
          if (overlayRef.current) {
            overlayRef.current.setProps({ layers: [] });
          }
          lastTime = currentTime;
          animationFrameRef.current = requestAnimationFrame(animate);
          return;
        }

        updateParticles();
        
        if (overlayRef.current) {
          overlayRef.current.setProps({
            layers: createLayers(),
          });
        }
        lastTime = currentTime;
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [enabled, windData, map, initParticles, updateParticles, createLayers, styleVersion]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (overlayRef.current && map) {
        try {
          map.removeControl(overlayRef.current as unknown as mapboxgl.IControl);
        } catch (e) {
          // Ignore errors during cleanup
        }
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [map]);

  // Handle enable/disable
  useEffect(() => {
    if (!overlayRef.current) return;

    if (!enabled) {
      overlayRef.current.setProps({ layers: [] });
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    }
  }, [enabled]);

  return null;
}

export default DeckWindParticleLayer;
