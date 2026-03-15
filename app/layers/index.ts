import mapboxgl from 'mapbox-gl';
import { addRiversSource, addRiversLayers } from './rivers';
import { addLakesSource, addLakesLayers } from './lakes';
import { addAccessPointsSource, addAccessPointsBackdrop } from './accessPoints';
import { addCampgroundsSource, addCampgroundsBackdrop } from './campgrounds';
import { addRapidsSource, addRapidsCircles } from './rapids';
import { addWaterfallsSource, addWaterfallsBackdrop } from './waterfalls';
import { addDamsSource, addDamsBackdrop } from './dams';
import { addRouteSource, addRouteLayers } from './routeLayer';
import { addBlmLandsSource, addBlmLandsLayers } from './blmLands';
import { addWildernessSource, addWildernessLayers } from './wilderness';
import { addNationalForestsSource, addNationalForestsLayers } from './nationalForests';
import { addNationalParksSource, addNationalParksLayers } from './nationalParks';
import { addGaugesSource, addGaugesLayers } from './gauges';
import { addPoiIcons } from './poiIcons';
import { addBwcaLayers } from './bwca';

export * from './rivers';
export * from './bwca';
export * from './lakes';
export * from './accessPoints';
export * from './campgrounds';
export * from './rapids';
export * from './waterfalls';
export * from './dams';
export * from './routeLayer';
export * from './blmLands';
export * from './wilderness';
export * from './nationalForests';
export * from './nationalParks';
export * from './gauges';
export * from './weather';

/**
 * Add all map sources and layers
 */
export async function addAllLayers(map: mapboxgl.Map, basemap: string) {
  // Add sources
  addBlmLandsSource(map);
  addWildernessSource(map);
  addNationalForestsSource(map);
  addNationalParksSource(map);
  addLakesSource(map);
  addRiversSource(map);
  addAccessPointsSource(map);
  addWaterfallsSource(map);
  addRapidsSource(map);
  addDamsSource(map);
  addCampgroundsSource(map);
  addGaugesSource(map);
  addRouteSource(map);

  // Add layers in order (bottom to top)
  // Land layers first (below everything)
  addBlmLandsLayers(map);
  addWildernessLayers(map);
  addNationalForestsLayers(map);
  addNationalParksLayers(map);
  
  // Lakes (below rivers)
  addLakesLayers(map);
  
  // Then rivers
  addRiversLayers(map, basemap);
  
  // Register custom POI pin icons, then add symbol layers
  await addPoiIcons(map);
  addWaterfallsBackdrop(map);
  addRapidsCircles(map);
  addDamsBackdrop(map);
  addCampgroundsBackdrop(map);
  addAccessPointsBackdrop(map);
  
  // Gauges (below route, above POIs)
  addGaugesLayers(map);
  
  // Route on top
  addRouteLayers(map);
  
  // BWCA layers (for Boundary Waters mode)
  addBwcaLayers(map);
}
