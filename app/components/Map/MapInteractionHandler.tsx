"use client";

import { useEffect, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import { useMapContext, usePersonaModeContext, useRouteContext, useLakeContext } from '../../contexts';
import { COLORS } from '../../constants';

/**
 * MapInteractionHandler handles map click and mouse events,
 * delegating to the appropriate context based on persona mode.
 */
export function MapInteractionHandler() {
  const { map } = useMapContext();
  const { mode } = usePersonaModeContext();
  const {
    putIn,
    setPutIn,
    setTakeOut,
    snapToRiver,
    calculateRoute,
    putInMarker,
    takeOutMarker,
  } = useRouteContext();
  const {
    drawingMode: lakeDrawingMode,
    isDrawing: isLakeDrawing,
    addWaypoint,
    startFreehand,
    addFreehandPoint,
    finishFreehand,
    getFreehandPreview,
  } = useLakeContext();

  // Handle map click
  const handleMapClick = useCallback(
    async (lng: number, lat: number) => {
      // Home mode - no route creation, just pan/scan
      if (mode === "home") {
        return;
      }

      // Lake mode - custom handling
      if (mode === "lake") {
        if (lakeDrawingMode === "waypoint") {
          addWaypoint(lng, lat);
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
        if (snap && map.current) {
          setPutIn(snap);
          if (putInMarker.current) putInMarker.current.remove();
          putInMarker.current = new mapboxgl.Marker({ color: COLORS.putIn })
            .setLngLat([snap.snap_point.lng, snap.snap_point.lat])
            .addTo(map.current);
        }
      } else {
        const snap = await snapToRiver(lng, lat);
        if (snap && map.current) {
          setTakeOut(snap);
          if (takeOutMarker.current) takeOutMarker.current.remove();
          takeOutMarker.current = new mapboxgl.Marker({ color: COLORS.takeOut })
            .setLngLat([snap.snap_point.lng, snap.snap_point.lat])
            .addTo(map.current);
          await calculateRoute(putIn, snap);
        }
      }
    },
    [
      mode,
      lakeDrawingMode,
      isLakeDrawing,
      putIn,
      map,
      snapToRiver,
      setPutIn,
      setTakeOut,
      calculateRoute,
      addWaypoint,
      startFreehand,
      finishFreehand,
      putInMarker,
      takeOutMarker,
    ]
  );

  // Handle map mouse move (for freehand drawing)
  const handleMapMouseMove = useCallback(
    (lng: number, lat: number) => {
      if (
        mode === "lake" &&
        lakeDrawingMode === "freehand" &&
        isLakeDrawing
      ) {
        addFreehandPoint(lng, lat);

        // Update preview line on map
        const coords = getFreehandPreview();
        if (coords.length > 1 && map.current) {
          const source = map.current.getSource("lake-route") as mapboxgl.GeoJSONSource;
          if (source) {
            source.setData({
              type: "FeatureCollection",
              features: [
                {
                  type: "Feature",
                  properties: { type: "lake-route-preview" },
                  geometry: { type: "LineString", coordinates: coords },
                },
              ],
            });
          }
        }
      }
    },
    [mode, lakeDrawingMode, isLakeDrawing, addFreehandPoint, getFreehandPreview, map]
  );

  // Register map event handlers
  useEffect(() => {
    if (!map.current) return;

    const onClick = (e: mapboxgl.MapMouseEvent) => {
      handleMapClick(e.lngLat.lng, e.lngLat.lat);
    };

    const onMouseMove = (e: mapboxgl.MapMouseEvent) => {
      handleMapMouseMove(e.lngLat.lng, e.lngLat.lat);
    };

    map.current.on("click", onClick);
    map.current.on("mousemove", onMouseMove);

    return () => {
      map.current?.off("click", onClick);
      map.current?.off("mousemove", onMouseMove);
    };
  }, [handleMapClick, handleMapMouseMove, map]);

  // This component doesn't render anything - just handles events
  return null;
}
