import { useEffect, useMemo, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { formatMoney, type Expense, type Member } from '../domain';
import { az } from '../i18n/az';
import { memberColor } from '../lib/memberColors';
import { usePrefersReducedMotion } from '../lib/motion';
import { useInertApp } from '../lib/useInertApp';
import { Avatar } from './Avatar';
import { CheckIcon } from './icons';

const DURATION_MS = 2700;
const REDUCED_DURATION_MS = 1800;
/** When the first coin leaves, and the longest the coins of one person keep leaving. */
const COINS_START_MS = 450;
const COINS_WINDOW_MS = 750;
const COIN_FLIGHT_MS = 620;
const MAX_STAGE_PX = 352;

/**
 * Picture only: coin counts follow each person's part of the total, and every number shown is the
 * saved amount, formatted. Nothing about the money is calculated here.
 */
function coinCount(amountMinor: number, totalMinor: number, people: number): number {
  const allCoins = Math.min(40, people * 8);
  return Math.max(3, Math.round((amountMinor / totalMinor) * allCoins));
}

/** The saved total flowing out to each participant as coins. Tap or Esc skips it. */
export function ExpenseSplitCelebration({
  expense,
  members,
  onDone,
}: {
  expense: Expense;
  members: Member[];
  onDone: () => void;
}) {
  const reduced = usePrefersReducedMotion();
  useInertApp();

  useEffect(() => {
    const timer = window.setTimeout(onDone, reduced ? REDUCED_DURATION_MS : DURATION_MS);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDone();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('keydown', onKey);
    };
  }, [onDone, reduced]);

  const stage = Math.min(window.innerWidth * 0.88, window.innerHeight * 0.8, MAX_STAGE_PX);
  const radius = stage * 0.37;
  const compact = expense.shares.length > 8;

  const people = useMemo(
    () =>
      expense.shares.map((share, i) => {
        const angle = -Math.PI / 2 + (i / expense.shares.length) * Math.PI * 2;
        return {
          share,
          member: members.find((m) => m.id === share.memberId),
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius,
        };
      }),
    [expense.shares, members, radius],
  );

  const total = formatMoney(expense.totalMinor);
  const summary = people
    .map((p) => `${p.member?.name ?? '?'} ${formatMoney(p.share.amountMinor)}`)
    .join(', ');

  return createPortal(
    <div
      data-celebration="expense"
      onClick={onDone}
      className={`fixed inset-0 z-50 flex items-center justify-center bg-bg/95 ${reduced ? '' : 'split-overlay'}`}
    >
      <p role="status" className="sr-only">
        {az.celebrate.splitSummary(expense.title, total, summary)}
      </p>
      <div aria-hidden="true" className="relative" style={{ width: stage, height: stage }}>
        {!reduced &&
          people.flatMap(({ share, member, x, y }, personIndex) => {
            const count = coinCount(share.amountMinor, expense.totalMinor, people.length);
            const gap = Math.min(65, COINS_WINDOW_MS / count);
            return Array.from({ length: count }, (_, i) => {
              // A slight sideways arc, alternating, so the coins do not fly in a single line.
              const bend = (i % 2 === 0 ? 0.16 : -0.16) * (1 + (i % 3) * 0.5);
              return (
                <span
                  key={`${share.memberId}-${i}`}
                  className="split-coin absolute left-1/2 top-1/2 -ml-1.5 -mt-1.5 h-3 w-3 rounded-full ring-2 ring-white/70"
                  style={
                    {
                      backgroundColor: memberColor(member),
                      animationDelay: `${COINS_START_MS + personIndex * 30 + i * gap}ms`,
                      animationDuration: `${COIN_FLIGHT_MS}ms`,
                      '--x': `${x}px`,
                      '--y': `${y}px`,
                      '--mx': `${x / 2 - y * bend}px`,
                      '--my': `${y / 2 + x * bend}px`,
                    } as CSSProperties
                  }
                />
              );
            });
          })}

        <div className="absolute inset-0 flex items-center justify-center">
          <div className={`max-w-[55%] text-center ${reduced ? '' : 'split-center'}`}>
            <p className="truncate text-sm font-medium text-ink-muted">{expense.title}</p>
            <p className="tabular text-3xl font-bold tracking-tight text-ink">{total}</p>
            <span
              className={`mt-1 inline-flex h-7 w-7 items-center justify-center rounded-full bg-pos-bar text-white ${reduced ? '' : 'split-check'}`}
            >
              <CheckIcon />
            </span>
          </div>
        </div>

        {people.map(({ share, member, x, y }, i) => (
          <div
            key={share.memberId}
            className="absolute left-1/2 top-1/2 w-0"
            style={{ transform: `translate(${x}px, ${y}px)` }}
          >
            <div className="flex -translate-x-1/2 -translate-y-5 flex-col items-center whitespace-nowrap">
              <span
                className={`inline-flex ${reduced ? '' : 'split-avatar'}`}
                style={{ animationDelay: `${i * 45}ms` }}
              >
                <Avatar member={member} size={compact ? 'sm' : 'lg'} />
              </span>
              <span
                className={`tabular mt-1 rounded-full bg-surface px-2 py-0.5 font-semibold text-ink shadow-card ring-1 ring-line ${compact ? 'text-[10px]' : 'text-xs'} ${reduced ? '' : 'split-share'}`}
                style={{ animationDelay: `${1250 + i * 60}ms` }}
              >
                {formatMoney(share.amountMinor)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>,
    document.body,
  );
}
