import { formatMoneyPlain, type Transfer } from '../domain';

/** The payment form, prefilled from a suggested transfer. */
export function paymentLink(t: Transfer): string {
  return `/payments/new?from=${t.fromMemberId}&to=${t.toMemberId}&amount=${formatMoneyPlain(t.amountMinor)}`;
}
