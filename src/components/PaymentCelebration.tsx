import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { formatMoney, type Member, type Settlement } from '../domain';
import { az } from '../i18n/az';
import { usePrefersReducedMotion } from '../lib/motion';
import { useInertApp } from '../lib/useInertApp';
import { Confetti } from './Confetti';

const DURATION_MS = 2000;

/** Blocks keys while shown; together with the inert app this makes it impossible to skip. */
function swallowKey(e: KeyboardEvent) {
  e.preventDefault();
  e.stopPropagation();
}

/** Full-screen confetti and the amount for ~2 s. Deliberately cannot be dismissed or skipped. */
export function PaymentCelebration({
  settlement,
  members,
  onDone,
}: {
  settlement: Settlement;
  members: Member[];
  onDone: () => void;
}) {
  const reduced = usePrefersReducedMotion();
  useInertApp();

  useEffect(() => {
    const timer = window.setTimeout(onDone, DURATION_MS);
    window.addEventListener('keydown', swallowKey, true);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('keydown', swallowKey, true);
    };
  }, [onDone]);

  const nameOf = (id: string) => members.find((m) => m.id === id)?.name ?? '?';
  const from = nameOf(settlement.fromMemberId);
  const to = nameOf(settlement.toMemberId);
  const amount = formatMoney(settlement.amountMinor);

  return createPortal(
    <>
      <div data-celebration="payment" className="fixed inset-0 z-50 bg-bg/80" />
      <Confetti variant="edges" durationMs={DURATION_MS} onDone={() => undefined} />
      <div className="pointer-events-none fixed inset-0 z-[52] flex items-center justify-center px-4">
        <div
          role="status"
          className={`${reduced ? '' : 'celebrate-card'} w-full max-w-xs rounded-card bg-surface px-6 py-7 text-center text-ink shadow-raised ring-1 ring-line`}
        >
          <p className="text-lg font-bold">{az.celebrate.paymentTitle}</p>
          <p className="tabular mt-2 text-4xl font-bold tracking-tight text-pos">{amount}</p>
          <p className="mt-2 break-words text-sm text-ink-muted">
            {from} → {to}
          </p>
        </div>
      </div>
    </>,
    document.body,
  );
}
