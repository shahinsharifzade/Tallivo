import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BalanceBars } from '../components/BalanceBars';
import { BalanceSettledSkeletonCelebration } from '../components/BalanceSettledSkeletonCelebration';
import { Confetti } from '../components/Confetti';
import { ExpenseAnalytics } from '../components/ExpenseAnalytics';
import { ReceiptArt } from '../components/illustrations';
import { PlusIcon } from '../components/icons';
import { buttonClass } from '../components/styles';
import { TransferCards } from '../components/TransferCards';
import { Card, EmptyState, SectionTitle } from '../components/ui';
import { formatMoney } from '../domain';
import { az } from '../i18n/az';
import { useCountUp } from '../lib/motion';
import { paymentLink } from '../lib/paymentLink';
import { useCelebrate } from '../state/celebrate';
import { useCelebration } from '../state/celebration';
import { useAppData, useOverallSummary } from '../state/hooks';

export function OverviewPage() {
  const { members, expenses, settlements } = useAppData();
  const { balances, transfers, totalSpentMinor, settled } = useOverallSummary();
  const hasData = expenses.some((e) => !e.deletedAt) || settlements.some((s) => !s.deletedAt);
  const celebration = useCelebration();
  const { active: celebrating } = useCelebrate();
  const [confetti, setConfetti] = useState(false);

  // Confetti only right after the group became settled, never on a plain page load.
  useEffect(() => {
    if (!celebration.pending) return;
    celebration.consume();
    // The payment that settled everything is already showing its own confetti.
    if (!celebrating) setConfetti(true);
  }, [celebration, celebrating]);

  if (!hasData) {
    return (
      <>
        <h1 className="sr-only">{az.overview.title}</h1>
        <EmptyState
          art={<ReceiptArt />}
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
        <section className="settle-in relative overflow-hidden rounded-card bg-pos-soft p-5 text-center shadow-card ring-1 ring-pos/30">
          <p className="text-4xl" aria-hidden="true">
            🎉
          </p>
          <p role="status" className="mt-2 text-xl font-bold text-pos">
            {az.overview.settledTitle}
          </p>
          <p className="mt-1 text-sm text-ink-soft">{az.overview.settledBody}</p>
          {/* Dance floor: full banner width (so the skeletons can run in and out of view), below the text.
              Mounted only while settled, so a new debt stops the party and its schedule. */}
          <div className="relative -mx-5 -mb-2 mt-2 h-14 sm:h-16">
            <div
              aria-hidden="true"
              className="absolute bottom-2 left-1/2 h-0.5 w-48 max-w-[60%] -translate-x-1/2 rounded-full bg-pos/20"
            />
            {/* Holds off while a full-screen payment celebration covers the page. */}
            <BalanceSettledSkeletonCelebration paused={celebrating} />
          </div>
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
            linkFor={paymentLink}
          />
        </Card>
      )}

      <ExpenseAnalytics />
    </div>
  );
}

function CountUpMoney({ value }: { value: number }) {
  return <>{formatMoney(useCountUp(value))}</>;
}
