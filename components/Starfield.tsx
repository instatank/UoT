'use client';

// A living night sky on <canvas> — layered stars with slow drift, twinkle,
// pointer parallax (fine pointers only), and a rare, quiet meteor. Fills its
// nearest positioned ancestor. Pure canvas + rAF, no dependencies.
// prefers-reduced-motion renders a single static frame: stars, no movement.

import { useEffect, useRef } from 'react';

interface Star {
  x: number; // 0..1 of width
  y: number; // 0..1 of height
  z: number; // depth 0.25..1 — scales parallax, drift, size
  r: number;
  a: number; // base alpha
  tw: number; // twinkle speed
  ph: number; // twinkle phase
  warm: boolean; // a few stars burn gold
}

interface Meteor {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number; // 0..1
}

interface Props {
  /** stars per 10,000 px² — home sky ~1.4, behind the map ~0.7 */
  density?: number;
  /** px of parallax at full depth; 0 disables pointer tracking */
  parallax?: number;
  /** overall alpha multiplier */
  dim?: number;
  /** average seconds between meteors; 0 disables them */
  meteorEvery?: number;
  className?: string;
}

export default function Starfield({
  density = 1.4,
  parallax = 18,
  dim = 1,
  meteorEvery = 34,
  className,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finePointer = window.matchMedia('(pointer: fine)').matches;

    let stars: Star[] = [];
    let meteors: Meteor[] = [];
    let w = 0;
    let h = 0;
    let dpr = 1;
    let raf = 0;
    // parallax offset eases toward the pointer target
    const target = { x: 0, y: 0 };
    const eased = { x: 0, y: 0 };

    const seedStars = () => {
      const count = Math.round(((w * h) / 10000) * density);
      stars = Array.from({ length: count }, () => {
        const z = 0.25 + Math.random() * 0.75;
        return {
          x: Math.random(),
          y: Math.random(),
          z,
          r: (0.35 + Math.pow(Math.random(), 2.4) * 1.25) * z,
          a: 0.25 + Math.random() * 0.55,
          tw: 0.4 + Math.random() * 1.1,
          ph: Math.random() * Math.PI * 2,
          warm: Math.random() < 0.12,
        };
      });
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = Math.max(1, rect.width);
      h = Math.max(1, rect.height);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seedStars();
      if (reduced) draw(0);
    };

    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h);
      const drift = reduced ? 0 : t * 0.0000042; // one slow sidereal slide
      for (const s of stars) {
        const twinkle = reduced ? 1 : 0.72 + 0.28 * Math.sin(t * 0.001 * s.tw + s.ph);
        const px = ((s.x + drift * s.z) % 1) * w + eased.x * s.z;
        const py = s.y * h + eased.y * s.z;
        ctx.globalAlpha = s.a * twinkle * dim;
        ctx.fillStyle = s.warm ? '#e8dcb0' : '#cdd8ec';
        ctx.beginPath();
        ctx.arc(px, py, s.r, 0, Math.PI * 2);
        ctx.fill();
        // the brightest stars get a soft bloom
        if (s.r > 1.1) {
          ctx.globalAlpha = s.a * twinkle * dim * 0.18;
          ctx.beginPath();
          ctx.arc(px, py, s.r * 3.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      for (const m of meteors) {
        const tail = 90 * m.life;
        const grad = ctx.createLinearGradient(m.x, m.y, m.x - m.vx * tail, m.y - m.vy * tail);
        grad.addColorStop(0, `rgba(220, 228, 246, ${0.5 * m.life * dim})`);
        grad.addColorStop(1, 'rgba(220, 228, 246, 0)');
        ctx.globalAlpha = 1;
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.moveTo(m.x, m.y);
        ctx.lineTo(m.x - m.vx * tail, m.y - m.vy * tail);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    };

    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(64, now - last);
      last = now;
      eased.x += (target.x - eased.x) * 0.04;
      eased.y += (target.y - eased.y) * 0.04;
      if (meteorEvery > 0 && Math.random() < dt / (meteorEvery * 1000)) {
        const angle = Math.PI * (0.62 + Math.random() * 0.2); // down-left-ish
        const speed = 0.22 + Math.random() * 0.12;
        meteors.push({
          x: w * (0.25 + Math.random() * 0.65),
          y: h * Math.random() * 0.3,
          vx: Math.cos(angle) * speed * dt,
          vy: Math.sin(angle) * speed * dt,
          life: 1,
        });
      }
      for (const m of meteors) {
        m.x += m.vx * (dt / 16);
        m.y += m.vy * (dt / 16);
        m.life -= dt / 1400;
      }
      meteors = meteors.filter((m) => m.life > 0);
      draw(now);
      raf = requestAnimationFrame(tick);
    };

    const onPointer = (e: PointerEvent) => {
      target.x = (e.clientX / window.innerWidth - 0.5) * -parallax;
      target.y = (e.clientY / window.innerHeight - 0.5) * -parallax;
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    if (!reduced) {
      raf = requestAnimationFrame(tick);
      if (parallax > 0 && finePointer) window.addEventListener('pointermove', onPointer);
    }
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('pointermove', onPointer);
    };
  }, [density, parallax, dim, meteorEvery]);

  return <canvas ref={canvasRef} className={`starfield${className ? ` ${className}` : ''}`} aria-hidden />;
}
