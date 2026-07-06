'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { NodeRef, SessionData } from '@/lib/types';
import { useSessionState } from '@/lib/state';
import { MOBILE_QUERY } from './geometries/common';
import NodePanel from './NodePanel';
import ArrivalOverlay from './ArrivalOverlay';
import RadialGeometry from './geometries/RadialGeometry';
import RiverGeometry from './geometries/RiverGeometry';
import DescentGeometry from './geometries/DescentGeometry';

type GeometryKind = 'radial' | 'river' | 'descent';

const GEOMETRIES: { kind: GeometryKind; label: string }[] = [
  { kind: 'radial', label: 'Radial' },
  { kind: 'river', label: 'River' },
  { kind: 'descent', label: 'Descent' },
];

const isMobile = () => typeof window !== 'undefined' && window.matchMedia(MOBILE_QUERY).matches;

// Scroll the selected node into the band of the map the bottom sheet doesn't
// cover, so selection never disappears behind the sheet.
function centerSelected(container: HTMLElement, behavior: ScrollBehavior = 'smooth') {
  const core = container.querySelector('.mnode.selected circle.core');
  if (!core) return;
  const cr = core.getBoundingClientRect();
  const br = container.getBoundingClientRect();
  container.scrollTo({
    left: container.scrollLeft + cr.left + cr.width / 2 - (br.left + br.width / 2),
    top: container.scrollTop + cr.top + cr.height / 2 - (br.top + br.height * 0.22),
    behavior,
  });
}

export default function SessionView({ session }: { session: SessionData }) {
  const [geometry, setGeometry] = useState<GeometryKind>('radial');
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [sheetTucked, setSheetTucked] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const { state, practiceUnlocked, select, arrive } = useSessionState(session);

  const handleSelect = (ref: NodeRef) => {
    setSheetTucked(false);
    select(ref);
  };

  const handleArrive = () => {
    setSheetTucked(false);
    arrive();
    setOverlayOpen(true);
  };

  // mobile: land each geometry at its origin — radial centered on the
  // complaint, river at the source, descent at the surface
  useEffect(() => {
    const el = mapRef.current;
    if (!el || !isMobile()) return;
    if (state.selected) {
      centerSelected(el, 'auto');
    } else if (geometry === 'radial') {
      el.scrollTo({
        left: (el.scrollWidth - el.clientWidth) / 2,
        top: (el.scrollHeight - el.clientHeight) / 2,
      });
    } else {
      el.scrollTo({ left: 0, top: 0 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geometry]);

  // mobile: pan gently to follow selection (focus stays above the sheet)
  useEffect(() => {
    const el = mapRef.current;
    if (!el || !isMobile() || !state.selected) return;
    const raf = requestAnimationFrame(() => centerSelected(el));
    return () => cancelAnimationFrame(raf);
  }, [state.selected]);

  const Geometry =
    geometry === 'radial' ? RadialGeometry : geometry === 'river' ? RiverGeometry : DescentGeometry;

  const sheetOpen = state.selected !== null && !sheetTucked;

  return (
    <div className="session-shell">
      <header className="session-header">
        <Link href="/" className="back">
          ← sessions
        </Link>
        <span className="title">“{session.surfaceComplaint}”</span>
        <span className="chip">{session.painCategory}</span>
        <nav className="geo-switch" aria-label="Geometry">
          {GEOMETRIES.map((g) => (
            <button
              key={g.kind}
              className={geometry === g.kind ? 'active' : ''}
              onClick={() => setGeometry(g.kind)}
            >
              {g.label}
            </button>
          ))}
        </nav>
      </header>

      <div className={`session-body${sheetOpen ? ' sheet-open' : ''}`}>
        <div className={`map-area geo-${geometry}`} ref={mapRef}>
          <Geometry
            session={session}
            state={state}
            practiceUnlocked={practiceUnlocked}
            onSelect={handleSelect}
            onArrive={handleArrive}
          />
        </div>
        <aside className={`panel${sheetOpen ? ' open' : ''}`}>
          <button
            className="sheet-handle"
            aria-label="Hide detail"
            onClick={() => setSheetTucked(true)}
          >
            <span />
          </button>
          <NodePanel
            session={session}
            state={state}
            practiceUnlocked={practiceUnlocked}
            onSelect={handleSelect}
          />
        </aside>
        {state.selected && sheetTucked && (
          <button className="sheet-peek" onClick={() => setSheetTucked(false)}>
            detail ↑
          </button>
        )}
      </div>

      {state.arrived && overlayOpen && (
        <ArrivalOverlay session={session} onDismiss={() => setOverlayOpen(false)} />
      )}
    </div>
  );
}
