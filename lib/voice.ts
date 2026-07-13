'use client';

// Listen module: reads node content aloud with the most human voice the
// device offers. Web Speech API, no backend, no assets.
//
// Voice character (AA, 2026-07-13, explicit): each lineage reads in its own
// human register — a warm woman here, an older measured man there — spoken
// slowly and sentence by sentence, consultative rather than mechanical. This
// deliberately amends the earlier single-neutral-voice stance *for variety of
// reading voice only*: these are still reading voices for curated text, never
// on-screen personas or authority figures (decision 7 holds — no gurus, no
// avatars; the register changes, the relationship doesn't).

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Lineage, NodeRef, SessionData } from './types';

export interface SpeakStyle {
  gender: 'f' | 'm' | 'any';
  rate: number;
  pitch: number;
  variant?: number; // rotate among the device's voices of that gender
}

export const defaultSpeakStyle: SpeakStyle = { gender: 'f', rate: 0.87, pitch: 0.97 };

// Registers per lineage — tuned for calm, not caricature.
export const lineageSpeakStyle: Record<Lineage, SpeakStyle> = {
  Stoicism: { gender: 'm', rate: 0.8, pitch: 0.8, variant: 0 }, // an older, measured voice
  Buddhism: { gender: 'f', rate: 0.83, pitch: 0.98, variant: 0 }, // warm, unhurried
  'Hindu/Gītā': { gender: 'm', rate: 0.86, pitch: 0.92, variant: 1 },
  Christianity: { gender: 'f', rate: 0.9, pitch: 1.07, variant: 1 }, // lighter, luminous
  Sufism: { gender: 'm', rate: 0.82, pitch: 0.88, variant: 2 },
  Taoism: { gender: 'f', rate: 0.8, pitch: 0.94, variant: 2 },
  'Neuroscience/Psychology': { gender: 'any', rate: 0.93, pitch: 1.0 }, // clear, present
};

// Known-decent voices, best first. Devices differ wildly; these are hints,
// not requirements — scoring falls back to any English voice.
const QUALITY_HINTS = [
  'natural', 'neural', 'premium', 'enhanced', 'siri',
  'samantha', 'karen', 'moira', 'tessa', 'serena', 'martha', 'aria', 'jenny',
  'libby', 'sonia', 'zira', 'susan', 'allison', 'ava', 'joanna', 'salli',
  'daniel', 'alex', 'oliver', 'ryan', 'guy', 'david', 'mark', 'arthur',
  'google uk english', 'google us english',
];

const FEMALE_HINTS = [
  'female', 'samantha', 'karen', 'moira', 'tessa', 'serena', 'martha', 'aria',
  'jenny', 'libby', 'sonia', 'zira', 'susan', 'allison', 'ava', 'joanna',
  'salli', 'victoria', 'kate', 'fiona', 'veena', 'catherine',
];
const MALE_HINTS = [
  'male', 'daniel', 'alex', 'oliver', 'ryan', 'guy', 'david', 'mark',
  'arthur', 'fred', 'gordon', 'lee', 'james', 'thomas', 'aaron',
];

let voiceCache: SpeechSynthesisVoice[] = [];

function refreshVoices(): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  const v = window.speechSynthesis.getVoices();
  if (v.length) voiceCache = v;
}

function genderOf(v: SpeechSynthesisVoice): 'f' | 'm' | 'any' {
  const n = v.name.toLowerCase();
  if (FEMALE_HINTS.some((h) => n.includes(h))) return 'f';
  if (MALE_HINTS.some((h) => n.includes(h))) return 'm';
  return 'any';
}

function qualityScore(v: SpeechSynthesisVoice): number {
  const n = v.name.toLowerCase();
  let s = 0;
  const idx = QUALITY_HINTS.findIndex((h) => n.includes(h));
  if (idx >= 0) s += (QUALITY_HINTS.length - idx) * 2;
  if (v.lang.toLowerCase().startsWith('en')) s += 20;
  if (v.localService) s += 3; // on-device voices tend to be the enhanced ones
  return s;
}

