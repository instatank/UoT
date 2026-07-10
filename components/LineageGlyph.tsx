// Symbolic, stroke-only marks — one per lineage family. Geometric seals, not
// religious iconography or figures (CLAUDE.md decision 7: symbolic/atmospheric
// imagery only). Drawn in a 24×24 box centered on (12,12); parent sets stroke
// color. Used inside map nodes, on door previews, and in detail pills.

import type { Lineage } from '@/lib/types';

const paths: Record<Lineage, React.ReactNode> = {
  // the citadel — an ordered square held inside the circle of what happens
  Stoicism: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <rect x="7.2" y="7.2" width="9.6" height="9.6" transform="rotate(45 12 12)" />
    </>
  ),
  // the eight-spoked wheel, abstracted
  Buddhism: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      {Array.from({ length: 8 }, (_, i) => {
        const a = (Math.PI / 4) * i;
        return (
          <line
            key={i}
            x1={12 + Math.cos(a) * 2.6}
            y1={12 + Math.sin(a) * 2.6}
            x2={12 + Math.cos(a) * 8.5}
            y2={12 + Math.sin(a) * 8.5}
          />
        );
      })}
    </>
  ),
  // the flame held steady — three petals rising from one point
  'Hindu/Gītā': (
    <>
      <path d="M12 20 C 7.5 16.5, 8.5 10, 12 4.5 C 15.5 10, 16.5 16.5, 12 20 Z" />
      <path d="M12 20 C 6.5 19, 4.5 14, 5.5 9.5" />
      <path d="M12 20 C 17.5 19, 19.5 14, 18.5 9.5" />
    </>
  ),
  // the crossing — vertical descent meeting the horizontal world
  Christianity: (
    <>
      <line x1="12" y1="3.5" x2="12" y2="20.5" />
      <line x1="5.5" y1="9.5" x2="18.5" y2="9.5" />
    </>
  ),
  // the turn — a spiral drawing inward
  Sufism: (
    <path d="M12 12 C 12 10.2, 14.6 10, 14.6 12 C 14.6 14.8, 9.6 15, 9.4 12 C 9.2 8.2, 15.8 7.6, 17 11 C 18.4 15.4, 12.6 19.4, 8 17 C 3.8 14.8, 4.4 8, 9 5.4" />
  ),
  // the watercourse — one line yielding through the circle
  Taoism: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 3.5 C 16.5 6, 16.5 10, 12 12 C 7.5 14, 7.5 18, 12 20.5" />
    </>
  ),
  // the branching cell — one signal, many arbors
  'Neuroscience/Psychology': (
    <>
      <circle cx="12" cy="17.5" r="2.6" />
      <path d="M12 14.9 L 12 10.5 M12 10.5 L 7.5 6 M12 10.5 L 16.5 6 M7.5 6 L 5 5 M7.5 6 L 8 3.2 M16.5 6 L 19 5 M16.5 6 L 16 3.2" />
    </>
  ),
};

export default function LineageGlyph({
  lineage,
  size = 16,
  color = 'currentColor',
  opacity = 1,
  className,
}: {
  lineage: Lineage;
  size?: number;
  color?: string;
  opacity?: number;
  className?: string;
}) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.3}
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity={opacity}
      aria-hidden
    >
      {paths[lineage]}
    </svg>
  );
}

/** Same marks, for use inside an existing SVG (map nodes). Renders a <g>
 * centered on (x, y), scaled so the 24-box glyph spans `size` units. */
export function LineageGlyphSvg({
  lineage,
  x,
  y,
  size,
  color,
  opacity = 0.9,
}: {
  lineage: Lineage;
  x: number;
  y: number;
  size: number;
  color: string;
  opacity?: number;
}) {
  const s = size / 24;
  return (
    <g
      transform={`translate(${x - size / 2} ${y - size / 2}) scale(${s})`}
      fill="none"
      stroke={color}
      strokeWidth={1.3 / s}
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity={opacity}
      pointerEvents="none"
    >
      {paths[lineage]}
    </g>
  );
}
