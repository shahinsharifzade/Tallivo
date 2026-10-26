import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BalanceBars } from '../components/BalanceBars';
import { Confetti } from '../components/Confetti';
import { PlusIcon } from '../components/icons';
import { buttonClass } from '../components/styles';
import { TransferCards } from '../components/TransferCards';
import { Card, EmptyState, SectionTitle } from '../components/ui';
import { formatMoney, formatMoneyPlain } from '../domain';
import { az } from '../i18n/az';
import { useCountUp } from '../lib/motion';
import { useCelebration } from '../state/celebration';
import { useAppData, useOverallSummary } from '../state/hooks';

export function OverviewPage() {
  const { members, expenses, settlements } = useAppData();
  const { balances, transfers, totalSpentMinor, settled } = useOverallSummary();
  const hasData = expenses.some((e) => !e.deletedAt) || settlements.some((s) => !s.deletedAt);
  const celebration = useCelebration();
  const [confetti, setConfetti] = useState(false);

  // Confetti only right after the group became settled, never on a plain page load.
  useEffect(() => {
    if (!celebration.pending) return;
    celebration.consume();
    setConfetti(true);
  }, [celebration]);

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
      {confetti && <Confetti onDone={() => setConfetti(false)} />}
      {settled && (
        <section className="settle-in rounded-card bg-pos-soft p-5 text-center shadow-card ring-1 ring-pos/30">
          <p className="text-4xl" aria-hidden="true">
            🎉
          </p>
          <p role="status" className="mt-2 text-xl font-bold text-pos">
            {az.overview.settledTitle}
          </p>
          <p className="mt-1 text-sm text-ink-soft">{az.overview.settledBody}</p>
        </section>
      )}

      <Card className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-ink-muted">{az.overview.totalSpent}</p>
          <p className="tabular text-2xl font-bold">
            <CountUpMoney value={totalSpentMinor} />
          </p>
        </div>
        <Link to="/payments/new" className={buttonClass('primary', 'shrink-0')}>
          {az.overview.recordPayment}
        </Link>
      </Card>

      <Card>
        <SectionTitle hint={az.overview.balancesHint}>{az.overview.balancesTitle}</SectionTitle>
        <BalanceBars members={members} balances={balances} />
      </Card>

      {!settled && (
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
      )}
    </div>
  );
}

function CountUpMoney({ value }: { value: number }) {
  return <>{formatMoney(useCountUp(value))}</>;
}
