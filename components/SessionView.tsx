'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { SessionData } from '@/lib/types';
import { useSessionState } from '@/lib/state';
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

export default function SessionView({ session }: { session: SessionData }) {
  const [geometry, setGeometry] = useState<GeometryKind>('radial');
  const [overlayOpen, setOverlayOpen] = useState(false);
  const { state, practiceUnlocked, select, arrive } = useSessionState(session);

  const handleArrive = () => {
    arrive();
    setOverlayOpen(true);
  };

  const Geometry =
    geometry === 'radial' ? RadialGeometry : geometry === 'river' ? RiverGeometry : DescentGeometry;

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

      <div className="session-body">
        <div className="map-area">
          <Geometry
            session={session}
            state={state}
            practiceUnlocked={practiceUnlocked}
            onSelect={select}
            onArrive={handleArrive}
          />
        </div>
        <aside className="panel">
          <NodePanel
            session={session}
            state={state}
            practiceUnlocked={practiceUnlocked}
            onSelect={select}
          />
        </aside>
      </div>

      {state.arrived && overlayOpen && (
        <ArrivalOverlay session={session} onDismiss={() => setOverlayOpen(false)} />
      )}
    </div>
  );
}
