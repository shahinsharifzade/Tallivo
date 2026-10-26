import { Link } from 'react-router-dom';
import { formatMoney, type Member, type Transfer } from '../domain';
import { az } from '../i18n/az';
import { Avatar } from './Avatar';
import { ArrowRightIcon, ChevronRightIcon } from './icons';

interface TransferCardsProps {
  transfers: Transfer[];
  members: Member[];
  emptyText: string;
  /** When given, each card is a link (e.g. to the prefilled payment form). */
  linkFor?: (transfer: Transfer) => string;
}

/** "Who pays whom" cards produced by simplifyDebts: [avatar] ➜ [avatar] amount. */
export function TransferCards({ transfers, members, emptyText, linkFor }: TransferCardsProps) {
  if (transfers.length === 0) {
    return <p className="py-2 text-sm text-ink-muted">{emptyText}</p>;
  }
  const memberOf = (id: string) => members.find((m) => m.id === id);

  return (
    <ul className="space-y-2">
      {transfers.map((t) => {
        const from = memberOf(t.fromMemberId);
        const to = memberOf(t.toMemberId);
        const amount = formatMoney(t.amountMinor);
        const body = (
          <>
            <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
              <Person member={from} />
              <span className="arrow-nudge shrink-0 text-ink-muted">
                <ArrowRightIcon />
              </span>
              <Person member={to} />
            </span>
            <span className="tabular shrink-0 pl-1 font-semibold">{amount}</span>
          </>
        );
        const base = 'flex min-h-14 items-center gap-2 rounded-control bg-surface-2 px-3 py-2';
        return (
          <li key={`${t.fromMemberId}-${t.toMemberId}`}>
            {linkFor ? (
              <Link
                to={linkFor(t)}
                aria-label={az.overview.recordTransferLabel(
                  from?.name ?? '?',
                  to?.name ?? '?',
                  amount,
                )}
                className={`${base} transition-[transform,background-color] duration-150 hover:bg-surface-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent active:scale-[0.98]`}
              >
                {body}
                <span className="shrink-0 text-ink-muted">
                  <ChevronRightIcon />
                </span>
              </Link>
            ) : (
              <div className={base}>{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function Person({ member }: { member: Member | undefined }) {
  return (
    <span className="flex min-w-0 max-w-full items-center gap-1.5">
      <Avatar member={member} size="sm" />
      <span className="break-words font-medium">{member?.name ?? '?'}</span>
    </span>
  );
}
