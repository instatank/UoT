// Schema types — prototype of the Truth Registry node shape. Documented in data/SCHEMA.md.

export type PainCategory =
  | 'Anxiety'
  | 'Burnout'
  | 'Meaning Crisis'
  | 'Identity Confusion'
  | 'Decision Paralysis'
  | 'Relationship Suffering'
  | 'Anger and Reactivity'
  | 'Grief and Loss'
  | 'Shame and Self-Judgment'
  | 'Disconnection';

export type Lineage =
  | 'Stoicism'
  | 'Buddhism'
  | 'Hindu/Gītā'
  | 'Christianity'
  | 'Sufism'
  | 'Taoism'
  | 'Neuroscience/Psychology';

export interface SourceRef {
  work: string;
  author?: string;
  locus?: string;
  translationNote?: string;
}

export interface Deepening {
  id: string;
  title: string;
  body: string;
}

export interface Parallel {
  id: string;
  lineage: Lineage;
  status: 'accepted' | 'rejected';
  title: string;
  source: SourceRef;
  passage: string;
  reading: string;
  deepening?: Deepening; // rejected parallels never deepen — dead ends by design
  rejectionReason?: string; // required iff status === 'rejected'
}

export interface Mechanism {
  id: string; // mech.* — provisional; real mechanism taxonomy doesn't exist yet
  name: string;
  provisional: boolean;
  description: string;
}

export interface Practice {
  id: string; // prac.*
  name: string;
  steps: string[];
  durationMinutes?: number;
}

export interface SessionData {
  schemaVersion: 1;
  id: string;
  painCategory: PainCategory;
  surfaceComplaint: string;
  complaintBody: string;
  mechanism: Mechanism;
  parallels: Parallel[];
  payoff: string;
  practice: Practice;
}

// A reference to a node on the map — the shared currency between geometries,
// session state, and the detail panel.
export type NodeRef =
  | { kind: 'complaint' }
  | { kind: 'mechanism' }
  | { kind: 'parallel'; id: string }
  | { kind: 'deepening'; parallelId: string }
  | { kind: 'practice' };

export function sameNode(a: NodeRef | null, b: NodeRef): boolean {
  if (!a || a.kind !== b.kind) return false;
  if (a.kind === 'parallel' && b.kind === 'parallel') return a.id === b.id;
  if (a.kind === 'deepening' && b.kind === 'deepening') return a.parallelId === b.parallelId;
  return true;
}
