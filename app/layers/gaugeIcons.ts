import mapboxgl from 'mapbox-gl';

/**
 * Square gradient gauge icons matching Iteration 6 design.
 * Each icon: rounded square with radial gradient + dark Lucide-style symbol.
 */

const ICON_SIZE = 44;
const CORNER_R = 10;

interface GaugeIconColors {
  inner: string;  // lighter center
  outer: string;  // darker edge
}

type IconDrawer = (ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number) => void;

// --- Icon drawers ---

const drawGauge: IconDrawer = (ctx, cx, cy, s) => {
  // Semicircle arc
  const r = s * 0.4;
  ctx.beginPath();
  ctx.arc(cx, cy + s * 0.05, r, Math.PI, 0);
  ctx.stroke();
  // Needle
  ctx.beginPath();
  ctx.moveTo(cx, cy + s * 0.05);
  ctx.lineTo(cx + r * 0.55, cy - r * 0.55 + s * 0.05);
  ctx.stroke();
  // Center dot
  ctx.beginPath();
  ctx.arc(cx, cy + s * 0.05, 2, 0, Math.PI * 2);
  ctx.fill();
};

const drawTrendingUp: IconDrawer = (ctx, cx, cy, s) => {
  const w = s * 0.38;
  const h = s * 0.25;
  // Line path
  ctx.beginPath();
  ctx.moveTo(cx - w, cy + h);
  ctx.lineTo(cx - w * 0.3, cy);
  ctx.lineTo(cx + w * 0.2, cy + h * 0.6);
  ctx.lineTo(cx + w, cy - h);
  ctx.stroke();
  // Arrow head
  ctx.beginPath();
  ctx.moveTo(cx + w * 0.35, cy - h);
  ctx.lineTo(cx + w, cy - h);
  ctx.lineTo(cx + w, cy - h * 0.2);
  ctx.stroke();
};

const drawMinus: IconDrawer = (ctx, cx, cy, s) => {
  const w = s * 0.3;
  ctx.beginPath();
  ctx.moveTo(cx - w, cy);
  ctx.lineTo(cx + w, cy);
  ctx.stroke();
};

const drawTrendingDown: IconDrawer = (ctx, cx, cy, s) => {
  const w = s * 0.38;
  const h = s * 0.25;
  // Line path
  ctx.beginPath();
  ctx.moveTo(cx - w, cy - h);
  ctx.lineTo(cx - w * 0.3, cy);
  ctx.lineTo(cx + w * 0.2, cy - h * 0.6);
  ctx.lineTo(cx + w, cy + h);
  ctx.stroke();
  // Arrow head
  ctx.beginPath();
  ctx.moveTo(cx + w * 0.35, cy + h);
  ctx.lineTo(cx + w, cy + h);
  ctx.lineTo(cx + w, cy + h * 0.2);
  ctx.stroke();
};

const drawThermometer: IconDrawer = (ctx, cx, cy, s) => {
  const w = s * 0.1;
  const h = s * 0.35;
  const bulbR = s * 0.15;
  // Stem
  ctx.beginPath();
  ctx.moveTo(cx - w, cy - h);
  ctx.arcTo(cx - w, cy - h - w, cx, cy - h - w, w);
  ctx.arcTo(cx + w, cy - h - w, cx + w, cy - h, w);
  ctx.lineTo(cx + w, cy);
  // Bulb (bottom circle)
  ctx.arc(cx, cy + bulbR * 0.3, bulbR, -0.4, Math.PI + 0.4);
  ctx.lineTo(cx - w, cy);
  ctx.lineTo(cx - w, cy - h);
  ctx.stroke();
};

const drawThermometerCold: IconDrawer = (ctx, cx, cy, s) => {
  // Draw thermometer shifted right
  drawThermometer(ctx, cx + s * 0.08, cy, s * 0.85);
  // Snowflake (small asterisk to the left)
  const sx = cx - s * 0.22;
  const sy = cy - s * 0.05;
  const r = s * 0.1;
  ctx.beginPath();
  for (let i = 0; i < 3; i++) {
    const angle = (i * Math.PI) / 3;
    ctx.moveTo(sx + Math.cos(angle) * r, sy + Math.sin(angle) * r);
    ctx.lineTo(sx - Math.cos(angle) * r, sy - Math.sin(angle) * r);
  }
  ctx.stroke();
};

