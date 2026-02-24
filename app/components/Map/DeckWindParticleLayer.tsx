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
}: DeckWindParticleLayerProps) {
  const overlayRef = useRef<MapboxOverlay | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const [viewBounds, setViewBounds] = useState<ViewBounds | null>(null);
  const [zoom, setZoom] = useState(3);

  // Calculate particle count based on zoom level
  const getParticleCount = useCallback((currentZoom: number) => {
    if (currentZoom < 4) return baseParticleCount;
    if (currentZoom < 6) return Math.floor(baseParticleCount * 0.5);
    if (currentZoom < 8) return Math.floor(baseParticleCount * 0.2);
    if (currentZoom < 10) return Math.floor(baseParticleCount * 0.08);
    if (currentZoom < 12) return Math.floor(baseParticleCount * 0.04);
    return Math.floor(baseParticleCount * 0.025);
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

  // Initialize particles within view bounds
  const initParticles = useCallback((forceViewBounds?: ViewBounds, forceZoom?: number) => {
    if (!windData) return;

    const { width, height, bounds: dataBounds } = windData;
    const currentZoom = forceZoom ?? zoom;
    const currentViewBounds = forceViewBounds ?? viewBounds;
    const particleCount = getParticleCount(currentZoom);
    
    let spawnBounds = dataBounds;
    if (currentViewBounds && currentZoom > 4) {
      spawnBounds = {
        west: Math.max(dataBounds.west, currentViewBounds.west),
        east: Math.min(dataBounds.east, currentViewBounds.east),
        south: Math.max(dataBounds.south, currentViewBounds.south),
        north: Math.min(dataBounds.north, currentViewBounds.north),
      };
    }

    const particles: Particle[] = [];

    for (let i = 0; i < particleCount; i++) {
      const lng = spawnBounds.west + Math.random() * (spawnBounds.east - spawnBounds.west);
      const lat = spawnBounds.south + Math.random() * (spawnBounds.north - spawnBounds.south);
      
      const x = ((lng - dataBounds.west) / (dataBounds.east - dataBounds.west)) * width;
      const y = ((dataBounds.north - lat) / (dataBounds.north - dataBounds.south)) * height;

      particles.push({
        id: i,
        x,
        y,
        age: Math.floor(Math.random() * maxAge),
        maxAge: maxAge + Math.floor(Math.random() * 30) - 15,
        trail: [{ lng, lat, age: 0 }],
      });
    }

    particlesRef.current = particles;
  }, [windData, zoom, viewBounds, maxAge, getParticleCount]);

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

      if (
        particle.age > particle.maxAge ||
        particle.x < 0 || particle.x >= width ||
        particle.y < 0 || particle.y >= height
      ) {
        let spawnBounds = bounds;
        if (viewBounds && zoom > 4) {
          spawnBounds = {
            west: Math.max(bounds.west, viewBounds.west),
            east: Math.min(bounds.east, viewBounds.east),
            south: Math.max(bounds.south, viewBounds.south),
            north: Math.min(bounds.north, viewBounds.north),
          };
        }
        
        const lng = spawnBounds.west + Math.random() * (spawnBounds.east - spawnBounds.west);
        const lat = spawnBounds.south + Math.random() * (spawnBounds.north - spawnBounds.south);
        particle.x = ((lng - bounds.west) / (bounds.east - bounds.west)) * width;
        particle.y = ((bounds.north - lat) / (bounds.north - bounds.south)) * height;
        particle.age = 0;
        particle.maxAge = maxAge + Math.floor(Math.random() * 30) - 15;
        particle.trail = [{ lng, lat, age: 0 }];
      }
    });
  }, [windData, speedFactor, trailLength, maxAge, viewBounds, zoom, getSpeedFactor, getTrailLength]);

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

  // Reinitialize particles when zoom changes significantly
  useEffect(() => {
    if (enabled && windData && viewBounds) {
      initParticles(viewBounds, zoom);
    }
  }, [zoom > 6 ? Math.floor(zoom) : 0, enabled, windData]);

  // Animation loop
  useEffect(() => {
    if (!enabled || !windData || !map) return;

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

    const animate = (currentTime: number) => {
      if (currentTime - lastTime >= frameInterval) {
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
  }, [enabled, windData, map, initParticles, updateParticles, createLayers]);

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
