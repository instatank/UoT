'use client';

// The Thread, rendered — a typographically serious dark card: mechanism, one
// cited line per visited lineage, the convergence, the practice, the date.
// Design bar (PRODUCT.md §7.3): someone who has never heard of the app should
// see a shared Thread and understand the entire thesis in five seconds.
//
// Deliberately literal fonts and hex colors (no CSS variables): the SVG is
// serialized and rasterized as a standalone document for PNG export, where
// page CSS doesn't exist. 720×N — width matches the 4:5 share formats.

import { forwardRef } from 'react';
import type { ThreadData } from '@/lib/thread';
import { wrapText } from '@/lib/thread';

const W = 720;
const PAD = 56;
const INNER = W - PAD * 2;

const SERIF = "Georgia, 'Iowan Old Style', 'Times New Roman', serif";
const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

// character budget for a given font size (Georgia ≈ 0.6em average advance —
// conservative, so lines never overflow the card)
const chars = (px: number) => Math.floor(INNER / (px * 0.6));

const ThreadCard = forwardRef<SVGSVGElement, { data: ThreadData }>(function ThreadCard(
  { data },
  ref
) {
  type El = React.ReactNode;
  const els: El[] = [];
  let y = 66;
  let key = 0;

  const text = (
    content: string,
    opts: {
      x?: number;
      size: number;
      fill: string;
      family?: string;
      italic?: boolean;
      spacing?: number;
      anchor?: 'start' | 'end';
      upper?: boolean;
    }
  ) => {
    els.push(
      <text
        key={key++}
        x={opts.x ?? PAD}
        y={y}
        fontFamily={opts.family ?? SANS}
        fontSize={opts.size}
        fill={opts.fill}
        fontStyle={opts.italic ? 'italic' : undefined}
        letterSpacing={opts.spacing}
        textAnchor={opts.anchor}
      >
        {opts.upper ? content.toUpperCase() : content}
      </text>
    );
  };

  const block = (
    content: string,
    opts: { size: number; fill: string; family?: string; italic?: boolean; lh: number }
  ) => {
    for (const line of wrapText(content, chars(opts.size))) {
      text(line, opts);
      y += opts.lh;
    }
  };

  const divider = () => {
    els.push(
      <line key={key++} x1={PAD} y1={y} x2={W - PAD} y2={y} stroke="#1b2230" strokeWidth={1} />
    );
  };

  // header
  text('The Thread', { size: 11, fill: '#d8c98a', spacing: 3, upper: true });
  text(data.dateLabel, { x: W - PAD, size: 11, fill: '#8a93a6', anchor: 'end' });
  y += 36;

  // the complaint, in the user's register
  block(`“${data.complaint}”`, { size: 15, fill: '#8a93a6', family: SERIF, italic: true, lh: 22 });
  y += 8;

  // the mechanism — the naming
  block(data.mechanismName, { size: 25, fill: '#e3e8f0', family: SERIF, lh: 32 });
  y += 10;
  divider();
  y += 34;

  // one cited line per visited lineage
  for (const line of data.lines) {
    els.push(<circle key={key++} cx={PAD + 4} cy={y - 4} r={3.5} fill={line.color} />);
    text(line.lineage, { x: PAD + 17, size: 10, fill: line.color, spacing: 2, upper: true });
    y += 21;
    block(line.text, { size: 15.5, fill: '#dde3ec', family: SERIF, lh: 23 });
    y += 2;
    text(line.cite, { size: 10.5, fill: '#596275' });
    y += 30;
  }

  divider();
  y += 34;

  // the convergence — where they meet
  text('Where they meet', { size: 10, fill: '#6e6647', spacing: 2, upper: true });
  y += 22;
  block(data.convergence, { size: 16, fill: '#e3e8f0', family: SERIF, lh: 24.5 });
  y += 10;
  divider();
  y += 34;

  // the practice
  text('The practice', { size: 10, fill: '#d8c98a', spacing: 2, upper: true });
  y += 24;
  text(
    data.practiceName + (data.practiceDuration ? `  ·  ~${data.practiceDuration} min` : ''),
    { size: 18, fill: '#e3e8f0', family: SERIF }
  );
  y += 34;

  // footer
  text('Unity of Truths — recognition, not argument', { size: 10.5, fill: '#596275' });
  y += 40;

  const H = y;

  return (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`The Thread — ${data.mechanismName}, ${data.dateLabel}`}
    >
      <rect x={0} y={0} width={W} height={H} rx={16} fill="#0a0d13" />
      <rect x={0.5} y={0.5} width={W - 1} height={H - 1} rx={15.5} fill="none" stroke="#262f44" />
      {els}
    </svg>
  );
});

export default ThreadCard;
