import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Avatar } from '../components/Avatar';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ArrowRightIcon } from '../components/icons';
import { buttonClass } from '../components/styles';
import { Badge, EmptyState, ErrorText, PageHeader } from '../components/ui';
import { formatMoney, type Settlement } from '../domain';
import { az } from '../i18n/az';
import { formatDate } from '../lib/format';
import { useActions, useAppData, useHistory, type HistoryItem } from '../state/hooks';
import { useSubmit } from '../state/useSubmit';

const t = az.history;

export function HistoryPage() {
  const items = useHistory();
  const { members } = useAppData();
  const actions = useActions();
  const { error, run } = useSubmit();
  const [settlementToDelete, setSettlementToDelete] = useState<Settlement | null>(null);
  const memberOf = (id: string) => members.find((m) => m.id === id);
  const nameOf = (id: string) => memberOf(id)?.name ?? '?';

  const restore = (entry: HistoryItem) =>
    run(() => {
      if (entry.kind === 'expense') return actions.restoreExpense(entry.item.id);
      if (entry.kind === 'settlement') return actions.restoreSettlement(entry.item.id);
      return actions.restoreMeetup(entry.item.id);
    });

  const deleteSettlement = async () => {
    const s = settlementToDelete;
    setSettlementToDelete(null);
    if (s) await run(() => actions.deleteSettlement(s.id));
  };

  const renderBody = (entry: HistoryItem) => {
    switch (entry.kind) {
      case 'expense': {
        const e = entry.item;
        return (
          <>
            <p className="truncate font-medium">{e.title}</p>
            <p className="flex flex-wrap items-center gap-x-1.5 text-sm text-ink-muted">
              <Avatar member={memberOf(e.paidByMemberId)} size="xs" />
              {t.paidBy(nameOf(e.paidByMemberId))}
              {entry.meetup && (
                <>
                  {' · '}
                  {entry.meetup.deletedAt ? (
                    t.inMeetup(entry.meetup.title)
                  ) : (
                    <Link to={`/meetups/${entry.meetup.id}`} className="underline">
                      {t.inMeetup(entry.meetup.title)}
                    </Link>
                  )}
                </>
              )}
            </p>
          </>
        );
      }
      case 'settlement': {
        const s = entry.item;
        return (
          <>
            <p className="flex items-center gap-1.5 font-medium">
              <Avatar member={memberOf(s.fromMemberId)} size="sm" />
              {nameOf(s.fromMemberId)}
              <span className="text-ink-muted">
                <ArrowRightIcon />
              </span>
              <Avatar member={memberOf(s.toMemberId)} size="sm" />
              {nameOf(s.toMemberId)}
            </p>
            <p className="text-sm text-ink-muted">
              {formatDate(s.date)}
              {s.note && ` · ${s.note}`}
            </p>
          </>
        );
      }
      case 'meetup':
        return (
          <>
            <p className="truncate font-medium">{entry.item.title}</p>
            <p className="text-sm text-ink-muted">{formatDate(entry.item.date)}</p>
          </>
        );
    }
  };

  const kindLabel = { expense: t.expense, settlement: t.settlement, meetup: t.meetup };

  return (
    <>
      <PageHeader title={t.title} subtitle={t.subtitle} />
      {error && (
        <div className="mb-3">
          <ErrorText>{error}</ErrorText>
        </div>
      )}
      {items.length === 0 ? (
        <EmptyState title={t.emptyTitle} body={t.emptyBody} />
      ) : (
        <ul className="stagger space-y-2">
          {items.map((entry) => {
            const deleted = !!entry.item.deletedAt;
            const amount =
              entry.kind === 'expense'
                ? entry.item.totalMinor
                : entry.kind === 'settlement'
                  ? entry.item.amountMinor
                  : null;
            return (
              <li
                key={`${entry.kind}-${entry.item.id}`}
                className={`rounded-card p-4 ring-1 ${
                  deleted
                    ? 'bg-surface-2 text-ink-muted ring-line'
                    : 'bg-surface shadow-card ring-line'
                }`}
              >
                <div className="mb-1 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-ink-muted">
                  {kindLabel[entry.kind]}
                  {deleted && <Badge>{az.common.deleted}</Badge>}
                </div>
                <div className="flex items-start gap-3">
                  <div
                    className={`min-w-0 flex-1 ${deleted ? 'line-through decoration-ink-muted' : ''}`}
                  >
                    {renderBody(entry)}
                  </div>
                  {amount !== null && (
                    <span className="tabular shrink-0 font-semibold">{formatMoney(amount)}</span>
                  )}
                </div>
                {deleted ? (
                  <div className="mt-2">
                    <button
                      type="button"
                      className={buttonClass('secondary', 'min-h-10 text-sm')}
                      onClick={() => restore(entry)}
                    >
                      {az.common.restore}
                    </button>
                  </div>
                ) : (
                  entry.kind === 'settlement' && (
                    <div className="mt-2">
                      <button
                        type="button"
                        className={buttonClass('danger', 'min-h-10 px-3 text-sm')}
                        onClick={() => setSettlementToDelete(entry.item)}
                      >
                        {az.common.delete}
                      </button>
                    </div>
                  )
                )}
              </li>
            );
          })}
        </ul>
      )}
      <ConfirmDialog
        open={settlementToDelete !== null}
        title={t.deleteSettlementTitle}
        confirmLabel={az.common.delete}
        destructive
        onConfirm={deleteSettlement}
        onCancel={() => setSettlementToDelete(null)}
      >
        {t.deleteSettlementBody}
      </ConfirmDialog>
    </>
  );
}
