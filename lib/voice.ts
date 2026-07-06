'use client';

// Listen module: reads node content aloud with the calmest voice the device
// offers. Deliberately neutral — a reading voice, not a persona (no guru
// figures on any surface). Web Speech API, no backend, no assets.

import { useCallback, useEffect, useRef, useState } from 'react';
import type { NodeRef, SessionData } from './types';

const PREFERRED = [
  'Samantha',
  'Karen',
  'Moira',
  'Daniel',
  'Google UK English Female',
  'Google US English',
];

function pickVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  for (const name of PREFERRED) {
    const v = voices.find((v) => v.name.includes(name));
    if (v) return v;
  }
  return voices.find((v) => v.lang.startsWith('en')) ?? voices[0] ?? null;
}

export function voiceSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function useVoice() {
  const [speaking, setSpeaking] = useState(false);
  const supported = useRef(false);

  useEffect(() => {
    supported.current = voiceSupported();
    if (supported.current) window.speechSynthesis.getVoices(); // warm the voice list
    return () => {
      if (supported.current) window.speechSynthesis.cancel();
    };
  }, []);

  const stop = useCallback(() => {
    if (supported.current) window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  const toggle = useCallback(
    (text: string) => {
      if (!supported.current) return;
      if (window.speechSynthesis.speaking) {
        stop();
        return;
      }
      const u = new SpeechSynthesisUtterance(text);
      const v = pickVoice();
      if (v) u.voice = v;
      u.rate = 0.88; // unhurried
      u.pitch = 0.95;
      u.onend = () => setSpeaking(false);
      u.onerror = () => setSpeaking(false);
      setSpeaking(true);
      window.speechSynthesis.speak(u);
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

export function arrivalSpeech(session: SessionData): string {
  return `${session.payoff} The practice: ${session.practice.name}. ${session.practice.steps.join(' ')}`;
}
