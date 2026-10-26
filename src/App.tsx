import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { BackupPanel } from './components/BackupPanel';
import { az } from './i18n/az';
import { useAppData } from './state/hooks';

// Dev-only: the debug page is not registered (and not bundled) in production builds.
const DebugPage = import.meta.env.DEV ? lazy(() => import('./pages/debug/DebugPage')) : null;

// Temporary home screen until Milestone 3 adds the real screens.
function Placeholder() {
  const { status, members, meetups, expenses, settlements } = useAppData();
  return (
    <main className="mx-auto max-w-xl space-y-4 p-4">
      <header>
        <h1 className="text-2xl font-bold">{az.app.name}</h1>
        <p className="text-slate-600">{az.app.tagline}</p>
      </header>
      {status === 'loading' && <p className="text-slate-500">{az.app.loading}</p>}
      {status === 'error' && <p className="text-red-700">{az.app.loadError}</p>}
      {status === 'ready' && (
        <>
          <p className="text-slate-500">{az.app.comingSoon}</p>
          <p className="text-sm text-slate-600">
            {az.app.dataCounts(members.length, meetups.length, expenses.length, settlements.length)}
          </p>
          <ul className="flex flex-wrap gap-2">
            {members.map((m) => (
              <li key={m.id} className="rounded-full bg-accent-50 px-3 py-1 text-accent-700">
                {m.name}
              </li>
            ))}
          </ul>
          <BackupPanel />
        </>
      )}
    </main>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={null}>
        <Routes>
          {DebugPage && <Route path="/debug" element={<DebugPage />} />}
          <Route path="*" element={<Placeholder />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
