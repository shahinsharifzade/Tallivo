import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { az } from '../i18n/az';
import { ChevronLeftIcon } from './icons';
import { buttonClass } from './styles';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 ${className}`}>
      {children}
    </section>
  );
}

export function SectionTitle({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <div className="mb-3">
      <h2 className="font-semibold text-slate-900">{children}</h2>
      {hint && <p className="mt-0.5 text-sm text-slate-500">{hint}</p>}
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
        {subtitle && <div className="mt-1 text-sm text-slate-500">{subtitle}</div>}
      </div>
      {actions && <div className="flex shrink-0 gap-1">{actions}</div>}
    </header>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-10 text-center">
      <p className="font-semibold text-slate-800">{title}</p>
      {body && <p className="mx-auto mt-1 max-w-xs text-sm text-slate-500">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-block rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700">
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
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </label>
      {children}
      {hint && !error && <div className="mt-1 text-sm text-slate-500">{hint}</div>}
      {error && (
        <p id={`${id}-error`} className="mt-1 text-sm text-red-700">
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
        <legend className="text-sm font-medium text-slate-700">{legend}</legend>
        {aside}
      </div>
      {children}
      {error && <p className="mt-1 text-sm text-red-700">{error}</p>}
    </fieldset>
  );
}

export function ErrorText({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">
      {children}
    </p>
  );
}
