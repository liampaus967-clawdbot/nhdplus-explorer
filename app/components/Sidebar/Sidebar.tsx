'use client';

import { PersonaMode, RouteResult, SnapResult, ElevationPoint, SteepSection, LakeDrawingMode, LakeRoute, LakeWaypoint, BwcaRouteResult } from '../../types';
import { WeatherData, ChopAssessment } from '../../services/weather';
import { WelcomeSidebar } from './WelcomeSidebar';
import { WhitewaterSidebar } from './WhitewaterSidebar';
import { ExplorerSidebar } from './ExplorerSidebar';
import { FloaterSidebar } from './FloaterSidebar';
import { LakeSidebar } from './LakeSidebar';
import { BwcaSidebar } from './BwcaSidebar';

interface SidebarProps {
  mode: PersonaMode;
  onModeChange: (mode: PersonaMode) => void;
  route: RouteResult | null;
  putIn: SnapResult | null;
  takeOut: SnapResult | null;
  paddleSpeed: number;
  onPaddleSpeedChange: (speed: number) => void;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  drawProfile: (profile: ElevationPoint[], steepSections: SteepSection[]) => void;
  profileSelection: { startM: number; endM: number } | null;
  onClearSelection: () => void;
  onClearRoute: () => void;
  onMouseDown: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onMouseMove: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onMouseUp: () => void;
  onMouseLeave: () => void;
  // Lake mode props
  lakeDrawingMode?: LakeDrawingMode;
  onLakeDrawingModeChange?: (mode: LakeDrawingMode) => void;
  lakePaddleSpeed?: number;
  onLakePaddleSpeedChange?: (speed: number) => void;
  lakeRoute?: LakeRoute | null;
  lakeWaypoints?: LakeWaypoint[];
  onDeleteLakeWaypoint?: (id: string) => void;
  onLakeUndo?: () => void;
  onLakeSaveRoute?: () => void;
  isLakeDrawing?: boolean;
  // Lake wind data
  lakeWindData?: WeatherData | null;
  lakeChopAssessment?: ChopAssessment | null;
  lakeWindLoading?: boolean;
  lakeName?: string | null;
  // POI highlight
  onHighlightPoi?: (poiType: 'campground' | 'access_point', id: number) => void;
  // BWCA mode props
  bwcaStartPoint?: { lng: number; lat: number } | null;
  bwcaEndPoint?: { lng: number; lat: number } | null;
  bwcaRoute?: BwcaRouteResult | null;
  bwcaLoading?: boolean;
  bwcaError?: string | null;
  onBwcaClearRoute?: () => void;
}

export function Sidebar({
  mode,
  onModeChange,
  route,
  putIn,
  takeOut,
  paddleSpeed,
  onPaddleSpeedChange,
  canvasRef,
  drawProfile,
  profileSelection,
  onClearSelection,
  onClearRoute,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onMouseLeave,
  // Lake mode props
  lakeDrawingMode = 'waypoint',
  onLakeDrawingModeChange,
  lakePaddleSpeed = 3.0,
  onLakePaddleSpeedChange,
  lakeRoute,
  lakeWaypoints = [],
  onDeleteLakeWaypoint,
  onLakeUndo,
  onLakeSaveRoute,
  isLakeDrawing = false,
  lakeWindData = null,
  lakeChopAssessment = null,
  lakeWindLoading = false,
  lakeName = null,
  onHighlightPoi,
  // BWCA props
  bwcaStartPoint = null,
  bwcaEndPoint = null,
  bwcaRoute = null,
  bwcaLoading = false,
  bwcaError = null,
  onBwcaClearRoute,
}: SidebarProps) {
  // BWCA mode - always show sidebar (for click-to-route)
  if (mode === 'bwca') {
    return (
      <BwcaSidebar
        startPoint={bwcaStartPoint}
        endPoint={bwcaEndPoint}
        route={bwcaRoute}
        loading={bwcaLoading}
        error={bwcaError}
        onClearRoute={onBwcaClearRoute || (() => {})}
      />
    );
  }

  // Home mode - always show welcome/explore sidebar
  if (mode === 'home') {
    return <WelcomeSidebar />;
  }

  // Lake mode always shows sidebar (no route required to start)
  if (mode === 'lake') {
    return (
      <LakeSidebar
        drawingMode={lakeDrawingMode}
        onDrawingModeChange={onLakeDrawingModeChange || (() => {})}
        paddleSpeed={lakePaddleSpeed}
        onPaddleSpeedChange={onLakePaddleSpeedChange || (() => {})}
        lakeRoute={lakeRoute || null}
        waypoints={lakeWaypoints}
        onDeleteWaypoint={onDeleteLakeWaypoint || (() => {})}
        onUndo={onLakeUndo || (() => {})}
        onSaveRoute={onLakeSaveRoute || (() => {})}
        isDrawing={isLakeDrawing}
        windData={lakeWindData}
        chopAssessment={lakeChopAssessment}
        windLoading={lakeWindLoading}
        lakeName={lakeName}
      />
    );
  }

  // For other modes, show welcome if no route
  if (!route) {
    return <WelcomeSidebar mode={mode} />;
  }

  switch (mode) {
    case 'whitewater':
      return (
        <WhitewaterSidebar
          route={route}
          putInCoords={putIn ? { lat: putIn.snap_point.lat, lng: putIn.snap_point.lng } : null}
          canvasRef={canvasRef}
          drawProfile={drawProfile}
          profileSelection={profileSelection}
          onClearSelection={onClearSelection}
          onClearRoute={onClearRoute}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseLeave}
        />
      );
    case 'explorer':
      return (
        <ExplorerSidebar
          route={route}
          putIn={putIn}
          takeOut={takeOut}
          paddleSpeed={paddleSpeed}
          onPaddleSpeedChange={onPaddleSpeedChange}
          canvasRef={canvasRef}
          drawProfile={drawProfile}
          profileSelection={profileSelection}
          onClearSelection={onClearSelection}
          onClearRoute={onClearRoute}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseLeave}
        />
      );
    case 'floater':
      return (
        <FloaterSidebar
          route={route}
          putIn={putIn}
          takeOut={takeOut}
          onClearRoute={onClearRoute}
          onHighlightPoi={onHighlightPoi}
        />
      );
    default:
      return null;
  }
}
