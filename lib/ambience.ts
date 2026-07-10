'use client';

// A very quiet generated sound bed — two soft partials a fifth apart under a
// slow-breathing lowpass, faded in and out. WebAudio, no audio assets, starts
// only on user gesture (autoplay-safe). Atmosphere, not stimulation: constant,
// loopless, no rhythm, nothing to anticipate.

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let filterNode: BiquadFilterNode | null = null;
let nodes: OscillatorNode[] = [];
let lfos: OscillatorNode[] = [];
let running = false;

const LEVEL = 0.028;
const ROOT = 96;
const DEFAULT_VOICING = { fifth: 1.5, octave: 2, filter: 340 };

function build() {
  ctx = new (window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  master = ctx.createGain();
  master.gain.value = 0;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = DEFAULT_VOICING.filter;
  filter.Q.value = 0.4;
  filter.connect(master);
  master.connect(ctx.destination);
  filterNode = filter;

  const partials: [number, number][] = [
    [ROOT, 1], // root — never moves
    [ROOT * DEFAULT_VOICING.fifth, 0.55], // the interval that carries the mood
    [ROOT * DEFAULT_VOICING.octave, 0.18], // shimmer
  ];
  nodes = partials.map(([freq, amp]) => {
    const osc = ctx!.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const g = ctx!.createGain();
    g.gain.value = amp;
    osc.connect(g);
    g.connect(filter);
    osc.start();
    return osc;
  });

  // the bed breathes: filter drifts over ~40s, level sways over ~23s
  const lfo1 = ctx.createOscillator();
  lfo1.frequency.value = 0.025;
  const lfo1g = ctx.createGain();
  lfo1g.gain.value = 90;
  lfo1.connect(lfo1g);
  lfo1g.connect(filter.frequency);
  lfo1.start();

  const lfo2 = ctx.createOscillator();
  lfo2.frequency.value = 0.043;
  const lfo2g = ctx.createGain();
  lfo2g.gain.value = LEVEL * 0.3;
  lfo2.connect(lfo2g);
  lfo2g.connect(master.gain);
  lfo2.start();

  lfos = [lfo1, lfo2];
}

export function ambienceRunning(): boolean {
  return running;
}

// Re-voice the bed to a lineage's atmosphere: the root holds, the second
// partial slides to the tradition's interval, the ceiling (lowpass) rises or
// sinks. Slow ramps — a room changing color, not a chord change. No-op when
// the bed is off; null returns to the neutral voicing.
export function tintAmbience(
  voicing: { fifth: number; octave: number; filter: number } | null
): void {
  if (!ctx || !running || !filterNode) return;
  const v = voicing ?? DEFAULT_VOICING;
  const t = ctx.currentTime;
  filterNode.frequency.setTargetAtTime(v.filter, t, 1.6);
  nodes[1]?.frequency.setTargetAtTime(ROOT * v.fifth, t, 1.6);
  nodes[2]?.frequency.setTargetAtTime(ROOT * v.octave, t, 1.6);
}

export async function toggleAmbience(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (!running) {
    // flip synchronously — resume() can take hundreds of ms on iOS, and a
    // fast double-tap must read as on→off, not start twice
    running = true;
    if (!ctx) build();
    await ctx!.resume();
    if (!running) return false; // toggled back off while resume() was pending
    const t = ctx!.currentTime;
    master!.gain.cancelScheduledValues(t);
    master!.gain.setValueAtTime(master!.gain.value, t);
    master!.gain.linearRampToValueAtTime(LEVEL, t + 2.5);
  } else {
    const t = ctx!.currentTime;
    master!.gain.cancelScheduledValues(t);
    master!.gain.setValueAtTime(master!.gain.value, t);
    master!.gain.linearRampToValueAtTime(0, t + 1.6);
    running = false;
    setTimeout(() => {
      if (!running && ctx?.state === 'running') void ctx.suspend();
    }, 1800);
  }
  return running;
}
