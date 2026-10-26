import { useCallback, useEffect, useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';

export interface Celebration {
  /** True after the group went from "someone owes" to "all settled" during this session. */
  pending: boolean;
  /** Marks the celebration as shown. */
  consume: () => void;
}

/**
 * Lives in the always-mounted layout so it notices the transition into the settled state even
 * when it happens on another screen (e.g. the payment form). The first value after loading is
 * only a baseline, so opening an already-settled app does not celebrate.
 */
export function useSettledTransition(settled: boolean, ready: boolean): Celebration {
  const previous = useRef<boolean | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!ready) return;
    if (previous.current === false && settled) setPending(true);
    if (!settled) setPending(false);
    previous.current = settled;
  }, [settled, ready]);

  const consume = useCallback(() => setPending(false), []);
  return { pending, consume };
}

/** Read the celebration state provided by AppLayout via <Outlet context>. */
export function useCelebration(): Celebration {
  return useOutletContext<Celebration>();
}
