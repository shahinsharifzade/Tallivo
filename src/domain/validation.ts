import type { Expense } from './types';

export type ExpenseValidationError =
  | 'noParticipants'
  | 'nonPositiveTotal'
  | 'nonIntegerAmount'
  | 'sharesSumMismatch'
  | 'duplicateParticipant'
  | 'nonPositiveShare'
  | 'missingPayer';

/** Returns all validation problems; an empty array means the expense is valid. */
export function validateExpense(
  expense: Pick<Expense, 'totalMinor' | 'shares' | 'paidByMemberId'>,
): ExpenseValidationError[] {
  const errors: ExpenseValidationError[] = [];
  const { totalMinor, shares } = expense;

  if (!expense.paidByMemberId) errors.push('missingPayer');
  if (!Number.isInteger(totalMinor)) errors.push('nonIntegerAmount');
  if (!(totalMinor > 0)) errors.push('nonPositiveTotal');
  if (shares.length === 0) errors.push('noParticipants');

  const seen = new Set<string>();
  let duplicate = false;
  let nonPositive = false;
  let nonInteger = false;
  let sum = 0;
  for (const share of shares) {
    if (seen.has(share.memberId)) duplicate = true;
    seen.add(share.memberId);
    if (!Number.isInteger(share.amountMinor)) nonInteger = true;
    if (!(share.amountMinor > 0)) nonPositive = true;
    sum += share.amountMinor;
  }
  if (duplicate) errors.push('duplicateParticipant');
  if (nonPositive) errors.push('nonPositiveShare');
  if (nonInteger && !errors.includes('nonIntegerAmount')) errors.push('nonIntegerAmount');
  if (shares.length > 0 && sum !== totalMinor) errors.push('sharesSumMismatch');

  return errors;
}
