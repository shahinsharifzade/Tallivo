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
      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-400">
        ₼
      </span>
    </div>
  );
}
