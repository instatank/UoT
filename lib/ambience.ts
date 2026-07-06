'use client';

// A very quiet generated sound bed — two soft partials a fifth apart under a
// slow-breathing lowpass, faded in and out. WebAudio, no audio assets, starts
// only on user gesture (autoplay-safe). Atmosphere, not stimulation: constant,
// loopless, no rhythm, nothing to anticipate.

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let nodes: OscillatorNode[] = [];
let lfos: OscillatorNode[] = [];
let running = false;

const LEVEL = 0.028;

function build() {
  ctx = new (window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  master = ctx.createGain();
  master.gain.value = 0;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 340;
  filter.Q.value = 0.4;
  filter.connect(master);
  master.connect(ctx.destination);

  const partials: [number, number][] = [
    [96, 1], // root
    [144, 0.55], // fifth
    [192, 0.18], // octave shimmer
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

export async function toggleAmbience(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (!running) {
    if (!ctx) build();
    await ctx!.resume();
    const t = ctx!.currentTime;
    master!.gain.cancelScheduledValues(t);
    master!.gain.setValueAtTime(master!.gain.value, t);
    master!.gain.linearRampToValueAtTime(LEVEL, t + 2.5);
    running = true;
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
