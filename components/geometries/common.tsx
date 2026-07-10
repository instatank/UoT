'use client';

import { useEffect, useState } from 'react';
import type { Lineage, NodeRef, SessionData } from '@/lib/types';
import type { SessionState } from '@/lib/state';
import { LineageGlyphSvg } from '../LineageGlyph';

export const MOBILE_QUERY = '(max-width: 768px)';

export const isMobile = () =>
  typeof window !== 'undefined' && window.matchMedia(MOBILE_QUERY).matches;

// True on phone-width viewports. Initializes false (matches the statically
// rendered desktop markup), corrects after hydration.
export function useCompact(): boolean {
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY);
    const update = () => setCompact(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return compact;
}

// The node the session is quietly inviting next — it breathes on the map.
export type CueTarget = 'complaint' | 'mechanism' | 'practice' | null;

export interface GeometryProps {
  session: SessionData;
  state: SessionState;
  practiceUnlocked: boolean;
  compact: boolean;
  cue: CueTarget;
  onSelect: (ref: NodeRef) => void;
  onArrive: () => void;
}

// Every geometry exports a layout: canvas size + where any node lives.
// The camera (MapViewport) uses it to focus selections.
export interface MapLayout {
  w: number;
  h: number;
  pos: (ref: NodeRef) => { x: number; y: number };
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

/** A pulse of light traveling along a path — the thread is alive. Purely
 * decorative; hidden entirely under prefers-reduced-motion. */
export function Flow({
  d,
  color,
  delay = 0,
  slow,
}: {
  d: string;
  color: string;
  delay?: number;
  slow?: boolean;
}) {
  return (
    <path
      className={`flowline${slow ? ' slow' : ''}`}
      d={d}
      pathLength={1}
      stroke={color}
      style={{ animationDelay: `${delay}s` }}
    />
  );
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
  cue?: boolean; // breathes — the map's quiet invitation
  glyph?: Lineage; // lineage seal drawn inside the star
  gate?: boolean; // practice terminal — double ring, turning when unlocked
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
  cue,
  glyph,
  gate,
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
      className={`mnode enter${selected ? ' selected' : ''}${locked ? ' locked' : ''}${
        visited ? ' visited' : ''
      }`}
      onClick={locked ? undefined : onClick}
    >
      {/* invisible hit area — keeps small nodes at a ≥44px touch target */}
      {onClick && !locked && (
        <circle cx={x} cy={y} r={Math.max(r + 10, 26)} fill="transparent" stroke="none" />
      )}
      {/* starlight aura — brighter once visited */}
      {!locked && (
        <circle
          className="aura"
          cx={x}
          cy={y}
          r={r * 2.05}
          fill={color}
          opacity={visited || selected ? 0.14 : 0.05}
          filter="url(#softBlur)"
        />
      )}
      {/* one-shot reveal ripple — the node surfaces */}
      {!locked && (
        <circle className="ripple" cx={x} cy={y} r={r + 8} fill="none" stroke={color} />
      )}
      {selected && (
        <circle
          className="halo"
          cx={x}
          cy={y}
          r={r + 7}
          fill="none"
          stroke={color}
          strokeOpacity={0.55}
        />
      )}
      {cue && (
        <circle className="cue-ring" cx={x} cy={y} r={r + 5} fill="none" stroke={color} />
      )}
      {/* fine outer ring — the star's setting */}
      {(visited || selected) && !rejected && (
        <circle
          cx={x}
          cy={y}
          r={r + 3.5}
          fill="none"
          stroke={color}
          strokeOpacity={0.28}
          strokeWidth={0.8}
        />
      )}
      {gate && (
        <circle
          className={`gate-ring${locked ? '' : ' live'}`}
          cx={x}
          cy={y}
          r={r + 6}
          fill="none"
          stroke={color}
          strokeOpacity={locked ? 0.25 : 0.7}
          strokeWidth={1}
          strokeDasharray="2 6"
        />
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
        filter={visited ? 'url(#nodeGlow)' : undefined}
      />
      {glyph && !rejected && r >= 12 && (
        <LineageGlyphSvg
          lineage={glyph}
          x={x}
          y={y}
          size={r * 1.2}
          color={color}
          opacity={locked ? 0.35 : 0.9}
        />
      )}
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
