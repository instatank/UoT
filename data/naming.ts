// Naming data for the Door — SANDBOX CONTENT, not Registry content.
// Recognition lines here are drafts in the ratified shape (2–3 first-person
// lines per mechanism, locked decision 13) written for the three seed
// sessions so the Door is feelable end-to-end. The real lines are Registry
// content and ship only after AA's gauntlet kill-pass; these retire with the
// seed sessions and never migrate.
//
// keywords[] feed the offline heuristic classifier only (lib/naming.ts) —
// they are plumbing, not content, and are never shown to the user.

import type { PainCategory } from '@/lib/types';

export interface NamingCandidate {
  mechanismId: string;
  sessionId: string;
  painCategory: PainCategory;
  recognitionLines: string[];
  keywords: string[];
}

export const namingCandidates: NamingCandidate[] = [
  {
    mechanismId: 'mech.anticipatory-self-surveillance',
    sessionId: 'anxiety-first-date',
    painCategory: 'Anxiety',
    recognitionLines: [
      'I rehearse conversations that haven’t happened yet.',
      'I’m both in the moment and grading my performance of it.',
      'I arrive at everything already exhausted by the version of it I invented.',
    ],
    keywords: [
      'anxious',
      'anxiety',
      'worry',
      'worried',
      'worrying',
      'nervous',
      'rehears',
      'overthink',
      'over-think',
      'date',
      'interview',
      'presentation',
      'meeting tomorrow',
      'dread',
      'what if',
      'scared',
      'panic',
      'spiral',
      'can’t stop thinking',
      "can't stop thinking",
    ],
  },
  {
    mechanismId: 'mech.assent-replay-amplification',
    sessionId: 'anger-reactivity',
    painCategory: 'Anger and Reactivity',
    recognitionLines: [
      'One comment can own my whole evening.',
      'I replay the insult with better comebacks, and it makes me angrier.',
      'The moment passed hours ago; I’m still in it.',
    ],
    keywords: [
      'angry',
      'anger',
      'furious',
      'rage',
      'mad at',
      'so mad',
      'insult',
      'comment',
      'replay',
      'snapped',
      'unfair',
      'disrespect',
      'resent',
      'seething',
      'argument',
      'fuming',
      'comeback',
    ],
  },
  {
    mechanismId: 'mech.worth-output-fusion',
    sessionId: 'burnout',
    painCategory: 'Burnout',
    recognitionLines: [
      'I can’t tell the difference between rest and quitting.',
      'I don’t care about the work anymore — and I still can’t stop doing it.',
      'Rest feels like falling behind.',
    ],
    keywords: [
      'burnout',
      'burned out',
      'burnt out',
      'exhausted',
      'drained',
      'numb',
      'unmotivated',
      'stopped caring',
      "can't care",
      'can’t care',
      'no energy',
      'tired all the time',
      'lazy',
      'falling behind',
      'productivity',
      'workaholic',
      'push through',
      'pushing through',
    ],
  },
];

// Category-level keywords for the seven categories with no seed session yet —
// so a miss can still be classified honestly ("your words sound like Grief
// and Loss; that territory isn't mapped yet") instead of silently dropped.
export const categoryKeywords: Partial<Record<PainCategory, string[]>> = {
  'Meaning Crisis': ['pointless', 'meaningless', 'empty', 'why bother', 'no purpose', 'what’s the point', "what's the point", 'hollow'],
  'Identity Confusion': ['who am i', 'who i am', 'imposter', 'impostor', 'fake', 'don’t know myself', "don't know myself", 'lost myself'],
  'Decision Paralysis': ['can’t decide', "can't decide", 'decision', 'choice', 'choices', 'paralyzed', 'options', 'commit to', 'fork in the road'],
  'Relationship Suffering': ['partner', 'wife', 'husband', 'boyfriend', 'girlfriend', 'marriage', 'relationship', 'breakup', 'break up', 'divorce'],
  'Grief and Loss': ['died', 'death', 'passed away', 'funeral', 'grief', 'grieving', 'mourning', 'miss her', 'miss him', 'miss them', 'lost my'],
  'Shame and Self-Judgment': ['ashamed', 'shame', 'hate myself', 'disgusted with myself', 'not good enough', 'worthless', 'failure', 'humiliat'],
  Disconnection: ['alone', 'lonely', 'disconnected', 'no one understands', 'distant from everyone', 'cut off', 'isolated'],
};
