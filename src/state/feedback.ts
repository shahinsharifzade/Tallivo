import { createContext, useContext } from 'react';

export interface Feedback {
  /** Short "saved" checkmark toast (+ haptic tap where supported). */
  saved(): void;
  /** Short "copied" checkmark toast (+ haptic tap where supported). */
  copied(): void;
  /** Short error toast. */
  error(message: string): void;
  /** Toast with an Undo button, e.g. after a swipe-to-delete. */
  undoable(message: string, undo: () => Promise<void>): void;
}

export const FeedbackContext = createContext<Feedback | null>(null);

export function useFeedback(): Feedback {
  const ctx = useContext(FeedbackContext);
  if (!ctx) throw new Error('useFeedback must be used inside <FeedbackProvider>');
  return ctx;
}
