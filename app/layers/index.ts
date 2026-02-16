import mapboxgl from 'mapbox-gl';
import { addRiversSource, addRiversLayers } from './rivers';
import { addAccessPointsSource, addAccessPointsLayers } from './accessPoints';
import { addCampgroundsSource, addCampgroundsLayers } from './campgrounds';
import { addRapidsSource, addRapidsLayers } from './rapids';
import { addWaterfallsSource, addWaterfallsLayers } from './waterfalls';
import { addRouteSource, addRouteLayers } from './route';

export * from './rivers';
export * from './accessPoints';
export * from './campgrounds';
export * from './rapids';
export * from './waterfalls';
export * from './route';

/**
 * Add all map sources and layers
 */
export function addAllLayers(map: mapboxgl.Map, basemap: string) {
  // Add sources first
  addRiversSource(map);
  addAccessPointsSource(map);
  addWaterfallsSource(map);
  addRapidsSource(map);
  addCampgroundsSource(map);
  addRouteSource(map);

  // Add layers in order (bottom to top)
  addRiversLayers(map, basemap);
  addWaterfallsLayers(map);
  addRapidsLayers(map);
  addCampgroundsLayers(map);
  addAccessPointsLayers(map);
  addRouteLayers(map);
}
