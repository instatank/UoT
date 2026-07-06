'use client';

import { useCallback, useMemo, useState } from 'react';
import type { NodeRef, SessionData } from './types';
import { saveSessionRecord } from './constellation';

// The shared session state machine. All three geometries render this state;
// none of them own any exploration state of their own, so switching geometry
// mid-session preserves progress exactly.
export interface SessionState {
  complaintTouched: boolean;
  mechanismRevealed: boolean;
  visitedParallels: string[]; // ordered visit log, rejected included
  visitedDeepenings: string[];
  selected: NodeRef | null;
  arrived: boolean;
}

export interface SessionController {
  state: SessionState;
  practiceUnlocked: boolean;
  select: (ref: NodeRef) => void;
  arrive: () => void;
  dismissArrival: () => void;
}

export function useSessionState(session: SessionData): SessionController {
  const [state, setState] = useState<SessionState>({
    complaintTouched: false,
    mechanismRevealed: false,
    visitedParallels: [],
    visitedDeepenings: [],
    selected: null,
    arrived: false,
  });

  const practiceUnlocked =
    state.mechanismRevealed &&
    state.visitedParallels.some(
      (id) => session.parallels.find((p) => p.id === id)?.status === 'accepted'
    );

  const select = useCallback((ref: NodeRef) => {
    setState((s) => {
      const next = { ...s, selected: ref };
      if (ref.kind === 'complaint') next.complaintTouched = true;
      if (ref.kind === 'mechanism') next.mechanismRevealed = true;
      if (ref.kind === 'parallel' && !s.visitedParallels.includes(ref.id)) {
        next.visitedParallels = [...s.visitedParallels, ref.id];
      }
      if (ref.kind === 'deepening' && !s.visitedDeepenings.includes(ref.parallelId)) {
        next.visitedDeepenings = [...s.visitedDeepenings, ref.parallelId];
      }
      return next;
    });
  }, []);

  const arrive = useCallback(() => {
    setState((s) => {
      if (!s.arrived) {
        saveSessionRecord({
          sessionId: session.id,
          painCategory: session.painCategory,
          mechanismId: session.mechanism.id,
          lineagePath: s.visitedParallels,
          practiceId: session.practice.id,
          completedAt: new Date().toISOString(),
        });
      }
      return { ...s, arrived: true, selected: { kind: 'practice' } };
    });
  }, [session]);

  const dismissArrival = useCallback(() => {
    setState((s) => ({ ...s, selected: null }));
  }, []);

  return useMemo(
    () => ({ state, practiceUnlocked, select, arrive, dismissArrival }),
    [state, practiceUnlocked, select, arrive, dismissArrival]
  );
}
