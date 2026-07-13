'use client';

// The retreat's soundscape — an outdoor air, fully generated (no samples, no
// loops): wind through a valley (filtered noise with slow gusts and a leaf
// shimmer that rides them), occasional birdsong (synthesized three-to-five
// note motifs, panned, never on a rhythm), lake water that swells as you near
// the shore, and the softest footfall taps while walking. Same contract as
// lib/ambience.ts: starts only on user gesture, fades in/out, optional and
// silent by default — atmosphere, not stimulation.
//
// Chamber tinting mirrors tintAmbience: entering a lineage site adds a very
// quiet two-partial pad at that tradition's interval and shifts the wind's
// ceiling; leaving returns to plain air. The root never moves.

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
// pad (chamber tint)
let padGain: GainNode | null = null;
let padOscs: OscillatorNode[] = [];
// birds
let birdTimer = 0;
let birdsAllowed = true;
// steps
let stepBuf: AudioBuffer | null = null;

const LEVEL = 0.16; // master ceiling — the whole outdoors stays under this
const PAD_ROOT = 108;

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
  const delay = 4000 + Math.random() * 11000;
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
  const v = Math.min(1, Math.max(0, k));
  waterGain.gain.setTargetAtTime(v * v * 0.5, ctx.currentTime, 0.8);
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
  if (running) void toggleNature();
}
