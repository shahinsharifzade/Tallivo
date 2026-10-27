interface ImportMetaEnv {
  /** Supabase project URL. Together with the publishable key it switches on shared mode. */
  readonly VITE_SUPABASE_URL?: string;
  /** Supabase publishable (public) key. Never put a secret / service_role key here. */
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
