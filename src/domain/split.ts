import type { ExpenseShare, Id, Minor } from './types';

/**
 * Splits totalMinor equally between participants.
 * Base share = floor(total / n); the remainder is handed out one qəpik at a time
 * to participants in the order given. Callers should pass ids ordered by member sortOrder.
 */
export function splitEqually(totalMinor: Minor, participantIds: readonly Id[]): ExpenseShare[] {
  const n = participantIds.length;
  if (n === 0) return [];
  const base = Math.floor(totalMinor / n);
  const remainder = totalMinor - base * n;
  return participantIds.map((memberId, i) => ({
    memberId,
    amountMinor: base + (i < remainder ? 1 : 0),
  }));
}
