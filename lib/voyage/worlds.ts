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
export function jitter(seed: number, i: number): number {
  const x = Math.sin(seed * 127.1 + i * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

// ---------- atmosphere sprites (all init-time; gradients never run per-frame) ----------

// A nebula: a seeded walk of soft blobs makes cloud structure (not a uniform
// disc), a few bright motes buried in the gauze, then a circular falloff mask
// so the sprite vanishes before its own edge ever shows.
const nebulaSprites = new Map<string, HTMLCanvasElement>();

export function nebulaSprite(color: string, seed: number): HTMLCanvasElement {
  const key = `${color}|${seed}`;
  let s = nebulaSprites.get(key);
  if (s) return s;
  const SIZE = 256;
  s = document.createElement('canvas');
  s.width = SIZE;
  s.height = SIZE;
  const c = s.getContext('2d')!;
  let bx = SIZE / 2;
  let by = SIZE / 2;
  let ang = jitter(seed, 0) * Math.PI * 2;
  for (let i = 0; i < 26; i++) {
    ang += (jitter(seed, i + 1) - 0.5) * 1.7;
    bx = Math.min(SIZE * 0.78, Math.max(SIZE * 0.22, bx + Math.cos(ang) * SIZE * 0.055));
    by = Math.min(SIZE * 0.78, Math.max(SIZE * 0.22, by + Math.sin(ang) * SIZE * 0.055));
    const br = SIZE * (0.09 + jitter(seed, i + 40) * 0.15);
    const g = c.createRadialGradient(bx, by, 0, bx, by, br);
    g.addColorStop(0, rgba(color, 0.05 + jitter(seed, i + 70) * 0.08));
    g.addColorStop(1, rgba(color, 0));
    c.fillStyle = g;
    c.fillRect(bx - br, by - br, br * 2, br * 2);
  }
  for (let i = 0; i < 5; i++) {
    c.globalAlpha = 0.18 + jitter(seed, i + 100) * 0.14;
    c.fillStyle = '#dde5f2';
    c.fillRect(
      SIZE * (0.3 + jitter(seed, i + 110) * 0.4),
      SIZE * (0.3 + jitter(seed, i + 120) * 0.4),
      1.4,
      1.4
    );
  }
  c.globalAlpha = 1;
  const m = c.createRadialGradient(SIZE / 2, SIZE / 2, SIZE * 0.12, SIZE / 2, SIZE / 2, SIZE * 0.5);
  m.addColorStop(0, 'rgba(0,0,0,1)');
  m.addColorStop(1, 'rgba(0,0,0,0)');
  c.globalCompositeOperation = 'destination-in';
  c.fillStyle = m;
  c.fillRect(0, 0, SIZE, SIZE);
  nebulaSprites.set(key, s);
  return s;
}

// The near-world skybox wash — a much gentler falloff than glowSprite, so it
// reads as air the camera has entered, not a spotlight on the world.
const skySprites = new Map<string, HTMLCanvasElement>();

export function skySprite(color: string): HTMLCanvasElement {
  let s = skySprites.get(color);
  if (s) return s;
  const SIZE = 256;
  s = document.createElement('canvas');
  s.width = SIZE;
  s.height = SIZE;
  const c = s.getContext('2d')!;
  const g = c.createRadialGradient(SIZE / 2, SIZE / 2, 0, SIZE / 2, SIZE / 2, SIZE / 2);
  g.addColorStop(0, rgba(color, 0.3));
  g.addColorStop(0.45, rgba(color, 0.12));
  g.addColorStop(1, rgba(color, 0));
  c.fillStyle = g;
  c.fillRect(0, 0, SIZE, SIZE);
  skySprites.set(color, s);
  return s;
}

// A soft-edged beam of light (vertical; rotate at draw time for other angles).
// Alpha peaks at 1 in the center so callers scale with globalAlpha.
const beamSprites = new Map<string, HTMLCanvasElement>();

export function beamSprite(color: string): HTMLCanvasElement {
  let s = beamSprites.get(color);
  if (s) return s;
  const W = 64;
  const H = 256;
  s = document.createElement('canvas');
  s.width = W;
  s.height = H;
  const c = s.getContext('2d')!;
  const v = c.createLinearGradient(0, 0, 0, H);
  v.addColorStop(0, rgba(color, 0));
  v.addColorStop(0.5, rgba(color, 1));
  v.addColorStop(1, rgba(color, 0));
  c.fillStyle = v;
  c.fillRect(0, 0, W, H);
  const hm = c.createLinearGradient(0, 0, W, 0);
  hm.addColorStop(0, 'rgba(0,0,0,0)');
  hm.addColorStop(0.5, 'rgba(0,0,0,1)');
  hm.addColorStop(1, 'rgba(0,0,0,0)');
  c.globalCompositeOperation = 'destination-in';
  c.fillStyle = hm;
  c.fillRect(0, 0, W, H);
  beamSprites.set(color, s);
  return s;
}

export interface WorldPaintOpts {
  alpha: number; // overall fade (dim pre-reveal, distance fade)
  visited: boolean;
  seed: number;
  /** 0 far → 1 in orbit: surface detail and orbital structures resolve on
   * approach. The rejected mirage inverts it — it *thins* up close. */
  detail?: number;
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
  { alpha, visited, seed, detail = 0 }: WorldPaintOpts
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
      if (detail > 0.04) {
        // on approach the inner keep resolves, watch-fires on the walls
        ctx.globalAlpha = alpha * detail;
        ctx.strokeStyle = rgba(color, 0.45);
        ctx.lineWidth = lw * 0.8;
        ctx.save();
        ctx.rotate(Math.PI / 4);
        const k = r * 0.34;
        ctx.strokeRect(-k, -k, k * 2, k * 2);
        ctx.restore();
        for (const [cx, cy] of [[-s, -s], [s, -s], [s, s], [-s, s]])
          dot(ctx, cx, cy, Math.max(1, lw * 0.8), rgba(color, 0.9));
        ctx.globalAlpha = alpha;
      }
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
      if (detail > 0.04) {
        // the rim resolves: tick marks around the wheel, a hub ring
        ctx.globalAlpha = alpha * detail;
        ctx.strokeStyle = rgba(color, 0.5);
        ctx.lineWidth = lw * 0.7;
        for (let i = 0; i < 24; i++) {
          const ang = a + (Math.PI / 12) * i;
          ctx.beginPath();
          ctx.moveTo(x + Math.cos(ang) * r * 0.86, y + Math.sin(ang) * r * 0.86);
          ctx.lineTo(x + Math.cos(ang) * r * 0.94, y + Math.sin(ang) * r * 0.94);
          ctx.stroke();
        }
        ring(ctx, x, y, r * 0.94, rgba(color, 0.35), lw * 0.7);
        ring(ctx, x, y, r * 0.2, rgba(color, 0.55), lw * 0.7);
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = rgba(color, 0.55);
        ctx.lineWidth = lw;
      }
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
      if (detail > 0.04) {
        // the brazier resolves beneath the flames, sparks rising from it
        ctx.globalAlpha = alpha * detail * 0.85;
        ctx.strokeStyle = rgba(color, 0.55);
        ctx.lineWidth = lw * 0.8;
        ctx.beginPath();
        ctx.arc(x, y + r * 0.6, r * 0.55, Math.PI * 0.12, Math.PI * 0.88);
        ctx.stroke();
        for (let i = 0; i < 4; i++) {
          const u = (t * 0.22 + jitter(seed, i + 60)) % 1;
          const sx = x + (jitter(seed, i + 64) - 0.5) * r * 0.7;
          dot(ctx, sx, y + r * 0.5 - u * r * 1.6, Math.max(0.7, lw * 0.6), rgba(color, 0.8 * (1 - u)));
        }
        ctx.globalAlpha = alpha;
      }
      break;
    }
    case 'christianity': {
      // light through high windows — soft beams crossing (pre-rendered; the
      // old per-frame linear gradients were a flagged perf cost)
      const beam = beamSprite(color);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = alpha * 0.5;
      ctx.drawImage(beam, x - r * 0.36, y - r * 1.65, r * 0.72, r * 3.3);
      ctx.save();
      ctx.translate(x, y - r * 0.61);
      ctx.rotate(Math.PI / 2);
      ctx.globalAlpha = alpha * 0.38;
      ctx.drawImage(beam, -r * 0.3, -r * 1.05, r * 0.6, r * 2.1);
      ctx.restore();
      if (detail > 0.04) {
        // more windows open on approach: two slanted beams join the cross
        for (const rot of [-0.5, 0.5]) {
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(rot);
          ctx.globalAlpha = alpha * detail * 0.28;
          ctx.drawImage(beam, -r * 0.26, -r * 1.5, r * 0.52, r * 3);
          ctx.restore();
        }
      }
      ctx.restore();
      if (detail > 0.04) {
        // a ring of high lights above the crossing
        ctx.globalAlpha = alpha * detail;
        for (let i = 0; i < 5; i++) {
          const ang = -Math.PI * 0.75 + (Math.PI * 0.5 * i) / 4;
          dot(ctx, x + Math.cos(ang) * r * 1.12, y + Math.sin(ang) * r * 1.12, Math.max(0.8, lw * 0.7), rgba(color, 0.85));
        }
        ctx.globalAlpha = alpha;
      }
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
      if (detail > 0.04) {
        // an outer arm resolves, turning the other way — the turn seen from within
        for (let k = 0; k < 12; k++) {
          const ang = -a0 * 0.7 + k * 0.55;
          const rad = r * (1 + k * 0.045);
          ctx.globalAlpha = alpha * detail * (1 - k / 14) * 0.8;
          dot(ctx, x + Math.cos(ang) * rad, y + Math.sin(ang) * rad, Math.max(0.6, lw * 0.7), rgba(color, 0.7));
        }
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
      if (detail > 0.04) {
        // eddies resolve around the watercourse, drifting the other way
        ctx.strokeStyle = rgba(color, 0.35);
        ctx.lineWidth = lw * 0.7;
        for (let i = 0; i < 3; i++) {
          const start = -a * 2.4 + i * 1.9;
          ctx.globalAlpha = alpha * detail * (0.7 - i * 0.15);
          ctx.beginPath();
          ctx.arc(x, y, r * (1.5 + i * 0.24), start, start + Math.PI * 0.5);
          ctx.stroke();
        }
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = rgba(color, 0.55);
        ctx.lineWidth = lw;
      }
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
        if (detail > 0.04) {
          // synapse terminals resolve at the filament tips
          ctx.globalAlpha = alpha * detail;
          ring(ctx, x2, y2, Math.max(1.2, lw * 1.6), rgba(color, 0.5), Math.max(0.5, lw * 0.5));
          ctx.globalAlpha = alpha;
        }
      }
      ring(ctx, x, y, r * 1.3, rgba(color, 0.22), lw * 0.7);
      break;
    }
    case 'rejected': {
      // the mirage — flicker, broken rings, a body that slips sideways.
      // Where real worlds grow richer on approach, this one comes apart:
      // the ring gaps widen, the double shows more often, static cuts the disc.
      const flick =
        0.55 + (0.25 + detail * 0.15) * Math.sin(t * 11.3) + 0.2 * Math.sin(t * 27.7);
      ctx.globalAlpha = alpha * Math.max(0.25, Math.min(1, flick));
      for (let i = 0; i < 3; i++) {
        const start = t * 0.2 + (i * Math.PI * 2) / 3;
        ctx.beginPath();
        ctx.arc(x, y, r * (1.18 + i * 0.16), start, start + Math.PI * (0.7 - detail * 0.3));
        ctx.strokeStyle = rgba(color, 0.4 - i * 0.1);
        ctx.stroke();
      }
      // the glitch: the mirage doubles when looked at too long — or too closely
      if (Math.sin(t * 0.9 + seed) > 0.86 - detail * 0.4) {
        ctx.globalAlpha = alpha * 0.3;
        ctx.beginPath();
        ctx.arc(x + r * (0.24 + detail * 0.1), y, r * 0.92, 0, Math.PI * 2);
        ctx.strokeStyle = rgba(color, 0.5);
        ctx.stroke();
      }
      if (detail > 0.04) {
        ctx.globalAlpha = alpha * detail * (0.25 + 0.15 * Math.sin(t * 17));
        ctx.strokeStyle = rgba(color, 0.5);
        ctx.lineWidth = Math.max(0.6, lw * 0.5);
        for (let i = 0; i < 3; i++) {
          const yy = y + (jitter(seed, i + 80) - 0.5) * r * 1.3;
          const half = Math.sqrt(Math.max(0, r * r - (yy - y) * (yy - y)));
          ctx.beginPath();
          ctx.moveTo(x - half, yy);
          ctx.lineTo(x + half, yy);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = alpha;
      break;
    }
  }

  if (detail > 0.04 && kind !== 'rejected') {
    // orbital structure resolves on approach — a tilted band with companions
    const rot = (jitter(seed, 90) - 0.5) * 0.9;
    const tilt = 0.26 + jitter(seed, 91) * 0.2;
    const or = r * (1.6 + jitter(seed, 92) * 0.3);
    ctx.save();
    ctx.globalAlpha = alpha * detail * 0.55;
    ctx.strokeStyle = rgba(color, 0.4);
    ctx.lineWidth = Math.max(0.6, lw * 0.6);
    ctx.beginPath();
    ctx.ellipse(x, y, or, or * tilt, rot, 0, Math.PI * 2);
    ctx.stroke();
    const ca = Math.cos(rot);
    const sa = Math.sin(rot);
    for (let m = 0; m < 2; m++) {
      const ang =
        t * (0.18 + jitter(seed, 94 + m) * 0.14) * (m === 0 ? 1 : -1) +
        jitter(seed, 96 + m) * Math.PI * 2;
      const px = Math.cos(ang) * or;
      const py = Math.sin(ang) * or * tilt;
      ctx.globalAlpha = alpha * detail * 0.9;
      dot(ctx, x + px * ca - py * sa, y + px * sa + py * ca, Math.max(0.9, lw * 0.8), rgba(color, 0.9));
    }
    ctx.restore();
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
