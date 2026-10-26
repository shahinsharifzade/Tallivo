import { useEffect, useRef } from 'react';
import { MEMBER_PALETTE } from '../lib/memberColors';
import { prefersReducedMotion } from '../lib/motion';

const DURATION_MS = 2000;
const FADE_MS = 500;
const COUNT = 140;
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
}

/** One ~2 s burst of canvas confetti. Calls onDone when finished (immediately under reduced motion). */
export function Confetti({ onDone }: { onDone: () => void }) {
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
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const particles: Particle[] = Array.from({ length: COUNT }, (_, i) => {
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
      ctx.globalAlpha = Math.max(0, Math.min(1, (DURATION_MS - elapsed) / FADE_MS));
      for (const p of particles) {
        p.vy += 0.28 * step;
        p.vx *= 0.99;
        p.x += p.vx * step;
        p.y += p.vy * step;
        p.rotation += p.spin * step;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx.restore();
      }
      if (elapsed < DURATION_MS) frame = requestAnimationFrame(tick);
      else done.current();
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      data-confetti
      className="pointer-events-none fixed inset-0 z-50 h-full w-full"
    />
  );
}
