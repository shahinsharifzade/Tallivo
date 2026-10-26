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
}

export interface AppDataContextValue {
  state: AppDataState;
  actions: AppActions;
}

export const AppDataContext = createContext<AppDataContextValue | null>(null);
