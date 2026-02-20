import mapboxgl from 'mapbox-gl';

/**
 * Gradient pin icon configs matching Iteration 5 design.
 * Each icon: radial gradient circle + triangle pointer + black Lucide-style symbol.
 */

const PIN_SIZE = 64;       // canvas size (px)
const CIRCLE_R = 22;       // circle radius
const CIRCLE_CX = 32;      // circle center x
const CIRCLE_CY = 26;      // circle center y
const POINTER_H = 10;      // pointer triangle height

interface PinColors {
  inner: string;  // lighter center
  outer: string;  // darker edge
}

const POI_COLORS: Record<string, PinColors> = {
  'access-point': { inner: '#60A5FA', outer: '#2563EB' },
  campground:     { inner: '#4ADE80', outer: '#16A34A' },
  rapid:          { inner: '#F87171', outer: '#DC2626' },
  waterfall:      { inner: '#22D3EE', outer: '#0891B2' },
};

// Simple icon path drawers (black, centered in circle)
type IconDrawer = (ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number) => void;

// boat icon: loaded from PNG asset (v5 design)
let boatImage: HTMLImageElement | null = null;
const boatImageReady = new Promise<void>((resolve) => {
  if (typeof window === 'undefined') { resolve(); return; }
  const img = new Image();
  img.onload = () => { boatImage = img; resolve(); };
  img.onerror = () => resolve();
  img.src = '/assets/access-point-boat-icon-transparent.png';
});

const drawBoat: IconDrawer = (ctx, cx, cy, s) => {
  if (!boatImage) return;
  const iconSize = s * 0.93;
  ctx.drawImage(boatImage, cx - iconSize / 2, cy - iconSize / 2, iconSize, iconSize);
};

const drawTent: IconDrawer = (ctx, cx, cy, s) => {
  const h = s * 0.4;
  const w = s * 0.45;
  ctx.beginPath();
  ctx.moveTo(cx, cy - h);
  ctx.lineTo(cx - w, cy + h * 0.6);
  ctx.moveTo(cx, cy - h);
  ctx.lineTo(cx + w, cy + h * 0.6);
  ctx.moveTo(cx - w * 0.35, cy + h * 0.05);
  ctx.lineTo(cx, cy + h * 0.6);
  ctx.lineTo(cx + w * 0.35, cy + h * 0.05);
  ctx.stroke();
};

// triangle-alert: warning triangle with exclamation mark
const drawTriangleAlert: IconDrawer = (ctx, cx, cy, s) => {
  const h = s * 0.4;
  const w = s * 0.42;
  // Triangle outline
  ctx.beginPath();
  ctx.moveTo(cx, cy - h);
  ctx.lineTo(cx + w, cy + h * 0.7);
  ctx.lineTo(cx - w, cy + h * 0.7);
  ctx.closePath();
  ctx.stroke();
  // Exclamation line
  ctx.beginPath();
  ctx.moveTo(cx, cy - h * 0.35);
  ctx.lineTo(cx, cy + h * 0.15);
  ctx.stroke();
  // Exclamation dot
  ctx.beginPath();
  ctx.arc(cx, cy + h * 0.42, 1.5, 0, Math.PI * 2);
  ctx.fill();
};

const drawWaves: IconDrawer = (ctx, cx, cy, s) => {
  const w = s * 0.38;
  const amp = s * 0.08;
  for (let row = -1; row <= 1; row++) {
    const y = cy + row * s * 0.2;
    ctx.beginPath();
    ctx.moveTo(cx - w, y);
    ctx.bezierCurveTo(cx - w * 0.5, y - amp, cx - w * 0.15, y - amp, cx, y);
    ctx.bezierCurveTo(cx + w * 0.15, y + amp, cx + w * 0.5, y + amp, cx + w, y);
    ctx.stroke();
  }
};

const ICON_DRAWERS: Record<string, IconDrawer> = {
  'access-point': drawBoat,
  campground: drawTent,
  rapid: drawTriangleAlert,
  waterfall: drawWaves,
};

function createPinIcon(key: string): ImageData {
  const canvas = document.createElement('canvas');
  canvas.width = PIN_SIZE;
  canvas.height = PIN_SIZE;
  const ctx = canvas.getContext('2d')!;

  const colors = POI_COLORS[key];

  // Radial gradient circle
  const grad = ctx.createRadialGradient(CIRCLE_CX, CIRCLE_CY, 0, CIRCLE_CX, CIRCLE_CY, CIRCLE_R);
  grad.addColorStop(0, colors.inner);
  grad.addColorStop(1, colors.outer);

  ctx.beginPath();
  ctx.arc(CIRCLE_CX, CIRCLE_CY, CIRCLE_R, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();
  // Thin black outline on circle
  ctx.strokeStyle = '#1A1A1A';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Triangle pointer beneath circle (with small gap)
  const py = CIRCLE_CY + CIRCLE_R + 3;
  ctx.beginPath();
  ctx.moveTo(CIRCLE_CX - 8, py);
  ctx.lineTo(CIRCLE_CX, py + POINTER_H);
  ctx.lineTo(CIRCLE_CX + 8, py);
  ctx.closePath();
  ctx.fillStyle = colors.outer;
  ctx.fill();
  // Thin black outline on pointer
  ctx.strokeStyle = '#1A1A1A';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Draw icon symbol in black
  ctx.fillStyle = '#1A1A1A';
  ctx.strokeStyle = '#1A1A1A';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // Scale icon to ~68% of circle diameter (matching design)
  const iconScale = CIRCLE_R * 1.35;
  const drawer = ICON_DRAWERS[key];
  if (drawer) drawer(ctx, CIRCLE_CX, CIRCLE_CY, iconScale);

  return ctx.getImageData(0, 0, PIN_SIZE, PIN_SIZE);
}

/**
 * Register all POI pin icons on the map. Call once on map load.
 */
export async function addPoiIcons(map: mapboxgl.Map) {
  await boatImageReady;
  for (const key of Object.keys(POI_COLORS)) {
    const imageName = `poi-${key}`;
    if (map.hasImage(imageName)) continue;
    map.addImage(imageName, createPinIcon(key), { pixelRatio: 2 });
  }
}
