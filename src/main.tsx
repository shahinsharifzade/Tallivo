import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import './index.css';
import { App } from './App';
import { LocalStorageRepository } from './data/localStorageRepository';
import { createSupabaseClientFromEnv } from './data/supabaseClient';
import { SupabaseRepository } from './data/supabaseRepository';
import { initTheme } from './lib/theme';
import { BackendContext, type Backend } from './state/backend';

initTheme();

// The only place that picks a concrete storage backend: Supabase (with sign-in) when both
// VITE_SUPABASE_* variables are set, otherwise this browser's localStorage.
const client = createSupabaseClientFromEnv();
const backend: Backend = client
  ? { mode: 'supabase', client, repository: new SupabaseRepository(client) }
  : { mode: 'local', repository: new LocalStorageRepository() };

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

createRoot(root).render(
  <StrictMode>
    <BackendContext.Provider value={backend}>
      <App />
    </BackendContext.Provider>
  </StrictMode>,
);
