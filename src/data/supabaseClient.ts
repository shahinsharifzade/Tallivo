import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Creates the Supabase client from the two public VITE_ variables, or returns null when either
 * is missing (the app then runs in local mode).
 */
export function createSupabaseClientFromEnv(): SupabaseClient | null {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim();
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
  });
}
