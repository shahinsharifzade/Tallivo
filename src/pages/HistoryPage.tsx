import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Avatar } from '../components/Avatar';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { HistoryArt } from '../components/illustrations';
import { ArrowRightIcon, TrashIcon } from '../components/icons';
import { buttonClass } from '../components/styles';
import { Badge, EmptyState, ErrorText, PageHeader } from '../components/ui';
import { formatMoney } from '../domain';
import { az } from '../i18n/az';
import { formatDate } from '../lib/format';
import {
  useActions,
  useAppData,
  useCurrentMember,
  useHistory,
  type HistoryItem,
} from '../state/hooks';
import { useFeedback } from '../state/feedback';
import { useSubmit } from '../state/useSubmit';

const t = az.history;

export function HistoryPage() {
  const history = useHistory();
  const { isAdmin } = useCurrentMember();
  const { members } = useAppData();
  const actions = useActions();
  const { error, run } = useSubmit();
  const feedback = useFeedback();
  const [entryToDelete, setEntryToDelete] = useState<HistoryItem | null>(null);
  // Only admins can restore, so only they get the view of deleted records.
  const [viewDeleted, setViewDeleted] = useState(false);
  const showingDeleted = isAdmin && viewDeleted;
  const items = history.filter((entry) => !!entry.item.deletedAt === showingDeleted);
  const deletedCount = history.filter((entry) => entry.item.deletedAt).length;
  const memberOf = (id: string) => members.find((m) => m.id === id);
  const nameOf = (id: string) => memberOf(id)?.name ?? '?';

  const restoreAction = (entry: HistoryItem) => {
    if (entry.kind === 'expense') return actions.restoreExpense(entry.item.id);
    if (entry.kind === 'settlement') return actions.restoreSettlement(entry.item.id);
    return actions.restoreMeetup(entry.item.id);
  };

  const labelOf = (entry: HistoryItem) =>
    entry.kind === 'settlement'
      ? `${nameOf(entry.item.fromMemberId)} → ${nameOf(entry.item.toMemberId)}`
      : entry.item.title;

  const confirmDelete = async () => {
    const entry = entryToDelete;
    setEntryToDelete(null);
    if (!entry) return;
    const deleted = await run(() =>
      entry.kind === 'settlement'
        ? actions.deleteSettlement(entry.item.id)
        : actions.deleteExpense(entry.item.id),
    );
    if (deleted) feedback.undoable(az.feedback.deleted(labelOf(entry)), () => restoreAction(entry));
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
      <PageHeader
        title={t.title}
        subtitle={showingDeleted ? t.deletedSubtitle : t.subtitle}
        actions={
          isAdmin &&
          (showingDeleted || deletedCount > 0) && (
            <button
              type="button"
              className={buttonClass('ghost', 'text-sm')}
              onClick={() => setViewDeleted(!viewDeleted)}
            >
              {showingDeleted ? t.showActive : t.showDeleted(deletedCount)}
            </button>
          )
        }
      />
      {error && (
        <div className="mb-3">
          <ErrorText>{error}</ErrorText>
        </div>
      )}
      {items.length === 0 && showingDeleted ? (
        <p className="text-sm text-ink-muted">{t.deletedEmpty}</p>
      ) : items.length === 0 ? (
        <EmptyState art={<HistoryArt />} title={t.emptyTitle} body={t.emptyBody} />
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
            const card = (
              <>
                <div className="mb-1 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-ink-muted">
                  {kindLabel[entry.kind]}
                  {deleted && <Badge>{az.common.deleted}</Badge>}
                  {isAdmin && !deleted && (
                    <button
                      type="button"
                      className={buttonClass('danger', 'ml-auto min-h-9 px-2.5')}
                      onClick={() => setEntryToDelete(entry)}
                      aria-label={`${az.common.delete}: ${labelOf(entry)}`}
                      title={az.common.delete}
                    >
                      <TrashIcon />
                    </button>
                  )}
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
                {deleted && (
                  <div className="mt-2">
                    <button
                      type="button"
                      className={buttonClass('secondary', 'min-h-10 text-sm')}
                      onClick={() => run(() => restoreAction(entry))}
                    >
                      {az.common.restore}
                    </button>
                  </div>
                )}
              </>
            );
            return (
              <li key={`${entry.kind}-${entry.item.id}`}>
                <div
                  className={`rounded-card p-4 ring-1 ${
                    deleted
                      ? 'bg-surface-2 text-ink-muted ring-line'
                      : 'bg-surface shadow-card ring-line'
                  }`}
                >
                  {card}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <ConfirmDialog
        open={entryToDelete !== null}
        title={
          entryToDelete?.kind === 'settlement'
            ? t.deleteSettlementTitle
            : az.meetupDetail.deleteExpenseTitle
        }
        confirmLabel={az.common.delete}
        destructive
        onConfirm={confirmDelete}
        onCancel={() => setEntryToDelete(null)}
      >
        {entryToDelete &&
          (entryToDelete.kind === 'settlement'
            ? t.deleteSettlementBody
            : az.meetupDetail.deleteExpenseBody(labelOf(entryToDelete)))}
      </ConfirmDialog>
    </>
  );
}
