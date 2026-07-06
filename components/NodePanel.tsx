'use client';

import type { NodeRef, SessionData } from '@/lib/types';
import type { SessionState } from '@/lib/state';
import { lineageColor, rejectedColor } from '@/lib/lineage';

interface Props {
  session: SessionData;
  state: SessionState;
  practiceUnlocked: boolean;
  onSelect: (ref: NodeRef) => void;
}

export default function NodePanel({ session, state, practiceUnlocked, onSelect }: Props) {
  const sel = state.selected;

  if (!sel) {
    return <p className="panel-empty">Begin at the surface — select the complaint.</p>;
  }

  if (sel.kind === 'complaint') {
    return (
      <div>
        <div className="kind">
          <span className="eyebrow">Surface complaint · {session.painCategory}</span>
        </div>
        <h2>“{session.surfaceComplaint}”</h2>
        <p className="body-text">{session.complaintBody}</p>
        <p className="hint">
          {state.mechanismRevealed
            ? 'The mechanism is on the map.'
            : 'Something is running underneath this. Select the mechanism when it surfaces.'}
        </p>
      </div>
    );
  }

  if (sel.kind === 'mechanism') {
    const m = session.mechanism;
    return (
      <div>
        <div className="kind">
          <span className="eyebrow">Mechanism</span>
          {m.provisional && <span className="prov">provisional name</span>}
        </div>
        <h2>{m.name}</h2>
        <p className="body-text">{m.description}</p>
        <p className="hint">
          The parallels have surfaced — each lineage catches this machine at a different joint. One
          of them only looks like it does.
        </p>
      </div>
    );
  }

  if (sel.kind === 'parallel') {
    const p = session.parallels.find((x) => x.id === sel.id)!;
    const rejected = p.status === 'rejected';
    const color = rejected ? rejectedColor : lineageColor[p.lineage];
    const cite = [p.source.author, p.source.work, p.source.locus].filter(Boolean).join(', ');
    return (
      <div>
        <div className="kind">
          <span className="eyebrow" style={{ color }}>
            {rejected ? 'Rejected parallel' : 'Parallel'} · {p.lineage}
          </span>
        </div>
        <h2>{p.title}</h2>
        <p className="citation">
          {cite}
          {p.source.translationNote ? ` — ${p.source.translationNote}` : ''}
        </p>
        <blockquote className="passage">{p.passage}</blockquote>
        <p className="reading">{p.reading}</p>
        {rejected && p.rejectionReason && (
          <div className="rejection">
            <span className="eyebrow">Why it doesn’t hold</span>
            <p>{p.rejectionReason}</p>
          </div>
        )}
        {!rejected && p.deepening && (
          <button
            className="deeper-btn"
            onClick={() => onSelect({ kind: 'deepening', parallelId: p.id })}
          >
            go deeper ↓
          </button>
        )}
        {rejected && (
          <p className="hint">Rejected parallels don’t deepen. This path ends here — by design.</p>
        )}
      </div>
    );
  }

  if (sel.kind === 'deepening') {
    const p = session.parallels.find((x) => x.id === sel.parallelId)!;
    const d = p.deepening!;
    return (
      <div>
        <div className="kind">
          <span className="eyebrow" style={{ color: lineageColor[p.lineage] }}>
            Deeper · {p.lineage} · {p.title}
          </span>
        </div>
        <h2>{d.title}</h2>
        <p className="body-text">{d.body}</p>
        <p className="hint">
          {practiceUnlocked
            ? 'Depth doesn’t branch forever here. The practice edge is open.'
            : 'Keep exploring — the practice edge opens once a parallel has landed.'}
        </p>
      </div>
    );
  }

  // practice — shown in panel after arrival, for revisiting
  const pr = session.practice;
  return (
    <div>
      <div className="kind">
        <span className="eyebrow" style={{ color: 'var(--gold)' }}>
          Practice
        </span>
      </div>
      <h2>{pr.name}</h2>
      {pr.durationMinutes && <p className="citation">~{pr.durationMinutes} minutes</p>}
      <ol className="steps">
        {pr.steps.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ol>
    </div>
  );
}
