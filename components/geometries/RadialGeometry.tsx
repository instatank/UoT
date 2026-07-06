'use client';

import { sameNode } from '@/lib/types';
import { lineageColor, rejectedColor } from '@/lib/lineage';
import { GeometryProps, MapNode, polar } from './common';

const CX = 400;
const CY = 400;
const R_MECH = 140; // mechanism ring — everything routes through it
const R_PARALLEL = 240;
const R_DEEP = 325;
const R_PRACTICE = 352; // the practice edge: every path terminates here

const COMPLAINT_COLOR = '#b9c3d6';
const MECH_COLOR = '#b9c3d6';
const GOLD = '#d8c98a';

function labelPosFor(angle: number): 'above' | 'below' | 'left' | 'right' {
  const a = ((angle + 180) % 360) - 180; // normalize to -180..180
  if (a > -30 && a < 30) return 'right';
  if (a > 150 || a < -150) return 'left';
  return a < 0 ? 'above' : 'below';
}

export default function RadialGeometry({
  session,
  state,
  practiceUnlocked,
  onSelect,
  onArrive,
}: GeometryProps) {
  const N = session.parallels.length;
  const angles = session.parallels.map((_, i) => -90 + (360 / N) * i);

  return (
    <svg viewBox="0 0 800 800" role="img" aria-label="Bounded radial session map">
      {/* practice edge — outer boundary, always present, locked until earned */}
      <g
        className={`mnode enter${practiceUnlocked ? '' : ' locked'}`}
        onClick={practiceUnlocked ? onArrive : undefined}
      >
        <circle cx={CX} cy={CY} r={R_PRACTICE} fill="none" stroke="transparent" strokeWidth={44} />
        <circle
          cx={CX}
          cy={CY}
          r={R_PRACTICE}
          fill="none"
          stroke={practiceUnlocked ? GOLD : '#242c3d'}
          strokeWidth={1.2}
          strokeDasharray="3 7"
          strokeOpacity={practiceUnlocked ? 0.8 : 0.9}
        />
        <text x={CX} y={CY - R_PRACTICE - 12} textAnchor="middle" opacity={practiceUnlocked ? 1 : 0.5}>
          {practiceUnlocked ? 'the practice edge — step out' : 'the practice edge'}
        </text>
      </g>

      {/* mechanism ring */}
      {state.complaintTouched && (
        <circle
          className="enter"
          cx={CX}
          cy={CY}
          r={R_MECH}
          fill="none"
          stroke="#232c3f"
          strokeWidth={1}
        />
      )}

      {/* complaint → mechanism spoke */}
      {state.complaintTouched && (
        <line
          className="edge enter"
          x1={CX}
          y1={CY - 46}
          x2={CX}
          y2={CY - R_MECH + 20}
        />
      )}

      {/* parallel spokes from mechanism ring */}
      {state.mechanismRevealed &&
        session.parallels.map((p, i) => {
          const [x1, y1] = polar(CX, CY, R_MECH, angles[i]);
          const [x2, y2] = polar(CX, CY, R_PARALLEL - 17, angles[i]);
          return <line key={p.id} className="edge enter" x1={x1} y1={y1} x2={x2} y2={y2} />;
        })}

      {/* deepening spokes + termination ticks toward the practice edge */}
      {session.parallels.map((p, i) => {
        if (!p.deepening || !state.visitedParallels.includes(p.id)) return null;
        const [x1, y1] = polar(CX, CY, R_PARALLEL + 17, angles[i]);
        const [x2, y2] = polar(CX, CY, R_DEEP - 9, angles[i]);
        const [tx1, ty1] = polar(CX, CY, R_DEEP + 9, angles[i]);
        const [tx2, ty2] = polar(CX, CY, R_PRACTICE, angles[i]);
        return (
          <g key={p.id} className="enter">
            <line className="edge" x1={x1} y1={y1} x2={x2} y2={y2} />
            <line className="edge-faint" x1={tx1} y1={ty1} x2={tx2} y2={ty2} />
          </g>
        );
      })}

      {/* complaint — the center */}
      <MapNode
        x={CX}
        y={CY}
        r={46}
        label="the complaint"
        color={COMPLAINT_COLOR}
        visited={state.complaintTouched}
        selected={sameNode(state.selected, { kind: 'complaint' })}
        onClick={() => onSelect({ kind: 'complaint' })}
      />

      {/* mechanism node, on its ring */}
      {state.complaintTouched && (
        <MapNode
          x={CX}
          y={CY - R_MECH}
          r={20}
          label={session.mechanism.name}
          sublabel="mechanism"
          color={MECH_COLOR}
          visited={state.mechanismRevealed}
          selected={sameNode(state.selected, { kind: 'mechanism' })}
          labelPos="right"
          onClick={() => onSelect({ kind: 'mechanism' })}
        />
      )}

      {/* parallels, radial by lineage; rejected are dashed embers */}
      {state.mechanismRevealed &&
        session.parallels.map((p, i) => {
          const [x, y] = polar(CX, CY, R_PARALLEL, angles[i]);
          const rejected = p.status === 'rejected';
          return (
            <MapNode
              key={p.id}
              x={x}
              y={y}
              r={17}
              label={p.title}
              sublabel={p.lineage}
              color={rejected ? rejectedColor : lineageColor[p.lineage]}
              rejected={rejected}
              visited={state.visitedParallels.includes(p.id)}
              selected={sameNode(state.selected, { kind: 'parallel', id: p.id })}
              labelPos={labelPosFor(angles[i])}
              onClick={() => onSelect({ kind: 'parallel', id: p.id })}
            />
          );
        })}

      {/* deepenings — depth as literal radius */}
      {session.parallels.map((p, i) => {
        if (!p.deepening || !state.visitedParallels.includes(p.id)) return null;
        const [x, y] = polar(CX, CY, R_DEEP, angles[i]);
        // on horizontal spokes the parallel's label already owns that side
        const lp = labelPosFor(angles[i]);
        const deepLp = lp === 'left' || lp === 'right' ? 'above' : lp;
        return (
          <MapNode
            key={p.id}
            x={x}
            y={y}
            r={9}
            label={p.deepening.title}
            color={lineageColor[p.lineage]}
            visited={state.visitedDeepenings.includes(p.id)}
            selected={sameNode(state.selected, { kind: 'deepening', parallelId: p.id })}
            labelPos={deepLp}
            onClick={() => onSelect({ kind: 'deepening', parallelId: p.id })}
          />
        );
      })}

      {/* practice node on the edge */}
      <MapNode
        x={CX}
        y={CY + R_PRACTICE}
        r={15}
        label={session.practice.name}
        sublabel="practice"
        color={GOLD}
        locked={!practiceUnlocked}
        visited={state.arrived}
        selected={sameNode(state.selected, { kind: 'practice' })}
        labelPos="above"
        onClick={onArrive}
      />
    </svg>
  );
}
