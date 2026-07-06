'use client';

import type { NodeRef, SessionData } from '@/lib/types';
import type { SessionState } from '@/lib/state';

export interface GeometryProps {
  session: SessionData;
  state: SessionState;
  practiceUnlocked: boolean;
  onSelect: (ref: NodeRef) => void;
  onArrive: () => void;
}

export function polar(cx: number, cy: number, r: number, angleDeg: number): [number, number] {
  const a = (angleDeg * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}

// Smooth open path through points (Catmull-Rom → cubic Bézier).
export function smoothPath(pts: [number, number][]): string {
  if (pts.length < 2) return '';
  let d = `M ${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${c1x},${c1y} ${c2x},${c2y} ${p2[0]},${p2[1]}`;
  }
  return d;
}

export function wrapLabel(label: string, maxChars = 18): string[] {
  const words = label.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if (cur && (cur + ' ' + w).length > maxChars) {
      lines.push(cur);
      cur = w;
    } else {
      cur = cur ? cur + ' ' + w : w;
    }
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 3);
}

interface MapNodeProps {
  x: number;
  y: number;
  r: number;
  label: string;
  sublabel?: string;
  color: string;
  fill?: string;
  rejected?: boolean;
  selected?: boolean;
  visited?: boolean;
  locked?: boolean;
  labelPos?: 'below' | 'above' | 'left' | 'right';
  onClick?: () => void;
}

export function MapNode({
  x,
  y,
  r,
  label,
  sublabel,
  color,
  fill,
  rejected,
  selected,
  visited,
  locked,
  labelPos = 'below',
  onClick,
}: MapNodeProps) {
  const lines = wrapLabel(label);
  const lineH = 14;
  let tx = x;
  // when the block sits below the node, leave room for the leading sublabel
  let ty = y + r + 16 + (sublabel ? lineH : 0);
  let anchor: 'middle' | 'start' | 'end' = 'middle';
  if (labelPos === 'above') ty = y - r - 8 - (lines.length - 1) * lineH;
  if (labelPos === 'left') {
    tx = x - r - 10;
    ty = y + 4 - ((lines.length - 1) * lineH) / 2;
    anchor = 'end';
  }
  if (labelPos === 'right') {
    tx = x + r + 10;
    ty = y + 4 - ((lines.length - 1) * lineH) / 2;
    anchor = 'start';
  }

  return (
    <g
      className={`mnode enter${selected ? ' selected' : ''}${locked ? ' locked' : ''}`}
      onClick={locked ? undefined : onClick}
    >
      {selected && (
        <circle cx={x} cy={y} r={r + 6} fill="none" stroke={color} strokeOpacity={0.5} />
      )}
      <circle
        className="core"
        cx={x}
        cy={y}
        r={r}
        fill={fill ?? (visited ? color : 'transparent')}
        fillOpacity={visited && !fill ? 0.28 : 1}
        stroke={color}
        strokeWidth={1.4}
        strokeOpacity={locked ? 0.35 : 0.9}
        strokeDasharray={rejected ? '4 4' : undefined}
      />
      {rejected && (
        <text x={x} y={y + 4} textAnchor="middle" fontSize={12} fill={color} opacity={0.9}>
          ≉
        </text>
      )}
      {sublabel && (
        <text className="sublabel" x={tx} y={ty - lineH} textAnchor={anchor}>
          {sublabel}
        </text>
      )}
      {lines.map((ln, i) => (
        <text key={i} x={tx} y={ty + i * lineH} textAnchor={anchor} opacity={locked ? 0.45 : 1}>
          {ln}
        </text>
      ))}
    </g>
  );
}
