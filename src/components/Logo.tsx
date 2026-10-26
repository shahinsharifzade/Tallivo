import { az } from '../i18n/az';

/** The app mark: a rounded accent square with an equals sign ("Hesab bərabər"). */
export function LogoMark({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={`shrink-0 ${className}`}>
      <rect width="32" height="32" rx="9" className="fill-accent" />
      <rect x="8.5" y="10.5" width="15" height="4" rx="2" className="fill-accent-contrast" />
      <rect x="8.5" y="17.5" width="15" height="4" rx="2" className="fill-accent-contrast" />
    </svg>
  );
}

/** Mark + wordmark + tagline. */
export function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark />
      <span className="flex flex-col leading-none">
        <span className="text-lg font-bold tracking-tight text-ink">{az.app.name}</span>
        <span className="mt-0.5 text-xs text-ink-muted">{az.app.tagline}</span>
      </span>
    </span>
  );
}
