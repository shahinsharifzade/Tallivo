// Theme preference (System / Light / Dark), stored in its own small localStorage key.
import { useSyncExternalStore } from 'react';

export type ThemePreference = 'system' | 'light' | 'dark';

export const THEME_STORAGE_KEY = 'tallivo:theme';
/** Browser UI color (matches the header surface) per resolved theme. */
const THEME_COLORS = { light: '#ffffff', dark: '#1b1e21' } as const;
const DARK_QUERY = '(prefers-color-scheme: dark)';

function readPreference(): ThemePreference {
  try {
    const v = window.localStorage.getItem(THEME_STORAGE_KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
}

let preference: ThemePreference = 'system';
const listeners = new Set<() => void>();

function resolved(pref: ThemePreference): 'light' | 'dark' {
  if (pref !== 'system') return pref;
  return window.matchMedia?.(DARK_QUERY).matches ? 'dark' : 'light';
}

function apply(): void {
  const theme = resolved(preference);
  document.documentElement.classList.toggle('dark', theme === 'dark');
  // With an explicit choice, both media-specific theme-color tags follow it.
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((meta) => {
    const media = meta.getAttribute('media') ?? '';
    const forTheme = preference === 'system' ? (media.includes('dark') ? 'dark' : 'light') : theme;
    meta.content = THEME_COLORS[forTheme];
  });
}

/** Call once at startup: applies the saved preference and follows system changes. */
export function initTheme(): void {
  preference = readPreference();
  apply();
  window.matchMedia?.(DARK_QUERY).addEventListener('change', () => {
    if (preference === 'system') apply();
  });
}

export function setThemePreference(next: ThemePreference): void {
  preference = next;
  try {
    if (next === 'system') window.localStorage.removeItem(THEME_STORAGE_KEY);
    else window.localStorage.setItem(THEME_STORAGE_KEY, next);
  } catch (e) {
    console.error('[tallivo] Could not save theme preference', e);
  }
  apply();
  listeners.forEach((l) => l());
}

export function useThemePreference(): ThemePreference {
  return useSyncExternalStore(
    (onChange) => {
      listeners.add(onChange);
      return () => listeners.delete(onChange);
    },
    () => preference,
    () => 'system' as const,
  );
}
