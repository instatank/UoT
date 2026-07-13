'use client';

// The retreat's soundscape — an outdoor air, fully generated (no samples, no
// loops): wind through a valley (filtered noise with slow gusts and a leaf
// shimmer that rides them), occasional birdsong (synthesized three-to-five
// note motifs, panned, never on a rhythm), lake water that swells as you near
// the shore, a waterfall on the west rim, and the softest footfall taps while
// walking. Same contract as lib/ambience.ts: starts only on user gesture,
// fades in/out, optional and silent by default — atmosphere, not stimulation.
//
// Each site carries its own sound as you near it (AA, 2026-07-13 — "let each
// stop have a slightly different character"): a singing bowl at the stupa,
// fire at the flame plinth, organ swells in the chapel ruin, a breath-flute
// at the spiral, brook water at the mirror pool, a deep stone hum in the
// fortress, a sputtering ember in the dry hollow. All synthesized, all quiet,
// all crossfaded by proximity — sound neighborhoods, not tracks.
//
// Chamber tinting mirrors tintAmbience: entering a lineage site adds a very
// quiet two-partial pad at that tradition's interval and shifts the wind's
// ceiling; birds hold their song while reading. The root never moves.

import type { LineageAtmosphere } from '@/lib/lineage';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let running = false;

// wind
let windGain: GainNode | null = null;
let windFilter: BiquadFilterNode | null = null;
let leafGain: GainNode | null = null;
// water
let waterGain: GainNode | null = null;
let fallGain: GainNode | null = null;
// pad (chamber tint)
let padGain: GainNode | null = null;
let padOscs: OscillatorNode[] = [];
// birds
let birdTimer = 0;
let birdsAllowed = true;
let birdRateMult = 1;
// steps
let stepBuf: AudioBuffer | null = null;
// site motifs
interface Motif {
  gain: GainNode;
  level: number;
}
const motifs = new Map<string, Motif>();
let bowlTimer = 0;
let humTimer = 0;

const LEVEL = 0.16; // master ceiling — the whole outdoors stays under this
const PAD_ROOT = 108;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

function noiseBuffer(ac: AudioContext, seconds: number, lowpassed = false): AudioBuffer {
  const len = Math.floor(ac.sampleRate * seconds);
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1;
    if (lowpassed) {
      // one-pole walk — browner noise for wind body
      last = last * 0.96 + w * 0.04;
      d[i] = last * 8;
    } else {
      d[i] = w;
    }
  }
  return buf;
}

/** Fire, baked into a buffer: mostly silence, random decaying bursts. */
function crackleBuffer(ac: AudioContext, seconds: number, density: number): AudioBuffer {
  const len = Math.floor(ac.sampleRate * seconds);
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const d = buf.getChannelData(0);
  let env = 0;
  for (let i = 0; i < len; i++) {
    if (Math.random() < density) env = 0.4 + Math.random() * 0.6;
    env *= 0.9993 - Math.random() * 0.0004;
    d[i] = (Math.random() * 2 - 1) * env * env;
  }
  return buf;
}

function motif(key: string, level: number, build: (out: GainNode) => void): void {
  if (!ctx || !master || motifs.has(key)) return;
  const g = ctx.createGain();
  g.gain.value = 0;
  g.connect(master);
  build(g);
  motifs.set(key, { gain: g, level });
}

