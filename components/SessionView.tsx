'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import Link from 'next/link';
import type { NodeRef, SessionData } from '@/lib/types';
import { useSessionState } from '@/lib/state';
import { tintAmbience, toggleAmbience } from '@/lib/ambience';
import { lineageAtmosphere, rejectedAtmosphere, type LineageAtmosphere } from '@/lib/lineage';
import MapViewport, { MapViewportHandle } from './MapViewport';
import { CueTarget, isMobile, useCompact } from './geometries/common';
import NodePanel from './NodePanel';
import ArrivalOverlay from './ArrivalOverlay';
import Starfield from './Starfield';
import RadialGeometry, { radialLayout } from './geometries/RadialGeometry';
import RiverGeometry, { riverLayout } from './geometries/RiverGeometry';
import DescentGeometry, { descentLayout } from './geometries/DescentGeometry';

type GeometryKind = 'radial' | 'river' | 'descent';
type SheetPos = 'peek' | 'half' | 'full';

// three lenses on the same descent — glyphs, not tabs
const GEOMETRIES: { kind: GeometryKind; label: string; glyph: string }[] = [
  { kind: 'radial', label: 'Radial', glyph: '◎' },
  { kind: 'river', label: 'River', glyph: '≈' },
  { kind: 'descent', label: 'Descent', glyph: '≣' },
];

const PEEK_VISIBLE = 92; // px of sheet visible when peeked

function nodeTitle(session: SessionData, ref: NodeRef): string {
  if (ref.kind === 'complaint') return session.surfaceComplaint;
  if (ref.kind === 'mechanism') return session.mechanism.name;
  if (ref.kind === 'practice') return session.practice.name;
  if (ref.kind === 'parallel') return session.parallels.find((p) => p.id === ref.id)?.title ?? '';
  return session.parallels.find((p) => p.id === ref.parallelId)?.deepening?.title ?? '';
}

