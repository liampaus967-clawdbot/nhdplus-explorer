import { RouteResult } from '../types';

/**
 * Get a point along a route at a specific distance
 */
export function getPointAtDistance(
  route: RouteResult,
  targetDist: number
): [number, number] | null {
  if (!route) return null;

  let accumDist = 0;
  for (const feature of route.route.features) {
    const coords = (feature.geometry as any).coordinates as [number, number][];

    for (let i = 1; i < coords.length; i++) {
      const [lng1, lat1] = coords[i - 1];
      const [lng2, lat2] = coords[i];

      // Approximate distance (good enough for this purpose)
      const segDist = Math.sqrt(
        Math.pow((lng2 - lng1) * 111000 * Math.cos((lat1 * Math.PI) / 180), 2) +
          Math.pow((lat2 - lat1) * 111000, 2)
      );

      if (accumDist + segDist >= targetDist) {
        // Interpolate point along segment
        const ratio = segDist > 0 ? (targetDist - accumDist) / segDist : 0;
        return [lng1 + (lng2 - lng1) * ratio, lat1 + (lat2 - lat1) * ratio];
      }

      accumDist += segDist;
    }
  }

  // Return last point if distance exceeds route
  const lastFeature = route.route.features[route.route.features.length - 1];
  const lastCoords = (lastFeature.geometry as any).coordinates as [number, number][];
  return lastCoords[lastCoords.length - 1];
}

/**
 * Build line coordinates between two distances along a route
 */
export function buildLineCoordsBetweenDistances(
  route: RouteResult,
  minDist: number,
  maxDist: number
): [number, number][] {
  const lineCoords: [number, number][] = [];
  let accumDist = 0;
  let recording = false;

  for (const feature of route.route.features) {
    const coords = (feature.geometry as any).coordinates as [number, number][];
    for (let i = 0; i < coords.length; i++) {
      if (i > 0) {
        const [lng1, lat1] = coords[i - 1];
        const [lng2, lat2] = coords[i];
        const segDist = Math.sqrt(
          Math.pow((lng2 - lng1) * 111000 * Math.cos((lat1 * Math.PI) / 180), 2) +
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

  return lineCoords;
}
