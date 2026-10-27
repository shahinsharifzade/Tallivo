import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { DataRoot } from './components/DataRoot';
import { ExpenseFormPage } from './pages/expense/ExpenseFormPage';
import { HistoryPage } from './pages/HistoryPage';
import { MeetupDetailPage } from './pages/MeetupDetailPage';
import { MeetupFormPage } from './pages/MeetupFormPage';
import { MeetupsPage } from './pages/MeetupsPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { OverviewPage } from './pages/OverviewPage';
import { PaymentFormPage } from './pages/PaymentFormPage';
import { SettingsPage } from './pages/SettingsPage';

// Dev-only: the debug page is not registered (and not bundled) in production builds.
const DebugPage = import.meta.env.DEV ? lazy(() => import('./pages/debug/DebugPage')) : null;

export function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={null}>
        <Routes>
          {DebugPage && <Route path="/debug" element={<DebugPage />} />}
          <Route element={<DataRoot />}>
            <Route index element={<OverviewPage />} />
            <Route path="meetups" element={<MeetupsPage />} />
            <Route path="meetups/new" element={<MeetupFormPage />} />
            <Route path="meetups/:meetupId" element={<MeetupDetailPage />} />
            <Route path="meetups/:meetupId/edit" element={<MeetupFormPage />} />
            <Route path="meetups/:meetupId/expenses/new" element={<ExpenseFormPage />} />
            <Route
              path="meetups/:meetupId/expenses/:expenseId/edit"
              element={<ExpenseFormPage />}
            />
            <Route path="payments/new" element={<PaymentFormPage />} />
            <Route path="history" element={<HistoryPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
