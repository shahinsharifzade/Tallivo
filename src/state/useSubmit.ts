import { useCallback, useRef, useState } from 'react';
import { errorMessage } from './errorMessage';

/**
 * Runs an async action while tracking pending state and a localized error message.
 * A second call while one is still running is ignored (no double submit).
 */
export function useSubmit() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);

  const run = useCallback(async (action: () => Promise<void>): Promise<boolean> => {
    if (inFlight.current) return false;
    inFlight.current = true;
    setPending(true);
    setError(null);
    try {
      await action();
      return true;
    } catch (e) {
      console.error(e);
      setError(errorMessage(e));
      return false;
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }, []);

  return { pending, error, setError, run };
}
