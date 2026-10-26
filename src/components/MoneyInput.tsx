import type { InputHTMLAttributes } from 'react';
import { az } from '../i18n/az';
import { inputClass } from './styles';

type MoneyInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'inputMode'> & {
  invalid?: boolean;
};

/** Text input tuned for amounts: decimal keypad on phones, "₼" suffix. */
export function MoneyInput({ invalid, className = '', ...props }: MoneyInputProps) {
  return (
    <div className="relative">
      <input
        type="text"
        inputMode="decimal"
        autoComplete="off"
        placeholder={az.common.amountPlaceholder}
        aria-invalid={invalid || undefined}
        className={`${inputClass} tabular pr-9 ${className}`}
        {...props}
      />
      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-ink-muted">
        ₼
      </span>
    </div>
  );
}

type HeroMoneyInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'inputMode' | 'value'
> & {
  value: string;
  invalid?: boolean;
  label: string;
};

/** Large, centered amount entry for the expense form. The whole block focuses the input. */
export function HeroMoneyInput({ id, label, value, invalid, ...props }: HeroMoneyInputProps) {
  // Grow with the content so "₼" stays right next to the number (layout, not animation).
  const width = `${Math.max(value.length, 4) + 0.2}ch`;
  return (
    <label
      htmlFor={id}
      className={`block cursor-text rounded-card px-4 py-4 text-center ring-1 transition-colors focus-within:ring-2 ${
        invalid ? 'bg-neg-soft ring-neg' : 'bg-surface-2 ring-line focus-within:ring-accent'
      }`}
    >
      <span className="block text-sm font-medium text-ink-soft">{label}</span>
      <span className="mt-1 flex items-baseline justify-center gap-1.5">
        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          placeholder={az.common.amountPlaceholder}
          aria-invalid={invalid || undefined}
          value={value}
          style={{ width }}
          className="tabular min-w-0 max-w-full bg-transparent text-right text-5xl font-bold tracking-tight text-ink placeholder:text-ink-muted/50 focus:outline-none"
          {...props}
        />
        <span aria-hidden="true" className="text-3xl font-semibold text-ink-muted">
          ₼
        </span>
      </span>
    </label>
  );
}
