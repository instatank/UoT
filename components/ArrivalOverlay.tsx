'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import type { SessionData } from '@/lib/types';
import { arrivalSpeech, useVoice, voiceSupported } from '@/lib/voice';
import { exportSvgAsPng, mintThread } from '@/lib/thread';
import Fold from './Fold';
import ThreadCard from './ThreadCard';

export default function ArrivalOverlay({
  session,
  visited,
  onDismiss,
}: {
  session: SessionData;
  visited: string[];
  onDismiss: () => void;
}) {
  const pr = session.practice;
  const { speaking, toggle, stop } = useVoice();
  const [voiceOk, setVoiceOk] = useState(false);
  const [saving, setSaving] = useState(false);
  const threadRef = useRef<SVGSVGElement>(null);
  useEffect(() => setVoiceOk(voiceSupported()), []);

  // Arrival mints the Thread (PRODUCT.md §5.6). The constellation record —
  // already written by arrive() — holds everything needed to re-mint it, so
  // "saved to the Constellation automatically" costs no new persistence.
  const thread = useMemo(() => mintThread(session, visited, new Date()), [session, visited]);

  const saveThread = async () => {
    if (!threadRef.current || saving) return;
    setSaving(true);
    try {
      const stamp = new Date().toISOString().slice(0, 10);
      await exportSvgAsPng(threadRef.current, `thread-${session.id}-${stamp}.png`);
    } catch {
      // rasterization unavailable (ancient browser) — the on-screen card remains
    } finally {
      setSaving(false);
    }
  };

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
          {/* exactly one practice at arrival; alternates stay behind a closed
              fold — a landing, not a menu (locked decision 12) */}
          {(session.alternatePractices?.length ?? 0) > 0 && (
            <Fold label="another way">
              {session.alternatePractices!.slice(0, 2).map((alt) => (
                <div key={alt.id} className="alt-practice">
                  <h4>{alt.name}</h4>
                  {alt.durationMinutes && <p className="duration">~{alt.durationMinutes} minutes</p>}
                  <ol>
                    {alt.steps.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ol>
                </div>
              ))}
            </Fold>
          )}
        </div>
        <div className="stage s5 thread-stage">
          <hr />
          <span className="eyebrow">The Thread</span>
          <div className="thread-wrap">
            <ThreadCard ref={threadRef} data={thread} />
          </div>
          <button className="thread-save" onClick={saveThread} disabled={saving}>
            {saving ? 'saving…' : 'save as image ↓'}
          </button>
        </div>
        <div className="arrival-foot stage s6">
          <span className="recorded">Recorded to the constellation.</span>
          <button onClick={dismiss}>sit with the map</button>
          <Link href="/">all sessions</Link>
        </div>
      </div>
    </div>
  );
}
