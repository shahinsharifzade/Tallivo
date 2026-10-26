import type { Minor } from './types';

export const CURRENCY_SYMBOL = '₼';

const NBSP = ' ';

/** Formats minor units as "12.50 ₼" (negative values get a leading "-"). */
export function formatMoney(minor: Minor): string {
  const sign = minor < 0 ? '-' : '';
  const abs = Math.abs(minor);
  const major = Math.floor(abs / 100);
  const cents = String(abs % 100).padStart(2, '0');
  return `${sign}${major}.${cents}${NBSP}${CURRENCY_SYMBOL}`;
}

/** Formats minor units without the currency symbol, suitable for prefilling an input ("12.50"). */
export function formatMoneyPlain(minor: Minor): string {
  const sign = minor < 0 ? '-' : '';
  const abs = Math.abs(minor);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
}

export type MoneyParseError =
  'empty' | 'invalid' | 'negative' | 'zero' | 'tooManyDecimals' | 'tooLarge';

export type MoneyParseResult = { ok: true; minor: Minor } | { ok: false; error: MoneyParseError };

/** Upper bound for a single amount: 1,000,000 AZN. Keeps values far from float-unsafe territory. */
export const MAX_AMOUNT_MINOR: Minor = 100_000_000;

/**
 * Parses user input like "12", "12.5", "12,50" into minor units using string arithmetic only
 * (no floating point). Rejects negatives, zero and more than 2 decimals.
 */
export function parseMoney(input: string): MoneyParseResult {
  const s = input.trim().replace(/\s+/g, '');
  if (s === '') return { ok: false, error: 'empty' };
  if (s.startsWith('-')) return { ok: false, error: 'negative' };

  const match = /^(\d*)(?:[.,](\d*))?$/.exec(s);
  if (!match) return { ok: false, error: 'invalid' };

  const intPart = match[1] ?? '';
  const fracPart = match[2];
  if (intPart === '' && (fracPart === undefined || fracPart === '')) {
    return { ok: false, error: 'invalid' };
  }
  if (fracPart !== undefined && fracPart.length > 2) return { ok: false, error: 'tooManyDecimals' };
  if (intPart.length > 9) return { ok: false, error: 'tooLarge' };

  const major = intPart === '' ? 0 : Number(intPart);
  const cents = fracPart === undefined || fracPart === '' ? 0 : Number(fracPart.padEnd(2, '0'));
  const minor = major * 100 + cents;

  if (minor === 0) return { ok: false, error: 'zero' };
  if (minor > MAX_AMOUNT_MINOR) return { ok: false, error: 'tooLarge' };
  return { ok: true, minor };
}
