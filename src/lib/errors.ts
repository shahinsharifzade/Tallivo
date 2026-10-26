import type { MoneyParseError } from '../domain';
import { az } from '../i18n/az';

export function moneyErrorMessage(error: MoneyParseError): string {
  return az.money[error];
}
