// The reference scenario from the spec, built in memory only (never persisted).
import type { Expense, Meetup, Member, Settlement } from '../../domain';

const createdAt = '2026-01-01T00:00:00.000Z';

export const ids = {
  ashraf: 'member-ashraf',
  ayxan: 'member-ayxan',
  shahin: 'member-shahin',
  seyid: 'member-seyid',
  garden: 'meetup-garden',
  playstation: 'meetup-playstation',
  coffee: 'meetup-coffee',
} as const;

export const members: Member[] = [
  { id: ids.ashraf, name: 'Əşrəf', sortOrder: 0, createdAt },
  { id: ids.ayxan, name: 'Ayxan', sortOrder: 1, createdAt },
  { id: ids.shahin, name: 'Şahin', sortOrder: 2, createdAt },
  { id: ids.seyid, name: 'Seyid', sortOrder: 3, createdAt },
];

export const meetups: Meetup[] = [
  { id: ids.garden, title: 'Garden', date: '2026-01-01', createdAt },
  { id: ids.playstation, title: 'PlayStation', date: '2026-01-02', createdAt },
  { id: ids.coffee, title: 'Coffee', date: '2026-01-03', createdAt },
];

function expense(
  id: string,
  meetupId: string,
  title: string,
  totalMinor: number,
  paidByMemberId: string,
  shares: [string, number][],
): Expense {
  return {
    id,
    meetupId,
    title,
    totalMinor,
    paidByMemberId,
    shares: shares.map(([memberId, amountMinor]) => ({ memberId, amountMinor })),
    createdAt,
    updatedAt: createdAt,
  };
}

export const expenses: Expense[] = [
  expense('expense-garden', ids.garden, 'Garden', 3000, ids.ayxan, [
    [ids.ayxan, 1000],
    [ids.shahin, 1000],
    [ids.seyid, 1000],
  ]),
  expense('expense-playstation', ids.playstation, 'PlayStation', 2000, ids.shahin, [
    [ids.ayxan, 667],
    [ids.shahin, 667],
    [ids.ashraf, 666],
  ]),
  expense('expense-coffee', ids.coffee, 'Coffee', 3000, ids.shahin, [
    [ids.ayxan, 1200],
    [ids.ashraf, 1100],
    [ids.shahin, 700],
  ]),
];

export const settlementAshrafToShahin: Settlement = {
  id: 'settlement-1',
  fromMemberId: ids.ashraf,
  toMemberId: ids.shahin,
  amountMinor: 1000,
  date: '2026-01-04',
  createdAt,
};

// ---- Settlement cycles and monthly analytics (separate timeline, distinct createdAt values) ----

const at = (day: number, hour: number) =>
  `2026-01-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:00:00.000Z`;

function timedExpense(
  id: string,
  meetupId: string,
  createdAt: string,
  totalMinor: number,
  paidByMemberId: string,
  shares: [string, number][],
  deletedAt?: string,
): Expense {
  return {
    ...expense(id, meetupId, id, totalMinor, paidByMemberId, shares),
    createdAt,
    updatedAt: createdAt,
    deletedAt,
  };
}

function timedSettlement(
  id: string,
  createdAt: string,
  fromMemberId: string,
  toMemberId: string,
  amountMinor: number,
): Settlement {
  return { id, fromMemberId, toMemberId, amountMinor, date: createdAt.slice(0, 10), createdAt };
}

export const cycleMeetups: Meetup[] = [
  ...meetups,
  { id: 'meetup-gone', title: 'Gone', date: '2026-01-05', createdAt, deletedAt: at(9, 12) },
];

/**
 * Batch 1: e1 (Əşrəf pays 100 ₼, four equal shares) and e2 (Ayxan pays 30 ₼ for Şahin 20 and
 * Seyid 10: payer not a participant). Partial repayments s1..s3, then s4 brings everyone to zero.
 * Batch 2: e3 after the settlement, settled later by s5. e4 and e5 (deleted meetup) never count.
 */
export const cycleExpenses: Expense[] = [
  timedExpense('e1', ids.garden, at(2, 10), 10000, ids.ashraf, [
    [ids.ashraf, 2500],
    [ids.ayxan, 2500],
    [ids.shahin, 2500],
    [ids.seyid, 2500],
  ]),
  timedExpense('e2', ids.coffee, at(3, 10), 3000, ids.ayxan, [
    [ids.shahin, 2000],
    [ids.seyid, 1000],
  ]),
  timedExpense('e3', ids.playstation, at(7, 10), 2000, ids.shahin, [
    [ids.shahin, 1000],
    [ids.ayxan, 1000],
  ]),
  timedExpense('e4', ids.coffee, at(8, 10), 5000, ids.ashraf, [[ids.ayxan, 5000]], at(8, 11)),
  timedExpense('e5', 'meetup-gone', at(9, 10), 7000, ids.seyid, [[ids.ashraf, 7000]], at(9, 12)),
];

export const cycleSettlements: Settlement[] = [
  timedSettlement('s1', at(4, 10), ids.ayxan, ids.ashraf, 2500),
  timedSettlement('s2', at(5, 10), ids.shahin, ids.ashraf, 4500),
  timedSettlement('s3', at(5, 11), ids.seyid, ids.ashraf, 500),
  timedSettlement('s4', at(6, 10), ids.seyid, ids.ayxan, 3000),
  timedSettlement('s5', at(10, 10), ids.ayxan, ids.shahin, 1000),
];

// ---- Monthly analytics: expenses grouped by meetup and placed on the meetup's date ----

/**
 * On top of the cycle data: "Dinner" (Jan 3, same day as Coffee) with three expenses, one of them
 * recorded in February; a second meetup also titled "Garden" on Jan 20; a February meetup; and a
 * deleted meetup (Mar 1) whose expense itself is not deleted.
 */
export const analyticsMeetups: Meetup[] = [
  ...cycleMeetups,
  { id: 'meetup-dinner', title: 'Dinner', date: '2026-01-03', createdAt: at(3, 20) },
  { id: 'meetup-garden-2', title: 'Garden', date: '2026-01-20', createdAt: at(20, 9) },
  { id: 'meetup-feb', title: 'February', date: '2026-02-10', createdAt: at(10, 9) },
  {
    id: 'meetup-gone-2',
    title: 'Gone too',
    date: '2026-03-01',
    createdAt: at(11, 9),
    deletedAt: at(11, 10),
  },
];

export const analyticsExpenses: Expense[] = [
  ...cycleExpenses,
  timedExpense('x1', 'meetup-dinner', at(3, 21), 1000, ids.ashraf, [[ids.ayxan, 1000]]),
  timedExpense('x2', 'meetup-dinner', at(3, 22), 500, ids.ashraf, [[ids.shahin, 500]]),
  timedExpense('x3', 'meetup-dinner', '2026-02-01T09:00:00.000Z', 680, ids.ashraf, [
    [ids.seyid, 680],
  ]),
  timedExpense('x4', 'meetup-gone-2', at(11, 9), 900, ids.ashraf, [[ids.ayxan, 900]]),
  timedExpense('x5', 'meetup-feb', at(10, 9), 4000, ids.ayxan, [[ids.ashraf, 4000]]),
  timedExpense('x6', 'meetup-garden-2', at(20, 9), 1500, ids.ayxan, [[ids.shahin, 1500]]),
];
