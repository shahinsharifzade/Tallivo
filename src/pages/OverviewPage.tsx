import { Link } from 'react-router-dom';
import { BalanceBars } from '../components/BalanceBars';
import { PlusIcon } from '../components/icons';
import { buttonClass } from '../components/styles';
import { TransferCards } from '../components/TransferCards';
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
        <BalanceBars members={members} balances={balances} />
      </Card>

      <Card>
        <SectionTitle hint={transfers.length > 0 ? az.overview.transfersHint : undefined}>
          {az.overview.transfersTitle}
        </SectionTitle>
        <TransferCards
          transfers={transfers}
          members={members}
          emptyText={az.overview.allSettled}
          linkFor={(t) =>
            `/payments/new?from=${t.fromMemberId}&to=${t.toMemberId}&amount=${formatMoneyPlain(t.amountMinor)}`
          }
        />
      </Card>
    </div>
  );
}
