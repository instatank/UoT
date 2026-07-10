'use client';

// The Voyage — the session as a first-person flight. You begin beside the
// complaint (a pale beacon above), descend to the mechanism (the sun the
// system turns on), fly between lineage worlds and are pulled into orbit
// around whichever you choose; landing opens that tradition's insight chamber
// in its own atmosphere. Once a real world has been visited the practice gate
// ignites far below; flying into it is arrival — the camera pulls back and
// the separate worlds resolve into one connected figure.
//
// Same state machine as the map lenses (useSessionState) — the Voyage is a
// presentation of the Descent arc, not a different session model. Decision 8's
// presentation half is deliberately amended here (AA, 2026-07-10): first-person
// navigation, but no scores, no objectives, no HUD clutter — arrival is still
// the only exit.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import type { CSSProperties } from 'react';
import type { NodeRef, Parallel, SessionData } from '@/lib/types';
import { useSessionState } from '@/lib/state';
import { tintAmbience, toggleAmbience } from '@/lib/ambience';
import {
  lineageAtmosphere,
  lineageColor,
  rejectedAtmosphere,
  rejectedColor,
} from '@/lib/lineage';
import { nodeSpeech, useVoice, voiceSupported } from '@/lib/voice';
import { mulberry32, seedFrom } from '@/lib/rand';
import { VoyageEngine, type VoyageTarget } from '@/lib/voyage/engine';
import { lineageWorldKind } from '@/lib/voyage/worlds';
import LineageGlyph from './LineageGlyph';
import Fold from './Fold';
import ArrivalOverlay from './ArrivalOverlay';

const COMPLAINT_COLOR = '#b9c3d6';
const GOLD = '#d8c98a';

function buildTargets(session: SessionData): {
  targets: VoyageTarget[];
  camPos: [number, number, number];
  lookAt: [number, number, number];
} {
  const rng = mulberry32(seedFrom(session.id));
  const N = session.parallels.length;
  const worlds: VoyageTarget[] = session.parallels.map((p, i) => {
    const ang = ((-90 + (360 / N) * i + (rng() - 0.5) * 24) * Math.PI) / 180;
    const rad = 320 + rng() * 70;
    const y = -50 + rng() * 120;
    const rejected = p.status === 'rejected';
    return {
      id: p.id,
      kind: 'world',
      pos: [Math.cos(ang) * rad, y, Math.sin(ang) * rad],
      r: 30,
      title: p.title,
      subtitle: p.lineage,
      color: rejected ? rejectedColor : lineageColor[p.lineage],
      worldKind: rejected ? 'rejected' : lineageWorldKind[p.lineage],
      present: true,
      active: false,
      dim: true,
      locked: false,
      visited: false,
    };
  });
  const targets: VoyageTarget[] = [
    {
      id: 'beacon',
      kind: 'beacon',
      pos: [0, 470, 160],
      r: 16,
      title: 'the complaint',
      subtitle: 'the surface',
      color: COMPLAINT_COLOR,
      present: true,
      active: true,
      dim: false,
      locked: false,
      visited: false,
    },
    {
      id: 'mechanism',
      kind: 'sun',
      pos: [0, 0, 0],
      r: 34,
      title: session.mechanism.name,
      subtitle: 'the mechanism',
      color: '#e8dcb0',
      present: true,
      active: false,
      dim: true,
      locked: false,
      visited: false,
    },
    ...worlds,
    {
      id: 'gate',
      kind: 'gate',
      pos: [0, -270, 40],
      r: 26,
      title: session.practice.name,
      subtitle: 'the practice gate · sealed',
      color: GOLD,
      present: true,
      active: true,
      dim: true,
      locked: true,
      visited: false,
    },
  ];
  return { targets, camPos: [0, 500, -140], lookAt: [0, 470, 160] };
}

