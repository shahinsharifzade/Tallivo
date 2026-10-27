import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Repository } from '../data/repository';
import { ensureSeeded } from '../data/seed';
import { createActions } from './actions';
import { AppDataContext, type AppData, type AppDataState } from './context';
import { errorMessage } from './errorMessage';

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
  stale: false,
  loadError: null,
  members: [],
  meetups: [],
  expenses: [],
  settlements: [],
};

/**
 * Loads all data from the given repository and exposes it plus actions via context.
 * Data is reloaded after every write and whenever the tab becomes visible again.
 */
export function AppDataProvider({
  repository,
  seedOnFirstRun = true,
  children,
}: {
  repository: Repository;
  /** Create the default members when storage is empty (local mode only). */
  seedOnFirstRun?: boolean;
  children: ReactNode;
}) {
  const [state, setState] = useState<AppDataState>(initialState);
  // Only the newest load may update state, so a slow older response cannot overwrite it.
  const latestLoad = useRef(0);

  const reload = useCallback(async () => {
    const load = ++latestLoad.current;
    try {
      const data = await loadAll(repository);
      if (load === latestLoad.current) {
        setState({ status: 'ready', stale: false, loadError: null, ...data });
      }
    } catch (e) {
      console.error('[tallivo] Failed to load data', e);
      if (load !== latestLoad.current) return;
      const loadError = errorMessage(e);
      // Keep already shown data (so open forms are not lost) but mark it as possibly outdated.
      setState((s) =>
        s.status === 'ready'
          ? { ...s, stale: true, loadError }
          : { ...s, status: 'error', loadError },
      );
    }
  }, [repository]);

  const retry = useCallback(async () => {
    setState((s) => (s.status === 'error' ? { ...s, status: 'loading' } : s));
    await reload();
  }, [reload]);

  useEffect(() => {
    let cancelled = false;
    (seedOnFirstRun ? ensureSeeded(repository) : Promise.resolve())
      .catch((e: unknown) => console.error('[tallivo] Seeding failed', e))
      .then(() => (cancelled ? undefined : reload()));
    return () => {
      cancelled = true;
    };
  }, [repository, seedOnFirstRun, reload]);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') void reload();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [reload]);

  const actions = useMemo(() => createActions(repository, reload), [repository, reload]);
  const value = useMemo(() => ({ state, actions, retry }), [state, actions, retry]);

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}
