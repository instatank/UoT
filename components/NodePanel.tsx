'use client';

import { useEffect, useState } from 'react';
import type { NodeRef, SessionData } from '@/lib/types';
import type { SessionState } from '@/lib/state';
import { lineageColor, rejectedColor } from '@/lib/lineage';
import { nodeSpeech, useVoice, voiceSupported } from '@/lib/voice';
import LineageGlyph from './LineageGlyph';
import Fold from './Fold';

interface Props {
  session: SessionData;
  state: SessionState;
  practiceUnlocked: boolean;
  onSelect: (ref: NodeRef) => void;
}

function ListenPill({ session, refNode }: { session: SessionData; refNode: NodeRef }) {
  const { speaking, toggle, stop } = useVoice();
  const [ok, setOk] = useState(false);
  useEffect(() => setOk(voiceSupported()), []);
  // a new selection interrupts the old reading
  useEffect(() => {
    stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refNode]);
  if (!ok) return null;
  return (
    <button
      className={`pill listen${speaking ? ' on' : ''}`}
      onClick={() => toggle(nodeSpeech(session, refNode))}
      aria-pressed={speaking}
    >
      {speaking ? '◼ stop' : '▷ listen'}
    </button>
  );
}

export default function NodePanel({ session, state, practiceUnlocked, onSelect }: Props) {
  const sel = state.selected;

  if (!sel) {
    return (
      <div className="panel-empty">
        <p>Begin at the surface —</p>
        <p>select the complaint.</p>
      </div>
    );
  }

  if (sel.kind === 'complaint') {
    return (
      <div className="node-detail" key="complaint">
        <div className="pill-row">
          <span className="pill">surface complaint</span>
          <span className="pill dim">{session.painCategory}</span>
          <ListenPill session={session} refNode={sel} />
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
      <div className="node-detail" key="mechanism">
        <div className="pill-row">
          <span className="pill">mechanism</span>
          {m.provisional && <span className="pill dashed">provisional name</span>}
          <ListenPill session={session} refNode={sel} />
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
      <div className="node-detail chamber" key={p.id}>
        {/* the room you're standing in — the lineage's seal, faint and large */}
        <div className="chamber-mark" aria-hidden>
          <LineageGlyph lineage={p.lineage} size={270} color={color} />
        </div>
        <div className="pill-row">
          <span className="pill lineage" style={{ color, borderColor: color }}>
            <LineageGlyph lineage={p.lineage} size={13} color={color} />
            {p.lineage}
          </span>
          {rejected && <span className="pill ember">≉ rejected</span>}
          <ListenPill session={session} refNode={sel} />
        </div>
        <h2>{p.title}</h2>
        <p className="citation">
          {cite}
          {p.source.translationNote ? ` — ${p.source.translationNote}` : ''}
        </p>
        <blockquote className="passage" style={{ borderLeftColor: `${color}66` }}>
          {p.passage}
        </blockquote>
        <Fold label="the reading" defaultOpen={false}>
          <p className="reading">{p.reading}</p>
        </Fold>
        {rejected && p.rejectionReason && (
          <Fold label="why it doesn’t hold" defaultOpen tone="ember">
            <p>{p.rejectionReason}</p>
            <p className="hint">Rejected parallels don’t deepen. This path ends here — by design.</p>
          </Fold>
        )}
        {!rejected && p.deepening && (
          <button
            className="pill action"
            onClick={() => onSelect({ kind: 'deepening', parallelId: p.id })}
          >
            go deeper ↓
          </button>
        )}
      </div>
    );
  }

  if (sel.kind === 'deepening') {
    const p = session.parallels.find((x) => x.id === sel.parallelId)!;
    const d = p.deepening!;
    return (
      <div className="node-detail chamber" key={d.id}>
        <div className="chamber-mark" aria-hidden>
          <LineageGlyph lineage={p.lineage} size={270} color={lineageColor[p.lineage]} />
        </div>
        <div className="pill-row">
          <span
            className="pill lineage"
            style={{ color: lineageColor[p.lineage], borderColor: lineageColor[p.lineage] }}
          >
            <LineageGlyph lineage={p.lineage} size={13} color={lineageColor[p.lineage]} />
            deeper · {p.lineage}
          </span>
          <ListenPill session={session} refNode={sel} />
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
    <div className="node-detail" key="practice">
      <div className="pill-row">
        <span className="pill gold">practice</span>
        {pr.durationMinutes && <span className="pill dim">~{pr.durationMinutes} min</span>}
        <ListenPill session={session} refNode={sel} />
      </div>
      <h2>{pr.name}</h2>
      <ol className="steps">
        {pr.steps.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ol>
      {(session.alternatePractices?.length ?? 0) > 0 && (
        <Fold label="another way">
          {session.alternatePractices!.slice(0, 2).map((alt) => (
            <div key={alt.id} className="alt-practice">
              <h4>{alt.name}</h4>
              {alt.durationMinutes && <p className="duration">~{alt.durationMinutes} min</p>}
              <ol className="steps">
                {alt.steps.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
            </div>
          ))}
        </Fold>
      )}
    </div>
  );
}
