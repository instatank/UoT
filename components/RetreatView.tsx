'use client';

// The Retreat — the session as a walk through a mountain valley at golden
// hour. You arrive at a trailhead arch (the complaint), follow the worn path
// down to a spring in the meadow (the mechanism), visit the sites that wake
// around it (parallels — the rejected one a dry hollow whose ember gutters),
// and when a place has truly landed, the jetty lanterns light and the walk
// ends over water. Arrival is dusk falling and the camera rising to see the
// whole figure you walked.
//
// Same state machine as the maps and the Voyage (useSessionState) — a fifth
// presentation of the Descent arc, not a different session model. Decision 8's
// presentation half (first-person navigation, AA 2026-07-10) extends here:
// no scores, no objectives, no HUD clutter — arrival is still the only exit.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import type { CSSProperties } from 'react';
import type { Lineage, NodeRef, Parallel, SessionData } from '@/lib/types';
import { useSessionState } from '@/lib/state';
import {
  lineageAtmosphere,
  lineageColor,
  rejectedAtmosphere,
  rejectedColor,
} from '@/lib/lineage';
import { nodeSpeech, useVoice, voiceSupported } from '@/lib/voice';
import { seedFrom } from '@/lib/rand';
import {
  RetreatEngine,
  type RetreatSpot,
  type SiteKind,
} from '@/lib/retreat/engine';
import {
  disposeNature,
  duskNature,
  setLakeCloseness,
  step as natureStep,
  tintNature,
  toggleNature,
} from '@/lib/retreat/nature';
import LineageGlyph from './LineageGlyph';
import Fold from './Fold';
import ArrivalOverlay from './ArrivalOverlay';

const GOLD = '#d8c98a';
const COMPLAINT_COLOR = '#cdd3dd';

const siteKindFor: Record<Lineage, SiteKind> = {
  Stoicism: 'stoa',
  Buddhism: 'stupa',
  'Hindu/Gītā': 'flame',
  Christianity: 'arch',
  Sufism: 'circle',
  Taoism: 'pool',
  'Neuroscience/Psychology': 'deck',
};

