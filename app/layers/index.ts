import mapboxgl from 'mapbox-gl';
import { addRiversSource, addRiversLayers } from './rivers';
import { addLakesSource, addLakesLayers } from './lakes';
import { addAccessPointsSource, addAccessPointsBackdrop } from './accessPoints';
import { addCampgroundsSource, addCampgroundsBackdrop } from './campgrounds';
import { addRapidsSource, addRapidsBackdrop } from './rapids';
import { addWaterfallsSource, addWaterfallsBackdrop } from './waterfalls';
import { addRouteSource, addRouteLayers } from './routeLayer';
import { addBlmLandsSource, addBlmLandsLayers } from './blmLands';
import { addWildernessSource, addWildernessLayers } from './wilderness';
import { addPoiIcons } from './poiIcons';

export * from './rivers';
export * from './lakes';
export * from './accessPoints';
export * from './campgrounds';
export * from './rapids';
export * from './waterfalls';
export * from './routeLayer';
export * from './blmLands';
export * from './wilderness';

/**
 * Add all map sources and layers
 */
export async function addAllLayers(map: mapboxgl.Map, basemap: string) {
  // Add sources
  addBlmLandsSource(map);
  addWildernessSource(map);
  addLakesSource(map);
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
  
  // Lakes (below rivers)
  addLakesLayers(map);
  
  // Then rivers
  addRiversLayers(map, basemap);
  
  // Register custom POI pin icons, then add symbol layers
  await addPoiIcons(map);
  addWaterfallsBackdrop(map);
  addRapidsBackdrop(map);
  addCampgroundsBackdrop(map);
  addAccessPointsBackdrop(map);
  
  // Route on top
  addRouteLayers(map);
}
