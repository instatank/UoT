'use client';

// The Atlas — the app's front door, literally. A night sky (canvas starfield)
// holds two kinds of objects: doors (sessions you can enter) and
// constellations (records of descents already completed, read from the
// localStorage stub). Entering a door plays a threshold transition, then
// routes to the session. The constellation layer is memory made visible —
// deliberately not a score: no counts on stars, no streaks, nothing to farm.

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { CSSProperties } from 'react';
import type { SessionData } from '@/lib/types';
import { sessions } from '@/lib/sessions';
import { lineageColor, rejectedColor } from '@/lib/lineage';
import { loadSessionRecords, type ConstellationRecord } from '@/lib/constellation';
import { doorsEnabled } from '@/lib/flags';
import { mulberry32, seedFrom } from '@/lib/rand';
import Starfield from './Starfield';

// ---------- constellations: completed descents, set into the sky ----------

function Constellation({ record, index }: { record: ConstellationRecord; index: number }) {
  const { left, top, pts, arrival, label } = useMemo(() => {
    const rng = mulberry32(seedFrom(record.sessionId + record.completedAt));
    const session = sessions.find((s) => s.id === record.sessionId);
    const left = 4 + rng() * 78; // % of viewport
    // the center of the sky belongs to the title — constellations that land
    // mid-field stay high above it
    const top = left > 22 && left < 64 ? 1 + rng() * 5 : 3 + rng() * 23;
    let x = 12 + rng() * 10;
    let y = 28 + rng() * 30;
    const pts = record.lineagePath.slice(0, 6).map((pid) => {
      const parallel = session?.parallels.find((p) => p.id === pid);
      const pt = {
        x,
        y,
        rejected: parallel?.status === 'rejected',
        color: parallel
          ? parallel.status === 'rejected'
            ? rejectedColor
            : lineageColor[parallel.lineage]
          : '#cdd8ec',
      };
      x += 15 + rng() * 12;
      y = Math.min(74, Math.max(10, y + (rng() - 0.5) * 40));
      return pt;
    });
    // the arrival star — practice reached — closes the figure in gold
    const arrival = pts.length
      ? { x, y: Math.min(70, Math.max(12, y + (rng() - 0.5) * 24)) }
      : { x: 30, y: 40 };
    return { left, top, pts, arrival, label: record.painCategory };
  }, [record]);

  return (
    <svg
      className="constellation"
      style={{ left: `${left}%`, top: `${top}%`, animationDelay: `${index * 0.18}s` }}
      width={150}
      height={92}
      viewBox="0 0 150 92"
      aria-hidden
    >
      {pts.map((p, i) => {
        const next = i < pts.length - 1 ? pts[i + 1] : arrival;
        return (
          <line
            key={`l${i}`}
            x1={p.x}
            y1={p.y}
            x2={next.x}
            y2={next.y}
            stroke="#cdd8ec"
            strokeOpacity={0.16}
            strokeWidth={0.8}
            strokeDasharray={p.rejected ? '2 3' : undefined}
          />
        );
      })}
      {pts.map((p, i) => (
        <circle
          key={`s${i}`}
          className="cstar"
          style={{ animationDelay: `${(i * 0.7 + index) % 4}s` }}
          cx={p.x}
          cy={p.y}
          r={p.rejected ? 2.4 : 2}
          fill={p.rejected ? 'none' : p.color}
          stroke={p.rejected ? p.color : 'none'}
          strokeWidth={0.9}
          strokeDasharray={p.rejected ? '1.5 1.8' : undefined}
          opacity={0.85}
        />
      ))}
      <circle className="cstar bright" cx={arrival.x} cy={arrival.y} r={2.8} fill="#e8dcb0" />
      <text x={pts[0]?.x ?? 20} y={88} className="clabel">
        {label.toLowerCase()}
      </text>
    </svg>
  );
}

// ---------- doors: sessions waiting to be entered ----------

