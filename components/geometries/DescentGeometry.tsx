'use client';

import { sameNode } from '@/lib/types';
import { lineageColor, rejectedColor } from '@/lib/lineage';
import { GeometryProps, MapNode, useCompact } from './common';

const COMPLAINT_COLOR = '#b9c3d6';
const GOLD = '#d8c98a';

// Two layouts, one structure. Desktop digs in a wide 800×960 pit; compact
// (portrait phone) narrows the pit to 430 so it renders at ~1:1 label scale
// across the viewport width — the only remaining axis is down.
const DESKTOP = {
  W: 800,
  SHAFT_X: 400,
  COMPLAINT_Y: 78,
  MECH_Y: 215,
  FIRST_ROW_Y: 345,
  ROW_H: 80,
  ACCEPTED_X: [280, 520], // alternate sides of the shaft
  REJECTED_X: 645, // offset pocket
  DEEP_DX: 95,
  DEEP_DY: 42,
  BAND_MECH: 140,
  BAND_PARALLELS: 290,
  PRACTICE_GAP: 110, // bedrock band → practice node
  TAIL: 110, // practice node → bottom edge
};

const COMPACT = {
  W: 430,
  SHAFT_X: 178,
  COMPLAINT_Y: 90,
  MECH_Y: 235,
  FIRST_ROW_Y: 400,
  ROW_H: 148,
  ACCEPTED_X: [96, 260],
  REJECTED_X: 344,
  DEEP_DX: 92,
  DEEP_DY: 74,
  BAND_MECH: 155,
  BAND_PARALLELS: 320,
  PRACTICE_GAP: 110,
  TAIL: 110,
};

