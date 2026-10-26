import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { az } from './i18n/az';

// Dev-only: the debug page is not registered (and not bundled) in production builds.
const DebugPage = import.meta.env.DEV ? lazy(() => import('./pages/debug/DebugPage')) : null;

function Placeholder() {
  return (
    <main className="mx-auto max-w-xl p-6">
      <h1 className="text-2xl font-bold">{az.app.name}</h1>
      <p className="text-slate-600">{az.app.tagline}</p>
      <p className="mt-4 text-slate-500">{az.app.comingSoon}</p>
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
