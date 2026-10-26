// Turns the raw expense form state into a validated ExpenseInput.
// All money math is delegated to src/domain (parseMoney, splitEqually, validateExpense).
import {
  formatMoneyPlain,
  parseMoney,
  sortMembers,
  splitEqually,
  validateExpense,
  type Expense,
  type ExpenseShare,
  type Id,
  type Member,
  type Minor,
} from '../../domain';
import type { ExpenseInput } from '../../data/repository';
import { az } from '../../i18n/az';
import { moneyErrorMessage } from '../../lib/errors';

export type SplitMode = 'equal' | 'custom';

export interface ExpenseDraft {
  title: string;
  total: string;
  paidBy: Id | null;
  participants: ReadonlySet<Id>;
  mode: SplitMode;
  /** Raw custom amount text per member. */
  custom: Readonly<Record<Id, string>>;
  note: string;
}

export interface DraftErrors {
  title?: string;
  total?: string;
  paidBy?: string;
  participants?: string;
  customAmounts?: string;
  customSum?: string;
}

export interface DraftEvaluation {
  /** Selected participants in member sortOrder. */
  orderedParticipants: Member[];
  totalMinor: Minor | null;
  errors: DraftErrors;
  /** Per-member custom amount errors (custom mode only). */
  customErrors: Record<Id, string>;
  /** Shares that will be saved (equal mode: computed; custom mode: when all amounts parse). */
  shares: ExpenseShare[] | null;
  /** Custom mode: the per-member amounts that currently parse (for the live split bar). */
  validCustomShares: ExpenseShare[];
  /** Custom mode: sum of the amounts that parse. */
  assignedMinor: Minor;
  /** Custom mode: total - assigned (null if the total is invalid). */
  remainingMinor: Minor | null;
  input: ExpenseInput | null;
}

export function newDraft(members: readonly Member[]): ExpenseDraft {
  return {
    title: '',
    total: '',
    paidBy: null,
    participants: new Set(members.map((m) => m.id)),
    mode: 'equal',
    custom: {},
    note: '',
  };
}

/** Rebuilds form state from a saved expense; picks "equal" mode if the shares match an equal split. */
export function draftFromExpense(expense: Expense, members: readonly Member[]): ExpenseDraft {
  const shareById = new Map(expense.shares.map((s) => [s.memberId, s.amountMinor]));
  const ordered = sortMembers(members).filter((m) => shareById.has(m.id));
  const equal = splitEqually(
    expense.totalMinor,
    ordered.map((m) => m.id),
  );
  const isEqual = equal.every((s) => shareById.get(s.memberId) === s.amountMinor);
  const custom: Record<Id, string> = {};
  for (const [id, amount] of shareById) custom[id] = formatMoneyPlain(amount);
  return {
    title: expense.title,
    total: formatMoneyPlain(expense.totalMinor),
    paidBy: expense.paidByMemberId,
    participants: new Set(shareById.keys()),
    mode: isEqual ? 'equal' : 'custom',
    custom: isEqual ? {} : custom,
    note: expense.note ?? '',
  };
}

export function evaluateDraft(
  draft: ExpenseDraft,
  members: readonly Member[],
  meetupId: Id,
): DraftEvaluation {
  const t = az.expenseForm;
  const errors: DraftErrors = {};
  const customErrors: Record<Id, string> = {};

  const orderedParticipants = sortMembers(members).filter((m) => draft.participants.has(m.id));
  if (draft.title.trim() === '') errors.title = t.titleRequired;
  if (!draft.paidBy) errors.paidBy = t.paidByRequired;
  if (orderedParticipants.length === 0) errors.participants = t.participantsRequired;

  const parsedTotal = parseMoney(draft.total);
  const totalMinor = parsedTotal.ok ? parsedTotal.minor : null;
  if (!parsedTotal.ok) errors.total = moneyErrorMessage(parsedTotal.error);

  let shares: ExpenseShare[] | null = null;
  let assignedMinor = 0;
  let validCustomShares: ExpenseShare[] = [];

  if (draft.mode === 'equal') {
    if (totalMinor !== null && orderedParticipants.length > 0) {
      shares = splitEqually(
        totalMinor,
        orderedParticipants.map((m) => m.id),
      );
    }
  } else {
    const customShares: ExpenseShare[] = [];
    for (const m of orderedParticipants) {
      const parsed = parseMoney(draft.custom[m.id] ?? '');
      if (parsed.ok) {
        assignedMinor += parsed.minor;
        customShares.push({ memberId: m.id, amountMinor: parsed.minor });
      } else {
        customErrors[m.id] = moneyErrorMessage(parsed.error);
      }
    }
    validCustomShares = customShares;
    if (Object.keys(customErrors).length > 0) errors.customAmounts = t.customAmountsInvalid;
    else if (orderedParticipants.length > 0) shares = customShares;
  }

  const remainingMinor = totalMinor === null ? null : totalMinor - assignedMinor;
  if (draft.mode === 'custom' && remainingMinor !== null && remainingMinor !== 0) {
    errors.customSum = t.sumMismatch;
  }

  let input: ExpenseInput | null = null;
  if (Object.keys(errors).length === 0 && shares && totalMinor !== null && draft.paidBy) {
    const candidate: ExpenseInput = {
      meetupId,
      title: draft.title.trim(),
      totalMinor,
      paidByMemberId: draft.paidBy,
      shares,
      note: draft.note,
    };
    // Final guard: the domain validator has the last word.
    if (validateExpense(candidate).length === 0) input = candidate;
    else errors.customSum = t.sumMismatch;
  }

  return {
    orderedParticipants,
    totalMinor,
    errors,
    customErrors,
    shares,
    validCustomShares,
    assignedMinor,
    remainingMinor,
    input,
  };
}
