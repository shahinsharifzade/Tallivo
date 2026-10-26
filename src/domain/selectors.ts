import type { Expense, Id, Member, Minor } from './types';
import { sortMembers } from './members';

function active<T extends { deletedAt?: string }>(items: readonly T[]): T[] {
  return items.filter((i) => !i.deletedAt);
}

/** Total spent by the group across the given (non-deleted) expenses. */
export function totalSpent(expenses: readonly Expense[]): Minor {
  return active(expenses).reduce((acc, e) => acc + e.totalMinor, 0);
}

/** memberId -> total amount this member paid for expenses. */
export function totalPaidByMember(
  members: readonly Member[],
  expenses: readonly Expense[],
): Record<Id, Minor> {
  const result: Record<Id, Minor> = {};
  for (const m of sortMembers(members)) result[m.id] = 0;
  for (const e of active(expenses)) {
    result[e.paidByMemberId] = (result[e.paidByMemberId] ?? 0) + e.totalMinor;
  }
  return result;
}

/** memberId -> total amount this member consumed (sum of their shares). */
export function totalConsumedByMember(
  members: readonly Member[],
  expenses: readonly Expense[],
): Record<Id, Minor> {
  const result: Record<Id, Minor> = {};
  for (const m of sortMembers(members)) result[m.id] = 0;
  for (const e of active(expenses)) {
    for (const s of e.shares) result[s.memberId] = (result[s.memberId] ?? 0) + s.amountMinor;
  }
  return result;
}

/** Distinct participant ids (share holders) across the given non-deleted expenses. */
export function participantIds(expenses: readonly Expense[]): Set<Id> {
  const ids = new Set<Id>();
  for (const e of active(expenses)) for (const s of e.shares) ids.add(s.memberId);
  return ids;
}
