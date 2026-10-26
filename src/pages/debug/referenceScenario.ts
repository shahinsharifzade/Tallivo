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