function buildSpots(session: SessionData): RetreatSpot[] {
  const sites: RetreatSpot[] = session.parallels.map((p) => {
    const rejected = p.status === 'rejected';
    return {
      id: p.id,
      kind: rejected ? 'hollow' : siteKindFor[p.lineage],
      title: p.title,
      subtitle: p.lineage,
      color: rejected ? rejectedColor : lineageColor[p.lineage],
      active: false,
      lit: false,
      visited: false,
    };
  });
  return [
    {
      id: 'trailhead',
      kind: 'trailhead',
      title: 'the trailhead',
      subtitle: 'the surface',
      color: COMPLAINT_COLOR,
      active: true,
      lit: true,
      cue: true,
      visited: false,
    },
    {
      id: 'mechanism',
      kind: 'spring',
      title: session.mechanism.name,
      subtitle: 'the spring · the mechanism',
      color: '#e8dcb0',
      active: false,
      lit: false,
      visited: false,
    },
    ...sites,
    {
      id: 'jetty',
      kind: 'jetty',
      title: session.practice.name,
      subtitle: 'the jetty · dark',
      color: GOLD,
      active: true,
      lit: false,
      locked: true,
      visited: false,
    },
  ];
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

// ---------- the resting place: reading at a site ----------

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
        <p className="hint">
          You carried this through the arch with you. Something runs beneath it — the path leads
          down to a spring.
        </p>
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
          This is the water under the complaint. Places have woken around the meadow — each
          tradition built beside the same spring. One of them only looks like it did.
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
            <Fold label="why this basin ran dry" defaultOpen tone="ember">
              <p>{p.rejectionReason}</p>
              <p className="hint">
                From across the meadow it looked like the others. Stand here and the basin is
                cracked — no water reaches it.
              </p>
            </Fold>
          )}
          {!rejected && p.deepening && (
            <button className="pill action" onClick={() => onDeepen(p.id)}>
              stay a while longer ↓
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
              ? 'Depth resolves. Down at the shore, the jetty lanterns are burning.'
              : 'Depth resolves into practice once a place has truly landed.'}
          </p>
          <button className="pill action" onClick={() => onSurface(p.id)}>
            ↑ back to this place
          </button>
        </>
      );
    }
  }

  return (
    <div
      className="vchamber retreat-chamber"
      key={JSON.stringify(refNode)}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={(e) => {
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
        ← stand up · walk on
      </button>
    </div>
  );
}

// ---------- the retreat ----------

export default function RetreatView({ session }: { session: SessionData }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const labelRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<RetreatEngine | null>(null);
  const { state, practiceUnlocked, select, arrive } = useSessionState(session);
  const [chamber, setChamber] = useState<NodeRef | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [intro, setIntro] = useState(true);
  const [arrivalOpen, setArrivalOpen] = useState(false);
  const [ambience, setAmbience] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [glFailed, setGlFailed] = useState(false);
  const hintTimer = useRef<number>(0);
  const stateRef = useRef(state);
  stateRef.current = state;
  const arrivedRef = useRef(false);
  const jettyOriented = useRef(false);

  const say = useCallback((text: string | null, ms = 7000) => {
    window.clearTimeout(hintTimer.current);
    setHint(text);
    if (text && ms > 0) hintTimer.current = window.setTimeout(() => setHint(null), ms);
  }, []);

  const refFor = useCallback(
    (id: string): NodeRef | null => {
      if (id === 'trailhead') return { kind: 'complaint' };
      if (id === 'mechanism') return { kind: 'mechanism' };
      if (session.parallels.some((p) => p.id === id)) return { kind: 'parallel', id };
      return null;
    },
    [session]
  );

  // engine lifecycle — once per mount
  useEffect(() => {
    const canvas = canvasRef.current;
    const labels = labelRef.current;
    if (!canvas || !labels) return;
    const reducedNow = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setReduced(reducedNow);
    const spots = buildSpots(session);
    let engine: RetreatEngine;
    try {
      engine = new RetreatEngine(canvas, labels, {
        onCapture: (id) => {
          if (id === 'jetty') {
            if (arrivedRef.current) {
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
            duskNature();
            engine.reveal(visitedAccepted);
            return;
          }
          const ref = refFor(id);
          if (!ref) return;
          say(null);
          select(ref);
          setChamber(ref);
          if (ref.kind === 'parallel') {
            const p = session.parallels.find((x) => x.id === ref.id)!;
            tintNature(p.status === 'rejected' ? rejectedAtmosphere : lineageAtmosphere[p.lineage]);
          } else {
            tintNature(null);
          }
        },
        onHint: (h) => say(h),
        onLockedTap: () =>
          say('the jetty is dark — a place must truly land before the water', 7000),
        onRevealDone: () => setArrivalOpen(true),
        onStep: () => natureStep(),
        onLakeCloseness: (k) => setLakeCloseness(k),
      });
    } catch {
      // WebGL unavailable (old device, disabled) — offer the other doors in
      setGlFailed(true);
      return;
    }
    engine.reducedMotion = reducedNow;
    engineRef.current = engine;
    engine.start(spots, seedFrom(session.id));
    const onResize = () => engine.resize();
    window.addEventListener('resize', onResize);
    const introTimer = window.setTimeout(() => setIntro(false), reducedNow ? 400 : 3400);
    // test/dev hook — lets automation walk deterministically
    (window as unknown as Record<string, unknown>).__retreatWalk = (id: string) =>
      engine.walkToSpot(id);
    (window as unknown as Record<string, unknown>).__retreatEngine = engine;
    return () => {
      window.removeEventListener('resize', onResize);
      window.clearTimeout(introTimer);
      window.clearTimeout(hintTimer.current);
      delete (window as unknown as Record<string, unknown>).__retreatWalk;
      delete (window as unknown as Record<string, unknown>).__retreatEngine;
      disposeNature();
      engine.dispose();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  // session arc → spot states (lanterns light as the arc surfaces places)
  useEffect(() => {
    const e = engineRef.current;
    if (!e) return;
    e.patchSpot('trailhead', {
      visited: state.complaintTouched,
      cue: !state.complaintTouched,
    });
    e.patchSpot('mechanism', {
      active: state.complaintTouched,
      lit: state.complaintTouched,
      visited: state.mechanismRevealed,
      cue: state.complaintTouched && !state.mechanismRevealed,
    });
    for (const p of session.parallels) {
      e.patchSpot(p.id, {
        active: state.mechanismRevealed,
        lit: state.mechanismRevealed,
        visited: state.visitedParallels.includes(p.id),
      });
    }
    e.patchSpot('jetty', {
      lit: practiceUnlocked,
      locked: !practiceUnlocked,
      cue: practiceUnlocked && !state.arrived,
      subtitle: practiceUnlocked ? 'the jetty — lanterns lit' : 'the jetty · dark',
    });
    // the day leans on as the session deepens — time passing, not a reward
    let phase = 0.12;
    if (state.complaintTouched) phase = 0.2;
    if (state.mechanismRevealed) phase = 0.32;
    phase += Math.min(state.visitedParallels.length * 0.08, 0.32);
    if (practiceUnlocked) phase = Math.max(phase, 0.7);
    if (state.arrived) phase = 1;
    e.setDayPhase(phase);
  }, [state, practiceUnlocked, session]);

  const releaseChamber = useCallback(() => {
    const wasKind = chamber?.kind;
    setChamber(null);
    tintNature(null);
    const e = engineRef.current;
    e?.release();
    // stage directions: the gaze settles onto what the arc opened next, and
    // the hint stays until acted on (the Voyage lesson — flashes find no one)
    const s = stateRef.current;
    if (wasKind === 'complaint' && !s.mechanismRevealed) {
      const p = e?.getSpotPos('mechanism');
      if (p) e?.orientToward(p);
      say(
        reduced
          ? 'something runs beneath this — tap the spring in the meadow below'
          : 'something runs beneath this — follow the path down to the spring',
        0
      );
    } else if (wasKind === 'mechanism' && s.visitedParallels.length === 0) {
      const first = session.parallels[0];
      const p = first ? e?.getSpotPos(first.id) : null;
      if (p) e?.orientToward(p);
      say(
        reduced
          ? 'places have woken around the meadow — tap one to walk there'
          : 'places have woken around the meadow — walk to one, or let ◉ carry you',
        0
      );
    } else if (practiceUnlocked && !s.arrived) {
      if (!jettyOriented.current) {
        jettyOriented.current = true;
        const p = e?.getSpotPos('jetty');
        if (p) e?.orientToward(p);
        say(
          reduced
            ? 'down at the shore the jetty lanterns are lit — tap it when ready'
            : 'down at the shore the jetty lanterns are lit — walk out over the water when ready',
          0
        );
      }
    }
  }, [chamber, practiceUnlocked, reduced, say, session]);

  // first hint once the intro lifts — stays until the trailhead is reached
  useEffect(() => {
    if (!intro && !glFailed)
      say(
        reduced
          ? 'tap the arch to begin — or use the compass ◉'
          : 'drag or arrow-keys to look · tap the arch ahead — or let ◉ carry you',
        0
      );
  }, [intro, glFailed, reduced, say]);

  // the atmosphere of the open chamber (wash over the whole scene)
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

  // every place the arc has opened — the keyboard/screen-reader path
  const reachable = useMemo(() => {
    const list: { id: string; label: string }[] = [
      { id: 'trailhead', label: 'the trailhead — the surface' },
    ];
    if (state.complaintTouched)
      list.push({ id: 'mechanism', label: `${session.mechanism.name} — the spring` });
    if (state.mechanismRevealed)
      for (const p of session.parallels)
        list.push({
          id: p.id,
          label: `${p.title} — ${p.lineage}${p.status === 'rejected' ? ' (does not hold)' : ''}${
            state.visitedParallels.includes(p.id) ? ' (visited)' : ''
          }`,
        });
    if (practiceUnlocked && !state.arrived)
      list.push({ id: 'jetty', label: `${session.practice.name} — the jetty` });
    return list;
  }, [state, practiceUnlocked, session]);

  if (glFailed) {
    return (
      <div className="retreat-fallback">
        <p className="eyebrow">the retreat needs WebGL</p>
        <p>This device can’t open the valley. The same session is walkable as:</p>
        <div className="retreat-fallback-links">
          <Link href={`/voyage/${session.id}`}>✦ the voyage</Link>
          <Link href={`/session/${session.id}`}>◈ the bird’s-eye maps</Link>
          <Link href="/">← the atlas</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="voyage retreat" style={wash}>
      <canvas ref={canvasRef} className="voyage-canvas" aria-hidden />
      <canvas ref={labelRef} className="retreat-labels" aria-hidden />
      <div className="retreat-vignette" aria-hidden />

      {/* the same valley, walkable without a pointer — visually hidden */}
      <nav className="v-sr-nav" aria-label="Places in this retreat">
        {reachable.map((t) => (
          <button key={t.id} onClick={() => engineRef.current?.walkToSpot(t.id)}>
            walk to {t.label}
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
          aria-label={ambience ? 'Turn the valley sound off' : 'Turn the valley sound on'}
          aria-pressed={ambience}
          onClick={async () => {
            engineRef.current?.noteActivity();
            const on = await toggleNature();
            setAmbience(on);
            if (on && chamberAtmo) tintNature(chamberAtmo);
          }}
        >
          ♪
        </button>
        <Link href={`/voyage/${session.id}`} className="vhud-btn" title="the voyage">
          ✦ voyage
        </Link>
        <Link href={`/session/${session.id}`} className="vhud-btn" title="bird's-eye lenses">
          ◈ bird&rsquo;s-eye
        </Link>
      </header>

      {/* permanently mounted so aria-live announcements actually fire */}
      <div className={`vhint retreat-hint${hint && !chamber ? '' : ' off'}`} aria-live="polite">
        {hint ?? ''}
      </div>

      {/* the compass — hold a chevron to look; the center walks you onward */}
      {!chamber && !arrivalOpen && (
        <div className="vcompass" role="group" aria-label="Retreat compass">
          {(
            [
              ['up', '‹', 0, -1, 'look up'],
              ['left', '‹', -1, 0, 'look left'],
              ['go', '◉', 0, 0, 'carry me onward'],
              ['right', '›', 1, 0, 'look right'],
              ['down', '›', 0, 1, 'look down'],
            ] as const
          ).map(([key, glyph, lx, ly, label]) =>
            key === 'go' ? (
              <button
                key={key}
                className="vc-go"
                aria-label={label}
                title="carry me onward"
                onClick={() => engineRef.current?.walkNext()}
              >
                {glyph}
              </button>
            ) : (
              <button
                key={key}
                className={`vc-btn vc-${key}`}
                aria-label={label}
                onPointerDown={(e) => {
                  e.currentTarget.setPointerCapture(e.pointerId);
                  engineRef.current?.setLookHeld(lx, ly);
                }}
                onPointerUp={() => engineRef.current?.setLookHeld(0, 0)}
                onPointerCancel={() => engineRef.current?.setLookHeld(0, 0)}
                onPointerLeave={() => engineRef.current?.setLookHeld(0, 0)}
              >
                {glyph}
              </button>
            )
          )}
        </div>
      )}

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
          <span className="eyebrow t1">{session.painCategory} · a retreat</span>
          <p className="threshold-quote t2">“{session.surfaceComplaint}”</p>
          <span className="threshold-hint t3">
            you are standing at the trailhead — drag to look, tap to walk
          </span>
        </div>
      )}

      {state.arrived && arrivalOpen && (
        <ArrivalOverlay
          session={session}
          visited={state.visitedParallels}
          onDismiss={() => {
            setArrivalOpen(false);
            say('dusk holds the valley — return to the atlas when ready', 0);
          }}
        />
      )}
    </div>
  );
}
