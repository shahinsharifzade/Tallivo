// Which expenses are already paid off ("settled"), derived from the recorded history.
//
// Nothing is stored for this. Active expenses and settlements are replayed in the order they were
// recorded (createdAt), using the same per-record steps as computeBalances. Every time the group's
// balances are all zero again, the expenses recorded since the previous zero point form one
// settlement batch: they are settled at the moment of the record that brought balances to zero.
//
// Properties this guarantees:
// - The final replayed balances are exactly computeBalances(...), so "Hesab bərabər!" on the
//   Overview page holds if and only if every active expense is settled.
// - Partial repayments never settle anything: only a full return to zero does.
// - Expenses recorded after a zero point start a new batch; earlier batches are not affected by
//   anything recorded later.
// - Soft-deleted expenses and settlements are ignored, exactly as in the balances. (Deleting a
//   meetup soft-deletes its expenses, so those are ignored too.)
// - Deleting, restoring or editing an OLD record replays history with that change, so batches
//   always agree with the balances the app shows.
import { applyExpense, applySettlement, emptyBalances } from './balances';
import type { Expense, Id, IsoDateTime, Member, Settlement } from './types';

export interface ExpenseSettlement {
  /** When the group's balances returned to zero, closing this expense's batch. */
  settledAt: IsoDateTime;
  /** Identifies the batch: the id of the expense or settlement that brought balances to zero. */
  batchId: Id;
}

type Event =
  | { kind: 'expense'; at: IsoDateTime; item: Expense }
  | { kind: 'settlement'; at: IsoDateTime; item: Settlement };

/** Recording order. On an exact tie, expenses go first, then by id, so the result is stable. */
function byRecordingOrder(a: Event, b: Event): number {
  if (a.at !== b.at) return a.at < b.at ? -1 : 1;
  if (a.kind !== b.kind) return a.kind === 'expense' ? -1 : 1;
  return a.item.id < b.item.id ? -1 : a.item.id > b.item.id ? 1 : 0;
}

/** expenseId -> its settlement batch, for every active expense that is settled. */
export function expenseSettlements(
  members: readonly Member[],
  expenses: readonly Expense[],
  settlements: readonly Settlement[],
): Map<Id, ExpenseSettlement> {
  const events: Event[] = [
    ...expenses
      .filter((e) => !e.deletedAt)
      .map((e) => ({ kind: 'expense' as const, at: e.createdAt, item: e })),
    ...settlements
      .filter((s) => !s.deletedAt)
      .map((s) => ({ kind: 'settlement' as const, at: s.createdAt, item: s })),
  ].sort(byRecordingOrder);

  const balances = emptyBalances(members);
  const result = new Map<Id, ExpenseSettlement>();
  let open: Id[] = [];
  for (const event of events) {
    if (event.kind === 'expense') {
      applyExpense(balances, event.item);
      open.push(event.item.id);
    } else {
      applySettlement(balances, event.item);
    }
    if (open.length > 0 && Object.values(balances).every((v) => v === 0)) {
      const batch: ExpenseSettlement = { settledAt: event.at, batchId: event.item.id };
      for (const id of open) result.set(id, batch);
      open = [];
    }
  }
  return result;
}
