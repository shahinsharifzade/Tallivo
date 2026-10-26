import { useEffect, type ReactNode } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { az } from '../i18n/az';
import { useAppData } from '../state/hooks';
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

  return (
    <div className="min-h-dvh pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-8">
      <ScrollToTop />
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-4 px-4 py-3">
          <NavLink to="/" className="flex items-baseline gap-2 rounded-lg">
            <span className="text-lg font-bold text-accent-600">{az.app.name}</span>
            <span className="text-sm text-slate-500">{az.app.tagline}</span>
          </NavLink>
          <nav aria-label={az.nav.label} className="hidden md:block">
            <ul className="flex gap-1">
              {tabs.map((tab) => (
                <li key={tab.to}>
                  <NavLink
                    to={tab.to}
                    end={tab.end}
                    className={({ isActive }) =>
                      `flex min-h-11 items-center rounded-xl px-3 font-medium ${
                        isActive
                          ? 'bg-accent-50 text-accent-700'
                          : 'text-slate-600 hover:bg-slate-100'
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
          <p className="py-10 text-center text-slate-500">{az.app.loading}</p>
        )}
        {status === 'error' && (
          <p role="alert" className="py-10 text-center text-red-700">
            {az.app.loadError}
          </p>
        )}
        {status === 'ready' && <Outlet />}
      </main>

      <nav
        aria-label={az.nav.label}
        className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        <ul className="mx-auto grid max-w-2xl grid-cols-4">
          {tabs.map((tab) => (
            <li key={tab.to}>
              <NavLink
                to={tab.to}
                end={tab.end}
                className={({ isActive }) =>
                  `flex min-h-16 flex-col items-center justify-center gap-0.5 text-xs font-medium ${
                    isActive ? 'text-accent-600' : 'text-slate-500'
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
  );
}