/** Lazily build every site's sound — cheap nodes, all silent until neared. */
function buildMotifs(): void {
  if (!ctx) return;
  const ac = ctx;

  // stupa — a singing bowl, struck rarely (scheduler below)
  motif('stupa', 1, () => {});

  // flame — fire crackle over a faint warm drone
  motif('flame', 0.35, (out) => {
    const src = ac.createBufferSource();
    src.buffer = crackleBuffer(ac, 5, 0.00035);
    src.loop = true;
    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1400;
    bp.Q.value = 0.6;
    src.connect(bp);
    bp.connect(out);
    src.start();
    const drone = ac.createOscillator();
    drone.frequency.value = 72;
    const dg = ac.createGain();
    dg.gain.value = 0.12;
    drone.connect(dg);
    dg.connect(out);
    drone.start();
  });

  // hollow — the same fire, guttering: sparser, darker, weaker
  motif('hollow', 0.22, (out) => {
    const src = ac.createBufferSource();
    src.buffer = crackleBuffer(ac, 6, 0.00012);
    src.loop = true;
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 640;
    src.connect(lp);
    lp.connect(out);
    src.start();
  });

  // arch — organ swells through a ruined chapel, far away
  motif('arch', 0.16, (out) => {
    for (const [f, a] of [
      [130.81, 1],
      [196.0, 0.55],
      [261.63, 0.3],
    ] as const) {
      const o = ac.createOscillator();
      o.frequency.value = f;
      const g = ac.createGain();
      g.gain.value = a;
      o.connect(g);
      g.connect(out);
      o.start();
    }
    const swell = ac.createOscillator();
    swell.frequency.value = 0.031;
    const sg = ac.createGain();
    sg.gain.value = 0.45;
    swell.connect(sg);
    sg.connect(out.gain);
    swell.start();
  });

  // circle — a breath-flute with slow vibrato, phrased by an LFO
  motif('circle', 0.14, (out) => {
    const o = ac.createOscillator();
    o.frequency.value = 523.25;
    const vib = ac.createOscillator();
    vib.frequency.value = 4.6;
    const vg = ac.createGain();
    vg.gain.value = 5;
    vib.connect(vg);
    vg.connect(o.frequency);
    vib.start();
    const g = ac.createGain();
    g.gain.value = 0.5;
    o.connect(g);
    g.connect(out);
    o.start();
    const breath = ac.createBufferSource();
    breath.buffer = noiseBuffer(ac, 4);
    breath.loop = true;
    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1900;
    bp.Q.value = 3;
    const bg = ac.createGain();
    bg.gain.value = 0.1;
    breath.connect(bp);
    bp.connect(bg);
    bg.connect(out);
    breath.start();
    const phrase = ac.createOscillator();
    phrase.frequency.value = 0.06;
    const pg = ac.createGain();
    pg.gain.value = 0.5;
    phrase.connect(pg);
    pg.connect(out.gain);
    phrase.start();
  });

  // pool & spring — brook water, brighter and quicker than the lake
  for (const [key, level] of [
    ['pool', 0.3],
    ['spring', 0.2],
  ] as const) {
    motif(key, level, (out) => {
      const src = ac.createBufferSource();
      src.buffer = noiseBuffer(ac, 5, true);
      src.loop = true;
      const bp = ac.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 900;
      bp.Q.value = 1.1;
      src.connect(bp);
      bp.connect(out);
      src.start();
      const wob = ac.createOscillator();
      wob.frequency.value = 0.6;
      const wg = ac.createGain();
      wg.gain.value = 320;
      wob.connect(wg);
      wg.connect(bp.frequency);
      wob.start();
    });
  }

  // stoa — the fortress: a deep stone hum, swelling rarely (scheduler below)
  motif('stoa', 1, () => {});

  // deck — a clear high shimmer, barely there; birds sing more nearby
  motif('deck', 0.05, (out) => {
    for (const [f, a] of [
      [1567.98, 1],
      [2093.0, 0.5],
    ] as const) {
      const o = ac.createOscillator();
      o.frequency.value = f;
      const g = ac.createGain();
      g.gain.value = a * 0.4;
      o.connect(g);
      g.connect(out);
      o.start();
    }
    const lfo = ac.createOscillator();
    lfo.frequency.value = 0.07;
    const lg = ac.createGain();
    lg.gain.value = 0.5;
    lfo.connect(lg);
    lg.connect(out.gain);
    lfo.start();
  });

  scheduleBowl();
  scheduleHum();
}

