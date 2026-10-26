import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { az } from '../i18n/az';
import { ChevronLeftIcon } from './icons';
import { buttonClass } from './styles';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-card bg-surface p-4 shadow-card ring-1 ring-line ${className}`}>
      {children}
    </section>
  );
}

export function SectionTitle({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <div className="mb-3">
      <h2 className="font-semibold text-ink">{children}</h2>
      {hint && <p className="mt-0.5 text-sm text-ink-muted">{hint}</p>}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  backTo,
  actions,
}: {
  title: string;
  subtitle?: ReactNode;
  backTo?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-4 flex items-start gap-2">
      {backTo && (
        <Link
          to={backTo}
          className={buttonClass('ghost', '-ml-2 px-2')}
          aria-label={az.common.back}
        >
          <ChevronLeftIcon />
        </Link>
      )}
      <div className="min-w-0 flex-1 pt-1.5">
        <h1 className="break-words text-xl font-bold leading-tight">{title}</h1>
        {subtitle && <div className="mt-1 text-sm text-ink-muted">{subtitle}</div>}
      </div>
      {actions && <div className="flex shrink-0 gap-1">{actions}</div>}
    </header>
  );
}

export function EmptyState({
  title,
  body,
  action,
  art,
}: {
  title: string;
  body?: string;
  action?: ReactNode;
  /** Optional small illustration shown above the title. */
  art?: ReactNode;
}) {
  return (
    <div className="rounded-card border border-dashed border-line-strong bg-surface/60 px-6 py-10 text-center">
      {art && <div className="mb-3 flex justify-center">{art}</div>}
      <p className="font-semibold text-ink">{title}</p>
      {body && <p className="mx-auto mt-1 max-w-xs text-sm text-ink-muted">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-block rounded-full bg-surface-3 px-2 py-0.5 text-xs font-medium text-ink-soft">
      {children}
    </span>
  );
}

/** Label + control + optional hint / error, wired for screen readers via ids. */
export function Field({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: ReactNode;
  error?: string | null;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink-soft">
        {label}
      </label>
      {children}
      {hint && !error && <div className="mt-1 text-sm text-ink-muted">{hint}</div>}
      {error && (
        <p id={`${id}-error`} className="mt-1 text-sm text-neg">
          {error}
        </p>
      )}
    </div>
  );
}

/** A group of controls (e.g. chips) with a visible legend. */
export function FieldGroup({
  legend,
  error,
  aside,
  children,
}: {
  legend: ReactNode;
  error?: string | null;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <fieldset>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <legend className="text-sm font-medium text-ink-soft">{legend}</legend>
        {aside}
      </div>
      {children}
      {error && <p className="mt-1 text-sm text-neg">{error}</p>}
    </fieldset>
  );
}

export function ErrorText({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="rounded-control bg-neg-soft px-3 py-2 text-sm text-neg">
      {children}
    </p>
  );
}
