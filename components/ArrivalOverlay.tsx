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
        {/* a star is born — the practice reached, set into the sky */}
        <div className="starbirth" aria-hidden>
          <svg viewBox="0 0 120 120">
            <g className="rays">
              {Array.from({ length: 8 }, (_, i) => {
                const a = (Math.PI / 4) * i + Math.PI / 8;
                return (
                  <line
                    key={i}
                    x1={60 + Math.cos(a) * 16}
                    y1={60 + Math.sin(a) * 16}
                    x2={60 + Math.cos(a) * (i % 2 ? 34 : 46)}
                    y2={60 + Math.sin(a) * (i % 2 ? 34 : 46)}
                  />
                );
              })}
            </g>
            <circle className="birth-halo" cx={60} cy={60} r={26} />
            <circle className="birth-halo late" cx={60} cy={60} r={26} />
            <circle className="birth-core" cx={60} cy={60} r={5} />
          </svg>
        </div>
        <div className="stage s1">
          <span className="eyebrow">Arrival — a star is set</span>
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
          <span className="recorded">A new star now stands in your sky.</span>
          <button onClick={dismiss}>sit with the map</button>
          <Link href="/">look up at the sky</Link>
        </div>
      </div>
    </div>
  );
}
