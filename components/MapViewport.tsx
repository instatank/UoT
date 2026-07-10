'use client';

// The map engine shared by all three geometries: pinch-zoom, drag-pan with
// momentum, wheel/trackpad zoom, double-tap zoom, animated focus transitions,
// and zoom controls. Geometries render pure SVG content into it; the engine
// owns the camera. No dependencies — pointer events + rAF.

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';

export interface MapViewportHandle {
  focusOn: (x: number, y: number, opts?: { k?: number; ms?: number }) => void;
  /** Gravitate toward a point: centers it and eases the zoom up to a
   * reading distance if the camera is still at overview scale. */
  approach: (x: number, y: number) => void;
  fit: (ms?: number) => void;
  zoomBy: (f: number) => void;
}

export interface InitialView {
  x: number; // content point to center
  y: number;
  k: number | 'fit' | 'fitW' | 'fitH';
}

interface Props {
  width: number;
  height: number;
  /** Called once on mount with the container size; returns the opening camera. */
  getInitial: (size: { cw: number; ch: number; fitK: number }) => InitialView;
  /** Live pixels obscured at the bottom (detail sheet); focus centers above it. */
  bottomInset?: React.MutableRefObject<number>;
  onBackgroundTap?: () => void;
  onFirstInteract?: () => void;
  ariaLabel: string;
  children: React.ReactNode;
}

const K_MAX = 2.6;
const TAP_SLOP = 9; // px of movement that still counts as a tap

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

