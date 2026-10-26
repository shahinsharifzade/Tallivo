import { useEffect, type ReactNode } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { az } from '../i18n/az';
import { useSettledTransition } from '../state/celebration';
import { useAppData, useOverallSummary } from '../state/hooks';
import { FeedbackProvider } from './FeedbackProvider';
import { Logo } from './Logo';
import { CalendarIcon, ClockIcon, HomeIcon, SettingsIcon } from './icons';

const tabs: { to: string; label: string; icon: ReactNode; end?: boolean }[] = [
  { to: '/', label: az.nav.overview, icon: <HomeIcon />, end: true },
  { to: '/meetups', label: az.nav.meetups, icon: <CalendarIcon /> },
  { to: '/history', label: az.nav.history, icon: <ClockIcon /> },
  { to: '/settings', label: az.nav.settings, icon: <SettingsIcon /> },
];

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

/** App shell: brand header, page outlet, bottom tab bar (mobile) / top nav (desktop). */
export function AppLayout() {
  const { status } = useAppData();
  const { pathname } = useLocation();
  const { settled } = useOverallSummary();
  const celebration = useSettledTransition(settled, status === 'ready');

  return (
    <FeedbackProvider>
      <div className="min-h-dvh pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-8">
        <ScrollToTop />
        <header className="border-b border-line bg-surface">
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-4 px-4 py-3">
            <NavLink
              to="/"
              aria-label={az.app.name}
              className="rounded-control focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
            >
              <Logo />
            </NavLink>
            <nav aria-label={az.nav.label} className="hidden md:block">
              <ul className="flex gap-1">
                {tabs.map((tab) => (
                  <li key={tab.to}>
                    <NavLink
                      to={tab.to}
                      end={tab.end}
                      className={({ isActive }) =>
                        `flex min-h-11 items-center rounded-control px-3 font-medium ${
                          isActive
                            ? 'bg-accent-soft text-accent-ink'
                            : 'text-ink-soft hover:bg-surface-2'
                        }`
                      }
                    >
                      {tab.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </header>

        <main className="mx-auto max-w-2xl px-4 py-4">
          {status === 'loading' && (
            <p className="py-10 text-center text-ink-muted">{az.app.loading}</p>
          )}
          {status === 'error' && (
            <p role="alert" className="py-10 text-center text-neg">
              {az.app.loadError}
            </p>
          )}
          {status === 'ready' && (
            // Keyed by path so each screen gets the short fade/slide entrance.
            <div key={pathname} className="page-in">
              <Outlet context={celebration} />
            </div>
          )}
        </main>

        <nav
          aria-label={az.nav.label}
          className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
        >
          <ul className="mx-auto grid max-w-2xl grid-cols-4">
            {tabs.map((tab) => (
              <li key={tab.to}>
                <NavLink
                  to={tab.to}
                  end={tab.end}
                  className={({ isActive }) =>
                    `flex min-h-16 flex-col items-center justify-center gap-0.5 text-xs font-medium ${
                      isActive ? 'text-accent-ink' : 'text-ink-muted'
                    }`
                  }
                >
                  {tab.icon}
                  {tab.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </FeedbackProvider>
  );
}
