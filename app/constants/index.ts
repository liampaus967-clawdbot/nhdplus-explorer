import mapboxgl from 'mapbox-gl';
import { BasemapStyle } from '../types';
import onWaterTopoLight from '../styles/onwater-topo-light.json';

// Map configuration
export const MAP_CONFIG = {
  center: [-72.617, 44.594] as [number, number], // Hyde Park, Vermont
  zoom: 10,
  pitch: 0,
};

// Basemap styles
// Using custom onWater Topo Light for outdoors (terrain, hillshade, public lands)
export const BASEMAP_STYLES: Record<BasemapStyle, string | mapboxgl.StyleSpecification> = {
  outdoors: onWaterTopoLight as mapboxgl.StyleSpecification,
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
  blmLands: 'mapbox://lman967.blm_polygons',
  wilderness: 'mapbox://lman967.wilderness_areas',
};

// Source layer names
export const SOURCE_LAYERS = {
  rivers: 'eastCoastRivers',
  accessPoints: 'access_points_clean',
  campgrounds: 'campgrounds',
  rapids: 'rapids',
  waterfalls: 'waterfalls',
  blmLands: 'blm_polygons',
  wilderness: 'wilderness_areas',
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
  blmLands: '#c9a227', // Yellow/tan for BLM lands
  wilderness: '#1a5d1a', // Deep green for wilderness areas
};