/** One soft bowl strike — two barely-detuned partials, long decay. */
function bowlStrike(): void {
  if (!ctx) return;
  const m = motifs.get('stupa');
  if (!m || m.gain.gain.value < 0.004) return;
  const t = ctx.currentTime;
  for (const [f, a] of [
    [392, 1],
    [393.8, 0.7],
    [1058, 0.12],
  ] as const) {
    const o = ctx.createOscillator();
    o.frequency.value = f;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.05 * a, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 7);
    o.connect(g);
    g.connect(m.gain);
    o.start(t);
    o.stop(t + 7.2);
  }
}

function scheduleBowl(): void {
  if (!ctx) return;
  bowlTimer = window.setTimeout(() => {
    if (running) bowlStrike();
    scheduleBowl();
  }, 11000 + Math.random() * 9000);
}

/** The fortress hum — a low stone swell out of silence and back. */
function scheduleHum(): void {
  if (!ctx) return;
  humTimer = window.setTimeout(() => {
    const m = motifs.get('stoa');
    if (running && ctx && m && m.gain.gain.value > 0.004) {
      const t = ctx.currentTime;
      const o = ctx.createOscillator();
      o.frequency.value = 64;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.14, t + 2.5);
      g.gain.linearRampToValueAtTime(0, t + 7);
      o.connect(g);
      g.connect(m.gain);
      o.start(t);
      o.stop(t + 7.2);
    }
    scheduleHum();
  }, 13000 + Math.random() * 9000);
}

