// The Voyage engine — a hand-rolled first-person 3D space on Canvas 2D.
// Perspective-projected starfield, the mechanism as a sun, parallels as
// lineage-themed worlds, the practice as a gate. Free flight (drag to look,
// thrust to move), gravitational capture (click a world or drift close and it
// pulls you in), orbit while reading, and a final pull-back reveal where the
// separate worlds turn out to be one connected figure.
//
// No dependencies, no React inside — the host component owns session state
// and drives target states through the public API. prefers-reduced-motion
// swaps every flight animation for an instant cut.

import { paintWorld, glowSprite, rgba, type WorldKind } from './worlds';

export type TargetKind = 'beacon' | 'sun' | 'world' | 'gate';

export interface VoyageTarget {
  id: string;
  kind: TargetKind;
  pos: [number, number, number];
  r: number;
  title: string;
  subtitle?: string;
  color: string;
  worldKind?: WorldKind; // for kind === 'world'
  // mutable state, set by the host
  present: boolean; // drawn at all
  active: boolean; // clickable + exerts gravity
  dim: boolean; // silhouette only (not yet surfaced by the session arc)
  locked: boolean; // the sealed gate
  visited: boolean;
}

export interface EngineCallbacks {
  /** entered orbit around a target */
  onCapture: (id: string) => void;
  /** quiet HUD line; null clears */
  onHint: (hint: string | null) => void;
  /** tapped something sealed (the locked gate) */
  onLockedTap: (id: string) => void;
  /** the pull-back reveal has finished drawing the figure */
  onRevealDone: () => void;
}

type Mode = 'free' | 'autopilot' | 'orbit' | 'reveal' | 'revealed';

interface V3 {
  x: number;
  y: number;
  z: number;
}

const FOV = (68 * Math.PI) / 180;
const NEAR = 2;
const STAR_COUNT = 850;
const DUST_COUNT = 240;
const SKY_R = 2600;
const CRUISE = 11; // gentle forward drift, u/s
const THRUST_MAX = 170;
const CAPTURE_FACTOR = 3.6; // capture radius = r * factor
const GRAVITY_RANGE = 9; // gravity felt within r * range
const BOUND = 1500; // soft world edge

const easeInOut = (u: number) => u * u * (3 - 2 * u);
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

function v3(x = 0, y = 0, z = 0): V3 {
  return { x, y, z };
}
function sub(a: V3, b: V3): V3 {
  return v3(a.x - b.x, a.y - b.y, a.z - b.z);
}
function len(a: V3): number {
  return Math.hypot(a.x, a.y, a.z);
}
function norm(a: V3): V3 {
  const l = len(a) || 1;
  return v3(a.x / l, a.y / l, a.z / l);
}
function lerp3(a: V3, b: V3, u: number): V3 {
  return v3(a.x + (b.x - a.x) * u, a.y + (b.y - a.y) * u, a.z + (b.z - a.z) * u);
}

interface Star {
  p: V3;
  m: number; // brightness 0..1
  warm: boolean;
  tw: number; // twinkle phase
}

