import { createContext, useContext } from 'react';
import type { Expense, Id, Settlement } from '../domain';

/**
 * One-off success animations. Call these only after the write has succeeded: pass what the
 * repository returned, so the animation shows exactly what was saved.
 */
export interface Celebrate {
  payment(settlement: Settlement): void;
  expenseSplit(expense: Expense): void;
  /** The meetups list gives this meetup's card its entrance the next time it is shown. */
  markNewMeetup(id: Id): void;
  /** The meetup waiting for its entrance, if any. */
  newMeetupId: Id | null;
  clearNewMeetup(): void;
  /** A full-screen celebration is on screen right now. */
  active: boolean;
}

export const CelebrateContext = createContext<Celebrate | null>(null);

export function useCelebrate(): Celebrate {
  const ctx = useContext(CelebrateContext);
  if (!ctx) throw new Error('useCelebrate must be used inside <CelebrateProvider>');
  return ctx;
}