export default function SessionView({ session }: { session: SessionData }) {
  const [geometry, setGeometry] = useState<GeometryKind>('radial');
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [sheetPos, setSheetPos] = useState<SheetPos>('half');
  const [dragging, setDragging] = useState(false);
  const [ambience, setAmbience] = useState(false);
  const [hintGone, setHintGone] = useState(false);
  // crossing the threshold — a brief moment at the surface before the map
  const [threshold, setThreshold] = useState<'on' | 'leaving' | null>('on');
  const vpRef = useRef<MapViewportHandle>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const insetRef = useRef(0);
  const compact = useCompact();
  const { state, practiceUnlocked, select, arrive } = useSessionState(session);

  // the coach mark leaves on first touch of the map, or quietly on its own —
  // parked over the map it was overlapping node labels indefinitely
  useEffect(() => {
    const t = window.setTimeout(() => setHintGone(true), 9000);
    return () => window.clearTimeout(t);
  }, []);

  // the threshold lifts on its own, or on a tap; reduced motion skips it
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setThreshold(null);
      return;
    }
    const t1 = window.setTimeout(() => setThreshold((s) => (s === 'on' ? 'leaving' : s)), 2600);
    const t2 = window.setTimeout(() => setThreshold(null), 3400);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, []);

  const liftThreshold = () => {
    setThreshold((s) => (s === 'on' ? 'leaving' : s));
    window.setTimeout(() => setThreshold(null), 800);
  };

  // the atmosphere of the selected node — each lineage has its own sensibility
  const atmosphere: LineageAtmosphere | null = useMemo(() => {
    const sel = state.selected;
    if (!sel) return null;
    if (sel.kind === 'parallel') {
      const p = session.parallels.find((x) => x.id === sel.id);
      if (!p) return null;
      return p.status === 'rejected' ? rejectedAtmosphere : lineageAtmosphere[p.lineage];
    }
    if (sel.kind === 'deepening') {
      const p = session.parallels.find((x) => x.id === sel.parallelId);
      return p ? lineageAtmosphere[p.lineage] : null;
    }
    return null;
  }, [state.selected, session]);

  // the sound bed follows the room you're standing in (no-op when it's off)
  useEffect(() => {
    tintAmbience(atmosphere);
  }, [atmosphere]);

  const layout = useMemo(
    () =>
      geometry === 'radial'
        ? radialLayout(session)
        : geometry === 'river'
          ? riverLayout(session)
          : descentLayout(session, compact),
    [geometry, session, compact]
  );

  const cue: CueTarget = !state.complaintTouched
    ? 'complaint'
    : !state.mechanismRevealed
      ? 'mechanism'
      : practiceUnlocked && !state.arrived
        ? 'practice'
        : null;

  const handleSelect = useCallback(
    (ref: NodeRef) => {
      setSheetPos((p) => (p === 'peek' ? 'half' : p));
      select(ref);
    },
    [select]
  );

  const handleArrive = () => {
    setSheetPos('half');
    arrive();
    setOverlayOpen(true);
  };

  // camera inset: how much of the map the sheet currently covers (mobile only)
  const computeInset = useCallback(
    (pos: SheetPos, selected: boolean): number => {
      if (!isMobile() || !selected) return 0;
      const vh = window.innerHeight;
      if (pos === 'peek') return PEEK_VISIBLE;
      return Math.round(vh * 0.48); // half (and full — focus is skipped there)
    },
    []
  );

  // keep the camera on the selection — gravitate toward what you choose.
  // Mobile centers in the band the sheet leaves visible; desktop glides too.
  useEffect(() => {
    insetRef.current = computeInset(sheetPos, state.selected !== null);
    if (!state.selected) return;
    if (isMobile() && sheetPos === 'full') return;
    const p = layout.pos(state.selected);
    const raf = requestAnimationFrame(() =>
      isMobile() ? vpRef.current?.focusOn(p.x, p.y) : vpRef.current?.approach(p.x, p.y)
    );
    return () => cancelAnimationFrame(raf);
  }, [state.selected, sheetPos, layout, computeInset]);

  // opening camera per geometry — remounts with key={geometry}
  const getInitial = useCallback(
    () => {
      const anchor = state.selected ?? { kind: 'complaint' as const };
      const p = layout.pos(anchor);
      if (!isMobile()) return { ...p, k: 'fit' as const };
      if (geometry === 'radial') return { ...p, k: 1 };
      if (geometry === 'river') return { ...p, k: 'fitH' as const };
      return { ...p, k: 'fitW' as const };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [geometry, layout]
  );

  // ---- sheet drag ----
  const drag = useRef<{ startY: number; startTop: number; moved: boolean; lastY: number; vy: number; t: number } | null>(null);

  const sheetTops = () => {
    const vh = window.innerHeight;
    return { full: vh * 0.1, half: vh * 0.52, peek: vh - PEEK_VISIBLE };
  };

  const onGripDown = (e: React.PointerEvent) => {
    if (!isMobile() || !state.selected) return;
    const tops = sheetTops();
    drag.current = {
      startY: e.clientY,
      startTop: tops[sheetPos],
      moved: false,
      lastY: e.clientY,
      vy: 0,
      t: performance.now(),
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDragging(true);
  };

  const onGripMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dy = e.clientY - d.startY;
    if (Math.abs(dy) > 6) d.moved = true;
    const now = performance.now();
    d.vy = (e.clientY - d.lastY) / Math.max(1, now - d.t);
    d.lastY = e.clientY;
    d.t = now;
    const tops = sheetTops();
    const top = Math.min(tops.peek, Math.max(tops.full, d.startTop + dy));
    sheetRef.current?.style.setProperty('--sheet-y', `${top}px`);
  };

  const onGripUp = () => {
    const d = drag.current;
    drag.current = null;
    setDragging(false);
    sheetRef.current?.style.removeProperty('--sheet-y');
    if (!d) return;
    if (!d.moved) {
      // a clean tap on the grip toggles half ↔ full
      setSheetPos((p) => (p === 'full' ? 'half' : p === 'half' ? 'full' : 'half'));
      return;
    }
    const tops = sheetTops();
    const cur = Math.min(
      tops.peek,
      Math.max(tops.full, d.startTop + (d.lastY - d.startY))
    );
    // fling wins over position
    if (d.vy < -0.55) return setSheetPos(sheetPos === 'peek' ? 'half' : 'full');
    if (d.vy > 0.55) return setSheetPos(sheetPos === 'full' ? 'half' : 'peek');
    const nearest = (Object.entries(tops) as [SheetPos, number][]).sort(
      (a, b) => Math.abs(a[1] - cur) - Math.abs(b[1] - cur)
    )[0][0];
    setSheetPos(nearest);
  };

  const Geometry =
    geometry === 'radial' ? RadialGeometry : geometry === 'river' ? RiverGeometry : DescentGeometry;

  const sheetState: SheetPos | 'hidden' = state.selected ? sheetPos : 'hidden';

  return (
    <div
      className="session-shell"
      data-sheet={sheetState}
      style={
        {
          '--sel-wash': atmosphere?.wash ?? 'rgba(0,0,0,0)',
          '--sel-on': atmosphere ? 1 : 0,
          '--aurora': atmosphere?.aurora ?? 'rgba(62, 76, 112, 0.16)',
        } as CSSProperties
      }
    >
      <header className="session-header">
        <Link href="/" className="back">
          ← atlas
        </Link>
        <Link href={`/voyage/${session.id}`} className="back voyage-link" title="enter the voyage">
          ✦ voyage
        </Link>
        <Link href={`/retreat/${session.id}`} className="back retreat-link" title="walk the retreat">
          ⛰ retreat
        </Link>
        <span className="title">“{session.surfaceComplaint}”</span>
        <span className="chip">{session.painCategory}</span>
        <button
          className={`icon-btn${ambience ? ' active' : ''}`}
          aria-label={ambience ? 'Turn ambient sound off' : 'Turn ambient sound on'}
          aria-pressed={ambience}
          title="quiet sound"
          onClick={async () => setAmbience(await toggleAmbience())}
        >
          ♪
        </button>
        <nav className="geo-switch" aria-label="Geometry">
          {GEOMETRIES.map((g) => (
            <button
              key={g.kind}
              className={geometry === g.kind ? 'active' : ''}
              onClick={() => setGeometry(g.kind)}
            >
              <span className="geo-glyph" aria-hidden>
                {g.glyph}
              </span>
              {g.label}
            </button>
          ))}
        </nav>
      </header>

      <div className="session-body">
        <div className="map-stage">
          <Starfield density={0.55} parallax={0} dim={0.75} meteorEvery={80} />
          <MapViewport
            key={geometry}
            ref={vpRef}
            width={layout.w}
            height={layout.h}
            getInitial={getInitial}
            bottomInset={insetRef}
            onBackgroundTap={() => state.selected && setSheetPos('peek')}
            onFirstInteract={() => setHintGone(true)}
            ariaLabel={
              geometry === 'radial'
                ? 'Bounded radial session map'
                : geometry === 'river'
                  ? 'Braided river session map'
                  : 'Descent strata session map'
            }
          >
            <Geometry
              session={session}
              state={state}
              practiceUnlocked={practiceUnlocked}
              compact={compact}
              cue={cue}
              onSelect={handleSelect}
              onArrive={handleArrive}
            />
          </MapViewport>
          <div className={`map-hint${hintGone ? ' gone' : ''}`} aria-hidden>
            drag to move · pinch or scroll to zoom
          </div>
        </div>

        <aside
          ref={sheetRef}
          className={`sheet pos-${sheetState}${dragging ? ' dragging' : ''}`}
          aria-hidden={sheetState === 'hidden'}
        >
          <div
            className="sheet-grip"
            onPointerDown={onGripDown}
            onPointerMove={onGripMove}
            onPointerUp={onGripUp}
            onPointerCancel={onGripUp}
          >
            <span className="grip-pill" />
            {state.selected && (
              <span className="grip-label">{nodeTitle(session, state.selected)}</span>
            )}
          </div>
          <div className="sheet-body">
            <NodePanel
              session={session}
              state={state}
              practiceUnlocked={practiceUnlocked}
              onSelect={handleSelect}
            />
          </div>
        </aside>
      </div>

      {state.arrived && overlayOpen && (
        <ArrivalOverlay
          session={session}
          visited={state.visitedParallels}
          onDismiss={() => {
            setOverlayOpen(false);
            // step back and see the whole of what was dug
            vpRef.current?.fit(900);
          }}
        />
      )}

      {threshold && (
        <div
          className={`threshold${threshold === 'leaving' ? ' leaving' : ''}`}
          onClick={liftThreshold}
          aria-hidden
        >
          <span className="eyebrow t1">{session.painCategory} · the surface</span>
          <p className="threshold-quote t2">“{session.surfaceComplaint}”</p>
          <span className="threshold-hint t3">something is running underneath — descend</span>
        </div>
      )}
    </div>
  );
}
