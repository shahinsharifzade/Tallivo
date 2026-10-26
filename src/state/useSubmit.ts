import { useCallback, useState } from 'react';
import { errorMessage } from './errorMessage';

/** Runs an async action while tracking pending state and a localized error message. */
export function useSubmit() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (action: () => Promise<void>): Promise<boolean> => {
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
      setPending(false);
    }
  }, []);

  return { pending, error, setError, run };
}
