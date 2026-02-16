'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import styles from './page.module.css';

// Types
import { BasemapStyle, SnapResult } from './types';

// Hooks
import { useRoute, useElevationProfile } from './hooks';

// Components
import {
  BasemapSelector,
  RouteSection,
  StatsSection,
  LiveConditions,
  PaddleSpeedSlider,
  ElevationProfile,
  LayerControl,
  LayerVisibility,
} from './components/Panel';

// Layers
import { addAllLayers, updateRouteData, clearRouteData, updateProfileHighlight } from './layers';

// Constants
import { MAP_CONFIG, BASEMAP_STYLES, COLORS } from './constants';

// Utils
import { getPointAtDistance, buildLineCoordsBetweenDistances } from './utils';

export default function Home() {
  // Map refs
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const putInMarker = useRef<mapboxgl.Marker | null>(null);
  const takeOutMarker = useRef<mapboxgl.Marker | null>(null);

  // State
  const [basemap, setBasemap] = useState<BasemapStyle>('outdoors');
  const basemapRef = useRef<BasemapStyle>('outdoors');
  const [layerVisibility, setLayerVisibility] = useState<LayerVisibility>({
    blmLands: true,
    wilderness: true,
    rivers: true,
    accessPoints: true,
    campgrounds: true,
    rapids: true,
    waterfalls: true,
  });

  // Custom hooks
  const {
    putIn,
    takeOut,
    route,
    loading,
    error,
    flowCondition,
    paddleSpeed,
    setPutIn,
    setTakeOut,
    setFlowCondition,
    setPaddleSpeed,
    snapToRiver,
    calculateRoute,
    clearRoute: clearRouteState,
    swapPoints,
  } = useRoute();

  const {
    canvasRef,
    profileSelection,
    setProfileSelection,
    drawProfile,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
  } = useElevationProfile();

  // Clear route and markers
  const handleClearRoute = useCallback(() => {
    clearRouteState();
    setProfileSelection(null);

    if (putInMarker.current) {
      putInMarker.current.remove();
      putInMarker.current = null;
    }
    if (takeOutMarker.current) {
      takeOutMarker.current.remove();
      takeOutMarker.current = null;
    }

    if (map.current) {
      clearRouteData(map.current);
    }
  }, [clearRouteState, setProfileSelection]);

  // Handle map click
  const handleMapClick = useCallback(
    async (lng: number, lat: number) => {
      if (!putIn) {
        const snap = await snapToRiver(lng, lat);
        if (snap) {
          setPutIn(snap);
          if (putInMarker.current) putInMarker.current.remove();
          putInMarker.current = new mapboxgl.Marker({ color: COLORS.putIn })
            .setLngLat([snap.snap_point.lng, snap.snap_point.lat])
            .addTo(map.current!);
        }
      } else if (!takeOut) {
        const snap = await snapToRiver(lng, lat);
        if (snap) {
          setTakeOut(snap);
          if (takeOutMarker.current) takeOutMarker.current.remove();
          takeOutMarker.current = new mapboxgl.Marker({ color: COLORS.takeOut })
            .setLngLat([snap.snap_point.lng, snap.snap_point.lat])
            .addTo(map.current!);
          await calculateRoute(putIn, snap);
        }
      }
    },
    [putIn, takeOut, snapToRiver, setPutIn, setTakeOut, calculateRoute]
  );

  // Handle paddle speed change
  const handlePaddleSpeedChange = useCallback(
    async (newSpeed: number) => {
      setPaddleSpeed(newSpeed);
      if (putIn && takeOut) {
        await calculateRoute(putIn, takeOut, flowCondition, newSpeed);
      }
    },
    [putIn, takeOut, flowCondition, setPaddleSpeed, calculateRoute]
  );

  // Handle swap points
  const handleSwapPoints = useCallback(async () => {
    if (putIn && takeOut) {
      // Swap markers visually
      if (putInMarker.current && takeOutMarker.current) {
        const putInPos = putInMarker.current.getLngLat();
        const takeOutPos = takeOutMarker.current.getLngLat();
        putInMarker.current.setLngLat(takeOutPos);
        takeOutMarker.current.setLngLat(putInPos);
      }
      // Swap state and recalculate
      const tempPutIn = putIn;
      setPutIn(takeOut);
      setTakeOut(tempPutIn);
      await calculateRoute(takeOut, tempPutIn, flowCondition, paddleSpeed);
    }
  }, [putIn, takeOut, flowCondition, paddleSpeed, setPutIn, setTakeOut, calculateRoute]);

  // Handle basemap change
  const handleBasemapChange = useCallback(
    (newBasemap: BasemapStyle) => {
      if (!map.current || newBasemap === basemap) return;
      setBasemap(newBasemap);
      basemapRef.current = newBasemap;
      map.current.setStyle(BASEMAP_STYLES[newBasemap]);
    },
    [basemap]
  );

  // Handle layer visibility change
  const handleLayerVisibilityChange = useCallback((newVisibility: LayerVisibility) => {
    setLayerVisibility(newVisibility);
    if (!map.current) return;

    const layerMapping: Record<keyof LayerVisibility, string[]> = {
      blmLands: ['blm-lands-fill', 'blm-lands-outline'],
      wilderness: ['wilderness-fill', 'wilderness-outline'],
      rivers: ['rivers-line', 'rivers-glow', 'rivers-labels'],
      accessPoints: ['access-points-backdrop', 'access-points-symbols'],
      campgrounds: ['campgrounds-backdrop', 'campgrounds-symbols'],
      rapids: ['rapids-backdrop', 'rapids-symbols'],
      waterfalls: ['waterfalls-backdrop', 'waterfalls-symbols'],
    };

    Object.entries(newVisibility).forEach(([key, visible]) => {
      const layers = layerMapping[key as keyof LayerVisibility];
      layers?.forEach((layerId) => {
        if (map.current?.getLayer(layerId)) {
          map.current.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none');
        }
      });
    });
  }, []);

  // Initialize map
  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: BASEMAP_STYLES.outdoors,
      center: MAP_CONFIG.center,
      zoom: MAP_CONFIG.zoom,
      pitch: MAP_CONFIG.pitch,
    });

    map.current.addControl(new mapboxgl.NavigationControl());
    map.current.addControl(new mapboxgl.FullscreenControl());

    const setupLayers = () => {
      if (map.current) {
        addAllLayers(map.current, basemapRef.current);
        map.current.getCanvas().style.cursor = 'crosshair';
      }
    };

    map.current.on('load', setupLayers);
    map.current.on('style.load', setupLayers);

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Handle click events
  useEffect(() => {
    if (!map.current) return;

    const onClick = (e: mapboxgl.MapMouseEvent) => {
      handleMapClick(e.lngLat.lng, e.lngLat.lat);
    };

    map.current.on('click', onClick);
    return () => {
      map.current?.off('click', onClick);
    };
  }, [handleMapClick]);

  // Update route on map
  useEffect(() => {
    if (!map.current) return;

    if (route) {
      updateRouteData(map.current, route.route);

      // Fit to bounds
      if (route.route.features.length > 0) {
        const coords = route.route.features.flatMap((f: any) => f.geometry.coordinates);
        const bounds = coords.reduce(
          (b: mapboxgl.LngLatBounds, c: [number, number]) => b.extend(c),
          new mapboxgl.LngLatBounds(coords[0], coords[0])
        );
        map.current.fitBounds(bounds, { padding: 80 });
      }
    }
  }, [route]);

  // Draw elevation profile when route changes
  useEffect(() => {
    if (route?.stats.elevation_profile) {
      setTimeout(() => {
        drawProfile(route.stats.elevation_profile, route.stats.steep_sections || []);
      }, 100);
    }
  }, [route, drawProfile]);

  // Update profile highlight on map
  useEffect(() => {
    if (!map.current || !route) return;

    if (profileSelection) {
      const startPoint = getPointAtDistance(route, Math.min(profileSelection.startM, profileSelection.endM));
      const endPoint = getPointAtDistance(route, Math.max(profileSelection.startM, profileSelection.endM));

      if (startPoint && endPoint) {
        const lineCoords = buildLineCoordsBetweenDistances(
          route,
          Math.min(profileSelection.startM, profileSelection.endM),
          Math.max(profileSelection.startM, profileSelection.endM)
        );

        updateProfileHighlight(map.current, {
          type: 'FeatureCollection',
          features: [
            { type: 'Feature', properties: { type: 'start' }, geometry: { type: 'Point', coordinates: startPoint } },
            { type: 'Feature', properties: { type: 'end' }, geometry: { type: 'Point', coordinates: endPoint } },
            {
              type: 'Feature',
              properties: { type: 'line' },
              geometry: { type: 'LineString', coordinates: lineCoords.length > 1 ? lineCoords : [startPoint, endPoint] },
            },
          ],
        });
      }
    } else {
      updateProfileHighlight(map.current, { type: 'FeatureCollection', features: [] });
    }
  }, [profileSelection, route]);

  return (
    <main className={styles.main}>
      <div className={styles.header}>
        <h1>River Router</h1>
        <p>Click to set a put-in and take-out, then get your float route with estimated times</p>
      </div>

      <div className={styles.container}>
        <div ref={mapContainer} className={styles.map} />

        <div className={styles.panel}>
          <BasemapSelector basemap={basemap} onChange={handleBasemapChange} />

          <div className={styles.section}>
            <h3>🗂️ Map Layers</h3>
            <LayerControl layers={layerVisibility} onChange={handleLayerVisibilityChange} />
          </div>

          <RouteSection
            putIn={putIn}
            takeOut={takeOut}
            loading={loading}
            onClear={handleClearRoute}
          />

          {error && (
            <div className={styles.error}>
              ⚠️ {error}
              {error.includes('Upstream') && (
                <button className={styles.swapBtn} onClick={handleSwapPoints}>
                  🔄 Swap Points
                </button>
              )}
            </div>
          )}

          {route?.warnings && route.warnings.length > 0 && (
            <div className={styles.section}>
              <div className={styles.upstreamWarning}>
                {route.warnings.map((warning, i) => (
                  <div key={i} className={styles.warningItem}>
                    {warning}
                  </div>
                ))}
              </div>
            </div>
          )}

          {route && (
            <>
              <StatsSection stats={route.stats} />
              <LiveConditions conditions={route.stats.live_conditions} />
              <PaddleSpeedSlider
                speed={paddleSpeed}
                onChange={handlePaddleSpeedChange}
                stats={route.stats}
              />
              <ElevationProfile
                profile={route.stats.elevation_profile}
                steepSections={route.stats.steep_sections || []}
                canvasRef={canvasRef}
                selection={profileSelection}
                onClearSelection={() => setProfileSelection(null)}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
              />
            </>
          )}

          <div className={styles.section}>
            <h3>ℹ️ About</h3>
            <p className={styles.info}>
              <strong>Real-time data:</strong> NOAA National Water Model (NWM) — hourly velocity &
              streamflow forecasts for 2.7M river reaches.
            </p>
            <p className={styles.info}>
              <strong>Historical baseline:</strong> USGS NHDPlus EROM (Extended Reach Output Model)
              — mean annual velocity estimates.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