function DoorPreview({ session }: { session: SessionData }) {
  const rng = useMemo(() => mulberry32(seedFrom(session.id)), [session.id]);
  const N = session.parallels.length;
  const cx = 90;
  const cy = 148;
  const stars = session.parallels.map((p, i) => {
    const spread = N > 1 ? 200 / (N - 1) : 0;
    const a = ((-190 + spread * i + (rng() - 0.5) * 14) * Math.PI) / 180;
    const r = 42 + rng() * 16;
    return {
      x: cx + Math.cos(a) * r,
      y: cy + Math.sin(a) * r * 0.92,
      rejected: p.status === 'rejected',
      color: p.status === 'rejected' ? rejectedColor : lineageColor[p.lineage],
    };
  });
  const gid = `doorglow-${session.id}`;
  return (
    <svg className="door-arch" viewBox="0 0 180 250" aria-hidden>
      <defs>
        <linearGradient id={gid} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#e8dcb0" stopOpacity="0.17" />
          <stop offset="0.45" stopColor="#e8dcb0" stopOpacity="0.05" />
          <stop offset="1" stopColor="#e8dcb0" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={`${gid}-sill`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#e8dcb0" stopOpacity="0.28" />
          <stop offset="1" stopColor="#e8dcb0" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* the light inside */}
      <path
        className="door-light"
        d="M 35 240 L 35 106 C 35 48 64 31 90 31 C 116 31 145 48 145 106 L 145 240 Z"
        fill={`url(#${gid})`}
      />

      {/* what waits within: mechanism star + its parallels */}
      <g className="door-stars">
        {stars.map((s, i) => (
          <line
            key={`e${i}`}
            x1={cx}
            y1={cy}
            x2={s.x}
            y2={s.y}
            stroke={s.color}
            strokeOpacity={s.rejected ? 0.18 : 0.28}
            strokeWidth={0.8}
            strokeDasharray={s.rejected ? '2 3' : undefined}
          />
        ))}
        {stars.map((s, i) => (
          <circle
            key={`s${i}`}
            className="cstar"
            style={{ animationDelay: `${(i * 0.9) % 4}s` }}
            cx={s.x}
            cy={s.y}
            r={s.rejected ? 2.6 : 2.4}
            fill={s.rejected ? 'none' : s.color}
            stroke={s.rejected ? s.color : 'none'}
            strokeWidth={0.9}
            strokeDasharray={s.rejected ? '1.5 1.8' : undefined}
          />
        ))}
        <circle className="cstar bright" cx={cx} cy={cy} r={3.4} fill="#e8dcb0" />
      </g>

      {/* the arch — double line, ancient masonry drawn as hairlines */}
      <path
        className="arch-line outer"
        d="M 28 240 L 28 104 C 28 42 60 24 90 24 C 120 24 152 42 152 104 L 152 240"
        fill="none"
      />
      <path
        className="arch-line inner"
        d="M 35 240 L 35 106 C 35 48 64 31 90 31 C 116 31 145 48 145 106 L 145 240"
        fill="none"
      />
      {/* the keystone */}
      <line className="arch-line" x1={90} y1={24} x2={90} y2={31} />
      {/* the sill, and the light pooling on it */}
      <ellipse cx={90} cy={241} rx={58} ry={7} fill={`url(#${gid}-sill)`} />
      <line className="arch-line sill" x1={14} y1={240} x2={166} y2={240} />
    </svg>
  );
}

// ---------- the Atlas ----------

export default function AtlasHome() {
  const router = useRouter();
  const [records, setRecords] = useState<ConstellationRecord[]>([]);
  const [entering, setEntering] = useState<{ id: string; x: number; y: number } | null>(null);

  useEffect(() => {
    setRecords(loadSessionRecords().slice(-12));
  }, []);

  const enter = (e: React.MouseEvent, s: SessionData) => {
    // let modified clicks (new tab etc.) behave like normal links
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    if (entering) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setEntering({
      id: s.id,
      x: ((rect.left + rect.width / 2) / window.innerWidth) * 100,
      y: ((rect.top + rect.height / 2) / window.innerHeight) * 100,
    });
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.setTimeout(() => router.push(`/session/${s.id}`), reduced ? 0 : 820);
  };

  return (
    <div className="atlas">
      <div className="sky" aria-hidden>
        <Starfield density={1.5} parallax={20} meteorEvery={30} />
        {records.map((r, i) => (
          <Constellation key={`${r.sessionId}-${r.completedAt}`} record={r} index={i} />
        ))}
      </div>

      <main className={`atlas-content${entering ? ' entering' : ''}`}>
        <header className="atlas-head">
          <span className="eyebrow">Truth Unites · the Atlas</span>
          <h1>Where does it hurt?</h1>
          <p className="sub">
            Each door opens onto a descent — surface, mechanism, parallels, practice. The sky above
            keeps what you have crossed.
          </p>
        </header>

        <div className="doors">
          {sessions.map((s, i) => (
            <Link
              key={s.id}
              href={`/session/${s.id}`}
              className={`door${entering?.id === s.id ? ' opening' : ''}`}
              style={{ animationDelay: `${0.25 + i * 0.12}s` }}
              onClick={(e) => enter(e, s)}
            >
              <span className="door-cat">{s.painCategory}</span>
              <DoorPreview session={s} />
              <span className="door-complaint">“{s.surfaceComplaint}”</span>
              <span className="door-enter">cross the threshold</span>
            </Link>
          ))}
        </div>

        {doorsEnabled && (
          <Link href="/door" className="atlas-door-entry">
            <span className="pill gold">the Door</span>
            <span className="atlas-door-line">Or say it in your own words →</span>
            <span className="atlas-door-sub">
              the ratified cold start (decision 11) — free text or the ten pains, crisis off-ramp
              included · Phase 3 trial
            </span>
          </Link>
        )}

        <footer className="atlas-foot">
          <p className="sky-note">
            {records.length === 0
              ? 'The sky is still dark. It will remember every descent that reaches practice.'
              : `The sky remembers ${records.length === 1 ? 'one descent' : `${records.length} descents`}.`}
          </p>
          <p className="fine-print">
            Choosing a door by category is provisional — how a pain point gets named at the start is
            an open problem, not a decision.
          </p>
        </footer>
      </main>

      {entering && (
        <div
          className="door-pass"
          style={{ '--dx': `${entering.x}%`, '--dy': `${entering.y}%` } as CSSProperties}
          aria-hidden
        />
      )}
    </div>
  );
}
