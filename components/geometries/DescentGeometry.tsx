'use client';

import { sameNode } from '@/lib/types';
import { lineageColor, rejectedColor } from '@/lib/lineage';
import { GeometryProps, MapNode } from './common';

const W = 800;
const SHAFT_X = 400;
const COMPLAINT_Y = 78;
const MECH_Y = 215;
const FIRST_ROW_Y = 345;
const ROW_H = 80;
const PRACTICE_Y = 850;

// strata boundaries
const BAND_MECH = 140;
const BAND_PARALLELS = 290;
const BAND_BEDROCK = 740;

const COMPLAINT_COLOR = '#b9c3d6';
const GOLD = '#d8c98a';

export default function DescentGeometry({
  session,
  state,
  practiceUnlocked,
  onSelect,
  onArrive,
}: GeometryProps) {
  // dig positions: accepted parallels alternate sides of the shaft;
  // rejected parallels sit in an offset pocket at the stratum's edge
  let acceptedCount = 0;
  const positions = session.parallels.map((p, i) => {
    const y = FIRST_ROW_Y + i * ROW_H;
    if (p.status === 'rejected') return { x: 645, y };
    const x = acceptedCount % 2 === 0 ? 280 : 520;
    acceptedCount++;
    return { x, y };
  });

  return (
    <svg viewBox={`0 0 ${W} 960`} role="img" aria-label="Descent strata session map">
      {/* strata — darkening with depth */}
      <rect x={0} y={0} width={W} height={BAND_MECH} fill="#b9c3d6" opacity={0.05} />
      <rect x={0} y={BAND_MECH} width={W} height={BAND_PARALLELS - BAND_MECH} fill="#b9c3d6" opacity={0.03} />
      <rect x={0} y={BAND_PARALLELS} width={W} height={BAND_BEDROCK - BAND_PARALLELS} fill="#b9c3d6" opacity={0.015} />
      <rect x={0} y={BAND_BEDROCK} width={W} height={960 - BAND_BEDROCK} fill="#000000" opacity={0.4} />
      {[BAND_MECH, BAND_PARALLELS, BAND_BEDROCK].map((y) => (
        <line key={y} x1={0} y1={y} x2={W} y2={y} stroke="#1b2230" strokeWidth={1} />
      ))}
      <text className="stratum-label" x={24} y={40}>surface</text>
      <text className="stratum-label" x={24} y={BAND_MECH + 30}>mechanism</text>
      <text className="stratum-label" x={24} y={BAND_PARALLELS + 30}>parallels</text>
      <text className="stratum-label" x={24} y={BAND_BEDROCK + 34}>bedrock · practice</text>

      {/* the shaft */}
      {state.complaintTouched && (
        <line
          className="edge enter"
          x1={SHAFT_X}
          y1={COMPLAINT_Y + 30}
          x2={SHAFT_X}
          y2={MECH_Y - 22}
        />
      )}
      {state.mechanismRevealed && (
        <line
          className="edge-faint enter"
          x1={SHAFT_X}
          y1={MECH_Y + 22}
          x2={SHAFT_X}
          y2={PRACTICE_Y - 24}
        />
      )}

      {/* branches from the shaft to each parallel */}
      {state.mechanismRevealed &&
        session.parallels.map((p, i) => {
          const { x, y } = positions[i];
          const dir = x > SHAFT_X ? -1 : 1;
          return (
            <line
              key={p.id}
              className="edge enter"
              x1={SHAFT_X}
              y1={y}
              x2={x + dir * 15}
              y2={y}
              strokeDasharray={p.status === 'rejected' ? '3 5' : undefined}
            />
          );
        })}

      {/* complaint at the surface */}
      <MapNode
        x={SHAFT_X}
        y={COMPLAINT_Y}
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
          x={SHAFT_X}
          y={MECH_Y}
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
              labelPos={rejected ? 'right' : 'below'}
              onClick={() => onSelect({ kind: 'parallel', id: p.id })}
            />
          );
        })}

      {/* deepenings — a half-level further down, off the parallel */}
      {session.parallels.map((p, i) => {
        if (!p.deepening || !state.visitedParallels.includes(p.id)) return null;
        const { x, y } = positions[i];
        const dx = x < SHAFT_X ? -95 : 95;
        return (
          <g key={p.id} className="enter">
            <line className="edge" x1={x + (dx > 0 ? 12 : -12)} y1={y + 10} x2={x + dx} y2={y + 42 - 9} />
            <MapNode
              x={x + dx}
              y={y + 42}
              r={9}
              label={p.deepening.title}
              color={lineageColor[p.lineage]}
              visited={state.visitedDeepenings.includes(p.id)}
              selected={sameNode(state.selected, { kind: 'deepening', parallelId: p.id })}
              labelPos={dx < 0 ? 'left' : 'right'}
              onClick={() => onSelect({ kind: 'deepening', parallelId: p.id })}
            />
          </g>
        );
      })}

      {/* bedrock: the practice */}
      <MapNode
        x={SHAFT_X}
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
