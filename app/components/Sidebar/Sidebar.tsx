'use client';

import { PersonaMode, RouteResult, SnapResult, ElevationPoint, SteepSection } from '../../types';
import { WelcomeSidebar } from './WelcomeSidebar';
import { WhitewaterSidebar } from './WhitewaterSidebar';
import { ExplorerSidebar } from './ExplorerSidebar';
import { FloaterSidebar } from './FloaterSidebar';

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
}: SidebarProps) {
  if (!route) {
    return <WelcomeSidebar onModeSelect={onModeChange} />;
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
        />
      );
  }
}
