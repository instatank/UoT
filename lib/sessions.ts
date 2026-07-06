import type { SessionData } from './types';
import anxietyFirstDate from '@/data/sessions/anxiety-first-date.json';
import angerReactivity from '@/data/sessions/anger-reactivity.json';
import burnout from '@/data/sessions/burnout.json';

export const sessions: SessionData[] = [
  anxietyFirstDate,
  angerReactivity,
  burnout,
] as SessionData[];

export function getSession(id: string): SessionData | undefined {
  return sessions.find((s) => s.id === id);
}
