// Pure "YYYY-MM-DD" helpers built from LOCAL calendar components. Never use toISOString() here:
// it converts to UTC, which shifts the day (e.g. local midnight in UTC+4 is the previous UTC day).
import type { IsoDate } from '../domain';

export interface YearMonth {
  year: number;
  /** 0-11, like Date#getMonth. */
  month: number;
}

export function toIsoDate(date: Date): IsoDate {
  const yyyy = String(date.getFullYear()).padStart(4, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/** The local-time Date for a "YYYY-MM-DD" string (assumes a valid date, see isIsoDate). */
export function parseIsoDate(iso: IsoDate): Date {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  return new Date(y, m - 1, d);
}

export function addDays(iso: IsoDate, days: number): IsoDate {
  const d = parseIsoDate(iso);
  return toIsoDate(new Date(d.getFullYear(), d.getMonth(), d.getDate() + days));
}

export function yearMonthOf(iso: IsoDate): YearMonth {
  const d = parseIsoDate(iso);
  return { year: d.getFullYear(), month: d.getMonth() };
}

export function addMonths({ year, month }: YearMonth, months: number): YearMonth {
  const d = new Date(year, month + months, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
}

/** 0 = Monday ... 6 = Sunday. */
export function weekdayIndex(iso: IsoDate): number {
  return (parseIsoDate(iso).getDay() + 6) % 7;
}

/** Six Monday-first weeks (42 days) covering the month, so the grid height never changes. */
export function monthGrid({ year, month }: YearMonth): IsoDate[] {
  const first = toIsoDate(new Date(year, month, 1));
  const start = addDays(first, -weekdayIndex(first));
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}
