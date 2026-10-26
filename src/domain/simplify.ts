import type { Balances, Id, Member, Transfer } from './types';
import { memberOrderComparator } from './members';

/**
 * Greedy debt simplification: repeatedly match the largest debtor with the largest creditor
 * and transfer the smaller of the two amounts. Every step settles at least one person and the
 * last step settles two, so n non-zero balances need at most n-1 transfers.
 * Ties are broken by member sortOrder, so the output is deterministic.
 */
export function simplifyDebts(balances: Balances, members: readonly Member[]): Transfer[] {
  const byOrder = memberOrderComparator(members);
  const remaining = new Map<Id, number>();
  for (const id of Object.keys(balances).sort(byOrder)) {
    const value = balances[id] ?? 0;
    if (value !== 0) remaining.set(id, value);
  }

  const transfers: Transfer[] = [];
  // Hard cap guards against an infinite loop if balances do not sum to zero.
  const maxSteps = remaining.size;
  for (let step = 0; step < maxSteps; step++) {
    let creditor: Id | undefined;
    let debtor: Id | undefined;
    // Map iteration follows sortOrder, and strict comparisons keep the first one on ties.
    for (const [id, value] of remaining) {
      if (value > 0 && (creditor === undefined || value > (remaining.get(creditor) ?? 0))) {
        creditor = id;
      }
      if (value < 0 && (debtor === undefined || value < (remaining.get(debtor) ?? 0))) {
        debtor = id;
      }
    }
    if (creditor === undefined || debtor === undefined) break;

    const credit = remaining.get(creditor) ?? 0;
    const debt = -(remaining.get(debtor) ?? 0);
    const amount = Math.min(credit, debt);
    transfers.push({ fromMemberId: debtor, toMemberId: creditor, amountMinor: amount });

    const newCredit = credit - amount;
    const newDebt = debt - amount;
    if (newCredit === 0) remaining.delete(creditor);
    else remaining.set(creditor, newCredit);
    if (newDebt === 0) remaining.delete(debtor);
    else remaining.set(debtor, -newDebt);
  }

  if (remaining.size > 0) {
    console.error('[tallivo] simplifyDebts could not settle all balances', remaining);
  }
  return transfers;
}

/** Applies transfers to balances (debtor pays creditor) and returns the resulting balances. */
export function applyTransfers(balances: Balances, transfers: readonly Transfer[]): Balances {
  const result: Balances = { ...balances };
  for (const t of transfers) {
    result[t.fromMemberId] = (result[t.fromMemberId] ?? 0) + t.amountMinor;
    result[t.toMemberId] = (result[t.toMemberId] ?? 0) - t.amountMinor;
  }
  return result;
}
