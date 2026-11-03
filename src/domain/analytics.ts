// Monthly expense analytics. Only expenses count (never settlements/repayments), all in integer
// qəpik. An expense belongs to its meetup's date (Meetup.date, a calendar day), so every expense
// of one meetup lands on the same day and month, whenever it was recorded.
import { sortMembers } from './members';
import type { Expense, Id, IsoDate, Meetup, Member, Minor } from './types';

/** "YYYY-MM". */
export type YearMonthKey = string;

/** One meetup's combined expenses within a day. */
export interface MeetupTotal {
  meetupId: Id;
  title: string;
  totalMinor: Minor;
}

export interface DayTotal {
  date: IsoDate;
  /** Sum of `meetups` below. */
  totalMinor: Minor;
  /** Meetups held on this day that have counted expenses, in the order they were created. */
  meetups: MeetupTotal[];
}

export interface MonthlyExpenses {
  month: YearMonthKey;
  /** Sum of every counted expense's total. Always equals the sum of `days` and of `byMember`. */
  totalMinor: Minor;
  /** Number of individual expenses counted (not meetups). */
  expenseCount: number;
  /** Every day of the month, in order (zero and no meetups for days without expenses). */
  days: DayTotal[];
  /** memberId -> sum of that member's own shares (not what they paid). Every member is listed. */
  byMember: Record<Id, Minor>;
}

/**
 * Expenses that count for analytics, each with its meetup: not soft-deleted, and in a meetup that
 * exists and is not soft-deleted. (Deleting a meetup already soft-deletes its expenses; the meetup
 * check is a second guard.) An expense without its meetup has no date, so it cannot be placed.
 */
function countedExpenses(
  expenses: readonly Expense[],
  meetups: readonly Meetup[],
): { expense: Expense; meetup: Meetup }[] {
  const meetupById = new Map(meetups.map((m) => [m.id, m]));
  const result: { expense: Expense; meetup: Meetup }[] = [];
  for (const expense of expenses) {
    const meetup = meetupById.get(expense.meetupId);
    if (expense.deletedAt || !meetup || meetup.deletedAt) continue;
    result.push({ expense, meetup });
  }
  return result;
}

function daysInMonth(month: YearMonthKey): number {
  const [y, m] = month.split('-').map(Number) as [number, number];
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export function monthlyExpenses(
  month: YearMonthKey,
  members: readonly Member[],
  expenses: readonly Expense[],
  meetups: readonly Meetup[],
): MonthlyExpenses {
  const days: DayTotal[] = Array.from({ length: daysInMonth(month) }, (_, i) => ({
    date: `${month}-${String(i + 1).padStart(2, '0')}`,
    totalMinor: 0,
    meetups: [],
  }));
  const byMember: Record<Id, Minor> = {};
  for (const m of sortMembers(members)) byMember[m.id] = 0;

  // Grouped by meetup id (never by title), then placed on the meetup's day.
  const perMeetup = new Map<Id, { meetup: Meetup; totalMinor: Minor }>();
  let totalMinor = 0;
  let expenseCount = 0;
  for (const { expense: e, meetup } of countedExpenses(expenses, meetups)) {
    if (!meetup.date.startsWith(`${month}-`)) continue;
    const group = perMeetup.get(meetup.id) ?? { meetup, totalMinor: 0 };
    group.totalMinor += e.totalMinor;
    perMeetup.set(meetup.id, group);
    totalMinor += e.totalMinor;
    expenseCount += 1;
    // Shares, not the payer: whoever paid, each participant's own part is what they spent.
    for (const s of e.shares) byMember[s.memberId] = (byMember[s.memberId] ?? 0) + s.amountMinor;
  }

  const groups = [...perMeetup.values()].sort((a, b) =>
    a.meetup.createdAt.localeCompare(b.meetup.createdAt),
  );
  for (const { meetup, totalMinor: meetupTotal } of groups) {
    const day = days[Number(meetup.date.slice(8, 10)) - 1];
    if (!day) continue;
    day.totalMinor += meetupTotal;
    day.meetups.push({ meetupId: meetup.id, title: meetup.title, totalMinor: meetupTotal });
  }
  return { month, totalMinor, expenseCount, days, byMember };
}

/** The first and last month (by meetup date) that have a counted expense, or null if none. */
export function expenseMonthRange(
  expenses: readonly Expense[],
  meetups: readonly Meetup[],
): { first: YearMonthKey; last: YearMonthKey } | null {
  let first: YearMonthKey | null = null;
  let last: YearMonthKey | null = null;
  for (const { meetup } of countedExpenses(expenses, meetups)) {
    const month = meetup.date.slice(0, 7);
    if (first === null || month < first) first = month;
    if (last === null || month > last) last = month;
  }
  return first && last ? { first, last } : null;
}
