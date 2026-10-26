import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Avatar } from '../components/Avatar';
import { BalanceBars } from '../components/BalanceBars';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { PencilIcon, PlusIcon, TrashIcon } from '../components/icons';
import { buttonClass } from '../components/styles';
import { TransferCards } from '../components/TransferCards';
import { Card, EmptyState, ErrorText, PageHeader, SectionTitle } from '../components/ui';
import { formatMoney, type Expense } from '../domain';
import { az } from '../i18n/az';
import { formatDate } from '../lib/format';
import { useActions, useAppData, useMeetup, useMeetupSummary } from '../state/hooks';
import { useSubmit } from '../state/useSubmit';
import { NotFoundPage } from './NotFoundPage';

const t = az.meetupDetail;

export function MeetupDetailPage() {
  const { meetupId = '' } = useParams();
  const navigate = useNavigate();
  const actions = useActions();
  const { members } = useAppData();
  const { meetup, expenses } = useMeetup(meetupId);
  const summary = useMeetupSummary(meetupId);
  const { error, run } = useSubmit();
  const [confirmDeleteMeetup, setConfirmDeleteMeetup] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);

  if (!meetup) return <NotFoundPage title={t.notFound} />;

  const memberOf = (id: string) => members.find((m) => m.id === id);
  const nameOf = (id: string) => memberOf(id)?.name ?? '?';
  const isDeleted = !!meetup.deletedAt;

  const deleteMeetup = async () => {
    setConfirmDeleteMeetup(false);
    if (await run(() => actions.deleteMeetup(meetup.id))) navigate('/meetups', { replace: true });
  };

  const deleteExpense = async () => {
    const expense = expenseToDelete;
    setExpenseToDelete(null);
    if (expense) await run(() => actions.deleteExpense(expense.id));
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title={meetup.title}
        subtitle={
          <>
            {formatDate(meetup.date)}
            {meetup.note && <span className="block text-ink-soft">{meetup.note}</span>}
          </>
        }
        backTo="/meetups"
        actions={
          !isDeleted && (
            <>
              <Link
                to={`/meetups/${meetup.id}/edit`}
                className={buttonClass('ghost', 'px-3')}
                aria-label={az.common.edit}
                title={az.common.edit}
              >
                <PencilIcon />
              </Link>
              <button
                type="button"
                className={buttonClass('danger', 'px-3')}
                onClick={() => setConfirmDeleteMeetup(true)}
                aria-label={az.common.delete}
                title={az.common.delete}
              >
                <TrashIcon />
              </button>
            </>
          )
        }
      />

      {error && <ErrorText>{error}</ErrorText>}

      {isDeleted ? (
        <Card className="space-y-3">
          <p className="text-ink-soft">{t.deletedBanner}</p>
          <button
            type="button"
            className={buttonClass('secondary')}
            onClick={() => run(() => actions.restoreMeetup(meetup.id))}
          >
            {az.common.restore}
          </button>
        </Card>
      ) : (
        <>
          <Card className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-ink-muted">{t.totalSpent}</p>
              <p className="tabular text-2xl font-bold">{formatMoney(summary.totalSpentMinor)}</p>
              {summary.participantCount > 0 && (
                <p className="text-sm text-ink-muted">
                  {az.common.people(summary.participantCount)}
                </p>
              )}
            </div>
            <Link
              to={`/meetups/${meetup.id}/expenses/new`}
              className={buttonClass('primary', 'shrink-0')}
            >
              <PlusIcon />
              {t.addExpense}
            </Link>
          </Card>

          {expenses.length === 0 ? (
            <EmptyState title={t.noExpensesTitle} body={t.noExpensesBody} />
          ) : (
            <>
              <Card>
                <SectionTitle>{t.expensesTitle}</SectionTitle>
                <ul className="divide-y divide-line">
                  {expenses.map((expense) => (
                    <li key={expense.id} className="flex items-start gap-3 py-3">
                      <Avatar member={memberOf(expense.paidByMemberId)} className="mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-3">
                          <p className="truncate font-medium">{expense.title}</p>
                          <p className="tabular shrink-0 font-semibold">
                            {formatMoney(expense.totalMinor)}
                          </p>
                        </div>
                        <p className="text-sm text-ink-muted">
                          {t.paidBy(nameOf(expense.paidByMemberId))}
                        </p>
                        <p className="tabular text-sm text-ink-muted">
                          {expense.shares
                            .map((s) => `${nameOf(s.memberId)} ${formatMoney(s.amountMinor)}`)
                            .join(' · ')}
                        </p>
                        {expense.note && (
                          <p className="text-sm italic text-ink-muted">{expense.note}</p>
                        )}
                      </div>
                      <div className="flex shrink-0">
                        <Link
                          to={`/meetups/${meetup.id}/expenses/${expense.id}/edit`}
                          className={buttonClass('ghost', 'px-3')}
                          aria-label={`${az.common.edit}: ${expense.title}`}
                          title={az.common.edit}
                        >
                          <PencilIcon />
                        </Link>
                        <button
                          type="button"
                          className={buttonClass('danger', 'px-3')}
                          onClick={() => setExpenseToDelete(expense)}
                          aria-label={`${az.common.delete}: ${expense.title}`}
                          title={az.common.delete}
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>

              <Card>
                <SectionTitle hint={t.balancesHint}>{t.balancesTitle}</SectionTitle>
                <BalanceBars
                  members={members}
                  balances={summary.balances}
                  onlyIds={summary.involvedMemberIds}
                />
              </Card>

              <Card>
                <SectionTitle>{t.transfersTitle}</SectionTitle>
                <TransferCards
                  transfers={summary.transfers}
                  members={members}
                  emptyText={t.allSettled}
                />
              </Card>
            </>
          )}
        </>
      )}

      <ConfirmDialog
        open={confirmDeleteMeetup}
        title={t.deleteMeetupTitle}
        confirmLabel={az.common.delete}
        destructive
        onConfirm={deleteMeetup}
        onCancel={() => setConfirmDeleteMeetup(false)}
      >
        {t.deleteMeetupBody}
      </ConfirmDialog>
      <ConfirmDialog
        open={expenseToDelete !== null}
        title={t.deleteExpenseTitle}
        confirmLabel={az.common.delete}
        destructive
        onConfirm={deleteExpense}
        onCancel={() => setExpenseToDelete(null)}
      >
        {expenseToDelete && t.deleteExpenseBody(expenseToDelete.title)}
      </ConfirmDialog>
    </div>
  );
}
