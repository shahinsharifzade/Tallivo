import { useEffect, useRef, useState, useSyncExternalStore } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

function subscribe(onChange: () => void): () => void {
  const mq = window.matchMedia?.(QUERY);
  mq?.addEventListener('change', onChange);
  return () => mq?.removeEventListener('change', onChange);
}

export function prefersReducedMotion(): boolean {
  return window.matchMedia?.(QUERY).matches ?? false;
}

/** True when the user asked the OS to minimize motion. */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, prefersReducedMotion, () => false);
}

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

/**
 * Animates a displayed integer towards `target` (ease-out, requestAnimationFrame).
 * Starts from 0 on mount and when the sign flips; jumps straight to the value under
 * reduced motion. Only the displayed number changes, never the underlying data.
 */
export function useCountUp(target: number, durationMs = 600): number {
  const reduced = usePrefersReducedMotion();
  const [display, setDisplay] = useState(reduced ? target : 0);
  const current = useRef(display);

  useEffect(() => {
    if (reduced) {
      current.current = target;
      setDisplay(target);
      return;
    }
    const from = Math.sign(current.current) === Math.sign(target) ? current.current : 0;
    if (from === target) {
      current.current = target;
      setDisplay(target);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const value = Math.round(from + (target - from) * easeOutCubic(t));
      current.current = value;
      setDisplay(value);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs, reduced]);

  return reduced ? target : display;
}
