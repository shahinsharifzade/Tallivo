import { createContext } from 'react';
import type { Expense, Meetup, Member, Settlement } from '../domain';
import type { AppActions } from './actions';

export interface AppData {
  members: Member[];
  meetups: Meetup[];
  expenses: Expense[];
  settlements: Settlement[];
}

export interface AppDataState extends AppData {
  status: 'loading' | 'ready' | 'error';
  /** The last reload failed; the data shown is from an earlier successful load. */
  stale: boolean;
  /** Localized reason for the last failed load, if any. */
  loadError: string | null;
}

export interface AppDataContextValue {
  state: AppDataState;
  actions: AppActions;
  /** Loads everything again (used by the retry buttons). */
  retry(): Promise<void>;
}

export const AppDataContext = createContext<AppDataContextValue | null>(null);
