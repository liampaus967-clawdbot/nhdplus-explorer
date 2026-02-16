import mapboxgl from 'mapbox-gl';
import { addRiversSource, addRiversLayers } from './rivers';
import { addAccessPointsSource, addAccessPointsBackdrop, addAccessPointsSymbols } from './accessPoints';
import { addCampgroundsSource, addCampgroundsBackdrop, addCampgroundsSymbols } from './campgrounds';
import { addRapidsSource, addRapidsBackdrop, addRapidsSymbols } from './rapids';
import { addWaterfallsSource, addWaterfallsBackdrop, addWaterfallsSymbols } from './waterfalls';
import { addRouteSource, addRouteLayers } from './routeLayer';
import { addBlmLandsSource, addBlmLandsLayers } from './blmLands';
import { addWildernessSource, addWildernessLayers } from './wilderness';

export * from './rivers';
export * from './accessPoints';
export * from './campgrounds';
export * from './rapids';
export * from './waterfalls';
export * from './routeLayer';
export * from './blmLands';
export * from './wilderness';

/**
 * Custom SDF icons - these can be colored with icon-color
 * Edit the SVGs in /public/icons/ to customize shapes
 */
const CUSTOM_ICONS = [
  { name: 'pitch-sdf', path: '/icons/pitch.svg' },
  { name: 'campsite-sdf', path: '/icons/campsite.svg' },
  { name: 'danger-sdf', path: '/icons/danger.svg' },
  { name: 'waterfall-sdf', path: '/icons/waterfall.svg' },
];

/**
 * Load custom SVG icons as SDF images (enables icon-color)
 */
async function loadCustomIcons(map: mapboxgl.Map): Promise<void> {
  const loadIcon = (name: string, path: string): Promise<void> => {
    return new Promise((resolve) => {
      if (map.hasImage(name)) {
        resolve();
        return;
      }

      const img = new Image();
      img.onload = () => {
        if (!map.hasImage(name)) {
          map.addImage(name, img, { sdf: true });
        }
        resolve();
      };
      img.onerror = () => {
        console.warn(`Failed to load icon: ${path}`);
        resolve();
      };
      img.src = path;
    });
  };

  await Promise.all(CUSTOM_ICONS.map(({ name, path }) => loadIcon(name, path)));
}

/**
 * Add all map sources and layers
 */
export async function addAllLayers(map: mapboxgl.Map, basemap: string) {
  // Load custom SDF icons first
  await loadCustomIcons(map);

  // Add sources
  addBlmLandsSource(map);
  addWildernessSource(map);
  addRiversSource(map);
  addAccessPointsSource(map);
  addWaterfallsSource(map);
  addRapidsSource(map);
  addCampgroundsSource(map);
  addRouteSource(map);

  // Add layers in order (bottom to top)
  // Land layers first (below everything)
  addBlmLandsLayers(map);
  addWildernessLayers(map);
  // Then rivers
  addRiversLayers(map, basemap);
  
  // Add all POI backdrops first (circles)
  addWaterfallsBackdrop(map);
  addRapidsBackdrop(map);
  addCampgroundsBackdrop(map);
  addAccessPointsBackdrop(map);
  
  // Then add all POI symbols on top
  addWaterfallsSymbols(map);
  addRapidsSymbols(map);
  addCampgroundsSymbols(map);
  addAccessPointsSymbols(map);
  
  addRouteLayers(map);
}
