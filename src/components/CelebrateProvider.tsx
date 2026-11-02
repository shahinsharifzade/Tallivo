import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Expense, Id, Settlement } from '../domain';
import { vibrate } from '../lib/haptics';
import { CelebrateContext, type Celebrate } from '../state/celebrate';
import { useAppData } from '../state/hooks';
import { ExpenseSplitCelebration } from './ExpenseSplitCelebration';
import { PaymentCelebration } from './PaymentCelebration';

type Moment =
  | { id: number; kind: 'payment'; settlement: Settlement }
  | { id: number; kind: 'expense'; expense: Expense };

/** Lives above the routes, so a celebration keeps playing while the page behind it changes. */
export function CelebrateProvider({ children }: { children: ReactNode }) {
  const { members } = useAppData();
  const [moment, setMoment] = useState<Moment | null>(null);
  const [newMeetupId, setNewMeetupId] = useState<Id | null>(null);
  const nextId = useRef(1);

  const payment = useCallback((settlement: Settlement) => {
    vibrate();
    setMoment({ id: nextId.current++, kind: 'payment', settlement });
  }, []);
  const expenseSplit = useCallback((expense: Expense) => {
    vibrate();
    setMoment({ id: nextId.current++, kind: 'expense', expense });
  }, []);
  const clearNewMeetup = useCallback(() => setNewMeetupId(null), []);
  const finish = useCallback(() => setMoment(null), []);

  const active = moment !== null;
  const value = useMemo<Celebrate>(
    () => ({
      payment,
      expenseSplit,
      markNewMeetup: setNewMeetupId,
      newMeetupId,
      clearNewMeetup,
      active,
    }),
    [payment, expenseSplit, newMeetupId, clearNewMeetup, active],
  );

  return (
    <CelebrateContext.Provider value={value}>
      {children}
      {moment?.kind === 'payment' && (
        <PaymentCelebration
          key={moment.id}
          settlement={moment.settlement}
          members={members}
          onDone={finish}
        />
      )}
      {moment?.kind === 'expense' && (
        <ExpenseSplitCelebration
          key={moment.id}
          expense={moment.expense}
          members={members}
          onDone={finish}
        />
      )}
    </CelebrateContext.Provider>
  );
}
