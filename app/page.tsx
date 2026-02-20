'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import styles from './page.module.css';

// Types
import { BasemapStyle, PersonaMode, SnapResult } from './types';

// Hooks
import { useRoute, useElevationProfile, useLakeRoute } from './hooks';

// Components
import { Header } from './components/Header';
import { Sidebar, IconRail } from './components/Sidebar';
import { MapControls, NavigationControls, LayerVisibility, DrawingControls } from './components/Map';

// Layers
import { addAllLayers, updateRouteData, clearRouteData, updateProfileHighlight } from './layers';

// Constants
import { MAP_CONFIG, BASEMAP_STYLES, COLORS } from './constants';

// Utils
import { getPointAtDistance, buildLineCoordsBetweenDistances } from './utils';

// Services
import { WeatherData, ChopAssessment, fetchRouteWindConditions } from './services/weather';

export default function Home() {
  // Map refs
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const putInMarker = useRef<mapboxgl.Marker | null>(null);
  const takeOutMarker = useRef<mapboxgl.Marker | null>(null);
  const lakeMarkers = useRef<mapboxgl.Marker[]>([]);

  // State
  const [basemap, setBasemap] = useState<BasemapStyle>('outdoors');
  const basemapRef = useRef<BasemapStyle>('outdoors');
  const [personaMode, setPersonaMode] = useState<PersonaMode>('explorer');
  const [layerVisibility, setLayerVisibility] = useState<LayerVisibility>({
    blmLands: true,
    wilderness: true,
    rivers: true,
    lakes: true,
    wildScenicRivers: false,
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

  // Lake mode hook
  const {
    drawingMode: lakeDrawingMode,
    waypoints: lakeWaypoints,
    lakeRoute,
    paddleSpeed: lakePaddleSpeed,
    isDrawing: isLakeDrawing,
    isSubmitted: isLakeSubmitted,
    setDrawingMode: setLakeDrawingMode,
    addWaypoint,
    deleteWaypoint,
    startFreehand,
    addFreehandPoint,
    finishFreehand,
    getFreehandPreview,
    submitRoute: submitLakeRoute,
    undo: lakeUndo,
    clearRoute: clearLakeRoute,
    updatePaddleSpeed: updateLakePaddleSpeed,
  } = useLakeRoute();

  // Lake wind data state
  const [lakeWindData, setLakeWindData] = useState<WeatherData | null>(null);
  const [lakeChopAssessment, setLakeChopAssessment] = useState<ChopAssessment | null>(null);
  const [lakeWindLoading, setLakeWindLoading] = useState(false);

  // Clear lake markers
  const clearLakeMarkers = useCallback(() => {
    lakeMarkers.current.forEach(m => m.remove());
    lakeMarkers.current = [];
  }, []);

  // Clear route and markers (for river modes)
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

  // Handle lake undo - removes last waypoint, marker, and updates map line
  const handleLakeUndo = useCallback(() => {
    // Remove last marker first
    if (lakeMarkers.current.length > 0) {
      const lastMarker = lakeMarkers.current.pop();
      lastMarker?.remove();
    }
    
    // Call the undo from hook (updates waypoints and lakeRoute)
    lakeUndo();
    
    // Update map line - will be synced via useEffect on lakeRoute change
  }, [lakeUndo]);

  // Handle full lake clear
  const handleLakeClear = useCallback(() => {
    clearLakeRoute();
    clearLakeMarkers();
    if (map.current) {
      // Clear lake route from map
      const source = map.current.getSource('lake-route') as mapboxgl.GeoJSONSource;
      if (source) {
        source.setData({ type: 'FeatureCollection', features: [] });
      }
    }
  }, [clearLakeRoute, clearLakeMarkers]);

  // Handle lake submit (Done button) - clears markers and submits route
  const handleLakeSubmit = useCallback(() => {
    // Remove all waypoint markers from map
    clearLakeMarkers();
    // Submit the route (changes to orange)
    submitLakeRoute();
  }, [clearLakeMarkers, submitLakeRoute]);

  // Handle map click
  const handleMapClick = useCallback(
    async (lng: number, lat: number) => {
      // Lake mode - custom handling
      if (personaMode === 'lake') {
        if (lakeDrawingMode === 'waypoint') {
          // Add waypoint
          const wp = addWaypoint(lng, lat);
          
          // Add marker
          const marker = new mapboxgl.Marker({ color: '#67e8f9' })
            .setLngLat([lng, lat])
            .addTo(map.current!);
          lakeMarkers.current.push(marker);
        } else {
          // Freehand mode
          if (!isLakeDrawing) {
            startFreehand(lng, lat);
          } else {
            finishFreehand(lng, lat);
          }
        }
        return;
      }

      // River modes - snap to river
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
    [personaMode, lakeDrawingMode, isLakeDrawing, putIn, takeOut, snapToRiver, setPutIn, setTakeOut, calculateRoute, addWaypoint, startFreehand, finishFreehand]
  );

  // Handle map mouse move (for freehand drawing)
  const handleMapMouseMove = useCallback(
    (lng: number, lat: number) => {
      if (personaMode === 'lake' && lakeDrawingMode === 'freehand' && isLakeDrawing) {
        addFreehandPoint(lng, lat);
        
        // Update preview line on map
        const coords = getFreehandPreview();
        if (coords.length > 1 && map.current) {
          const source = map.current.getSource('lake-route') as mapboxgl.GeoJSONSource;
          if (source) {
            source.setData({
              type: 'FeatureCollection',
              features: [{
                type: 'Feature',
                properties: { type: 'lake-route-preview' },
                geometry: { type: 'LineString', coordinates: coords }
              }]
            });
          }
        }
      }
    },
    [personaMode, lakeDrawingMode, isLakeDrawing, addFreehandPoint, getFreehandPreview]
  );

  // Handle paddle speed change (river modes)
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
      if (putInMarker.current && takeOutMarker.current) {
        const putInPos = putInMarker.current.getLngLat();
        const takeOutPos = takeOutMarker.current.getLngLat();
        putInMarker.current.setLngLat(takeOutPos);
        takeOutMarker.current.setLngLat(putInPos);
      }
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
      lakes: ['lakes-fill', 'lakes-outline'],
      wildScenicRivers: ['wsr-line', 'wsr-labels'],
      accessPoints: ['access-points-backdrop'],
      campgrounds: ['campgrounds-backdrop'],
      rapids: ['rapids-backdrop'],
      waterfalls: ['waterfalls-backdrop'],
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

  // Handle persona mode change
  const handleModeChange = useCallback((newMode: PersonaMode) => {
    // Clear lake route when switching away from lake mode
    if (personaMode === 'lake' && newMode !== 'lake') {
      handleLakeClear();
    }
    // Clear river route when switching to lake mode
    if (newMode === 'lake' && personaMode !== 'lake') {
      handleClearRoute();
    }
    setPersonaMode(newMode);
  }, [personaMode, handleLakeClear, handleClearRoute]);

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

    map.current.addControl(new mapboxgl.FullscreenControl());

    const setupLayers = () => {
      if (map.current) {
        addAllLayers(map.current, basemapRef.current);
        
        // Add lake route source and layers
        if (!map.current.getSource('lake-route')) {
          map.current.addSource('lake-route', {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] }
          });
          
          // Glow layer for submitted routes (animated pulse)
          map.current.addLayer({
            id: 'lake-route-glow',
            type: 'line',
            source: 'lake-route',
            filter: ['==', ['get', 'submitted'], true],
            paint: {
              'line-color': '#f59e0b',
              'line-width': 12,
              'line-opacity': 0.3,
              'line-blur': 8
            }
          });
          
          // Main route line - cyan while drawing, orange when submitted
          map.current.addLayer({
            id: 'lake-route-line',
            type: 'line',
            source: 'lake-route',
            paint: {
              'line-color': [
                'case',
                ['==', ['get', 'submitted'], true], '#f59e0b', // Orange when submitted
                '#006BF7' // Cyan while drawing
              ],
              'line-width': 4,
              'line-opacity': 0.9
            }
          });
        }
        
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

    const onMouseMove = (e: mapboxgl.MapMouseEvent) => {
      handleMapMouseMove(e.lngLat.lng, e.lngLat.lat);
    };

    map.current.on('click', onClick);
    map.current.on('mousemove', onMouseMove);
    
    return () => {
      map.current?.off('click', onClick);
      map.current?.off('mousemove', onMouseMove);
    };
  }, [handleMapClick, handleMapMouseMove]);

  // Update route on map (river modes)
  useEffect(() => {
    if (!map.current) return;

    if (route) {
      updateRouteData(map.current, route.route);

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

  // Update lake route on map
  useEffect(() => {
    if (!map.current) return;
    
    const source = map.current.getSource('lake-route') as mapboxgl.GeoJSONSource;
    if (!source) return;

    // If no route or no geojson, clear the map
    if (!lakeRoute?.geojson) {
      source.setData({ type: 'FeatureCollection', features: [] });
      return;
    }

    // Update with new route data
    source.setData(lakeRoute.geojson);
    
    // Fit bounds to lake route (only when route has meaningful length)
    const lineFeature = lakeRoute.geojson.features.find(f => f.geometry.type === 'LineString');
    if (lineFeature && lineFeature.geometry.type === 'LineString') {
      const coords = lineFeature.geometry.coordinates as [number, number][];
      if (coords.length > 1) {
        const bounds = coords.reduce(
          (b: mapboxgl.LngLatBounds, c: [number, number]) => b.extend(c),
          new mapboxgl.LngLatBounds(coords[0], coords[0])
        );
        map.current.fitBounds(bounds, { padding: 80 });
      }
    }
  }, [lakeRoute]);

  // Fetch wind data when lake route changes
  useEffect(() => {
    if (!lakeRoute?.geojson) {
      setLakeWindData(null);
      setLakeChopAssessment(null);
      return;
    }

    const lineFeature = lakeRoute.geojson.features.find(f => f.geometry.type === 'LineString');
    if (!lineFeature || lineFeature.geometry.type !== 'LineString') return;

    const coords = lineFeature.geometry.coordinates as [number, number][];
    if (coords.length < 2) return;

    // Fetch wind conditions for the route
    setLakeWindLoading(true);
    fetchRouteWindConditions(coords)
      .then((result) => {
        if (result) {
          setLakeWindData(result.avgWind);
          setLakeChopAssessment(result.chop);
        }
      })
      .catch((err) => {
        console.error('Failed to fetch wind data:', err);
      })
      .finally(() => {
        setLakeWindLoading(false);
      });
  }, [lakeRoute]);

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
      <Header />

      <div className={styles.body}>
        <div className={styles.mapWrapper}>
          <div ref={mapContainer} className={styles.map} />
          <NavigationControls map={map.current} />
          <MapControls
            layers={layerVisibility}
            onLayersChange={handleLayerVisibilityChange}
            basemap={basemap}
            onBasemapChange={handleBasemapChange}
          />
          <DrawingControls
            visible={personaMode === 'lake' && (lakeWaypoints.length > 0 || isLakeDrawing) && !isLakeSubmitted}
            drawingMode={lakeDrawingMode}
            waypointCount={lakeWaypoints.length}
            hasRoute={!!(lakeRoute && lakeRoute.distance_mi > 0)}
            isDrawing={isLakeDrawing}
            onUndo={handleLakeUndo}
            onClear={handleLakeClear}
            onSubmit={handleLakeSubmit}
          />
        </div>

        <IconRail mode={personaMode} onModeChange={handleModeChange} />

        <div className={styles.sidebar}>
          {error && (
            <div className={styles.error}>
              {error}
              {error.includes('Upstream') && (
                <button className={styles.swapBtn} onClick={handleSwapPoints}>
                  Swap Points
                </button>
              )}
            </div>
          )}

          {loading && (
            <div className={styles.loadingBar}>Calculating route...</div>
          )}

          <Sidebar
            mode={personaMode}
            onModeChange={handleModeChange}
            route={route}
            putIn={putIn}
            takeOut={takeOut}
            paddleSpeed={paddleSpeed}
            onPaddleSpeedChange={handlePaddleSpeedChange}
            canvasRef={canvasRef}
            drawProfile={drawProfile}
            profileSelection={profileSelection}
            onClearSelection={() => setProfileSelection(null)}
            onClearRoute={handleClearRoute}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            // Lake mode props
            lakeDrawingMode={lakeDrawingMode}
            onLakeDrawingModeChange={setLakeDrawingMode}
            lakePaddleSpeed={lakePaddleSpeed}
            onLakePaddleSpeedChange={updateLakePaddleSpeed}
            lakeRoute={lakeRoute}
            lakeWaypoints={lakeWaypoints}
            onDeleteLakeWaypoint={deleteWaypoint}
            onLakeUndo={handleLakeUndo}
            onLakeSaveRoute={() => { /* TODO: implement save */ }}
            isLakeDrawing={isLakeDrawing}
            lakeWindData={lakeWindData}
            lakeChopAssessment={lakeChopAssessment}
            lakeWindLoading={lakeWindLoading}
          />
        </div>
      </div>
    </main>
  );
}
