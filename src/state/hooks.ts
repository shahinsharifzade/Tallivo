// Read-side hooks. Every number shown in the UI comes from src/domain via these hooks.
import { useContext, useMemo } from 'react';
import {
  computeBalances,
  computeBalancesForMeetup,
  participantIds,
  simplifyDebts,
  sortMembers,
  totalSpent,
  type Id,
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

/** Overall balances, simplified debts and total spend across all meetups and settlements. */
export function useOverallSummary() {
  const { members, expenses, settlements } = useAppData();
  return useMemo(() => {
    const balances = computeBalances(members, expenses, settlements);
    return {
      balances,
      transfers: simplifyDebts(balances, members),
      totalSpentMinor: totalSpent(expenses),
    };
  }, [members, expenses, settlements]);
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
    };
  }, [meetupId, members, expenses]);
}
