import type { ReactNode } from 'react';
import { formatMoney, type Member, type Transfer } from '../domain';
import { ArrowRightIcon } from './icons';

interface TransferListProps {
  transfers: Transfer[];
  members: Member[];
  emptyText: string;
  /** Optional action rendered at the end of each row (e.g. "record this payment"). */
  renderAction?: (transfer: Transfer) => ReactNode;
}

/** "Who pays whom" rows produced by simplifyDebts. */
export function TransferList({ transfers, members, emptyText, renderAction }: TransferListProps) {
  if (transfers.length === 0) {
    return <p className="py-2 text-sm text-ink-muted">{emptyText}</p>;
  }
  const name = (id: string) => members.find((m) => m.id === id)?.name ?? '?';
  return (
    <ul className="divide-y divide-line">
      {transfers.map((t) => (
        <li
          key={`${t.fromMemberId}-${t.toMemberId}`}
          className="flex min-h-12 flex-wrap items-center gap-x-3 gap-y-1 py-2"
        >
          <span className="flex min-w-0 flex-1 items-center gap-1.5 font-medium">
            <span className="truncate">{name(t.fromMemberId)}</span>
            <span className="shrink-0 text-ink-muted">
              <ArrowRightIcon />
            </span>
            <span className="truncate">{name(t.toMemberId)}</span>
          </span>
          <span className="tabular font-semibold">{formatMoney(t.amountMinor)}</span>
          {renderAction?.(t)}
        </li>
      ))}
    </ul>
  );
}
