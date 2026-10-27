import { createContext, useContext } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Repository } from '../data/repository';

/** Which storage the app runs on. Chosen once in main.tsx. */
export type Backend =
  | { mode: 'local'; repository: Repository }
  | { mode: 'supabase'; repository: Repository; client: SupabaseClient };

/** The signed-in person (shared mode only). */
export interface Account {
  memberName: string;
  signOut(): Promise<void>;
}

export const BackendContext = createContext<Backend | null>(null);
export const AccountContext = createContext<Account | null>(null);

export function useBackend(): Backend {
  const ctx = useContext(BackendContext);
  if (!ctx) throw new Error('useBackend must be used inside <BackendContext.Provider>');
  return ctx;
}

/** The signed-in account, or null in local mode. */
export function useAccount(): Account | null {
  return useContext(AccountContext);
}