export default function DescentGeometry({
  session,
  state,
  practiceUnlocked,
  onSelect,
  onArrive,
}: GeometryProps) {
  const compact = useCompact();
  const L = compact ? COMPACT : DESKTOP;
  const N = session.parallels.length;

  // strata depth scales with the dig on compact; fixed on desktop to keep
  // the original tuned proportions
  const lastRowY = L.FIRST_ROW_Y + (N - 1) * L.ROW_H;
  const BAND_BEDROCK = compact ? lastRowY + L.DEEP_DY + 60 : 740;
  const PRACTICE_Y = compact ? BAND_BEDROCK + L.PRACTICE_GAP : 850;
  const H = compact ? PRACTICE_Y + L.TAIL : 960;

  // dig positions: accepted parallels alternate sides of the shaft;
  // rejected parallels sit in an offset pocket at the stratum's edge
  let acceptedCount = 0;
  const positions = session.parallels.map((p, i) => {
    const y = L.FIRST_ROW_Y + i * L.ROW_H;
    if (p.status === 'rejected') return { x: L.REJECTED_X, y };
    const x = L.ACCEPTED_X[acceptedCount % 2];
    acceptedCount++;
    return { x, y };
  });

  return (
    <svg viewBox={`0 0 ${L.W} ${H}`} role="img" aria-label="Descent strata session map">
      {/* strata — darkening with depth */}
      <rect x={0} y={0} width={L.W} height={L.BAND_MECH} fill="#b9c3d6" opacity={0.05} />
      <rect x={0} y={L.BAND_MECH} width={L.W} height={L.BAND_PARALLELS - L.BAND_MECH} fill="#b9c3d6" opacity={0.03} />
      <rect x={0} y={L.BAND_PARALLELS} width={L.W} height={BAND_BEDROCK - L.BAND_PARALLELS} fill="#b9c3d6" opacity={0.015} />
      <rect x={0} y={BAND_BEDROCK} width={L.W} height={H - BAND_BEDROCK} fill="#000000" opacity={0.4} />
      {[L.BAND_MECH, L.BAND_PARALLELS, BAND_BEDROCK].map((y) => (
        <line key={y} x1={0} y1={y} x2={L.W} y2={y} stroke="#1b2230" strokeWidth={1} />
      ))}
      <text className="stratum-label" x={24} y={40}>surface</text>
      <text className="stratum-label" x={24} y={L.BAND_MECH + 30}>mechanism</text>
      <text className="stratum-label" x={24} y={L.BAND_PARALLELS + 30}>parallels</text>
      <text className="stratum-label" x={24} y={BAND_BEDROCK + 34}>bedrock · practice</text>

      {/* the shaft */}
      {state.complaintTouched && (
        <line
          className="edge enter"
          x1={L.SHAFT_X}
          y1={L.COMPLAINT_Y + 30}
          x2={L.SHAFT_X}
          y2={L.MECH_Y - 22}
        />
      )}
      {state.mechanismRevealed && (
        <line
          className="edge-faint enter"
          x1={L.SHAFT_X}
          y1={L.MECH_Y + 22}
          x2={L.SHAFT_X}
          y2={PRACTICE_Y - 24}
        />
      )}

      {/* branches from the shaft to each parallel */}
      {state.mechanismRevealed &&
        session.parallels.map((p, i) => {
          const { x, y } = positions[i];
          const dir = x > L.SHAFT_X ? -1 : 1;
          return (
            <line
              key={p.id}
              className="edge enter"
              x1={L.SHAFT_X}
              y1={y}
              x2={x + dir * 15}
              y2={y}
              strokeDasharray={p.status === 'rejected' ? '3 5' : undefined}
            />
          );
        })}

      {/* complaint at the surface */}
      <MapNode
        x={L.SHAFT_X}
        y={L.COMPLAINT_Y}
        r={30}
        label="the complaint"
        sublabel="surface"
        color={COMPLAINT_COLOR}
        visited={state.complaintTouched}
        selected={sameNode(state.selected, { kind: 'complaint' })}
        labelPos="right"
        onClick={() => onSelect({ kind: 'complaint' })}
      />

      {/* mechanism stratum */}
      {state.complaintTouched && (
        <MapNode
          x={L.SHAFT_X}
          y={L.MECH_Y}
          r={22}
          label={session.mechanism.name}
          sublabel="mechanism"
          color={COMPLAINT_COLOR}
          visited={state.mechanismRevealed}
          selected={sameNode(state.selected, { kind: 'mechanism' })}
          labelPos="right"
          onClick={() => onSelect({ kind: 'mechanism' })}
        />
      )}

      {/* parallels — each its own dig level; rejected in an offset pocket */}
      {state.mechanismRevealed &&
        session.parallels.map((p, i) => {
          const { x, y } = positions[i];
          const rejected = p.status === 'rejected';
          return (
            <MapNode
              key={p.id}
              x={x}
              y={y}
              r={15}
              label={p.title}
              sublabel={p.lineage}
              color={rejected ? rejectedColor : lineageColor[p.lineage]}
              rejected={rejected}
              visited={state.visitedParallels.includes(p.id)}
              selected={sameNode(state.selected, { kind: 'parallel', id: p.id })}
              labelPos={rejected && !compact ? 'right' : 'below'}
              onClick={() => onSelect({ kind: 'parallel', id: p.id })}
            />
          );
        })}

      {/* deepenings — a half-level further down, off the parallel */}
      {session.parallels.map((p, i) => {
        if (!p.deepening || !state.visitedParallels.includes(p.id)) return null;
        const { x, y } = positions[i];
        const dx = x < L.SHAFT_X ? -L.DEEP_DX : L.DEEP_DX;
        // compact: the pit is narrow, so deepenings step inward toward the
        // shaft instead of outward past the edge
        const ddx = compact ? -dx : dx;
        return (
          <g key={p.id} className="enter">
            <line
              className="edge"
              x1={x + (ddx > 0 ? 12 : -12)}
              y1={y + 10}
              x2={x + ddx}
              y2={y + L.DEEP_DY - 9}
            />
            <MapNode
              x={x + ddx}
              y={y + L.DEEP_DY}
              r={9}
              label={p.deepening.title}
              color={lineageColor[p.lineage]}
              visited={state.visitedDeepenings.includes(p.id)}
              selected={sameNode(state.selected, { kind: 'deepening', parallelId: p.id })}
              labelPos={ddx < 0 ? 'left' : 'right'}
              onClick={() => onSelect({ kind: 'deepening', parallelId: p.id })}
            />
          </g>
        );
      })}

      {/* bedrock: the practice */}
      <MapNode
        x={L.SHAFT_X}
        y={PRACTICE_Y}
        r={24}
        label={session.practice.name}
        sublabel={practiceUnlocked ? 'practice — dig through' : 'practice'}
        color={GOLD}
        locked={!practiceUnlocked}
        visited={state.arrived}
        selected={sameNode(state.selected, { kind: 'practice' })}
        labelPos="right"
        onClick={onArrive}
      />
    </svg>
  );
}
