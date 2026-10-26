import type { IsoDate } from '../domain';
import { az } from '../i18n/az';

/**
 * "2026-01-03" -> "3 yanvar 2026". Month names come from az.ts because browser support for the
 * Azerbaijani Intl locale is inconsistent.
 */
export function formatDate(date: IsoDate): string {
  const [y, m, d] = date.split('-').map(Number);
  const month = m ? az.common.months[m - 1] : undefined;
  if (!y || !d || !month) return date;
  return `${d} ${month} ${y}`;
}
