import { BasemapStyle } from '../types';

// Map configuration
export const MAP_CONFIG = {
  center: [-72.617, 44.594] as [number, number], // Hyde Park, Vermont
  zoom: 10,
  pitch: 0,
};

// Basemap styles
export const BASEMAP_STYLES: Record<BasemapStyle, string> = {
  outdoors: 'mapbox://styles/mapbox/outdoors-v12',
  satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
  dark: 'mapbox://styles/mapbox/dark-v11',
};

// Flow conditions
export const FLOW_CONDITIONS = {
  low: { label: 'Low Water', description: 'Late summer, drought conditions' },
  normal: { label: 'Normal', description: 'Typical paddling conditions' },
  high: { label: 'High Water', description: 'Spring runoff, after rain' },
};

// Gradient colors for elevation profile
export const GRADIENT_COLORS: Record<string, string> = {
  pool: 'rgba(96, 165, 250, 0.3)',      // Blue - calm
  riffle: 'rgba(250, 204, 21, 0.5)',    // Yellow - riffles
  rapid_mild: 'rgba(251, 146, 60, 0.6)', // Orange - Class I-II
  rapid_steep: 'rgba(239, 68, 68, 0.7)', // Red - Class III+
};

// Tileset URLs
export const TILESETS = {
  rivers: 'mapbox://lman967.east-coast-rivers',
  accessPoints: 'mapbox://lman967.access-points-clean',
  campgrounds: 'mapbox://lman967.campgrounds-near-water',
  rapids: 'mapbox://lman967.rapids',
  waterfalls: 'mapbox://lman967.waterfalls',
};

// Source layer names
export const SOURCE_LAYERS = {
  rivers: 'eastCoastRivers',
  accessPoints: 'access_points_clean',
  campgrounds: 'campgrounds',
  rapids: 'rapids',
  waterfalls: 'waterfalls',
};

// Colors
export const COLORS = {
  river: '#3b82f6',
  riverLabel: '#1e40af',
  accessPoint: '#3b82f6',
  campground: '#22c55e',
  rapid: '#ef4444',
  waterfall: '#67e8f9',
  route: '#f59e0b',
  routeGlow: '#fbbf24',
  putIn: '#22c55e',
  takeOut: '#ef4444',
};
