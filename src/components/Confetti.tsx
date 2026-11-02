import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { MEMBER_PALETTE } from '../lib/memberColors';
import { prefersReducedMotion } from '../lib/motion';

const DURATION_MS = 2000;
const FADE_MS = 500;
const COUNT = 140;
/** Slower fall than the burst, so edge confetti drifts across the screen. */
const GRAVITY = { burst: 0.28, edges: 0.09 };
const DRAG = { burst: 0.99, edges: 0.985 };
const COLORS = [...MEMBER_PALETTE, '#2DD4BF', '#FBBF24', '#F47059'];

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rotation: number;
  spin: number;
  color: string;
  /** Milliseconds before this particle starts moving (edges only). */
  delay: number;
  /** Side-to-side flutter strength and phase, and the 3D-like tumble speed (edges only). */
  sway: number;
  phase: number;
  tumble: number;
  round: boolean;
}

/** Enters from the left, right or top edge and heads inwards on its own trajectory. */
function edgeParticle(i: number, width: number, height: number): Particle {
  const side = i % 3;
  const speed = 5 + Math.random() * 8;
  const spread = (Math.random() - 0.5) * 1.1;
  const angle =
    side === 0 ? -0.35 + spread : side === 1 ? Math.PI + 0.35 - spread : Math.PI / 2 + spread;
  return {
    x: side === 0 ? -12 : side === 1 ? width + 12 : Math.random() * width,
    y: side === 2 ? -12 : Math.random() * height * 0.7,
    vx: Math.cos(angle) * speed * (side === 2 ? 0.6 : 1 + width / 900),
    vy: Math.sin(angle) * speed,
    size: 5 + Math.random() * 7,
    rotation: Math.random() * Math.PI,
    spin: (Math.random() - 0.5) * 0.2,
    color: COLORS[i % COLORS.length] ?? '#2DD4BF',
    delay: Math.random() * 700,
    sway: 0.4 + Math.random() * 0.9,
    phase: Math.random() * Math.PI * 2,
    tumble: 0.05 + Math.random() * 0.12,
    round: i % 5 === 0,
  };
}

/**
 * One ~2 s run of canvas confetti: a burst from the middle, or `edges` coming in from the sides
 * and top. Calls onDone when finished (immediately under reduced motion).
 */
export function Confetti({
  onDone,
  variant = 'burst',
  durationMs = DURATION_MS,
}: {
  onDone: () => void;
  variant?: 'burst' | 'edges';
  durationMs?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || prefersReducedMotion()) {
      done.current();
      return;
    }

    const dpr = window.devicePixelRatio || 1;
    const width = window.innerWidth;
    const height = window.innerHeight;
    const count = variant === 'edges' && width < 640 ? 90 : COUNT;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const particles: Particle[] = Array.from({ length: count }, (_, i) => {
      if (variant === 'edges') return edgeParticle(i, width, height);
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.6;
      const speed = 7 + Math.random() * 9;
      return {
        x: width / 2 + (Math.random() - 0.5) * 60,
        y: height * 0.35,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 6 + Math.random() * 6,
        rotation: Math.random() * Math.PI,
        spin: (Math.random() - 0.5) * 0.3,
        color: COLORS[i % COLORS.length] ?? '#2DD4BF',
        delay: 0,
        sway: 0,
        phase: 0,
        tumble: 0,
        round: false,
      };
    });

    let frame = 0;
    let last = performance.now();
    const start = last;
    const tick = (now: number) => {
      const elapsed = now - start;
      const step = Math.min(2, (now - last) / 16.7); // normalize to ~60 fps
      last = now;
      ctx.clearRect(0, 0, width, height);
      ctx.globalAlpha = Math.max(0, Math.min(1, (durationMs - elapsed) / FADE_MS));
      for (const p of particles) {
        if (elapsed < p.delay) continue;
        p.vy += GRAVITY[variant] * step;
        p.vx *= DRAG[variant];
        if (variant === 'edges') p.vy *= DRAG.edges;
        p.phase += p.tumble * step;
        p.x += (p.vx + Math.sin(p.phase) * p.sway) * step;
        p.y += p.vy * step;
        p.rotation += p.spin * step;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        if (p.tumble > 0) ctx.scale(1, Math.cos(p.phase * 2));
        ctx.fillStyle = p.color;
        if (p.round) {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2.4, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        }
        ctx.restore();
      }
      if (elapsed < durationMs) frame = requestAnimationFrame(tick);
      else done.current();
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [variant, durationMs]);

  // Portal to <body> so animated (transformed) ancestors cannot offset the fixed canvas.
  return createPortal(
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      data-confetti
      className="pointer-events-none fixed inset-0 z-[51] h-full w-full"
    />,
    document.body,
  );
}
