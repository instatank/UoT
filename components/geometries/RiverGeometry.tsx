'use client';

import { sameNode } from '@/lib/types';
import { lineageColor, rejectedColor } from '@/lib/lineage';
import { GeometryProps, MapNode, smoothPath } from './common';

const SOURCE_X = 80;
const MECH_X = 210;
const MID_Y = 320;
const PARALLEL_X = 430;
const DEEP_X = 645;
const POOL_X = 900;
const POOL_R = 46;

const COMPLAINT_COLOR = '#b9c3d6';
const GOLD = '#d8c98a';

export default function RiverGeometry({
  session,
  state,
  practiceUnlocked,
  onSelect,
  onArrive,
}: GeometryProps) {
  const N = session.parallels.length;
  // one stream per parallel, spread vertically off the shared source
  const baseY = (i: number) => (N === 1 ? MID_Y : 130 + (380 / (N - 1)) * i);
  // mid-stream the braids drift toward each other — cross-tradition serendipity
  const driftY = (y: number) => y + (MID_Y - y) * 0.42;

  return (
    <svg viewBox="0 0 1000 640" role="img" aria-label="Braided river session map">
      {/* streams */}
      {state.mechanismRevealed &&
        session.parallels.map((p, i) => {
          const y = baseY(i);
          const rejected = p.status === 'rejected';
          const color = rejected ? rejectedColor : lineageColor[p.lineage];
          const pts: [number, number][] = rejected
            ? [
                [MECH_X + 24, MID_Y],
                [PARALLEL_X, y],
                [DEEP_X, driftY(y)],
              ]
            : [
                [MECH_X + 24, MID_Y],
                [PARALLEL_X, y],
                [DEEP_X, driftY(y)],
                [POOL_X - POOL_R - 6, MID_Y],
              ];
          return (
            <g key={p.id} className="enter">
              <path className={`stream${rejected ? ' dead' : ''}`} d={smoothPath(pts)} stroke={color} />
              {rejected && (
                // the rejected stream dries up before the pool — a dead end, marked
                <g>
                  <line
                    x1={DEEP_X + 8}
                    y1={driftY(y) - 9}
                    x2={DEEP_X + 8}
                    y2={driftY(y) + 9}
                    stroke={color}
                    strokeWidth={2}
                    strokeOpacity={0.8}
                  />
                  <text
                    x={DEEP_X + 20}
                    y={driftY(y) + 4}
                    fontSize={11}
                    fill={color}
                    opacity={0.75}
                    fontStyle="italic"
                  >
                    runs dry
                  </text>
                </g>
              )}
            </g>
          );
        })}

      {/* headwater: complaint feeds mechanism */}
      {state.complaintTouched && (
        <line
          className="edge enter"
          x1={SOURCE_X + 34}
          y1={MID_Y}
          x2={MECH_X - 24}
          y2={MID_Y}
        />
      )}

      {/* complaint — the source */}
      <MapNode
        x={SOURCE_X}
        y={MID_Y}
        r={34}
        label="the complaint"
        sublabel="source"
        color={COMPLAINT_COLOR}
        visited={state.complaintTouched}
        selected={sameNode(state.selected, { kind: 'complaint' })}
        onClick={() => onSelect({ kind: 'complaint' })}
      />

      {/* mechanism — the fork every stream leaves from */}
      {state.complaintTouched && (
        <MapNode
          x={MECH_X}
          y={MID_Y}
          r={24}
          label={session.mechanism.name}
          sublabel="mechanism"
          color={COMPLAINT_COLOR}
          visited={state.mechanismRevealed}
          selected={sameNode(state.selected, { kind: 'mechanism' })}
          onClick={() => onSelect({ kind: 'mechanism' })}
        />
      )}

      {/* parallels mid-stream */}
      {state.mechanismRevealed &&
        session.parallels.map((p, i) => {
          const y = baseY(i);
          const rejected = p.status === 'rejected';
          return (
            <MapNode
              key={p.id}
              x={PARALLEL_X}
              y={y}
              r={16}
              label={p.title}
              sublabel={p.lineage}
              color={rejected ? rejectedColor : lineageColor[p.lineage]}
              rejected={rejected}
              visited={state.visitedParallels.includes(p.id)}
              selected={sameNode(state.selected, { kind: 'parallel', id: p.id })}
              labelPos={y <= MID_Y ? 'above' : 'below'}
              onClick={() => onSelect({ kind: 'parallel', id: p.id })}
            />
          );
        })}

      {/* deepenings, downstream where the braids draw close */}
      {session.parallels.map((p, i) => {
        if (!p.deepening || !state.visitedParallels.includes(p.id)) return null;
        const y = driftY(baseY(i));
        return (
          <MapNode
            key={p.id}
            x={DEEP_X}
            y={y}
            r={9}
            label={p.deepening.title}
            color={lineageColor[p.lineage]}
            visited={state.visitedDeepenings.includes(p.id)}
            selected={sameNode(state.selected, { kind: 'deepening', parallelId: p.id })}
            labelPos={baseY(i) <= MID_Y ? 'above' : 'below'}
            onClick={() => onSelect({ kind: 'deepening', parallelId: p.id })}
          />
        );
      })}

      {/* the practice pool — where every living stream reconverges */}
      <MapNode
        x={POOL_X}
        y={MID_Y}
        r={POOL_R}
        label={session.practice.name}
        sublabel={practiceUnlocked ? 'practice pool — enter' : 'practice pool'}
        color={GOLD}
        locked={!practiceUnlocked}
        visited={state.arrived}
        selected={sameNode(state.selected, { kind: 'practice' })}
        labelPos="below"
        onClick={onArrive}
      />
    </svg>
  );
}