const drawSun: IconDrawer = (ctx, cx, cy, s) => {
  const r = s * 0.15;
  const rayLen = s * 0.12;
  const rayDist = r + s * 0.06;
  // Center circle
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  // Rays
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI) / 4;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * rayDist, cy + Math.sin(angle) * rayDist);
    ctx.lineTo(cx + Math.cos(angle) * (rayDist + rayLen), cy + Math.sin(angle) * (rayDist + rayLen));
    ctx.stroke();
  }
};

// --- Icon configs ---

interface GaugeIconConfig {
  name: string;
  colors: GaugeIconColors;
  drawer: IconDrawer;
}

const GAUGE_ICON_CONFIGS: GaugeIconConfig[] = [
  // Default (amber)
  { name: 'gauge-default', colors: { inner: '#FCD34D', outer: '#f59e0b' }, drawer: drawGauge },
  // Flow Percentile
  { name: 'gauge-pctl-low', colors: { inner: '#D4A574', outer: '#A0724A' }, drawer: drawGauge },
  { name: 'gauge-pctl-normal', colors: { inner: '#86EFAC', outer: '#22c55e' }, drawer: drawGauge },
  { name: 'gauge-pctl-high', colors: { inner: '#C4B5FD', outer: '#7c3aed' }, drawer: drawGauge },
  // Flow Trend
  { name: 'gauge-trend-rising', colors: { inner: '#60A5FA', outer: '#3b82f6' }, drawer: drawTrendingUp },
  { name: 'gauge-trend-stable', colors: { inner: '#86EFAC', outer: '#22c55e' }, drawer: drawMinus },
  { name: 'gauge-trend-falling', colors: { inner: '#FCA5A5', outer: '#ef4444' }, drawer: drawTrendingDown },
  // Temperature
  { name: 'gauge-temp-cold', colors: { inner: '#60A5FA', outer: '#3b82f6' }, drawer: drawThermometerCold },
  { name: 'gauge-temp-moderate', colors: { inner: '#86EFAC', outer: '#22c55e' }, drawer: drawThermometer },
  { name: 'gauge-temp-hot', colors: { inner: '#FCA5A5', outer: '#dc2626' }, drawer: drawSun },
  // Temp Trend
  { name: 'gauge-ttrend-cooling', colors: { inner: '#60A5FA', outer: '#3b82f6' }, drawer: drawTrendingDown },
  { name: 'gauge-ttrend-stable', colors: { inner: '#86EFAC', outer: '#22c55e' }, drawer: drawMinus },
  { name: 'gauge-ttrend-warming', colors: { inner: '#FCA5A5', outer: '#ef4444' }, drawer: drawTrendingUp },
];

// --- Rendering ---

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function createGaugeIcon(config: GaugeIconConfig): ImageData {
  const canvas = document.createElement('canvas');
  canvas.width = ICON_SIZE;
  canvas.height = ICON_SIZE;
  const ctx = canvas.getContext('2d')!;

  // Rounded square with radial gradient
  const inset = 1.5; // half of stroke width
  roundRect(ctx, inset, inset, ICON_SIZE - inset * 2, ICON_SIZE - inset * 2, CORNER_R);
  const grad = ctx.createRadialGradient(
    ICON_SIZE / 2, ICON_SIZE / 2, 0,
    ICON_SIZE / 2, ICON_SIZE / 2, ICON_SIZE / 2,
  );
  grad.addColorStop(0, config.colors.inner);
  grad.addColorStop(1, config.colors.outer);
  ctx.fillStyle = grad;
  ctx.fill();

  // Dark border
  ctx.strokeStyle = '#1A1A1A';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Draw icon symbol
  ctx.fillStyle = '#1A1A1A';
  ctx.strokeStyle = '#1A1A1A';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  config.drawer(ctx, ICON_SIZE / 2, ICON_SIZE / 2, ICON_SIZE);

  return ctx.getImageData(0, 0, ICON_SIZE, ICON_SIZE);
}

/**
 * Register all gauge icons on the map. Call once on map load.
 */
export function addGaugeIcons(map: mapboxgl.Map) {
  for (const config of GAUGE_ICON_CONFIGS) {
    if (map.hasImage(config.name)) continue;
    map.addImage(config.name, createGaugeIcon(config), { pixelRatio: 1 });
  }
}