function pickVoice(style: SpeakStyle): SpeechSynthesisVoice | null {
  refreshVoices();
  if (!voiceCache.length) return null;
  const en = voiceCache.filter((v) => v.lang.toLowerCase().startsWith('en'));
  const pool = en.length ? en : voiceCache;
  const ranked = [...pool].sort((a, b) => qualityScore(b) - qualityScore(a));
  const matching = style.gender === 'any' ? ranked : ranked.filter((v) => genderOf(v) === style.gender);
  const source = matching.length ? matching : ranked;
  // rotate among the top few so lineages sharing a gender still differ
  const top = source.slice(0, Math.min(3, source.length));
  return top[(style.variant ?? 0) % top.length] ?? null;
}

/** Sentence-split for breathing room; also dodges Chrome's long-utterance
 * cutoff. Keeps citations attached to their sentence. */
function sentences(text: string): string[] {
  const parts = text
    .split(/(?<=[.?!…])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length ? parts : [text];
}

export function voiceSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function useVoice() {
  const [speaking, setSpeaking] = useState(false);
  const supported = useRef(false);
  const session = useRef(0); // stale utterance callbacks must not flip state

  useEffect(() => {
    supported.current = voiceSupported();
    if (supported.current) {
      refreshVoices();
      window.speechSynthesis.addEventListener?.('voiceschanged', refreshVoices);
    }
    return () => {
      if (supported.current) {
        window.speechSynthesis.removeEventListener?.('voiceschanged', refreshVoices);
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const stop = useCallback(() => {
    session.current++;
    if (supported.current) window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  const toggle = useCallback(
    (text: string, style: SpeakStyle = defaultSpeakStyle) => {
      if (!supported.current) return;
      if (window.speechSynthesis.speaking) {
        stop();
        return;
      }
      const id = ++session.current;
      const voice = pickVoice(style);
      const parts = sentences(text);
      parts.forEach((part, i) => {
        const u = new SpeechSynthesisUtterance(part);
        if (voice) u.voice = voice;
        u.rate = style.rate;
        u.pitch = style.pitch;
        if (i === parts.length - 1) {
          u.onend = () => {
            if (session.current === id) setSpeaking(false);
          };
        }
        u.onerror = () => {
          if (session.current === id) setSpeaking(false);
        };
        window.speechSynthesis.speak(u); // the API queues them — natural pauses between
      });
      setSpeaking(true);
    },
    [stop]
  );

  return { speaking, toggle, stop };
}

// What "listen" reads for each node — the full content, including anything
// visually collapsed. Voice is the low-text path through the same material.
export function nodeSpeech(session: SessionData, ref: NodeRef): string {
  if (ref.kind === 'complaint') {
    return `${session.surfaceComplaint}. ${session.complaintBody}`;
  }
  if (ref.kind === 'mechanism') {
    return `The mechanism. ${session.mechanism.name}. ${session.mechanism.description}`;
  }
  if (ref.kind === 'parallel') {
    const p = session.parallels.find((x) => x.id === ref.id)!;
    const cite = [p.source.author, p.source.work].filter(Boolean).join(', ');
    const base = `${p.title}. From ${cite}. ${p.passage} ${p.reading}`;
    return p.status === 'rejected' && p.rejectionReason
      ? `A rejected parallel. ${base} Why it doesn't hold: ${p.rejectionReason}`
      : base;
  }
  if (ref.kind === 'deepening') {
    const p = session.parallels.find((x) => x.id === ref.parallelId)!;
    return `${p.deepening!.title}. ${p.deepening!.body}`;
  }
  const pr = session.practice;
  return `The practice. ${pr.name}. ${pr.steps.join(' ')}`;
}

/** The register a node is read in — lineage voices for parallels, the
 * default warm reading voice everywhere else. */
export function nodeSpeakStyle(session: SessionData, ref: NodeRef): SpeakStyle {
  if (ref.kind === 'parallel' || ref.kind === 'deepening') {
    const pid = ref.kind === 'parallel' ? ref.id : ref.parallelId;
    const p = session.parallels.find((x) => x.id === pid);
    if (p) return lineageSpeakStyle[p.lineage];
  }
  return defaultSpeakStyle;
}

export function arrivalSpeech(session: SessionData): string {
  return `${session.payoff} The practice: ${session.practice.name}. ${session.practice.steps.join(' ')}`;
}
