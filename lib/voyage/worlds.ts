// Per-lineage world painters for the Voyage — each tradition is a different
// world with its own visual signature, drawn procedurally on canvas in screen
// space. Symbolic geometry only (decision 7): wheels, flames, beams, spirals,
// watercourses, filaments — never figures. The rejected parallel is an ember
// mirage: it looks like a world from far away and doesn't hold up close.

import type { Lineage } from '@/lib/types';

export type WorldKind =
  | 'stoicism'
  | 'buddhism'
  | 'hindu'
  | 'christianity'
  | 'sufism'
  | 'taoism'
  | 'neuro'
  | 'rejected';

export const lineageWorldKind: Record<Lineage, WorldKind> = {
  Stoicism: 'stoicism',
  Buddhism: 'buddhism',
  'Hindu/Gītā': 'hindu',
  Christianity: 'christianity',
  Sufism: 'sufism',
  Taoism: 'taoism',
  'Neuroscience/Psychology': 'neuro',
};

export function hexRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

export function rgba(hex: string, a: number): string {
  const [r, g, b] = hexRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

// ---------- glow sprites (pre-rendered radial gradients; per-frame canvas
// gradients are too expensive for the render loop) ----------

const sprites = new Map<string, HTMLCanvasElement>();

export function glowSprite(color: string): HTMLCanvasElement {
  let s = sprites.get(color);
  if (s) return s;
  const SIZE = 256;
  s = document.createElement('canvas');
  s.width = SIZE;
  s.height = SIZE;
  const c = s.getContext('2d')!;
  const g = c.createRadialGradient(SIZE / 2, SIZE / 2, 0, SIZE / 2, SIZE / 2, SIZE / 2);
  g.addColorStop(0, rgba(color, 0.85));
  g.addColorStop(0.25, rgba(color, 0.32));
  g.addColorStop(0.6, rgba(color, 0.08));
  g.addColorStop(1, rgba(color, 0));
  c.fillStyle = g;
  c.fillRect(0, 0, SIZE, SIZE);
  sprites.set(color, s);
  return s;
}

// tiny deterministic hash → 0..1 series for per-world jitter (axon shapes etc.)
function jitter(seed: number, i: number): number {
  const x = Math.sin(seed * 127.1 + i * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export interface WorldPaintOpts {
  alpha: number; // overall fade (dim pre-reveal, distance fade)
  visited: boolean;
  seed: number;
}

/** Paint one world at screen (x, y) with screen radius r at time t (seconds). */
export function paintWorld(
  ctx: CanvasRenderingContext2D,
  kind: WorldKind,
  color: string,
  x: number,
  y: number,
  r: number,
  t: number,
  { alpha, visited, seed }: WorldPaintOpts
): void {
  if (r < 0.4 || alpha <= 0.01) return;
  const lw = Math.max(0.8, r * 0.045);
  ctx.save();
  ctx.globalAlpha = alpha;

  // atmosphere
  const spriteSize = r * 6.4;
  ctx.drawImage(glowSprite(color), x - spriteSize / 2, y - spriteSize / 2, spriteSize, spriteSize);

  // core disc — a dark body lit from within
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = rgba(color, kind === 'rejected' ? 0.14 : 0.2);
  ctx.fill();
  ctx.lineWidth = lw;
  ctx.strokeStyle = rgba(color, 0.85);
  if (kind === 'rejected') ctx.setLineDash([r * 0.28, r * 0.22]);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.strokeStyle = rgba(color, 0.55);
  ctx.fillStyle = rgba(color, 0.8);
  ctx.lineWidth = lw;

  switch (kind) {
    case 'stoicism': {
      // the citadel — an ordered square turning very slowly inside the circle
      const a = t * 0.08;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(a);
      const s = r * 0.62;
      ctx.strokeRect(-s, -s, s * 2, s * 2);
      ctx.restore();
      ring(ctx, x, y, r * 1.28, rgba(color, 0.3), lw * 0.8);
      break;
    }
    case 'buddhism': {
      // the wheel — eight spokes, patient rotation
      const a = t * 0.12;
      ring(ctx, x, y, r * 0.78, rgba(color, 0.6), lw);
      for (let i = 0; i < 8; i++) {
        const ang = a + (Math.PI / 4) * i;
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(ang) * r * 0.2, y + Math.sin(ang) * r * 0.2);
        ctx.lineTo(x + Math.cos(ang) * r * 0.78, y + Math.sin(ang) * r * 0.78);
        ctx.stroke();
      }
      dot(ctx, x, y, lw * 1.4, rgba(color, 0.9));
      break;
    }
    case 'hindu': {
      // the flame held steady — three petals breathing
      for (let i = -1; i <= 1; i++) {
        const ph = 0.55 + 0.25 * Math.sin(t * 1.7 + i * 1.1);
        ctx.strokeStyle = rgba(color, ph);
        ctx.beginPath();
        const w = r * 0.34 * (i === 0 ? 1 : 0.72);
        const h = r * (i === 0 ? 0.85 : 0.6);
        const ox = x + i * r * 0.34;
        ctx.moveTo(ox, y + h * 0.55);
        ctx.bezierCurveTo(ox - w, y, ox - w * 0.3, y - h * 0.8, ox, y - h);
        ctx.bezierCurveTo(ox + w * 0.3, y - h * 0.8, ox + w, y, ox, y + h * 0.55);
        ctx.stroke();
      }
      break;
    }
    case 'christianity': {
      // light through high windows — two soft beams crossing
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const bw = r * 0.34;
      const bh = r * 3.3;
      const vg = ctx.createLinearGradient(x, y - bh / 2, x, y + bh / 2);
      vg.addColorStop(0, rgba(color, 0));
      vg.addColorStop(0.5, rgba(color, 0.34));
      vg.addColorStop(1, rgba(color, 0));
      ctx.fillStyle = vg;
      ctx.fillRect(x - bw / 2, y - bh / 2, bw, bh);
      const hw = r * 2.1;
      const hg = ctx.createLinearGradient(x - hw / 2, y, x + hw / 2, y);
      hg.addColorStop(0, rgba(color, 0));
      hg.addColorStop(0.5, rgba(color, 0.26));
      hg.addColorStop(1, rgba(color, 0));
      ctx.fillStyle = hg;
      ctx.fillRect(x - hw / 2, y - r * 0.75, hw, r * 0.28);
      ctx.restore();
      break;
    }
    case 'sufism': {
      // the turn — a spiral of motes, always circling inward
      const a0 = t * 0.5;
      for (let k = 0; k < 18; k++) {
        const ang = a0 + k * 0.46;
        const rad = r * (0.15 + k * 0.052);
        ctx.globalAlpha = alpha * (1 - k / 22);
        dot(ctx, x + Math.cos(ang) * rad, y + Math.sin(ang) * rad, Math.max(0.7, lw * 0.9), rgba(color, 0.85));
      }
      ctx.globalAlpha = alpha;
      break;
    }
    case 'taoism': {
      // the watercourse — one line yielding through the circle
      const a = t * 0.06;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(a);
      ctx.beginPath();
      ctx.arc(0, -r * 0.375, r * 0.375, Math.PI / 2, -Math.PI / 2, true);
      ctx.arc(0, r * 0.375, r * 0.375, -Math.PI / 2, Math.PI / 2, true);
      ctx.stroke();
      dot(ctx, 0, -r * 0.375, lw * 1.2, rgba(color, 0.9));
      dot(ctx, 0, r * 0.375, lw * 1.2, rgba(color, 0.45));
      ctx.restore();
      break;
    }
    case 'neuro': {
      // the branching cell — filaments with signals travelling outward
      for (let i = 0; i < 6; i++) {
        const baseAng = (Math.PI / 3) * i + jitter(seed, i) * 0.7;
        const len = r * (1.15 + jitter(seed, i + 10) * 0.55);
        const bend = (jitter(seed, i + 20) - 0.5) * 0.9;
        const x1 = x + Math.cos(baseAng) * r * 0.55;
        const y1 = y + Math.sin(baseAng) * r * 0.55;
        const x2 = x + Math.cos(baseAng + bend) * len;
        const y2 = y + Math.sin(baseAng + bend) * len;
        ctx.strokeStyle = rgba(color, 0.4);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.quadraticCurveTo(
          x + Math.cos(baseAng + bend * 0.4) * len * 0.62,
          y + Math.sin(baseAng + bend * 0.4) * len * 0.62,
          x2,
          y2
        );
        ctx.stroke();
        // a signal pulse rides each filament
        const u = (t * 0.3 + jitter(seed, i + 30)) % 1;
        const px = x1 + (x2 - x1) * u;
        const py = y1 + (y2 - y1) * u;
        dot(ctx, px, py, Math.max(0.8, lw), rgba(color, 0.9 * (1 - u * 0.5)));
      }
      ring(ctx, x, y, r * 1.3, rgba(color, 0.22), lw * 0.7);
      break;
    }
    case 'rejected': {
      // the mirage — flicker, broken rings, a body that slips sideways
      const flick = 0.55 + 0.25 * Math.sin(t * 11.3) + 0.2 * Math.sin(t * 27.7);
      ctx.globalAlpha = alpha * Math.max(0.25, Math.min(1, flick));
      for (let i = 0; i < 3; i++) {
        const start = t * 0.2 + (i * Math.PI * 2) / 3;
        ctx.beginPath();
        ctx.arc(x, y, r * (1.18 + i * 0.16), start, start + Math.PI * 0.7);
        ctx.strokeStyle = rgba(color, 0.4 - i * 0.1);
        ctx.stroke();
      }
      // the glitch: the mirage doubles when looked at too long
      if (Math.sin(t * 0.9 + seed) > 0.86) {
        ctx.globalAlpha = alpha * 0.3;
        ctx.beginPath();
        ctx.arc(x + r * 0.24, y, r * 0.92, 0, Math.PI * 2);
        ctx.strokeStyle = rgba(color, 0.5);
        ctx.stroke();
      }
      ctx.globalAlpha = alpha;
      break;
    }
  }

  if (visited) {
    // a small settled star orbits what you've already landed on
    const ang = t * 0.6 + seed;
    dot(
      ctx,
      x + Math.cos(ang) * r * 1.55,
      y + Math.sin(ang) * r * 1.55 * 0.5,
      Math.max(1, lw),
      'rgba(232,220,176,0.9)'
    );
  }

  ctx.restore();
}

function ring(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  style: string,
  lw: number
): void {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.strokeStyle = style;
  ctx.lineWidth = lw;
  ctx.stroke();
}

function dot(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, style: string): void {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = style;
  ctx.fill();
}