function ListenPill({ session, refNode }: { session: SessionData; refNode: NodeRef }) {
  const { speaking, toggle, stop } = useVoice();
  const [ok, setOk] = useState(false);
  useEffect(() => setOk(voiceSupported()), []);
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

// ---------- the chamber: reading surface while in orbit ----------

function Chamber({
  session,
  refNode,
  practiceUnlocked,
  onDeepen,
  onSurface,
  onRelease,
}: {
  session: SessionData;
  refNode: NodeRef;
  practiceUnlocked: boolean;
  onDeepen: (parallelId: string) => void;
  onSurface: (parallelId: string) => void;
  onRelease: () => void;
}) {
  const innerRef = useRef<HTMLDivElement>(null);
  // reading focus enters the room with you; Escape releases orbit
  useEffect(() => {
    innerRef.current?.focus({ preventScroll: true });
  }, [refNode]);

  let body: React.ReactNode = null;
  let title = '';
  let head: React.ReactNode = null;
  let mark: React.ReactNode = null;

  if (refNode.kind === 'complaint') {
    title = `“${session.surfaceComplaint}”`;
    head = (
      <>
        <span className="pill">surface complaint</span>
        <span className="pill dim">{session.painCategory}</span>
      </>
    );
    body = (
      <>
        <p className="body-text">{session.complaintBody}</p>
        <p className="hint">Something is running underneath this. Release, and descend toward the light below.</p>
      </>
    );
  } else if (refNode.kind === 'mechanism') {
    const m = session.mechanism;
    title = m.name;
    head = (
      <>
        <span className="pill">mechanism</span>
        {m.provisional && <span className="pill dashed">provisional name</span>}
      </>
    );
    body = (
      <>
        <p className="body-text">{m.description}</p>
        <p className="hint">
          Worlds have surfaced around this sun — each lineage catches the same machine at a
          different joint. One of them only looks like it does.
        </p>
      </>
    );
  } else if (refNode.kind === 'parallel' || refNode.kind === 'deepening') {
    const pid = refNode.kind === 'parallel' ? refNode.id : refNode.parallelId;
    const p = session.parallels.find((x) => x.id === pid) as Parallel;
    const rejected = p.status === 'rejected';
    const color = rejected ? rejectedColor : lineageColor[p.lineage];
    mark = (
      <div className="chamber-mark" aria-hidden>
        <LineageGlyph lineage={p.lineage} size={300} color={color} />
      </div>
    );
    if (refNode.kind === 'parallel') {
      const cite = [p.source.author, p.source.work, p.source.locus].filter(Boolean).join(', ');
      title = p.title;
      head = (
        <>
          <span className="pill lineage" style={{ color, borderColor: color }}>
            <LineageGlyph lineage={p.lineage} size={13} color={color} />
            {p.lineage}
          </span>
          {rejected && <span className="pill ember">≉ it does not hold</span>}
        </>
      );
      body = (
        <>
          <p className="citation">
            {cite}
            {p.source.translationNote ? ` — ${p.source.translationNote}` : ''}
          </p>
          <blockquote className="passage" style={{ borderLeftColor: `${color}66` }}>
            {p.passage}
          </blockquote>
          <Fold label="the reading">
            <p className="reading">{p.reading}</p>
          </Fold>
          {rejected && p.rejectionReason && (
            <Fold label="why this world runs dry" defaultOpen tone="ember">
              <p>{p.rejectionReason}</p>
              <p className="hint">A mirage — it resembles the others from a distance. No thread leaves it.</p>
            </Fold>
          )}
          {!rejected && p.deepening && (
            <button className="pill action" onClick={() => onDeepen(p.id)}>
              go deeper into this world ↓
            </button>
          )}
        </>
      );
    } else {
      const d = p.deepening!;
      title = d.title;
      head = (
        <span className="pill lineage" style={{ color, borderColor: color }}>
          <LineageGlyph lineage={p.lineage} size={13} color={color} />
          deeper · {p.lineage}
        </span>
      );
      body = (
        <>
          <p className="body-text">{d.body}</p>
          <p className="hint">
            {practiceUnlocked
              ? 'Depth resolves. Far below the sun, a gate stands open.'
              : 'Depth resolves into practice once a world has truly landed.'}
          </p>
          <button className="pill action" onClick={() => onSurface(p.id)}>
            ↑ back to the surface of this world
          </button>
        </>
      );
    }
  }

  return (
    <div
      className="vchamber"
      key={JSON.stringify(refNode)}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={(e) => {
        // tapping the open space above the reading surface releases orbit
        if (e.target === e.currentTarget) onRelease();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onRelease();
      }}
    >
      <div className="vchamber-inner node-detail" ref={innerRef} tabIndex={-1}>
        {mark}
        <div className="pill-row">
          {head}
          <ListenPill session={session} refNode={refNode} />
        </div>
        <h2>{title}</h2>
        {body}
      </div>
      <button className="vrelease" onClick={onRelease}>
        ← release · return to space
      </button>
    </div>
  );
}

// ---------- the voyage ----------

export default function VoyageView({ session }: { session: SessionData }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<VoyageEngine | null>(null);
  const { state, practiceUnlocked, select, arrive } = useSessionState(session);
  const [chamber, setChamber] = useState<NodeRef | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [intro, setIntro] = useState(true);
  const [arrivalOpen, setArrivalOpen] = useState(false);
  const [ambience, setAmbience] = useState(false);
  const [reduced, setReduced] = useState(false);
  const hintTimer = useRef<number>(0);
  // engine callbacks read these refs — never stale
  const stateRef = useRef(state);
  stateRef.current = state;
  const arrivedRef = useRef(false);

  const say = useCallback((text: string | null, ms = 7000) => {
    window.clearTimeout(hintTimer.current);
    setHint(text);
    if (text && ms > 0) hintTimer.current = window.setTimeout(() => setHint(null), ms);
  }, []);

  const refFor = useCallback(
    (id: string): NodeRef | null => {
      if (id === 'beacon') return { kind: 'complaint' };
      if (id === 'mechanism') return { kind: 'mechanism' };
      if (session.parallels.some((p) => p.id === id)) return { kind: 'parallel', id };
      return null;
    },
    [session]
  );

  // engine lifecycle — once per mount
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setReduced(reduced);
    const { targets, camPos, lookAt } = buildTargets(session);
    const engine = new VoyageEngine(canvas, {
      onCapture: (id) => {
        if (id === 'gate') {
          if (arrivedRef.current) {
            // revisiting the gate after arrival re-opens the practice —
            // never strand the camera in a UI-less orbit
            setArrivalOpen(true);
            engine.release();
            return;
          }
          arrivedRef.current = true;
          arrive();
          const visitedAccepted = stateRef.current.visitedParallels.filter(
            (pid) => session.parallels.find((p) => p.id === pid)?.status === 'accepted'
          );
          say(null);
          setChamber(null);
          engine.reveal(visitedAccepted);
          return;
        }
        const ref = refFor(id);
        if (!ref) return;
        select(ref);
        setChamber(ref);
        if (ref.kind === 'parallel') {
          const p = session.parallels.find((x) => x.id === ref.id)!;
          tintAmbience(p.status === 'rejected' ? rejectedAtmosphere : lineageAtmosphere[p.lineage]);
        } else {
          tintAmbience(null);
        }
      },
      onHint: (h) => say(h),
      onLockedTap: () => say('the gate is sealed — a world must truly land first'),
      onRevealDone: () => setArrivalOpen(true),
    });
    engine.reducedMotion = reduced;
    engineRef.current = engine;
    engine.start(targets, camPos, lookAt);
    const onResize = () => engine.resize();
    window.addEventListener('resize', onResize);
    const introTimer = window.setTimeout(() => setIntro(false), reduced ? 400 : 3400);
    // test/dev hook — lets automation fly the ship deterministically
    (window as unknown as Record<string, unknown>).__voyageTravel = (id: string) =>
      engine.travelTo(id);
    (window as unknown as Record<string, unknown>).__voyageEngine = engine;
    return () => {
      window.removeEventListener('resize', onResize);
      window.clearTimeout(introTimer);
      window.clearTimeout(hintTimer.current);
      delete (window as unknown as Record<string, unknown>).__voyageTravel;
      delete (window as unknown as Record<string, unknown>).__voyageEngine;
      tintAmbience(null); // never leave the shared bed tinted to a chamber
      engine.dispose();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  // session arc → target states
  useEffect(() => {
    const e = engineRef.current;
    if (!e) return;
    e.patchTarget('beacon', { visited: state.complaintTouched });
    e.patchTarget('mechanism', {
      dim: !state.complaintTouched,
      active: state.complaintTouched,
      visited: state.mechanismRevealed,
    });
    for (const p of session.parallels) {
      e.patchTarget(p.id, {
        dim: !state.mechanismRevealed,
        active: state.mechanismRevealed,
        visited: state.visitedParallels.includes(p.id),
      });
    }
    e.patchTarget('gate', {
      dim: !practiceUnlocked,
      locked: !practiceUnlocked,
      subtitle: practiceUnlocked ? 'the practice gate — enter' : 'the practice gate · sealed',
    });
  }, [state, practiceUnlocked, session]);

  const releaseChamber = useCallback(() => {
    const wasKind = chamber?.kind;
    setChamber(null);
    tintAmbience(null);
    engineRef.current?.release();
    // the arc's quiet stage directions — reduced-motion users tap, not fly
    const s = stateRef.current;
    if (wasKind === 'complaint' && !s.mechanismRevealed)
      say(
        reduced
          ? 'something is running underneath — tap the light below'
          : 'something is running underneath — descend to the light below'
      );
    else if (wasKind === 'mechanism' && s.visitedParallels.length === 0)
      say(
        reduced
          ? 'worlds have surfaced around you — tap one to approach'
          : 'worlds have surfaced around you — fly to one'
      );
    else if (practiceUnlocked && !s.arrived)
      say(
        reduced
          ? 'far below the sun, a golden gate stands open — tap it'
          : 'far below the sun, a golden gate stands open'
      );
  }, [chamber, practiceUnlocked, reduced, say]);

  // first hint once the intro lifts
  useEffect(() => {
    if (!intro)
      say(
        reduced
          ? 'tap the pale light to approach it'
          : 'drag to look around · tap the pale light to approach it',
        9000
      );
  }, [intro, reduced, say]);

  // the atmosphere of the chamber currently open (null outside lineage rooms)
  const chamberAtmo = useMemo(() => {
    if (chamber?.kind === 'parallel' || chamber?.kind === 'deepening') {
      const pid = chamber.kind === 'parallel' ? chamber.id : chamber.parallelId;
      const p = session.parallels.find((x) => x.id === pid);
      if (p) return p.status === 'rejected' ? rejectedAtmosphere : lineageAtmosphere[p.lineage];
    }
    return null;
  }, [chamber, session]);

  const wash: CSSProperties = useMemo(
    () =>
      chamberAtmo
        ? ({ '--sel-wash': chamberAtmo.wash, '--sel-on': 1 } as CSSProperties)
        : ({ '--sel-wash': 'rgba(0,0,0,0)', '--sel-on': 0 } as CSSProperties),
    [chamberAtmo]
  );

  // targets the session arc has surfaced — the keyboard/screen-reader path
  const reachable = useMemo(() => {
    const list: { id: string; label: string }[] = [{ id: 'beacon', label: 'the complaint — the surface' }];
    if (state.complaintTouched)
      list.push({ id: 'mechanism', label: `${session.mechanism.name} — the mechanism` });
    if (state.mechanismRevealed)
      for (const p of session.parallels)
        list.push({
          id: p.id,
          label: `${p.title} — ${p.lineage}${p.status === 'rejected' ? ' (does not hold)' : ''}${
            state.visitedParallels.includes(p.id) ? ' (visited)' : ''
          }`,
        });
    if (practiceUnlocked && !state.arrived)
      list.push({ id: 'gate', label: `${session.practice.name} — the practice gate` });
    return list;
  }, [state, practiceUnlocked, session]);

  return (
    <div className="voyage" style={wash}>
      <canvas ref={canvasRef} className="voyage-canvas" aria-hidden />

      {/* the same space, navigable without a pointer — visually hidden */}
      <nav className="v-sr-nav" aria-label="Places in this voyage">
        {reachable.map((t) => (
          <button key={t.id} onClick={() => engineRef.current?.travelTo(t.id)}>
            travel to {t.label}
          </button>
        ))}
      </nav>

      <header className="vhud-top">
        <Link href="/" className="vhud-btn" title="the Atlas">
          ← atlas
        </Link>
        <span className="vhud-title">“{session.surfaceComplaint}”</span>
        <button
          className={`icon-btn${ambience ? ' active' : ''}`}
          aria-label={ambience ? 'Turn ambient sound off' : 'Turn ambient sound on'}
          aria-pressed={ambience}
          onClick={async () => {
            const on = await toggleAmbience();
            setAmbience(on);
            // switching on inside a chamber joins that room's voicing
            if (on && chamberAtmo) tintAmbience(chamberAtmo);
          }}
        >
          ♪
        </button>
        <Link href={`/session/${session.id}`} className="vhud-btn" title="bird's-eye lenses">
          ◈ bird&rsquo;s-eye
        </Link>
      </header>

      {/* permanently mounted so aria-live announcements actually fire */}
      <div className={`vhint${hint && !chamber ? '' : ' off'}`} aria-live="polite">
        {hint ?? ''}
      </div>

      {chamber && (
        <Chamber
          session={session}
          refNode={chamber}
          practiceUnlocked={practiceUnlocked}
          onDeepen={(pid) => {
            const ref: NodeRef = { kind: 'deepening', parallelId: pid };
            select(ref);
            setChamber(ref);
          }}
          onSurface={(pid) => {
            const ref: NodeRef = { kind: 'parallel', id: pid };
            select(ref);
            setChamber(ref);
          }}
          onRelease={releaseChamber}
        />
      )}

      {intro && (
        <div
          className="vintro"
          role="button"
          tabIndex={0}
          onClick={() => setIntro(false)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') setIntro(false);
          }}
        >
          <span className="eyebrow t1">{session.painCategory} · a voyage</span>
          <p className="threshold-quote t2">“{session.surfaceComplaint}”</p>
          <span className="threshold-hint t3">you are adrift above it — drag to look, tap to approach</span>
        </div>
      )}

      {state.arrived && arrivalOpen && (
        <ArrivalOverlay
          session={session}
          visited={state.visitedParallels}
          onDismiss={() => setArrivalOpen(false)}
        />
      )}
    </div>
  );
}