function build() {
  ctx = new (window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  master = ctx.createGain();
  master.gain.value = 0;
  master.connect(ctx.destination);

  // ----- wind: brown-ish noise through a breathing lowpass -----
  const windSrc = ctx.createBufferSource();
  windSrc.buffer = noiseBuffer(ctx, 7, true);
  windSrc.loop = true;
  windFilter = ctx.createBiquadFilter();
  windFilter.type = 'lowpass';
  windFilter.frequency.value = 320;
  windFilter.Q.value = 0.4;
  windGain = ctx.createGain();
  windGain.gain.value = 0.5;
  windSrc.connect(windFilter);
  windFilter.connect(windGain);
  windGain.connect(master);
  windSrc.start();

  // gusts: two incommensurate LFOs on the wind level — never a repeating swell
  for (const [freq, depth] of [
    [0.037, 0.16],
    [0.011, 0.22],
  ] as const) {
    const lfo = ctx.createOscillator();
    lfo.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.value = depth;
    lfo.connect(g);
    g.connect(windGain.gain);
    lfo.start();
  }

  // leaf shimmer: high-band noise that rides the same air, quieter
  const leafSrc = ctx.createBufferSource();
  leafSrc.buffer = noiseBuffer(ctx, 5);
  leafSrc.loop = true;
  const leafBp = ctx.createBiquadFilter();
  leafBp.type = 'bandpass';
  leafBp.frequency.value = 2400;
  leafBp.Q.value = 0.7;
  leafGain = ctx.createGain();
  leafGain.gain.value = 0.028;
  leafSrc.connect(leafBp);
  leafBp.connect(leafGain);
  leafGain.connect(master);
  leafSrc.start();
  const leafLfo = ctx.createOscillator();
  leafLfo.frequency.value = 0.043;
  const leafLfoG = ctx.createGain();
  leafLfoG.gain.value = 0.014;
  leafLfo.connect(leafLfoG);
  leafLfoG.connect(leafGain.gain);
  leafLfo.start();

  // ----- lake: low burble, gain driven by proximity (setLakeCloseness) -----
  const waterSrc = ctx.createBufferSource();
  waterSrc.buffer = noiseBuffer(ctx, 6, true);
  waterSrc.loop = true;
  const waterLp = ctx.createBiquadFilter();
  waterLp.type = 'lowpass';
  waterLp.frequency.value = 480;
  const waterBp = ctx.createBiquadFilter();
  waterBp.type = 'bandpass';
  waterBp.frequency.value = 220;
  waterBp.Q.value = 1.4;
  waterGain = ctx.createGain();
  waterGain.gain.value = 0;
  waterSrc.connect(waterLp);
  waterLp.connect(waterBp);
  waterBp.connect(waterGain);
  waterGain.connect(master);
  waterSrc.start();
  // lapping: a slow wobble on the burble's pitch center
  const lapLfo = ctx.createOscillator();
  lapLfo.frequency.value = 0.21;
  const lapG = ctx.createGain();
  lapG.gain.value = 70;
  lapLfo.connect(lapG);
  lapG.connect(waterBp.frequency);
  lapLfo.start();

  // ----- the waterfall on the west rim — white water, proximity-driven -----
  const fallSrc = ctx.createBufferSource();
  fallSrc.buffer = noiseBuffer(ctx, 5);
  fallSrc.loop = true;
  const fallLp = ctx.createBiquadFilter();
  fallLp.type = 'lowpass';
  fallLp.frequency.value = 1300;
  fallGain = ctx.createGain();
  fallGain.gain.value = 0;
  fallSrc.connect(fallLp);
  fallLp.connect(fallGain);
  fallGain.connect(master);
  fallSrc.start();

  // ----- pad: silent until a chamber tints it -----
  padGain = ctx.createGain();
  padGain.gain.value = 0;
  padGain.connect(master);
  padOscs = [1, 1.5].map((ratio, i) => {
    const osc = ctx!.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = PAD_ROOT * ratio;
    const g = ctx!.createGain();
    g.gain.value = i === 0 ? 1 : 0.5;
    osc.connect(g);
    g.connect(padGain!);
    osc.start();
    return osc;
  });

  // ----- footsteps: a tiny pre-rendered scuff, retriggered per step -----
  const stepLen = Math.floor(ctx.sampleRate * 0.09);
  stepBuf = ctx.createBuffer(1, stepLen, ctx.sampleRate);
  const sd = stepBuf.getChannelData(0);
  for (let i = 0; i < stepLen; i++) {
    const env = Math.pow(1 - i / stepLen, 2.6);
    sd[i] = (Math.random() * 2 - 1) * env;
  }

  buildMotifs();
  scheduleBird();
}

// Birdsong: short whistled motifs at long, irregular intervals. Each note is
// a sine with a quick pitch bend — close enough to a real call to read as
// "there are birds here," far enough to never demand attention.
function chirp(when: number, pan: number): void {
  if (!ctx || !master) return;
  const notes = 2 + Math.floor(Math.random() * 3);
  const base = 2100 + Math.random() * 1600;
  const panner = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
  const out = panner ?? ctx.createGain();
  if (panner) panner.pan.value = pan;
  out.connect(master);
  let t = when;
  for (let n = 0; n < notes; n++) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    const f0 = base * (0.92 + Math.random() * 0.18);
    const dur = 0.07 + Math.random() * 0.09;
    osc.frequency.setValueAtTime(f0, t);
    osc.frequency.exponentialRampToValueAtTime(f0 * (1.1 + Math.random() * 0.35), t + dur * 0.6);
    osc.frequency.exponentialRampToValueAtTime(f0 * 0.95, t + dur);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.05 + Math.random() * 0.035, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(out);
    osc.start(t);
    osc.stop(t + dur + 0.02);
    t += dur + 0.03 + Math.random() * 0.12;
  }
}

function scheduleBird(): void {
  if (!ctx) return;
  const delay = (4000 + Math.random() * 11000) / birdRateMult;
  birdTimer = window.setTimeout(() => {
    if (running && birdsAllowed && ctx) chirp(ctx.currentTime + 0.05, Math.random() * 1.6 - 0.8);
    scheduleBird();
  }, delay);
}

export function natureRunning(): boolean {
  return running;
}

