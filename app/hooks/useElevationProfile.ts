'use client';

import { useRef, useCallback, useState } from 'react';
import { ElevationPoint, SteepSection } from '../types';
import { GRADIENT_COLORS } from '../constants';

interface ProfileBounds {
  maxDist: number;
  padLeft: number;
  chartW: number;
}

interface ProfileSelection {
  startM: number;
  endM: number;
}

interface UseElevationProfileReturn {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  profileSelection: ProfileSelection | null;
  setProfileSelection: (selection: ProfileSelection | null) => void;
  drawProfile: (profile: ElevationPoint[], steepSections: SteepSection[]) => void;
  handleMouseDown: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  handleMouseMove: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  handleMouseUp: () => void;
  handleMouseLeave: () => void;
}

export function useElevationProfile(): UseElevationProfileReturn {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const profileBounds = useRef<ProfileBounds | null>(null);
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const [profileSelection, setProfileSelection] = useState<ProfileSelection | null>(null);

  const drawProfile = useCallback((profile: ElevationPoint[], steepSections: SteepSection[]) => {
    const canvas = canvasRef.current;
    if (!canvas || profile.length < 2) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // High DPI support
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const W = rect.width;
    const H = rect.height;
    const pad = { top: 20, right: 15, bottom: 30, left: 45 };
    const chartW = W - pad.left - pad.right;
    const chartH = H - pad.top - pad.bottom;

    // Clear
    ctx.clearRect(0, 0, W, H);

    // Data bounds
    const maxDist = profile[profile.length - 1].dist_m;
    const elevs = profile.map((p) => p.elev_m);
    const minElev = Math.min(...elevs) - 5;
    const maxElev = Math.max(...elevs) + 5;
    const elevRange = maxElev - minElev || 1;

    // Coordinate transforms
    const toX = (d: number) => pad.left + (d / maxDist) * chartW;
    const toY = (e: number) => pad.top + (1 - (e - minElev) / elevRange) * chartH;

    // Draw steep section highlights first
    for (const section of steepSections) {
      const x1 = toX(section.start_m);
      const x2 = toX(section.end_m);
      const color = GRADIENT_COLORS[section.classification] || GRADIENT_COLORS.riffle;

      ctx.fillStyle = color;
      ctx.fillRect(x1, pad.top, x2 - x1, chartH);
    }

    // Fill gradient for main profile
    const grad = ctx.createLinearGradient(0, pad.top, 0, H - pad.bottom);
    grad.addColorStop(0, 'rgba(96, 165, 250, 0.25)');
    grad.addColorStop(1, 'rgba(96, 165, 250, 0.05)');

    ctx.beginPath();
    ctx.moveTo(toX(profile[0].dist_m), H - pad.bottom);
    profile.forEach((p) => ctx.lineTo(toX(p.dist_m), toY(p.elev_m)));
    ctx.lineTo(toX(profile[profile.length - 1].dist_m), H - pad.bottom);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Draw line with color segments
    for (let i = 1; i < profile.length; i++) {
      const p1 = profile[i - 1];
      const p2 = profile[i];
      const classification = p1.classification || 'pool';

      ctx.beginPath();
      ctx.moveTo(toX(p1.dist_m), toY(p1.elev_m));
      ctx.lineTo(toX(p2.dist_m), toY(p2.elev_m));

      if (classification === 'rapid_steep') {
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 3;
      } else if (classification === 'rapid_mild') {
        ctx.strokeStyle = '#fb923c';
        ctx.lineWidth = 2.5;
      } else if (classification === 'riffle') {
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 2;
      } else {
        ctx.strokeStyle = '#60a5fa';
        ctx.lineWidth = 2;
      }
      ctx.stroke();
    }

    // Axes
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.left, pad.top);
    ctx.lineTo(pad.left, H - pad.bottom);
    ctx.lineTo(W - pad.right, H - pad.bottom);
    ctx.stroke();

    // Y-axis labels (elevation in ft)
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'right';

    for (let i = 0; i <= 4; i++) {
      const elevM = minElev + (elevRange * i) / 4;
      const elevFt = Math.round(elevM * 3.28084);
      const y = toY(elevM);
      ctx.fillText(`${elevFt}'`, pad.left - 5, y + 3);

      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(W - pad.right, y);
      ctx.stroke();
    }

    // X-axis labels (distance in miles)
    ctx.textAlign = 'center';
    for (let i = 0; i <= 4; i++) {
      const d = (maxDist * i) / 4;
      const mi = (d / 1609.34).toFixed(1);
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fillText(`${mi} mi`, toX(d), H - pad.bottom + 15);
    }

    // Store bounds for interaction
    profileBounds.current = { maxDist, padLeft: pad.left, chartW };
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!profileBounds.current || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const { maxDist, padLeft, chartW } = profileBounds.current;

    const dist = Math.max(0, Math.min(maxDist, ((x - padLeft) / chartW) * maxDist));

    isDragging.current = true;
    dragStartX.current = dist;
    setProfileSelection({ startM: dist, endM: dist });
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging.current || !profileBounds.current || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const { maxDist, padLeft, chartW } = profileBounds.current;

    const dist = Math.max(0, Math.min(maxDist, ((x - padLeft) / chartW) * maxDist));
    setProfileSelection({ startM: dragStartX.current, endM: dist });
  }, []);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (isDragging.current) {
      isDragging.current = false;
    }
  }, []);

  return {
    canvasRef,
    profileSelection,
    setProfileSelection,
    drawProfile,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
  };
}
