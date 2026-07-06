'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { SessionData } from '@/lib/types';
import { arrivalSpeech, useVoice, voiceSupported } from '@/lib/voice';

export default function ArrivalOverlay({
  session,
  onDismiss,
}: {
  session: SessionData;
  onDismiss: () => void;
}) {
  const pr = session.practice;
  const { speaking, toggle, stop } = useVoice();
  const [voiceOk, setVoiceOk] = useState(false);
  useEffect(() => setVoiceOk(voiceSupported()), []);

  const dismiss = () => {
    stop();
    onDismiss();
  };

  return (
    <div className="arrival-backdrop">
      <div className="arrival">
        <div className="stage s1">
          <span className="eyebrow">Arrival</span>
          {voiceOk && (
            <button
              className={`pill listen${speaking ? ' on' : ''}`}
              onClick={() => toggle(arrivalSpeech(session))}
              aria-pressed={speaking}
            >
              {speaking ? '◼ stop' : '▷ listen'}
            </button>
          )}
        </div>
        <p className="payoff stage s2">{session.payoff}</p>
        <hr className="stage s3" />
        <div className="stage s4">
          <h3>{pr.name}</h3>
          {pr.durationMinutes && <p className="duration">~{pr.durationMinutes} minutes</p>}
          <ol>
            {pr.steps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
        </div>
        <div className="arrival-foot stage s5">
          <span className="recorded">Recorded to the constellation.</span>
          <button onClick={dismiss}>sit with the map</button>
          <Link href="/">all sessions</Link>
        </div>
      </div>
    </div>
  );
}
