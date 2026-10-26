import type { Balances, Expense, Id, Member, Settlement } from './types';
import { sortMembers } from './members';

function emptyBalances(members: readonly Member[]): Balances {
  const balances: Balances = {};
  for (const m of sortMembers(members)) balances[m.id] = 0;
  return balances;
}

function add(balances: Balances, memberId: Id, delta: number): void {
  balances[memberId] = (balances[memberId] ?? 0) + delta;
}

function applyExpenses(balances: Balances, expenses: readonly Expense[]): void {
  for (const e of expenses) {
    if (e.deletedAt) continue;
    add(balances, e.paidByMemberId, e.totalMinor);
    for (const s of e.shares) add(balances, s.memberId, -s.amountMinor);
  }
}

function sanityCheck(balances: Balances, context: string): void {
  const sum = Object.values(balances).reduce((acc, v) => acc + v, 0);
  if (sum !== 0) {
    console.error(`[tallivo] Balances do not sum to 0 (${context}): sum=${sum}`, balances);
  }
}

/**
 * Overall balances across all non-deleted expenses and settlements.
 * Expense: payer += total, each share holder -= share.
 * Settlement from A to B of x: A += x, B -= x.
 */
export function computeBalances(
  members: readonly Member[],
  expenses: readonly Expense[],
  settlements: readonly Settlement[],
): Balances {
  const balances = emptyBalances(members);
  applyExpenses(balances, expenses);
  for (const s of settlements) {
    if (s.deletedAt) continue;
    add(balances, s.fromMemberId, s.amountMinor);
    add(balances, s.toMemberId, -s.amountMinor);
  }
  sanityCheck(balances, 'overall');
  return balances;
}

/** Balances for a single meetup: only its expenses, never settlements (those are global). */
export function computeBalancesForMeetup(
  meetupId: Id,
  members: readonly Member[],
  expenses: readonly Expense[],
): Balances {
  const balances = emptyBalances(members);
  applyExpenses(
    balances,
    expenses.filter((e) => e.meetupId === meetupId),
  );
  sanityCheck(balances, `meetup ${meetupId}`);
  return balances;
}
