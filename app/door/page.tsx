'use client';

// The Door — the ratified cold start (locked decision 11; PRODUCT.md §5.1–5.2,
// §8.1). Two ways in: "Say it" (free text, the user's own words) and "the ten
// pains" (browse). Free text is classified — never answered — into the fixed
// taxonomy; the user picks the recognition line that stings, and the pick is
// the naming. "None of these" always exists and is logged as taxonomy
// feedback. Crisis signals bypass everything and land on the off-ramp.
//
// The Door never asks who you are or what you believe. Pain is the entrance.
//
// Sandbox wiring: candidates map to the three seed sessions; the user's own
// words becoming the surface-complaint node of a live Descent is Phase 3 work
// (needs Descents compiled from the Registry, not fixed seed JSON).

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { PainCategory } from '@/lib/types';
import { doorsEnabled } from '@/lib/flags';
import { namingCandidates } from '@/data/naming';
import {
  classifyHeuristically,
  detectCrisis,
  loadNamingMisses,
  logNamingMiss,
  type NamingResult,
} from '@/lib/naming';
import { sessions } from '@/lib/sessions';
import CrisisOfframp from '@/components/CrisisOfframp';

const PAIN_CATEGORIES: PainCategory[] = [
  'Anxiety',
  'Burnout',
  'Meaning Crisis',
  'Identity Confusion',
  'Decision Paralysis',
  'Relationship Suffering',
  'Anger and Reactivity',
  'Grief and Loss',
  'Shame and Self-Judgment',
  'Disconnection',
];

type Stage = 'door' | 'naming' | 'browse' | 'crisis';

function MissCount() {
  const [n, setN] = useState<number | null>(null);
  useEffect(() => setN(loadNamingMisses().length), []);
  if (!n) return null;
  return (
    <p className="door-devnote">
      Naming misses logged: {n} (`uot.naming-misses.v1`) — taxonomy feedback for the gauntlet.
    </p>
  );
}

export default function DoorPage() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>('door');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<NamingResult | null>(null);

  const candidates = useMemo(() => {
    const ids = result?.candidateMechanismIds ?? [];
    return ids
      .map((id) => namingCandidates.find((c) => c.mechanismId === id))
      .filter((c): c is NonNullable<typeof c> => Boolean(c));
  }, [result]);

  if (!doorsEnabled) {
    return (
      <main className="door-page">
        <span className="eyebrow">The Door</span>
        <h1>Behind a flag.</h1>
        <p className="sub">
          The ratified cold-start flow is built but gated — set <code>NEXT_PUBLIC_DOORS=1</code>{' '}
          (it&rsquo;s always on in dev). The sandbox home is unchanged until Phase 3.
        </p>
        <p>
          <Link className="door-back" href="/">
            ← back to the sandbox
          </Link>
        </p>
      </main>
    );
  }

  const submit = async () => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    // Crisis floor runs client-side first: the off-ramp must work with the
    // network down, and crisis text should ideally not leave the device.
    if (detectCrisis(trimmed)) {
      setStage('crisis');
      return;
    }
    setBusy(true);
    let r: NamingResult;
    try {
      const res = await fetch('/api/naming', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text: trimmed }),
      });
      if (!res.ok) throw new Error(String(res.status));
      r = (await res.json()) as NamingResult;
    } catch {
      r = { ...classifyHeuristically(trimmed), crisisFlag: false, via: 'heuristic' };
    }
    setBusy(false);
    setResult(r);
    if (r.crisisFlag) {
      setStage('crisis');
    } else if (r.candidateMechanismIds.length === 0) {
      logNamingMiss({
        kind: 'no-match',
        text: trimmed,
        painCategory: r.painCategory,
        candidateMechanismIds: [],
      });
      setStage('browse');
    } else {
      setStage('naming');
    }
  };

  const noneOfThese = () => {
    logNamingMiss({
      kind: 'none-of-these',
      text: text.trim(),
      painCategory: result?.painCategory ?? null,
      candidateMechanismIds: result?.candidateMechanismIds ?? [],
    });
    setStage('browse');
  };

  if (stage === 'crisis') {
    return (
      <main className="door-page">
        <CrisisOfframp onBack={() => setStage('door')} />
      </main>
    );
  }

  if (stage === 'naming') {
    return (
      <main className="door-page">
        <span className="eyebrow">The Naming</span>
        <blockquote className="door-echo">“{text.trim()}”</blockquote>
        <p className="sub">Underneath that, one of these might be running. Pick the one that stings.</p>
        <div className="naming-cards">
          {candidates.map((c) => (
            <button
              key={c.mechanismId}
              className="naming-card"
              onClick={() => router.push(`/session/${c.sessionId}`)}
            >
              <span className="line">“{c.recognitionLines[0]}”</span>
              <span className="naming-sub">
                <span className="pill dim">{c.painCategory}</span>
              </span>
            </button>
          ))}
          <button className="naming-none" onClick={noneOfThese}>
            none of these →
          </button>
        </div>
        <p className="door-foot-note">
          Nothing here was written for you by a machine — these lines are curated, and your words
          only chose among them.
        </p>
      </main>
    );
  }

  if (stage === 'browse') {
    const hinted = result?.painCategory ?? null;
    return (
      <main className="door-page">
        <span className="eyebrow">The ten pains</span>
        <h1>Where does it hurt?</h1>
        {hinted && !sessions.some((s) => s.painCategory === hinted) && (
          <p className="sub">
            Your words sounded like <strong>{hinted}</strong> — that territory isn&rsquo;t mapped
            yet. The taxonomy is being built; the miss is recorded and counts.
          </p>
        )}
        <div className="browse-list">
          {PAIN_CATEGORIES.map((cat) => {
            const session = sessions.find((s) => s.painCategory === cat);
            if (session) {
              return (
                <Link
                  key={cat}
                  href={`/session/${session.id}`}
                  className={`browse-row${hinted === cat ? ' hinted' : ''}`}
                >
                  <span className="browse-cat">{cat}</span>
                  <span className="browse-complaint">“{session.surfaceComplaint}”</span>
                </Link>
              );
            }
            return (
              <div key={cat} className={`browse-row dim${hinted === cat ? ' hinted' : ''}`}>
                <span className="browse-cat">{cat}</span>
                <span className="browse-complaint">not yet mapped — Phase 1 territory</span>
              </div>
            );
          })}
        </div>
        <button className="door-back" onClick={() => setStage('door')}>
          ← say it instead
        </button>
      </main>
    );
  }

  return (
    <main className="door-page">
      <span className="eyebrow">The Door</span>
      <h1>What hurts, right now?</h1>
      <p className="sub">
        No name, no beliefs, no intake form. Pain is the entrance — everyone walks in through the
        same door.
      </p>
      <textarea
        className="door-say"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Say it the way you’d say it to a friend at 2am."
        rows={4}
      />
      <div className="door-actions">
        <button className="door-submit" onClick={submit} disabled={!text.trim() || busy}>
          {busy ? 'listening…' : 'name it →'}
        </button>
      </div>
      <div className="door-or" aria-hidden>
        <span>or</span>
      </div>
      <button className="door-browse" onClick={() => setStage('browse')}>
        browse the ten pains →
      </button>
      <div className="home-foot">
        <p>
          The Door is the ratified cold start (decision 11), wired to the three seed sessions.
          Free text is classified into the fixed taxonomy — never generated against (
          {'“'}the LLM shapes the journey; only the Registry speaks{'”'}).
        </p>
        <MissCount />
      </div>
    </main>
  );
}
