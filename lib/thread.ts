// The Thread (PRODUCT.md §7.3, §5.6) — the arrival artifact: mechanism, one
// cited line per visited lineage, the convergence, the practice, the date.
// Minted client-side from the session + the visit log; the constellation
// record already stores everything needed to re-mint it later, so nothing new
// is persisted. Rendered as SVG (components/ThreadCard.tsx) and exported as
// PNG on request — no backend.

import type { Lineage, SessionData } from './types';
import { lineageColor } from './lineage';

export interface ThreadLine {
  lineage: Lineage;
  color: string;
  text: string;
  cite: string;
}

export interface ThreadData {
  complaint: string;
  mechanismName: string;
  painCategory: string;
  lines: ThreadLine[];
  convergence: string;
  practiceName: string;
  practiceDuration?: number;
  dateLabel: string;
}

// First sentence (or a word-boundary cut) — the "one line" of a passage.
function passageExcerpt(text: string, max = 180): string {
  if (text.length <= max) return text;
  const m = text.match(/^[\s\S]*?[.!?…](?=[\s”")\]]|$)/);
  if (m && m[0].length <= max) return m[0];
  const cut = text.slice(0, max);
  return cut.slice(0, Math.max(cut.lastIndexOf(' '), 1)).trimEnd() + ' …';
}

// Whole sentences of the payoff up to a budget — the convergence, plainly.
function convergenceExcerpt(payoff: string, budget = 800): string {
  if (payoff.length <= budget) return payoff;
  const sentences = payoff.match(/[^.!?…]+[.!?…]+["”)]?\s*/g) ?? [payoff];
  let out = '';
  for (const s of sentences) {
    if (out && (out + s).trim().length > budget) break;
    out += s;
  }
  return out.trim() || payoff.slice(0, budget);
}

export function mintThread(session: SessionData, visitedParallels: string[], date: Date): ThreadData {
  // One cited line per visited lineage: accepted parallels only (Near Misses
  // are session content, not payoff), first visited per lineage, visit order.
  const seen = new Set<Lineage>();
  const lines: ThreadLine[] = [];
  for (const id of visitedParallels) {
    const p = session.parallels.find((x) => x.id === id);
    if (!p || p.status !== 'accepted' || seen.has(p.lineage)) continue;
    seen.add(p.lineage);
    lines.push({
      lineage: p.lineage,
      color: lineageColor[p.lineage],
      text: passageExcerpt(p.passage),
      cite: [p.source.author, p.source.work, p.source.locus].filter(Boolean).join(' · '),
    });
  }
  return {
    complaint: session.surfaceComplaint,
    mechanismName: session.mechanism.name,
    painCategory: session.painCategory,
    lines,
    convergence: convergenceExcerpt(session.payoff),
    practiceName: session.practice.name,
    practiceDuration: session.practice.durationMinutes,
    dateLabel: date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
  };
}

// Greedy word wrap against a character budget — SVG has no native text
// wrapping, and estimating by character count is enough at these sizes.
export function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const cand = cur ? `${cur} ${w}` : w;
    if (cand.length > maxChars && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = cand;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

// Serialize the on-screen SVG and rasterize to a PNG download. The SVG uses
// only literal fonts/colors (no CSS variables) so it renders identically as a
// standalone document inside the rasterizing <img>.
export async function exportSvgAsPng(svg: SVGSVGElement, filename: string, scale = 2): Promise<void> {
  const xml = new XMLSerializer().serializeToString(svg);
  const svgUrl = URL.createObjectURL(new Blob([xml], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('SVG rasterization failed'));
      img.src = svgUrl;
    });
    const w = svg.viewBox.baseVal.width;
    const h = svg.viewBox.baseVal.height;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas unavailable');
    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0, w, h);
    const png = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('PNG encoding failed'))), 'image/png')
    );
    const a = document.createElement('a');
    a.href = URL.createObjectURL(png);
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}
