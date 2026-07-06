'use client';

import Link from 'next/link';
import type { SessionData } from '@/lib/types';

export default function ArrivalOverlay({
  session,
  onDismiss,
}: {
  session: SessionData;
  onDismiss: () => void;
}) {
  const pr = session.practice;
  return (
    <div className="arrival-backdrop">
      <div className="arrival">
        <span className="eyebrow">Arrival</span>
        <p className="payoff">{session.payoff}</p>
        <hr />
        <h3>{pr.name}</h3>
        {pr.durationMinutes && <p className="duration">~{pr.durationMinutes} minutes</p>}
        <ol>
          {pr.steps.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ol>
        <div className="arrival-foot">
          <span className="recorded">Recorded to the constellation.</span>
          <button onClick={onDismiss}>sit with the map</button>
          <Link href="/">all sessions</Link>
        </div>
      </div>
    </div>
  );
}
