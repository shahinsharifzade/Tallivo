import { Link } from 'react-router-dom';
import { BalanceList } from '../components/BalanceList';
import { PlusIcon } from '../components/icons';
import { buttonClass } from '../components/styles';
import { TransferList } from '../components/TransferList';
import { Card, EmptyState, SectionTitle } from '../components/ui';
import { formatMoney, formatMoneyPlain } from '../domain';
import { az } from '../i18n/az';
import { useAppData, useOverallSummary } from '../state/hooks';

export function OverviewPage() {
  const { members, expenses, settlements } = useAppData();
  const { balances, transfers, totalSpentMinor } = useOverallSummary();
  const hasData = expenses.some((e) => !e.deletedAt) || settlements.some((s) => !s.deletedAt);

  if (!hasData) {
    return (
      <>
        <h1 className="sr-only">{az.overview.title}</h1>
        <EmptyState
          title={az.overview.emptyTitle}
          body={az.overview.emptyBody}
          action={
            <Link to="/meetups/new" className={buttonClass('primary')}>
              <PlusIcon />
              {az.overview.emptyAction}
            </Link>
          }
        />
      </>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="sr-only">{az.overview.title}</h1>

      <Card className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-ink-muted">{az.overview.totalSpent}</p>
          <p className="tabular text-2xl font-bold">{formatMoney(totalSpentMinor)}</p>
        </div>
        <Link to="/payments/new" className={buttonClass('primary', 'shrink-0')}>
          {az.overview.recordPayment}
        </Link>
      </Card>

      <Card>
        <SectionTitle hint={az.overview.balancesHint}>{az.overview.balancesTitle}</SectionTitle>
        <BalanceList members={members} balances={balances} />
      </Card>

      <Card>
        <SectionTitle>{az.overview.transfersTitle}</SectionTitle>
        <TransferList
          transfers={transfers}
          members={members}
          emptyText={az.overview.allSettled}
          renderAction={(t) => (
            <Link
              to={`/payments/new?from=${t.fromMemberId}&to=${t.toMemberId}&amount=${formatMoneyPlain(t.amountMinor)}`}
              className={buttonClass('secondary', 'min-h-10 px-3 text-sm')}
            >
              {az.overview.recordThis}
            </Link>
          )}
        />
      </Card>
    </div>
  );
}
