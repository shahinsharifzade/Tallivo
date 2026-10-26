import type { Expense, Id, Member, Settlement } from './types';

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

export type SettlementValidationError = 'missingMember' | 'sameMember' | 'nonPositiveAmount';

export function validateSettlement(
  settlement: Pick<Settlement, 'fromMemberId' | 'toMemberId' | 'amountMinor'>,
): SettlementValidationError[] {
  const errors: SettlementValidationError[] = [];
  const { fromMemberId, toMemberId, amountMinor } = settlement;
  if (!fromMemberId || !toMemberId) errors.push('missingMember');
  else if (fromMemberId === toMemberId) errors.push('sameMember');
  if (!Number.isInteger(amountMinor) || amountMinor <= 0) errors.push('nonPositiveAmount');
  return errors;
}

export const MAX_NAME_LENGTH = 40;

export type MemberNameError = 'empty' | 'tooLong' | 'duplicate';

/** Validates a member name; names must be unique (case-insensitive) among members. */
export function validateMemberName(
  name: string,
  members: readonly Member[],
  excludeMemberId?: Id,
): MemberNameError | null {
  const trimmed = name.trim();
  if (trimmed === '') return 'empty';
  if (trimmed.length > MAX_NAME_LENGTH) return 'tooLong';
  const lower = trimmed.toLocaleLowerCase('az');
  const clash = members.some(
    (m) => m.id !== excludeMemberId && m.name.trim().toLocaleLowerCase('az') === lower,
  );
  return clash ? 'duplicate' : null;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** True for a real calendar date in "YYYY-MM-DD" form. */
export function isIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number) as [number, number, number];
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

/** True if the member appears in any expense or settlement, including soft-deleted ones. */
export function isMemberReferenced(
  memberId: Id,
  expenses: readonly Expense[],
  settlements: readonly Settlement[],
): boolean {
  return (
    expenses.some(
      (e) => e.paidByMemberId === memberId || e.shares.some((s) => s.memberId === memberId),
    ) || settlements.some((s) => s.fromMemberId === memberId || s.toMemberId === memberId)
  );
}
