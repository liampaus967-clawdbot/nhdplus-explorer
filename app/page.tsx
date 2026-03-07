"use client";

import { useCallback } from "react";
import styles from "./page.module.css";

// Contexts
import {
  useMapContext,
  useRouteContext,
  usePersonaModeContext,
  useLakeContext,
  useWeatherContext,
  useGaugeContext,
} from "./contexts";

// Hooks
import { usePoiHighlight } from "./hooks";

// Components
import { Header } from "./components/Header";
import { Sidebar, IconRail } from "./components/Sidebar";
import {
  MapControls,
  NavigationControls,
  DrawingControls,
  GaugeStyleControl,
  WeatherBottomBar,
  DeckWindParticleLayer,
  MapInteractionHandler,
} from "./components/Map";

export default function Home() {
  // Map context
  const {
    mapContainer,
    map,
    basemap,
    theme,
    styleVersion,
    layerVisibility,
    setBasemap,
    toggleTheme,
    setLayerVisibility,
  } = useMapContext();

  // Route context
  const {
    putIn,
    takeOut,
    route,
    loading,
    error,
    paddleSpeed,
    canvasRef,
    profileSelection,
    setProfileSelection,
    drawProfile,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
    clearRoute,
    swapPoints,
    handlePaddleSpeedChange,
  } = useRouteContext();

  // Persona mode context
  const { mode, setMode } = usePersonaModeContext();

  // Lake context
  const {
    drawingMode: lakeDrawingMode,
    setDrawingMode: setLakeDrawingMode,
    waypoints: lakeWaypoints,
    lakeRoute,
    paddleSpeed: lakePaddleSpeed,
    isDrawing: isLakeDrawing,
    isSubmitted: isLakeSubmitted,
    deleteWaypoint,
    undo: lakeUndo,
    clear: lakeClear,
    submitRoute: lakeSubmitRoute,
    updatePaddleSpeed: updateLakePaddleSpeed,
    windData: lakeWindData,
    chopAssessment: lakeChopAssessment,
    windLoading: lakeWindLoading,
    lakeName,
  } = useLakeContext();

  // Weather context
  const {
    metadata: weatherMetadata,
    metadataLoading: weatherLoading,
    metadataError: weatherError,
    refreshMetadata: refreshWeather,
    weatherEnabled,
    setWeatherEnabled,
    selectedVariable: selectedWeatherVariable,
    setSelectedVariable: setSelectedWeatherVariable,
    selectedForecast: selectedWeatherForecast,
    setSelectedForecast: setSelectedWeatherForecast,
    opacity: weatherOpacity,
    setOpacity: setWeatherOpacity,
    isLayersReady: weatherLayersReady,
    loadProgress: weatherLoadProgress,
    windEnabled,
    setWindEnabled,
    windData,
    windLoading,
  } = useWeatherContext();

  // Gauge context
  const { styleMode: gaugeStyleMode, setStyleMode: setGaugeStyleMode } = useGaugeContext();

  // POI highlight hook
  const { highlightPoi } = usePoiHighlight();

  // Handle mode change - clear appropriate routes when switching
  const handleModeChange = useCallback(
    (newMode: typeof mode) => {
      // Clear lake route when switching away from lake mode
      if (mode === "lake" && newMode !== "lake") {
        lakeClear();
      }
      // Clear river route when switching to lake mode
      if (newMode === "lake" && mode !== "lake") {
        clearRoute();
      }
      setMode(newMode);
    },
    [mode, lakeClear, clearRoute, setMode]
  );

  // Handle POI highlight from sidebar
  const handleHighlightPoi = useCallback(
    (poiType: "campground" | "access_point", id: number) => {
      highlightPoi(map.current, poiType, id);
    },
    [highlightPoi, map]
  );

  return (
    <main className={styles.main}>
      <Header theme={theme} onThemeToggle={toggleTheme} />

      <div className={styles.body}>
        <div className={styles.mapWrapper}>
          <div ref={mapContainer} className={styles.map} />
          
          {/* Map interaction handler - handles clicks and mouse moves */}
          <MapInteractionHandler />
          
          <NavigationControls map={map.current} />
          <MapControls
            layers={layerVisibility}
            onLayersChange={setLayerVisibility}
            basemap={basemap}
            onBasemapChange={setBasemap}
            weather={{
              metadata: weatherMetadata,
              loading: weatherLoading,
              error: weatherError,
              enabled: weatherEnabled,
              onToggle: setWeatherEnabled,
              selectedVariable: selectedWeatherVariable,
              onVariableChange: (id: string) => setSelectedWeatherVariable(id || null),
              selectedForecast: selectedWeatherForecast,
              onForecastChange: setSelectedWeatherForecast,
              opacity: weatherOpacity,
              onOpacityChange: setWeatherOpacity,
              onRefresh: refreshWeather,
              isReady: weatherLayersReady,
              loadProgress: weatherLoadProgress,
              windEnabled: windEnabled,
              onWindToggle: setWindEnabled,
              windLoading: windLoading,
            }}
          />
          
          {/* Lake Mode Drawing Controls */}
          <DrawingControls
            visible={
              mode === "lake" &&
              (lakeWaypoints.length > 0 || isLakeDrawing) &&
              !isLakeSubmitted
            }
            drawingMode={lakeDrawingMode}
            waypointCount={lakeWaypoints.length}
            hasRoute={!!(lakeRoute && lakeRoute.distance_mi > 0)}
            isDrawing={isLakeDrawing}
            onUndo={lakeUndo}
            onClear={lakeClear}
            onSubmit={lakeSubmitRoute}
          />
          
          {/* Gauge Style Control */}
          <GaugeStyleControl
            visible={layerVisibility.gauges}
            mode={gaugeStyleMode}
            onModeChange={setGaugeStyleMode}
          />
          
          {/* Weather Bottom Bar */}
          {weatherEnabled && selectedWeatherVariable && weatherMetadata && (
            <WeatherBottomBar
              metadata={weatherMetadata}
              selectedVariable={selectedWeatherVariable}
              selectedForecast={selectedWeatherForecast}
              onForecastChange={setSelectedWeatherForecast}
              opacity={weatherOpacity}
              onOpacityChange={setWeatherOpacity}
              onClose={() => {
                setSelectedWeatherVariable(null);
                setWeatherEnabled(false);
                setWindEnabled(false);
              }}
              windEnabled={windEnabled}
              onWindToggle={setWindEnabled}
              windLoading={windLoading}
            />
          )}
          
          {/* Wind Particle Layer */}
          <DeckWindParticleLayer
            map={map.current}
            windData={windData}
            enabled={windEnabled}
            opacity={weatherOpacity}
            styleVersion={styleVersion}
          />
        </div>

        <IconRail mode={mode} onModeChange={handleModeChange} />

        <div className={styles.sidebar}>
          {error && (
            <div className={styles.error}>
              {error}
              {error.includes("Upstream") && (
                <button className={styles.swapBtn} onClick={swapPoints}>
                  Swap Points
                </button>
              )}
            </div>
          )}

          {loading && (
            <div className={styles.loadingBar}>Calculating route...</div>
          )}

          <Sidebar
            mode={mode}
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
            onClearRoute={clearRoute}
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
            onLakeUndo={lakeUndo}
            onLakeSaveRoute={() => {
              /* TODO: implement save */
            }}
            isLakeDrawing={isLakeDrawing}
            lakeWindData={lakeWindData}
            lakeChopAssessment={lakeChopAssessment}
            lakeWindLoading={lakeWindLoading}
            lakeName={lakeName}
            onHighlightPoi={handleHighlightPoi}
          />
        </div>
      </div>
    </main>
  );
}
