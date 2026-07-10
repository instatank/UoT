// Naming — shared classification logic for the Door (locked decision 11).
// Isomorphic on purpose: the API route uses it as the fallback when no model
// key is configured, and the client uses it again if the network fails, so
// the Door works end-to-end with zero backend.
//
// Trust boundary (PRODUCT.md §9.1): everything here CLASSIFIES into the fixed
// taxonomy — {painCategory, candidateMechanismIds, crisisFlag}. Nothing here
// (or in the model path) generates a sentence the user reads; recognition
// lines are looked up from curated data by ID.

import type { PainCategory } from './types';
import { categoryKeywords, namingCandidates } from '@/data/naming';

export interface NamingResult {
  painCategory: PainCategory | null;
  candidateMechanismIds: string[];
  crisisFlag: boolean;
  via: 'model' | 'heuristic';
}

// ---- crisis off-ramp (day-one floor, locked decision 11) ----
// This local list is the FLOOR, not the ceiling: when a model key is
// configured, the model classifies crisis too, and either signal trips the
// off-ramp. A false positive costs a calm screen with an easy way back —
// acceptable. A false negative costs more, so err toward tripping.
const CRISIS_PATTERNS: RegExp[] = [
  /suicid/i,
  /kill (myself|me|him|her|them|someone|somebody)/i,
  /(hurt|harm)(ing)? (myself|someone|somebody)/i,
  /self[- ]harm/i,
  /end (my|this) life/i,
  /end it all/i,
  /(don'?t|do not|doesn'?t) want to (live|be alive|exist|wake up)/i,
  /(no reason|nothing) (left )?to live/i,
  /better off (dead|without me)/i,
  /want(ing)? to die/i,
  /(cut|cutting) myself/i,
  /overdose/i,
];

export function detectCrisis(text: string): boolean {
  return CRISIS_PATTERNS.some((re) => re.test(text));
}

// ---- heuristic classifier ----

function countHits(haystack: string, needles: string[]): number {
  let n = 0;
  for (const k of needles) {
    // keywords must start at a word boundary but may grow a suffix
    // ("rehears" → "rehearsing"); plain substring matching false-positives
    // ("presentation" contains "resent")
    const re = new RegExp('\\b' + k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    if (re.test(haystack)) n++;
  }
  return n;
}

export function classifyHeuristically(
  text: string
): Pick<NamingResult, 'painCategory' | 'candidateMechanismIds'> {
  const lower = text.toLowerCase();

  const scored = namingCandidates
    .map((c) => ({ c, score: countHits(lower, c.keywords) }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length > 0) {
    return {
      painCategory: scored[0].c.painCategory,
      candidateMechanismIds: scored.slice(0, 3).map((s) => s.c.mechanismId),
    };
  }

  // No mechanism match — try to at least name the category honestly.
  let best: { cat: PainCategory; score: number } | null = null;
  for (const [cat, words] of Object.entries(categoryKeywords)) {
    const score = countHits(lower, words as string[]);
    if (score > 0 && (!best || score > best.score)) best = { cat: cat as PainCategory, score };
  }
  return { painCategory: best?.cat ?? null, candidateMechanismIds: [] };
}

// ---- miss log (taxonomy feedback, locked decision 11) ----
// Local-only: repeated misses in a category = a missing mechanism. Never
// called on crisis-flagged text — that text is not feedback, and not ours.

export interface NamingMiss {
  kind: 'none-of-these' | 'no-match';
  text: string;
  painCategory: PainCategory | null;
  candidateMechanismIds: string[];
  at: string; // ISO 8601
}

const MISS_KEY = 'uot.naming-misses.v1';

export function loadNamingMisses(): NamingMiss[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(MISS_KEY);
    return raw ? (JSON.parse(raw) as NamingMiss[]) : [];
  } catch {
    return [];
  }
}

export function logNamingMiss(miss: Omit<NamingMiss, 'at'>): void {
  if (typeof window === 'undefined') return;
  try {
    const all = [...loadNamingMisses(), { ...miss, at: new Date().toISOString() }];
    window.localStorage.setItem(MISS_KEY, JSON.stringify(all));
  } catch {
    // localStorage unavailable — feedback quietly declines
  }
}
