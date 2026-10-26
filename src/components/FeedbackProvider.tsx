import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { az } from '../i18n/az';
import { errorMessage } from '../state/errorMessage';
import { FeedbackContext, type Feedback } from '../state/feedback';
import { CheckIcon } from './icons';

type Toast =
  | { id: number; kind: 'saved' }
  | { id: number; kind: 'undo'; message: string; undo: () => Promise<void> }
  | { id: number; kind: 'error'; message: string };

const SAVED_MS = 1400;
const UNDO_MS = 5000;

/** Optional haptic tap; silently ignored where unsupported. */
function vibrate(): void {
  try {
    navigator.vibrate?.(15);
  } catch {
    // Not supported or blocked: nothing to do.
  }
}

/** Provides toasts (saved checkmark, undo) above the bottom tab bar. */
export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const nextId = useRef(1);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(
      () => setToast((t) => (t?.id === toast.id ? null : t)),
      toast.kind === 'saved' ? SAVED_MS : UNDO_MS,
    );
    return () => window.clearTimeout(timer);
  }, [toast]);

  const saved = useCallback(() => {
    vibrate();
    setToast({ id: nextId.current++, kind: 'saved' });
  }, []);

  const undoable = useCallback((message: string, undo: () => Promise<void>) => {
    setToast({ id: nextId.current++, kind: 'undo', message, undo });
  }, []);

  const value = useMemo<Feedback>(() => ({ saved, undoable }), [saved, undoable]);

  const runUndo = async (undo: () => Promise<void>) => {
    setToast(null);
    try {
      await undo();
    } catch (e) {
      setToast({ id: nextId.current++, kind: 'error', message: errorMessage(e) });
    }
  };

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-40 flex justify-center px-4 md:bottom-6"
      >
        {toast && (
          <div
            key={toast.id}
            role="status"
            className="toast-in pointer-events-auto flex min-h-12 max-w-md items-center gap-3 rounded-full bg-ink py-2 pl-3 pr-2 text-sm font-medium text-bg shadow-raised"
          >
            {toast.kind === 'saved' && (
              <>
                <span className="check-pop flex h-7 w-7 items-center justify-center rounded-full bg-pos-bar text-white">
                  <CheckIcon />
                </span>
                <span className="pr-3">{az.feedback.saved}</span>
              </>
            )}
            {toast.kind === 'undo' && (
              <>
                <span className="pl-1">{toast.message}</span>
                <button
                  type="button"
                  onClick={() => runUndo(toast.undo)}
                  className="min-h-10 rounded-full bg-bg/15 px-4 font-semibold text-bg transition-[transform,background-color] hover:bg-bg/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent active:scale-95"
                >
                  {az.feedback.undo}
                </button>
              </>
            )}
            {toast.kind === 'error' && <span className="px-2">{toast.message}</span>}
          </div>
        )}
      </div>
    </FeedbackContext.Provider>
  );
}
