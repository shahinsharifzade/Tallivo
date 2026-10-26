import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Repository } from '../data/repository';
import { ensureSeeded } from '../data/seed';
import { createActions } from './actions';
import { AppDataContext, type AppData, type AppDataState } from './context';

async function loadAll(repository: Repository): Promise<AppData> {
  const [members, meetups, expenses, settlements] = await Promise.all([
    repository.listMembers(),
    repository.listMeetups(),
    repository.listExpenses(),
    repository.listSettlements(),
  ]);
  return { members, meetups, expenses, settlements };
}

const initialState: AppDataState = {
  status: 'loading',
  members: [],
  meetups: [],
  expenses: [],
  settlements: [],
};

/** Loads all data from the given repository and exposes it plus actions via context. */
export function AppDataProvider({
  repository,
  children,
}: {
  repository: Repository;
  children: ReactNode;
}) {
  const [state, setState] = useState<AppDataState>(initialState);

  const reload = useCallback(async () => {
    try {
      const data = await loadAll(repository);
      setState({ status: 'ready', ...data });
    } catch (e) {
      console.error('[tallivo] Failed to load data', e);
      setState((s) => ({ ...s, status: 'error' }));
    }
  }, [repository]);

  useEffect(() => {
    let cancelled = false;
    ensureSeeded(repository)
      .catch((e: unknown) => console.error('[tallivo] Seeding failed', e))
      .then(() => (cancelled ? undefined : reload()));
    return () => {
      cancelled = true;
    };
  }, [repository, reload]);

  const actions = useMemo(() => createActions(repository, reload), [repository, reload]);
  const value = useMemo(() => ({ state, actions }), [state, actions]);

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}
