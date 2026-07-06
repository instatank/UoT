// Constellation persistence stub — the cross-session memory layer is a future
// build; this only writes the minimal record a future Constellation view will
// consume. Nothing here is rendered as progression UI on purpose.

import type { PainCategory } from './types';

export interface ConstellationRecord {
  sessionId: string;
  painCategory: PainCategory;
  mechanismId: string;
  lineagePath: string[]; // ordered parallel IDs visited, rejected included
  practiceId: string;
  completedAt: string; // ISO 8601
}

const KEY = 'uot.constellation.v1';

export function loadSessionRecords(): ConstellationRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ConstellationRecord[]) : [];
  } catch {
    return [];
  }
}

export function saveSessionRecord(record: ConstellationRecord): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify([...loadSessionRecords(), record]));
  } catch {
    // localStorage unavailable (private mode etc.) — stub silently declines
  }
}