const MapViewport = forwardRef<MapViewportHandle, Props>(function MapViewport(
  { width: W, height: H, getInitial, bottomInset, onBackgroundTap, onFirstInteract, ariaLabel, children },
  ref
) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const gRef = useRef<SVGGElement>(null);
  const view = useRef({ x: 0, y: 0, k: 1 });
  const raf = useRef<number | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ d: number; mid: { x: number; y: number }; cx: number; cy: number; k: number } | null>(null);
  const pan = useRef<{ px: number; py: number; vx: number; vy: number; t: number } | null>(null);
  const moved = useRef(false);
  const suppressClick = useRef(false);
  const lastTap = useRef<{ t: number; x: number; y: number } | null>(null);
  const interacted = useRef(false);
  const reduceMotion = useRef(false);
  const [ready, setReady] = useState(false);

  const size = () => {
    const r = wrapRef.current?.getBoundingClientRect();
    return { cw: r?.width ?? 1, ch: r?.height ?? 1 };
  };
  const fitK = useCallback(() => {
    const { cw, ch } = size();
    return Math.min(cw / W, ch / H) * 0.94;
  }, [W, H]);

  const apply = useCallback(() => {
    const v = view.current;
    gRef.current?.setAttribute('transform', `translate(${v.x} ${v.y}) scale(${v.k})`);
  }, []);

  const clampView = useCallback(
    (v: { x: number; y: number; k: number }) => {
      const { cw, ch } = size();
      const kMin = Math.max(fitK() * 0.7, 0.12);
      const k = Math.min(Math.max(v.k, kMin), K_MAX);
      const sw = W * k;
      const sh = H * k;
      const pad = 40;
      const inset = bottomInset?.current ?? 0;
      let x = v.x;
      let y = v.y;
      if (sw <= cw) x = (cw - sw) / 2;
      else x = Math.min(pad, Math.max(cw - sw - pad, x));
      if (sh <= ch - inset) y = (ch - inset - sh) / 2;
      else y = Math.min(pad, Math.max(ch - inset - sh - pad, y));
      return { x, y, k };
    },
    [W, H, fitK, bottomInset]
  );

  const stopAnim = () => {
    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = null;
  };

  const animateTo = useCallback(
    (target: { x: number; y: number; k: number }, ms = 650) => {
      stopAnim();
      const from = { ...view.current };
      const to = clampView(target);
      if (reduceMotion.current || ms <= 0) {
        view.current = to;
        apply();
        return;
      }
      const t0 = performance.now();
      const step = (now: number) => {
        const t = Math.min(1, (now - t0) / ms);
        const e = easeInOutCubic(t);
        view.current = {
          x: from.x + (to.x - from.x) * e,
          y: from.y + (to.y - from.y) * e,
          k: from.k + (to.k - from.k) * e,
        };
        apply();
        if (t < 1) raf.current = requestAnimationFrame(step);
        else raf.current = null;
      };
      raf.current = requestAnimationFrame(step);
    },
    [apply, clampView]
  );

  const centerTarget = useCallback(
    (cx: number, cy: number, k: number) => {
      const { cw, ch } = size();
      const inset = bottomInset?.current ?? 0;
      return { x: cw / 2 - cx * k, y: (ch - inset) / 2 - cy * k, k };
    },
    [bottomInset]
  );

  const focusOn = useCallback(
    (cx: number, cy: number, opts?: { k?: number; ms?: number }) => {
      const k = opts?.k ?? view.current.k;
      animateTo(centerTarget(cx, cy, k), opts?.ms ?? 650);
    },
    [animateTo, centerTarget]
  );

  const fit = useCallback(
    (ms = 550) => animateTo(centerTarget(W / 2, H / 2, fitK()), ms),
    [animateTo, centerTarget, W, H, fitK]
  );

  const approach = useCallback(
    (cx: number, cy: number) => {
      // at overview scale the clamp pins the map to center and focusing is a
      // no-op — drift in a little, so selection feels like moving closer
      const k = Math.max(view.current.k, fitK() * 1.35);
      animateTo(centerTarget(cx, cy, k), 850);
    },
    [animateTo, centerTarget, fitK]
  );

  const zoomAt = useCallback(
    (px: number, py: number, f: number, ms = 0) => {
      const r = wrapRef.current!.getBoundingClientRect();
      const sx = px - r.left;
      const sy = py - r.top;
      const v = view.current;
      const kMin = Math.max(fitK() * 0.7, 0.12);
      const k = Math.min(Math.max(v.k * f, kMin), K_MAX);
      const cx = (sx - v.x) / v.k;
      const cy = (sy - v.y) / v.k;
      const target = clampView({ x: sx - cx * k, y: sy - cy * k, k });
      if (ms > 0) animateTo(target, ms);
      else {
        view.current = target;
        apply();
      }
    },
    [apply, animateTo, clampView, fitK]
  );

  const zoomBy = useCallback(
    (f: number) => {
      const r = wrapRef.current!.getBoundingClientRect();
      zoomAt(r.left + r.width / 2, r.top + r.height / 2, f, 320);
    },
    [zoomAt]
  );

  useImperativeHandle(ref, () => ({ focusOn, approach, fit, zoomBy }), [
    focusOn,
    approach,
    fit,
    zoomBy,
  ]);

  const markInteracted = () => {
    if (!interacted.current) {
      interacted.current = true;
      onFirstInteract?.();
    }
  };

  // ---- gestures ----

  const onPointerDown = (e: React.PointerEvent) => {
    stopAnim();
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    moved.current = false;
    if (pointers.current.size === 1) {
      pan.current = { px: e.clientX, py: e.clientY, vx: 0, vy: 0, t: performance.now() };
    } else if (pointers.current.size === 2) {
      const [p1, p2] = [...pointers.current.values()];
      const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
      const r = wrapRef.current!.getBoundingClientRect();
      const v = view.current;
      pinch.current = {
        d: Math.hypot(p2.x - p1.x, p2.y - p1.y),
        mid,
        cx: (mid.x - r.left - v.x) / v.k,
        cy: (mid.y - r.top - v.y) / v.k,
        k: v.k,
      };
      pan.current = null;
    }
    window.addEventListener('pointermove', onWinMove);
    window.addEventListener('pointerup', onWinUp);
    window.addEventListener('pointercancel', onWinUp);
  };

  const onWinMove = (e: PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    const prev = pointers.current.get(e.pointerId)!;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pinch.current && pointers.current.size >= 2) {
      markInteracted();
      moved.current = true;
      const [p1, p2] = [...pointers.current.values()];
      const d = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
      const r = wrapRef.current!.getBoundingClientRect();
      const kMin = Math.max(fitK() * 0.7, 0.12);
      const k = Math.min(Math.max((pinch.current.k * d) / pinch.current.d, kMin), K_MAX);
      view.current = clampView({
        x: mid.x - r.left - pinch.current.cx * k,
        y: mid.y - r.top - pinch.current.cy * k,
        k,
      });
      apply();
      return;
    }

    if (pan.current && pointers.current.size === 1) {
      const dx = e.clientX - prev.x;
      const dy = e.clientY - prev.y;
      if (!moved.current && Math.hypot(e.clientX - pan.current.px, e.clientY - pan.current.py) > TAP_SLOP) {
        moved.current = true;
        markInteracted();
      }
      if (moved.current) {
        const now = performance.now();
        const dt = Math.max(1, now - pan.current.t);
        pan.current.vx = 0.8 * pan.current.vx + (0.2 * dx) / dt;
        pan.current.vy = 0.8 * pan.current.vy + (0.2 * dy) / dt;
        pan.current.t = now;
        view.current = clampView({ x: view.current.x + dx, y: view.current.y + dy, k: view.current.k });
        apply();
      }
    }
  };

  const onWinUp = (e: PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    if (pointers.current.size === 0) {
      window.removeEventListener('pointermove', onWinMove);
      window.removeEventListener('pointerup', onWinUp);
      window.removeEventListener('pointercancel', onWinUp);
      if (moved.current) {
        suppressClick.current = true;
        setTimeout(() => (suppressClick.current = false), 80);
        // momentum
        const p = pan.current;
        if (p && !reduceMotion.current) {
          let vx = p.vx * 16;
          let vy = p.vy * 16;
          if (Math.hypot(vx, vy) > 1.5) {
            let last = performance.now();
            const glide = (now: number) => {
              const dt = now - last;
              last = now;
              const decay = Math.exp(-dt / 260);
              vx *= decay;
              vy *= decay;
              const next = clampView({
                x: view.current.x + vx * (dt / 16),
                y: view.current.y + vy * (dt / 16),
                k: view.current.k,
              });
              if (next.x === view.current.x) vx = 0;
              if (next.y === view.current.y) vy = 0;
              view.current = next;
              apply();
              if (Math.hypot(vx, vy) > 0.35) raf.current = requestAnimationFrame(glide);
              else raf.current = null;
            };
            stopAnim();
            raf.current = requestAnimationFrame(glide);
          }
        }
      } else {
        // clean tap — double-tap zooms
        const now = performance.now();
        const t = lastTap.current;
        if (t && now - t.t < 320 && Math.hypot(e.clientX - t.x, e.clientY - t.y) < 32) {
          markInteracted();
          const nearFit = view.current.k < fitK() * 1.45;
          if (nearFit) zoomAt(e.clientX, e.clientY, 1.9 / (view.current.k / fitK()), 480);
          else fit(480);
          lastTap.current = null;
        } else {
          lastTap.current = { t: now, x: e.clientX, y: e.clientY };
        }
      }
      pan.current = null;
    }
  };

  const onClickCapture = (e: React.MouseEvent) => {
    if (suppressClick.current) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const onClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget || (e.target as Element).classList?.contains('map-svg')) {
      onBackgroundTap?.();
    }
  };

  // wheel zoom (trackpad pinch sends ctrlKey)
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      markInteracted();
      const f = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0022));
      zoomAt(e.clientX, e.clientY, f);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoomAt]);

  // opening camera
  useEffect(() => {
    reduceMotion.current =
      typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const { cw, ch } = size();
    const init = getInitial({ cw, ch, fitK: fitK() });
    let k: number;
    if (init.k === 'fit') k = fitK();
    else if (init.k === 'fitW') k = cw / W;
    else if (init.k === 'fitH') k = Math.min(ch / H, 1.1);
    else k = init.k;
    view.current = clampView(centerTarget(init.x, init.y, k));
    apply();
    setReady(true);
    const ro = new ResizeObserver(() => {
      view.current = clampView(view.current);
      apply();
    });
    if (wrapRef.current) ro.observe(wrapRef.current);
    return () => {
      ro.disconnect();
      stopAnim();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={`map-viewport${ready ? ' ready' : ''}`} ref={wrapRef}>
      <svg
        className="map-svg"
        role="img"
        aria-label={ariaLabel}
        onPointerDown={onPointerDown}
        onClickCapture={onClickCapture}
        onClick={onClick}
      >
        <defs>
          <filter id="nodeGlow" x="-120%" y="-120%" width="340%" height="340%">
            <feGaussianBlur stdDeviation="5" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="edgeGlow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="2.2" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* pure blur — node auras */}
          <filter id="softBlur" x="-120%" y="-120%" width="340%" height="340%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
        </defs>
        <g ref={gRef}>{children}</g>
      </svg>
      <div className="zoom-controls" aria-label="Map zoom">
        <button aria-label="Zoom in" onClick={() => zoomBy(1.4)}>
          +
        </button>
        <button aria-label="Fit whole map" onClick={() => fit()}>
          ◎
        </button>
        <button aria-label="Zoom out" onClick={() => zoomBy(1 / 1.4)}>
          −
        </button>
      </div>
    </div>
  );
});

export default MapViewport;