export class VoyageEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private cb: EngineCallbacks;
  targets: VoyageTarget[] = [];
  reducedMotion = false;

  // camera
  private pos: V3 = v3();
  private yaw = 0;
  private pitch = 0;
  private f = 600; // focal length, set on resize
  private w = 0;
  private h = 0;
  private dpr = 1;

  // flight
  private mode: Mode = 'free';
  private speed = 0;
  private thrust = 0; // 0..1 target from input
  private wheelImpulse = 0;
  private captured: VoyageTarget | null = null;

  // autopilot
  private apFrom: V3 = v3();
  private apTo: V3 = v3();
  private apLook0: { yaw: number; pitch: number } | null = null;
  private apTarget: V3 = v3();
  private apStart = 0;
  private apDur = 1;
  private apThen: 'orbit' | 'revealed' = 'orbit';

  // orbit
  private orbitAngle = 0;
  private orbitDist = 100;
  private orbitY = 0;

  // lift-off after release — without this, gravity instantly re-captures
  // the body you just left and the chamber never closes
  private escape: { id: string; dir: V3; until: number } | null = null;

  // reveal
  private revealT = 0;
  private revealPath: V3[] = [];
  private revealDone = false;

  // scene dressing
  private stars: Star[] = [];
  private dust: V3[] = [];
  private gateFlare = 0; // 1 when the gate just ignited, decays
  private wasLocked = true;

  // input
  private drag: {
    x: number;
    y: number;
    sx: number; // pointerdown origin — 'moved' is judged cumulatively from here
    sy: number;
    slop: number; // touch fingers jitter more than mice
    moved: boolean;
    id: number;
  } | null = null;
  private keys = new Set<string>();

  private raf = 0;
  private last = 0;
  private t0 = 0;
  private disposed = false;
  private frameEma = 16;
  private quality = 1; // drops to 0.5 if frames sag
  private dprCap = 1.75; // quality drop lowers this — resolution is the real lever
  private vignette: CanvasGradient | null = null; // cached; rebuilt on resize

  // per-frame camera trig + a scratch projection target — the star/dust loops
  // must not allocate (~1,300 objects/frame otherwise; GC hitches on phones)
  private cyF = 1;
  private syF = 0;
  private cpF = 1;
  private spF = 0;
  private scratch = { x: 0, y: 0, z: 0, scale: 0 };

  constructor(canvas: HTMLCanvasElement, cb: EngineCallbacks) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.cb = cb;
    this.seedSky();
  }

  // ---------- public API ----------

  start(targets: VoyageTarget[], camPos: [number, number, number], lookAt: [number, number, number]): void {
    this.targets = targets;
    this.pos = v3(...camPos);
    this.lookToward(v3(...lookAt));
    this.resize();
    this.bind();
    this.t0 = performance.now();
    this.last = this.t0;
    const loop = (now: number) => {
      if (this.disposed) return;
      this.tick(now);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.unbind();
  }

  patchTarget(id: string, patch: Partial<VoyageTarget>): void {
    const t = this.targets.find((x) => x.id === id);
    if (t) Object.assign(t, patch);
  }

  /** Fly to a target and enter orbit (instant under reduced motion). */
  travelTo(id: string): void {
    if (this.mode === 'reveal') return; // nothing interrupts the arrival pull-back
    const t = this.targets.find((x) => x.id === id);
    if (!t || !t.present || !t.active) return;
    if (t.locked) {
      this.cb.onLockedTap(t.id);
      return;
    }
    const tp = v3(...t.pos);
    const stand = t.r * 3.1;
    const dir = norm(sub(this.pos, tp));
    const dest = v3(tp.x + dir.x * stand, tp.y + dir.y * stand * 0.6 + t.r * 0.5, tp.z + dir.z * stand);
    this.escape = null;
    this.captured = t;
    this.orbitDist = stand;
    if (this.reducedMotion) {
      this.pos = dest;
      this.enterOrbit(t);
      return;
    }
    this.apFrom = { ...this.pos };
    this.apTo = dest;
    this.apTarget = tp;
    this.apLook0 = { yaw: this.yaw, pitch: this.pitch };
    this.apStart = performance.now();
    this.apDur = clamp(len(sub(dest, this.pos)) / 220, 1.4, 3.4) * 1000;
    this.apThen = 'orbit';
    this.mode = 'autopilot';
  }

  /** Leave orbit and return to free flight — with a push off the body. */
  release(): void {
    // the reveal (and the revealed sky) can't be released out of
    if (this.mode === 'revealed' || this.mode === 'reveal') return;
    const from = this.captured;
    this.captured = null;
    this.mode = 'free';
    this.speed = 0;
    this.wheelImpulse = 0;
    if (from) {
      this.escape = {
        id: from.id,
        dir: norm(sub(this.pos, v3(...from.pos))),
        until: performance.now() + 1500,
      };
    }
  }

  /** The arrival: pull back until the worlds resolve into one figure. */
  reveal(visitedWorldIds: string[]): void {
    this.captured = null;
    const path: V3[] = [];
    const byId = (id: string) => this.targets.find((t) => t.id === id);
    const beacon = this.targets.find((t) => t.kind === 'beacon');
    const sun = this.targets.find((t) => t.kind === 'sun');
    const gate = this.targets.find((t) => t.kind === 'gate');
    if (beacon) path.push(v3(...beacon.pos));
    if (sun) path.push(v3(...sun.pos));
    for (const id of visitedWorldIds) {
      const t = byId(id);
      if (t) path.push(v3(...t.pos));
    }
    if (gate) path.push(v3(...gate.pos));
    this.revealPath = path;
    this.revealT = 0;
    this.revealDone = false;
    // everything shows itself now
    for (const t of this.targets) {
      t.dim = false;
      t.present = true;
    }
    const out = norm(v3(this.pos.x, Math.max(this.pos.y, 180), this.pos.z || 1));
    const vantage = v3(out.x * 980, Math.max(out.y * 980, 300), out.z * 980);
    if (this.reducedMotion) {
      this.pos = vantage;
      this.lookToward(v3(0, -60, 0));
      this.mode = 'revealed';
      this.revealT = 1;
      this.finishReveal();
      return;
    }
    this.apFrom = { ...this.pos };
    this.apTo = vantage;
    this.apTarget = v3(0, -60, 0);
    this.apLook0 = { yaw: this.yaw, pitch: this.pitch };
    this.apStart = performance.now();
    this.apDur = 3600;
    this.apThen = 'revealed';
    this.mode = 'reveal';
  }

  resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.dpr = Math.min(window.devicePixelRatio || 1, this.dprCap);
    this.w = Math.max(1, rect.width);
    this.h = Math.max(1, rect.height);
    this.canvas.width = Math.round(this.w * this.dpr);
    this.canvas.height = Math.round(this.h * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.f = this.h / 2 / Math.tan(FOV / 2);
    const vg = this.ctx.createRadialGradient(
      this.w / 2,
      this.h / 2,
      Math.min(this.w, this.h) * 0.42,
      this.w / 2,
      this.h / 2,
      Math.max(this.w, this.h) * 0.72
    );
    vg.addColorStop(0, 'rgba(4,6,11,0)');
    vg.addColorStop(1, 'rgba(4,6,11,0.55)');
    this.vignette = vg;
  }

  // ---------- input ----------

  private onPointerDown = (e: PointerEvent) => {
    if (this.drag) return; // one finger flies the ship; a second is ignored
    this.canvas.setPointerCapture(e.pointerId);
    this.drag = {
      x: e.clientX,
      y: e.clientY,
      sx: e.clientX,
      sy: e.clientY,
      slop: e.pointerType === 'touch' ? 9 : 4,
      moved: false,
      id: e.pointerId,
    };
  };

  private onPointerMove = (e: PointerEvent) => {
    if (!this.drag || this.drag.id !== e.pointerId) return;
    const dx = e.clientX - this.drag.x;
    const dy = e.clientY - this.drag.y;
    // cumulative displacement from the pointerdown origin — per-event deltas
    // never cross the threshold on slow touch pans
    if (Math.hypot(e.clientX - this.drag.sx, e.clientY - this.drag.sy) > this.drag.slop)
      this.drag.moved = true;
    if (this.drag.moved && (this.mode === 'free' || this.mode === 'revealed')) {
      this.yaw -= dx * 0.0032;
      this.pitch = clamp(this.pitch + dy * 0.0028, -1.35, 1.35);
    }
    this.drag.x = e.clientX;
    this.drag.y = e.clientY;
  };

  private onPointerUp = (e: PointerEvent) => {
    if (!this.drag || this.drag.id !== e.pointerId) return;
    const d = this.drag;
    this.drag = null;
    if (d.moved) return;
    // a clean tap: pick a target
    const rect = this.canvas.getBoundingClientRect();
    this.pick(e.clientX - rect.left, e.clientY - rect.top);
  };

  // a cancelled touch (system gesture, incoming call) is never a tap
  private onPointerCancel = (e: PointerEvent) => {
    if (this.drag?.id === e.pointerId) this.drag = null;
  };

  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    if (this.mode !== 'free' && this.mode !== 'revealed') return;
    this.wheelImpulse = clamp(this.wheelImpulse - e.deltaY * 0.6, -160, 260);
  };

  private onKey = (e: KeyboardEvent) => {
    // keys pressed on buttons/links belong to those controls, not the ship
    const t = e.target as HTMLElement | null;
    if (t?.closest?.('button, a, input, textarea, [tabindex]')) return;
    if (e.type === 'keydown') this.keys.add(e.key.toLowerCase());
    else this.keys.delete(e.key.toLowerCase());
  };

  private bind(): void {
    this.canvas.addEventListener('pointerdown', this.onPointerDown);
    this.canvas.addEventListener('pointermove', this.onPointerMove);
    this.canvas.addEventListener('pointerup', this.onPointerUp);
    this.canvas.addEventListener('pointercancel', this.onPointerCancel);
    this.canvas.addEventListener('wheel', this.onWheel, { passive: false });
    window.addEventListener('keydown', this.onKey);
    window.addEventListener('keyup', this.onKey);
  }

  private unbind(): void {
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.canvas.removeEventListener('pointerup', this.onPointerUp);
    this.canvas.removeEventListener('pointercancel', this.onPointerCancel);
    this.canvas.removeEventListener('wheel', this.onWheel);
    window.removeEventListener('keydown', this.onKey);
    window.removeEventListener('keyup', this.onKey);
  }

  private pick(sx: number, sy: number): void {
    if (this.mode === 'reveal') return; // the arrival pull-back is not interruptible
    let best: VoyageTarget | null = null;
    let bestD = Infinity;
    for (const t of this.targets) {
      if (!t.present || !t.active) continue;
      const p = this.project(v3(...t.pos));
      if (!p) continue;
      const rad = Math.max(26, p.scale * t.r * 1.5);
      const d = Math.hypot(p.x - sx, p.y - sy);
      if (d < rad && p.z < bestD) {
        best = t;
        bestD = p.z;
      }
    }
    if (best) this.travelTo(best.id);
  }

  // ---------- camera math ----------

  private lookToward(target: V3): void {
    const d = sub(target, this.pos);
    const l = len(d) || 1;
    this.yaw = Math.atan2(d.x, d.z);
    this.pitch = Math.asin(clamp(d.y / l, -1, 1));
  }

  private forward(): V3 {
    return v3(
      Math.sin(this.yaw) * Math.cos(this.pitch),
      Math.sin(this.pitch),
      Math.cos(this.yaw) * Math.cos(this.pitch)
    );
  }

  private updateTrig(): void {
    this.cyF = Math.cos(this.yaw);
    this.syF = Math.sin(this.yaw);
    this.cpF = Math.cos(this.pitch);
    this.spF = Math.sin(this.pitch);
  }

  private project(p: V3): { x: number; y: number; z: number; scale: number } | null {
    const dx = p.x - this.pos.x;
    const dy = p.y - this.pos.y;
    const dz = p.z - this.pos.z;
    const x1 = dx * this.cyF - dz * this.syF;
    const z1 = dx * this.syF + dz * this.cyF;
    const y2 = dy * this.cpF - z1 * this.spF;
    const z2 = dy * this.spF + z1 * this.cpF;
    if (z2 < NEAR) return null;
    const scale = this.f / z2;
    return { x: this.w / 2 + x1 * scale, y: this.h / 2 - y2 * scale, z: z2, scale };
  }

  /** Allocation-free projection for the hot star/dust loops — returns the
   * shared scratch object (do not retain across calls). */
  private projectScratch(px: number, py: number, pz: number) {
    const dx = px - this.pos.x;
    const dy = py - this.pos.y;
    const dz = pz - this.pos.z;
    const x1 = dx * this.cyF - dz * this.syF;
    const z1 = dx * this.syF + dz * this.cyF;
    const y2 = dy * this.cpF - z1 * this.spF;
    const z2 = dy * this.spF + z1 * this.cpF;
    if (z2 < NEAR) return null;
    const scale = this.f / z2;
    const s = this.scratch;
    s.x = this.w / 2 + x1 * scale;
    s.y = this.h / 2 - y2 * scale;
    s.z = z2;
    s.scale = scale;
    return s;
  }

  // ---------- simulation ----------

  private enterOrbit(t: VoyageTarget): void {
    this.mode = 'orbit';
    this.captured = t;
    this.wheelImpulse = 0; // a frozen scroll impulse must not lurch on release
    const tp = v3(...t.pos);
    const d = sub(this.pos, tp);
    this.orbitAngle = Math.atan2(d.x, d.z);
    this.orbitDist = Math.max(len(v3(d.x, 0, d.z)), t.r * 2.4);
    this.orbitY = clamp(d.y, -t.r * 1.2, t.r * 1.2);
    this.lookToward(tp);
    this.cb.onCapture(t.id);
  }

  private finishReveal(): void {
    if (this.revealDone) return;
    this.revealDone = true;
    this.cb.onRevealDone();
  }

  private tick(now: number): void {
    const dt = clamp(now - this.last, 0, 50) / 1000;
    this.last = now;
    const t = (now - this.t0) / 1000;

    // adaptive quality: if frames sag hard, drop resolution (the real cost)
    // and thin the sky, once
    this.frameEma = this.frameEma * 0.95 + (dt * 1000) * 0.05;
    if (this.frameEma > 26 && this.quality === 1) {
      this.quality = 0.5;
      this.stars = this.stars.filter((_, i) => i % 2 === 0);
      this.dust = this.dust.filter((_, i) => i % 2 === 0);
      this.dprCap = 1.2;
      this.resize();
      this.frameEma = 16; // fresh judgment after the drop
    }

    // the gate igniting is an event worth a flare
    const gate = this.targets.find((x) => x.kind === 'gate');
    if (gate) {
      if (this.wasLocked && !gate.locked && gate.present) this.gateFlare = 1;
      this.wasLocked = gate.locked;
    }
    this.gateFlare = Math.max(0, this.gateFlare - dt * 0.35);

    if (this.mode === 'free' || this.mode === 'revealed') this.freeFlight(dt);
    else if (this.mode === 'autopilot' || this.mode === 'reveal') this.autopilot(now);
    else if (this.mode === 'orbit') this.orbit(dt);

    if (this.mode === 'revealed' && this.revealT < 1) {
      this.revealT = Math.min(1, this.revealT + dt / 2.6);
      if (this.revealT >= 1) this.finishReveal();
    }

    this.render(t);
  }

  private freeFlight(dt: number): void {
    if (this.reducedMotion) return; // no drift under reduced motion — taps travel
    const thrustKey = this.keys.has('w') || this.keys.has('arrowup') || this.keys.has(' ');
    const brakeKey = this.keys.has('s') || this.keys.has('arrowdown');
    const targetSpeed =
      CRUISE + (thrustKey ? THRUST_MAX : 0) + this.wheelImpulse - (brakeKey ? CRUISE + 40 : 0);
    this.wheelImpulse *= Math.pow(0.2, dt); // impulses decay
    this.speed += (targetSpeed - this.speed) * Math.min(1, dt * 2.2);
    const fwd = this.forward();
    this.pos.x += fwd.x * this.speed * dt;
    this.pos.y += fwd.y * this.speed * dt;
    this.pos.z += fwd.z * this.speed * dt;

    // lifting off — drift away from the released body until clear of its pull
    if (this.escape) {
      this.pos.x += this.escape.dir.x * 62 * dt;
      this.pos.y += this.escape.dir.y * 62 * dt;
      this.pos.z += this.escape.dir.z * 62 * dt;
      const from = this.targets.find((x) => x.id === this.escape!.id);
      // the timer is sufficient once you're out of the capture zone itself —
      // demanding a wide margin left a permanent repulsion field on the body
      const clear = !from || len(sub(v3(...from.pos), this.pos)) > from.r * CAPTURE_FACTOR;
      if (performance.now() > this.escape.until && clear) this.escape = null;
    }

    // gravity — active bodies pull; close enough and they capture you
    if (this.mode === 'free') {
      for (const tg of this.targets) {
        if (!tg.present || !tg.active || tg.locked) continue;
        if (this.escape && tg.id === this.escape.id) continue;
        const tp = v3(...tg.pos);
        const d = sub(tp, this.pos);
        const dist = len(d);
        if (dist < tg.r * CAPTURE_FACTOR) {
          this.enterOrbit(tg);
          return;
        }
        const range = tg.r * GRAVITY_RANGE;
        if (dist < range) {
          const g = 26 * (1 - dist / range); // gentle, not a slingshot
          const n = norm(d);
          this.pos.x += n.x * g * dt;
          this.pos.y += n.y * g * dt;
          this.pos.z += n.z * g * dt;
        }
      }
    }

    // soft edge — the universe curves you back
    const r = len(this.pos);
    if (r > BOUND) {
      const n = norm(this.pos);
      const push = (r - BOUND) * 0.9 * dt;
      this.pos.x -= n.x * push;
      this.pos.y -= n.y * push;
      this.pos.z -= n.z * push;
    }
  }

  private autopilot(now: number): void {
    const u = easeInOut(clamp((now - this.apStart) / this.apDur, 0, 1));
    this.pos = lerp3(this.apFrom, this.apTo, u);
    if (this.apLook0) {
      // ease the gaze onto the destination
      const d = sub(this.apTarget, this.pos);
      const l = len(d) || 1;
      const wantYaw = Math.atan2(d.x, d.z);
      const wantPitch = Math.asin(clamp(d.y / l, -1, 1));
      let dyaw = wantYaw - this.apLook0.yaw;
      while (dyaw > Math.PI) dyaw -= Math.PI * 2;
      while (dyaw < -Math.PI) dyaw += Math.PI * 2;
      const g = easeInOut(clamp(u * 1.5, 0, 1));
      this.yaw = this.apLook0.yaw + dyaw * g;
      this.pitch = this.apLook0.pitch + (wantPitch - this.apLook0.pitch) * g;
    }
    if (u >= 1) {
      if (this.apThen === 'orbit' && this.captured) this.enterOrbit(this.captured);
      else if (this.apThen === 'revealed') {
        this.mode = 'revealed';
        this.lookToward(this.apTarget);
      }
    }
  }

  private orbit(dt: number): void {
    const t = this.captured;
    if (!t) {
      this.mode = 'free';
      return;
    }
    if (!this.reducedMotion) this.orbitAngle += dt * 0.05;
    const tp = v3(...t.pos);
    this.pos = v3(
      tp.x + Math.sin(this.orbitAngle) * this.orbitDist,
      tp.y + this.orbitY,
      tp.z + Math.cos(this.orbitAngle) * this.orbitDist
    );
    this.lookToward(tp);
  }

  // ---------- scene ----------

  private seedSky(): void {
    this.stars = Array.from({ length: STAR_COUNT }, () => {
      // uniform on sphere
      const u = Math.random() * 2 - 1;
      const ph = Math.random() * Math.PI * 2;
      const s = Math.sqrt(1 - u * u);
      return {
        p: v3(Math.cos(ph) * s * SKY_R, u * SKY_R, Math.sin(ph) * s * SKY_R),
        m: 0.2 + Math.pow(Math.random(), 2.2) * 0.8,
        warm: Math.random() < 0.12,
        tw: Math.random() * Math.PI * 2,
      };
    });
    this.dust = Array.from({ length: DUST_COUNT }, () =>
      v3((Math.random() * 2 - 1) * 750, (Math.random() * 2 - 1) * 600, (Math.random() * 2 - 1) * 750)
    );
  }

  private render(t: number): void {
    const { ctx, w, h } = this;
    this.updateTrig();
    // deep space backdrop
    ctx.fillStyle = '#04060b';
    ctx.fillRect(0, 0, w, h);

    // stars — fixed sky, parallax from rotation only
    for (const s of this.stars) {
      const p = this.projectScratch(s.p.x, s.p.y, s.p.z);
      if (!p || p.x < -3 || p.x > w + 3 || p.y < -3 || p.y > h + 3) continue;
      const twinkle = this.reducedMotion ? 1 : 0.75 + 0.25 * Math.sin(t * 1.2 + s.tw);
      ctx.globalAlpha = s.m * twinkle * 0.9;
      ctx.fillStyle = s.warm ? '#e8dcb0' : '#cdd8ec';
      const sz = s.m > 0.75 ? 1.8 : 1.1;
      ctx.fillRect(p.x, p.y, sz, sz);
    }

    // dust — near-field parallax so motion is legible
    ctx.fillStyle = '#8fa3bf';
    for (const d of this.dust) {
      const p = this.projectScratch(d.x, d.y, d.z);
      if (!p || p.x < -3 || p.x > w + 3 || p.y < -3 || p.y > h + 3) continue;
      ctx.globalAlpha = clamp(60 / p.z, 0.03, 0.3);
      ctx.fillRect(p.x, p.y, 1, 1);
    }
    ctx.globalAlpha = 1;

    // threads: sun ↔ worlds (behind bodies)
    const sun = this.targets.find((x) => x.kind === 'sun');
    if (sun && sun.present) {
      for (const tg of this.targets) {
        if (tg.kind !== 'world' || !tg.present || tg.dim) continue;
        this.drawThread(v3(...sun.pos), v3(...tg.pos), tg.color, t, tg.worldKind === 'rejected');
      }
      const gate = this.targets.find((x) => x.kind === 'gate');
      if (gate && gate.present && !gate.locked) {
        this.drawThread(v3(...sun.pos), v3(...gate.pos), '#d8c98a', t, false);
      }
    }

    // the reveal figure — the visited path igniting into one line
    if (this.revealT > 0 && this.revealPath.length > 1) {
      const total = this.revealPath.length - 1;
      const progress = this.revealT * total;
      for (let i = 0; i < total; i++) {
        const segU = clamp(progress - i, 0, 1);
        if (segU <= 0) break;
        const a = this.revealPath[i];
        const b = lerp3(this.revealPath[i], this.revealPath[i + 1], segU);
        const pa = this.project(a);
        const pb = this.project(b);
        if (!pa || !pb) continue;
        ctx.strokeStyle = 'rgba(232,220,176,0.55)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(pa.x, pa.y);
        ctx.lineTo(pb.x, pb.y);
        ctx.stroke();
      }
    }

    // bodies, far → near
    const order = this.targets
      .filter((x) => x.present)
      .map((tg) => ({ tg, p: this.project(v3(...tg.pos)) }))
      .filter((o) => o.p !== null)
      .sort((a, b) => b.p!.z - a.p!.z);

    for (const { tg, p } of order) {
      // cap the painted radius (a body flown into must not blend a 30x-screen
      // glow) and fade out at the near plane instead of popping through
      const sr = Math.min(p!.scale * tg.r, Math.max(w, h) * 0.7);
      const nearFade = clamp((p!.z - NEAR) / (tg.r * 1.1), 0, 1);
      const alpha = (tg.dim ? 0.13 : clamp(2.2 - p!.z / 900, 0.35, 1)) * nearFade;
      if (tg.kind === 'world') {
        paintWorld(ctx, tg.worldKind ?? 'stoicism', tg.color, p!.x, p!.y, sr, t, {
          alpha,
          visited: tg.visited,
          seed: tg.id.length + tg.id.charCodeAt(0),
        });
      } else if (tg.kind === 'sun') {
        this.paintSun(p!.x, p!.y, sr, t, alpha);
      } else if (tg.kind === 'beacon') {
        this.paintBeacon(p!.x, p!.y, sr, t, alpha, tg.visited);
      } else {
        this.paintGate(p!.x, p!.y, sr, t, alpha, tg.locked);
      }
      // labels — etched, close enough to read, not while dim
      if (!tg.dim && p!.z < 620 && sr > 7 && this.mode !== 'reveal') {
        this.paintLabel(p!.x, p!.y + sr * 2.1 + 14, tg.title, tg.subtitle, tg.color, clamp(1.4 - p!.z / 520, 0, 0.95));
      }
    }

    // vignette — cached gradient, rebuilt only on resize
    ctx.globalAlpha = 1;
    if (this.vignette) {
      ctx.fillStyle = this.vignette;
      ctx.fillRect(0, 0, w, h);
    }
  }

  private drawThread(a: V3, b: V3, color: string, t: number, broken: boolean): void {
    const pa = this.project(a);
    const pb = this.project(b);
    if (!pa || !pb) return;
    const { ctx } = this;
    ctx.strokeStyle = rgba(color, broken ? 0.1 : 0.16);
    ctx.lineWidth = 1;
    if (broken) ctx.setLineDash([4, 7]);
    ctx.beginPath();
    ctx.moveTo(pa.x, pa.y);
    ctx.lineTo(pb.x, pb.y);
    ctx.stroke();
    ctx.setLineDash([]);
    if (!broken && !this.reducedMotion) {
      // a pulse of light travels the thread
      const u = (t * 0.12 + (a.x + b.z) * 0.001) % 1;
      const p = this.project(lerp3(a, b, u));
      if (p) {
        ctx.globalAlpha = 0.7;
        const sz = Math.max(6, p.scale * 3);
        ctx.drawImage(glowSprite(color), p.x - sz / 2, p.y - sz / 2, sz, sz);
        ctx.globalAlpha = 1;
      }
    }
  }

  private paintSun(x: number, y: number, r: number, t: number, alpha: number): void {
    const { ctx } = this;
    ctx.save();
    ctx.globalAlpha = alpha;
    const pulse = this.reducedMotion ? 1 : 1 + Math.sin(t * 0.7) * 0.04;
    const sz = r * 9 * pulse;
    ctx.drawImage(glowSprite('#e8dcb0'), x - sz / 2, y - sz / 2, sz, sz);
    ctx.beginPath();
    ctx.arc(x, y, r * pulse, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(240,232,200,0.95)';
    ctx.fill();
    // slow corona rays
    ctx.strokeStyle = 'rgba(232,220,176,0.35)';
    ctx.lineWidth = Math.max(0.8, r * 0.04);
    for (let i = 0; i < 10; i++) {
      const a = (this.reducedMotion ? 0 : t * 0.03) + (Math.PI / 5) * i;
      const r1 = r * 1.5;
      const r2 = r * (2.1 + (i % 2) * 0.5);
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1);
      ctx.lineTo(x + Math.cos(a) * r2, y + Math.sin(a) * r2);
      ctx.stroke();
    }
    ctx.restore();
  }

  private paintBeacon(x: number, y: number, r: number, t: number, alpha: number, visited: boolean): void {
    const { ctx } = this;
    ctx.save();
    ctx.globalAlpha = alpha;
    const sz = r * 7;
    ctx.drawImage(glowSprite('#b9c3d6'), x - sz / 2, y - sz / 2, sz, sz);
    ctx.beginPath();
    ctx.arc(x, y, r * 0.8, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(200,210,228,0.9)';
    ctx.fill();
    if (!this.reducedMotion) {
      const ph = (t * 0.4) % 1;
      ctx.beginPath();
      ctx.arc(x, y, r * (1 + ph * 1.6), 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(185,195,214,${0.5 * (1 - ph)})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    if (visited) {
      ctx.beginPath();
      ctx.arc(x, y, r * 1.5, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(185,195,214,0.3)';
      ctx.stroke();
    }
    ctx.restore();
  }

  private paintGate(x: number, y: number, r: number, t: number, alpha: number, locked: boolean): void {
    const { ctx } = this;
    ctx.save();
    const gold = '#d8c98a';
    const a = locked ? alpha * 0.5 : alpha;
    ctx.globalAlpha = a;
    if (!locked) {
      const sz = r * (8 + this.gateFlare * 26);
      ctx.globalAlpha = a * (0.7 + this.gateFlare);
      ctx.drawImage(glowSprite(gold), x - sz / 2, y - sz / 2, sz, sz);
      ctx.globalAlpha = a;
      // a pillar of light — visible across space once open
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const bh = r * 14;
      const bg = ctx.createLinearGradient(x, y - bh / 2, x, y + bh / 2);
      bg.addColorStop(0, rgba(gold, 0));
      bg.addColorStop(0.5, rgba(gold, 0.2 + this.gateFlare * 0.4));
      bg.addColorStop(1, rgba(gold, 0));
      ctx.fillStyle = bg;
      ctx.fillRect(x - r * 0.3, y - bh / 2, r * 0.6, bh);
      ctx.restore();
    }
    // the ring itself — a doorway standing in space
    ctx.lineWidth = Math.max(1, r * 0.09);
    ctx.strokeStyle = rgba(gold, locked ? 0.5 : 0.95);
    if (locked) ctx.setLineDash([r * 0.35, r * 0.3]);
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 1.45, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.ellipse(x, y, r * 0.78, r * 1.16, 0, 0, Math.PI * 2);
    ctx.strokeStyle = rgba(gold, locked ? 0.25 : 0.5);
    ctx.lineWidth = Math.max(0.8, r * 0.04);
    ctx.stroke();
    if (!locked && !this.reducedMotion) {
      // sparks circling the door
      for (let i = 0; i < 5; i++) {
        const ang = t * 0.9 + (i * Math.PI * 2) / 5;
        ctx.beginPath();
        ctx.arc(x + Math.cos(ang) * r, y + Math.sin(ang) * r * 1.45, Math.max(1, r * 0.06), 0, Math.PI * 2);
        ctx.fillStyle = rgba(gold, 0.85);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  private paintLabel(x: number, y: number, title: string, subtitle: string | undefined, color: string, alpha: number): void {
    if (alpha <= 0.02) return;
    const { ctx } = this;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.textAlign = 'center';
    if (subtitle) {
      ctx.font = '9px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.fillStyle = rgba(color, 0.75);
      ctx.fillText(subtitle.toUpperCase().split('').join('  '), x, y);
      y += 15;
    }
    ctx.font = '13px Georgia, serif';
    ctx.fillStyle = 'rgba(201,209,221,0.92)';
    // wrap at ~26 chars, max 2 lines
    const words = title.split(' ');
    const lines: string[] = [];
    let cur = '';
    for (const wd of words) {
      if (cur && (cur + ' ' + wd).length > 26) {
        lines.push(cur);
        cur = wd;
      } else cur = cur ? cur + ' ' + wd : wd;
      if (lines.length === 2) break;
    }
    if (cur && lines.length < 2) lines.push(cur);
    lines.forEach((ln, i) => ctx.fillText(ln, x, y + i * 16));
    ctx.restore();
  }
}