export async function toggleNature(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (!running) {
    running = true; // flip synchronously — fast double-taps must read on→off
    if (!ctx) build();
    await ctx!.resume();
    if (!running) return false;
    const t = ctx!.currentTime;
    master!.gain.cancelScheduledValues(t);
    master!.gain.setValueAtTime(master!.gain.value, t);
    master!.gain.linearRampToValueAtTime(LEVEL, t + 2.5);
  } else {
    const t = ctx!.currentTime;
    master!.gain.cancelScheduledValues(t);
    master!.gain.setValueAtTime(master!.gain.value, t);
    master!.gain.linearRampToValueAtTime(0, t + 1.4);
    running = false;
    setTimeout(() => {
      if (!running && ctx?.state === 'running') void ctx.suspend();
    }, 1600);
  }
  return running;
}

/** How near the shore the listener stands, 0..1 — the engine feeds this. */
export function setLakeCloseness(k: number): void {
  if (!ctx || !running || !waterGain) return;
  const v = clamp01(k);
  waterGain.gain.setTargetAtTime(v * v * 0.5, ctx.currentTime, 0.8);
}

/** Waterfall proximity, 0..1 — big water when you stand beside it. */
export function setFallCloseness(k: number): void {
  if (!ctx || !running || !fallGain) return;
  const v = clamp01(k);
  fallGain.gain.setTargetAtTime(v * v * 0.34, ctx.currentTime, 0.9);
}

/** The site whose air the walker is in (engine feeds nearest lit site).
 * Crossfades that site's motif up and every other down — neighborhoods. */
export function setSiteAtmos(kind: string | null, closeness: number): void {
  if (!ctx || !running) return;
  const t = ctx.currentTime;
  const k = clamp01(closeness);
  for (const [key, m] of motifs) {
    const want = key === kind ? m.level * k * k : 0;
    m.gain.gain.setTargetAtTime(want, t, 1.2);
  }
  birdRateMult = kind === 'deck' && k > 0.4 ? 2.2 : 1;
}

/** One footfall — called by the engine on walk cadence. Barely there. */
export function step(): void {
  if (!ctx || !running || !stepBuf || !master) return;
  const src = ctx.createBufferSource();
  src.buffer = stepBuf;
  src.playbackRate.value = 0.82 + Math.random() * 0.3;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 420 + Math.random() * 180;
  const g = ctx.createGain();
  g.gain.value = 0.11;
  src.connect(lp);
  lp.connect(g);
  g.connect(master);
  src.start();
}

// Entering a lineage site colors the air: a faint pad at the tradition's
// interval fades in, the wind's ceiling shifts with the room, and the birds
// hold their song (a reading needs quiet). Null returns to open air.
export function tintNature(voicing: LineageAtmosphere | null): void {
  if (!ctx || !running || !padGain || !windFilter) return;
  const t = ctx.currentTime;
  if (voicing) {
    padOscs[1]?.frequency.setTargetAtTime(PAD_ROOT * voicing.fifth, t, 1.4);
    padGain.gain.setTargetAtTime(0.05, t, 2.0);
    windFilter.frequency.setTargetAtTime(160 + voicing.filter * 0.5, t, 1.8);
    birdsAllowed = false;
  } else {
    padGain.gain.setTargetAtTime(0, t, 1.6);
    windFilter.frequency.setTargetAtTime(320, t, 1.8);
    birdsAllowed = true;
  }
}

/** Dusk falls at arrival — birds settle, wind sinks, water carries further. */
export function duskNature(): void {
  if (!ctx || !running || !windFilter) return;
  birdsAllowed = false;
  windFilter.frequency.setTargetAtTime(210, ctx.currentTime, 3.0);
}

/** Full teardown on unmount — timers cleared, air released. */
export function disposeNature(): void {
  window.clearTimeout(birdTimer);
  window.clearTimeout(bowlTimer);
  window.clearTimeout(humTimer);
  if (running) void toggleNature();
}
