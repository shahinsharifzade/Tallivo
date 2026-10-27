// Read-side hooks. Every number shown in the UI comes from src/domain via these hooks.
import { useContext, useMemo } from 'react';
import {
  computeBalances,
  computeBalancesForMeetup,
  involvedMemberIds,
  isMemberReferenced,
  participantIds,
  simplifyDebts,
  sortMembers,
  totalPaidByMember,
  totalSpent,
  type Expense,
  type Id,
  type Meetup,
  type Settlement,
} from '../domain';
import type { AppActions } from './actions';
import { AppDataContext, type AppDataContextValue } from './context';

function useAppDataContext(): AppDataContextValue {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData must be used inside <AppDataProvider>');
  return ctx;
}

/** Raw data (including soft-deleted rows), with members sorted by sortOrder. */
export function useAppData() {
  const { state } = useAppDataContext();
  const members = useMemo(() => sortMembers(state.members), [state.members]);
  return { ...state, members };
}

export function useActions(): AppActions {
  return useAppDataContext().actions;
}

export function useRetryLoad(): () => Promise<void> {
  return useAppDataContext().retry;
}

/** Overall balances, simplified debts and total spend across all meetups and settlements. */
export function useOverallSummary() {
  const { members, expenses, settlements } = useAppData();
  return useMemo(() => {
    const balances = computeBalances(members, expenses, settlements);
    const transfers = simplifyDebts(balances, members);
    return {
      balances,
      transfers,
      totalSpentMinor: totalSpent(expenses),
      /** At least one expense exists and nobody owes anything. */
      settled: expenses.some((e) => !e.deletedAt) && Object.values(balances).every((v) => v === 0),
    };
  }, [members, expenses, settlements]);
}

/** memberId -> total paid for (non-deleted) expenses. */
export function usePaidByMember() {
  const { members, expenses } = useAppData();
  return useMemo(() => totalPaidByMember(members, expenses), [members, expenses]);
}

/** Balances, simplified debts and totals for one meetup (settlements are not included). */
export function useMeetupSummary(meetupId: Id) {
  const { members, expenses } = useAppData();
  return useMemo(() => {
    const meetupExpenses = expenses.filter((e) => e.meetupId === meetupId);
    const balances = computeBalancesForMeetup(meetupId, members, expenses);
    return {
      balances,
      transfers: simplifyDebts(balances, members),
      totalSpentMinor: totalSpent(meetupExpenses),
      participantCount: participantIds(meetupExpenses).size,
      involvedMemberIds: involvedMemberIds(meetupExpenses),
    };
  }, [meetupId, members, expenses]);
}

const byDateDesc = (a: Meetup, b: Meetup) =>
  b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt);

/** Active meetups (newest first) with their totals. */
export function useMeetupList() {
  const { meetups, expenses, members } = useAppData();
  return useMemo(
    () =>
      meetups
        .filter((m) => !m.deletedAt)
        .sort(byDateDesc)
        .map((meetup) => {
          const own = expenses.filter((e) => e.meetupId === meetup.id && !e.deletedAt);
          const ids = participantIds(own);
          return {
            meetup,
            totalSpentMinor: totalSpent(own),
            participants: members.filter((m) => ids.has(m.id)),
            expenseCount: own.length,
          };
        }),
    [meetups, expenses, members],
  );
}

/** One meetup (possibly soft-deleted) and its active expenses in the order they were added. */
export function useMeetup(meetupId: Id | undefined) {
  const { meetups, expenses } = useAppData();
  return useMemo(() => {
    const meetup = meetups.find((m) => m.id === meetupId);
    const own = expenses
      .filter((e) => e.meetupId === meetupId && !e.deletedAt)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return { meetup, expenses: own };
  }, [meetupId, meetups, expenses]);
}

/** Ids of members that cannot be deleted because an expense or settlement references them. */
export function useReferencedMemberIds() {
  const { members, expenses, settlements } = useAppData();
  return useMemo(
    () =>
      new Set(
        members.filter((m) => isMemberReferenced(m.id, expenses, settlements)).map((m) => m.id),
      ),
    [members, expenses, settlements],
  );
}

export type HistoryItem =
  | { kind: 'expense'; at: string; item: Expense; meetup: Meetup | undefined }
  | { kind: 'settlement'; at: string; item: Settlement }
  | { kind: 'meetup'; at: string; item: Meetup };

/**
 * Everything ever recorded, newest first, including soft-deleted rows. Deleted meetups are
 * listed too so they can be restored.
 */
export function useHistory(): HistoryItem[] {
  const { meetups, expenses, settlements } = useAppData();
  return useMemo(() => {
    const meetupById = new Map(meetups.map((m) => [m.id, m]));
    const items: HistoryItem[] = [
      ...expenses.map((e) => ({
        kind: 'expense' as const,
        at: e.createdAt,
        item: e,
        meetup: meetupById.get(e.meetupId),
      })),
      ...settlements.map((s) => ({ kind: 'settlement' as const, at: s.createdAt, item: s })),
      ...meetups
        .filter((m) => m.deletedAt)
        .map((m) => ({ kind: 'meetup' as const, at: m.createdAt, item: m })),
    ];
    return items.sort((a, b) => b.at.localeCompare(a.at));
  }, [meetups, expenses, settlements]);
}
