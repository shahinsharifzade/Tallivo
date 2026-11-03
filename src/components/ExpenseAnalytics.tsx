import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { formatMoney, type DayTotal, type Member, type Minor, type YearMonthKey } from '../domain';
import { az } from '../i18n/az';
import { todayIso } from '../lib/dates';
import { formatDate } from '../lib/format';
import { memberColor } from '../lib/memberColors';
import { useCountUp } from '../lib/motion';
import { useAppData, useExpenseMonthRange, useMonthlyExpenses } from '../state/hooks';
import { Avatar } from './Avatar';
import { ChevronLeftIcon, ChevronRightIcon } from './icons';
import { Card } from './ui';

const t = az.analytics;
type Tab = 'total' | 'members';

function shiftMonth(month: YearMonthKey, delta: number): YearMonthKey {
  const [y, m] = month.split('-').map(Number) as [number, number];
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** "2026-11" -> "Noyabr 2026". */
function monthLabel(month: YearMonthKey): string {
  const [y, m] = month.split('-').map(Number) as [number, number];
  const name = az.common.months[m - 1] ?? '';
  return `${name.charAt(0).toLocaleUpperCase('az')}${name.slice(1)} ${y}`;
}

/** True one frame pair after mount, so bars can grow in from zero. */
function useEntered(): boolean {
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setEntered(true));
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, []);
  return entered;
}

/**
 * Overview card: the selected month's spending, either as the group total with a per-day bar chart
 * or as each member's own share. Months are switched with the arrows; both tabs share the month.
 * All numbers come from the domain (useMonthlyExpenses); repayments are never included.
 */
export function ExpenseAnalytics() {
  const { members } = useAppData();
  const range = useExpenseMonthRange();
  const current = todayIso().slice(0, 7);
  const [month, setMonth] = useState<YearMonthKey>(current);
  const [tab, setTab] = useState<Tab>('total');
  const data = useMonthlyExpenses(month);
  const baseId = useId();

  // No browsing before the first expense or past the current month (or the last expense, if later).
  const min = range && range.first < current ? range.first : current;
  const max = range && range.last > current ? range.last : current;
  const canPrev = month > min;
  const canNext = month < max;

  const tabs: { id: Tab; label: string }[] = [
    { id: 'total', label: t.tabTotal },
    { id: 'members', label: t.tabMembers },
  ];
  const onTabKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const next: Tab = tab === 'total' ? 'members' : 'total';
    setTab(next);
    document.getElementById(`${baseId}-tab-${next}`)?.focus();
  };

  const empty = data.expenseCount === 0;

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="font-semibold text-ink">{t.title}</h2>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-control text-ink-soft hover:bg-surface-2 disabled:opacity-30 disabled:hover:bg-transparent"
            onClick={() => setMonth(shiftMonth(month, -1))}
            disabled={!canPrev}
            aria-label={t.prevMonth}
          >
            <ChevronLeftIcon />
          </button>
          <p
            aria-live="polite"
            className="min-w-[7.5rem] text-center text-sm font-semibold tabular text-ink"
          >
            {monthLabel(month)}
          </p>
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-control text-ink-soft hover:bg-surface-2 disabled:opacity-30 disabled:hover:bg-transparent"
            onClick={() => setMonth(shiftMonth(month, 1))}
            disabled={!canNext}
            aria-label={t.nextMonth}
          >
            <ChevronRightIcon />
          </button>
        </div>
      </div>

      <div
        role="tablist"
        aria-label={t.tabsLabel}
        onKeyDown={onTabKey}
        className="mb-4 grid grid-cols-2 gap-1 rounded-control bg-surface-2 p-1"
      >
        {tabs.map((item) => {
          const selected = tab === item.id;
          return (
            <button
              key={item.id}
              id={`${baseId}-tab-${item.id}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`${baseId}-panel`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setTab(item.id)}
              className={`min-h-9 rounded-control px-2 text-sm font-medium transition-colors ${
                selected ? 'bg-surface text-ink shadow-card' : 'text-ink-muted hover:text-ink-soft'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <div
        key={tab}
        id={`${baseId}-panel`}
        role="tabpanel"
        aria-labelledby={`${baseId}-tab-${tab}`}
        className="page-in"
      >
        {tab === 'total' ? (
          <>
            <p className="text-sm text-ink-muted">{t.monthTotal}</p>
            <div className="mb-4 flex items-baseline gap-2">
              <p className="tabular text-3xl font-bold text-ink">
                <CountUpMoney value={data.totalMinor} />
              </p>
              {!empty && (
                <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent-ink">
                  {t.expenseCount(data.expenseCount)}
                </span>
              )}
            </div>
            {empty ? (
              <MonthEmpty />
            ) : (
              <DailyChart days={data.days} label={t.chartLabel(monthLabel(month))} />
            )}
          </>
        ) : empty ? (
          <MonthEmpty />
        ) : (
          <MemberShares members={members} byMember={data.byMember} totalMinor={data.totalMinor} />
        )}
      </div>
    </Card>
  );
}

function CountUpMoney({ value }: { value: number }) {
  return <>{formatMoney(useCountUp(value))}</>;
}

function MonthEmpty() {
  return (
    <div className="flex flex-col items-center justify-center rounded-control bg-surface-2 px-4 py-8 text-center">
      <svg
        viewBox="0 0 48 48"
        className="mb-2 h-10 w-10 text-ink-muted"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <path d="M8 40h32" />
        <path d="M14 40V30M22 40V24M30 40V33M38 40V27" strokeDasharray="3 4" />
      </svg>
      <p className="font-semibold text-ink">{t.emptyTitle}</p>
      <p className="mt-0.5 text-sm text-ink-muted">{t.emptyBody}</p>
    </div>
  );
}

/** Days labelled under the chart: roughly weekly, plus the last day. */
function isTick(day: number, length: number): boolean {
  return day === 1 || day === 8 || day === 15 || day === 22 || day === length;
}

/**
 * One bar per day (single series, accent color): each meetup's expenses combined, placed on the
 * meetup's date, and meetups of the same day added together. Hover, tap or arrow keys pick a day;
 * its date, meetup name(s) and amount show in a tooltip above the bar. Bars slide up from the baseline when they mount
 * and move to their new height when the month changes (transform only).
 */
function DailyChart({ days, label }: { days: DayTotal[]; label: string }) {
  const entered = useEntered();
  const [active, setActive] = useState<number | null>(null);
  const [focusIndex, setFocusIndex] = useState(0);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const max = Math.max(...days.map((d) => d.totalMinor));

  // A new month means a new set of days: drop the old selection.
  const firstDate = days[0]?.date;
  useEffect(() => {
    setActive(null);
    setFocusIndex(0);
  }, [firstDate]);

  const pctOf = (value: Minor) => (max === 0 ? 0 : (value / max) * 100);
  const activeDay = active !== null ? days[active] : undefined;
  const activeLeft = active !== null ? ((active + 0.5) / days.length) * 100 : 0;

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    const jump = e.key === 'Home' ? 0 : e.key === 'End' ? days.length - 1 : null;
    if (!step && jump === null) return;
    e.preventDefault();
    const next = jump ?? Math.min(days.length - 1, Math.max(0, focusIndex + step));
    setFocusIndex(next);
    setActive(next);
    buttons.current[next]?.focus();
  };

  return (
    <div>
      <div className="relative pt-12">
        {activeDay && (
          <div
            role="status"
            className="pointer-events-none absolute z-10 w-max max-w-[15rem] rounded-control bg-ink px-2.5 py-1.5 text-xs text-surface shadow-card"
            style={{
              left: `${activeLeft}%`,
              bottom: `calc(${pctOf(activeDay.totalMinor) * 0.01} * 8rem + 0.5rem)`,
              transform: `translateX(${activeLeft < 18 ? '-12%' : activeLeft > 82 ? '-88%' : '-50%'})`,
            }}
          >
            <span className="block text-surface/70">{formatDate(activeDay.date)}</span>
            {activeDay.meetups.length === 1 && (
              <span className="block truncate font-medium">{activeDay.meetups[0]?.title}</span>
            )}
            {activeDay.meetups.length > 1 && (
              <span className="my-0.5 block space-y-0.5">
                {activeDay.meetups.map((m) => (
                  <span key={m.meetupId} className="flex justify-between gap-3">
                    <span className="truncate">{m.title}</span>
                    <span className="tabular shrink-0 text-surface/80">
                      {formatMoney(m.totalMinor)}
                    </span>
                  </span>
                ))}
              </span>
            )}
            <span className="tabular block font-semibold">
              {activeDay.totalMinor > 0 ? formatMoney(activeDay.totalMinor) : t.noSpending}
            </span>
          </div>
        )}
        <div
          role="group"
          aria-label={label}
          onKeyDown={onKey}
          onPointerLeave={(e) => {
            if (e.pointerType === 'mouse') setActive(null);
          }}
          className="flex h-32 items-stretch gap-[2px] border-b border-line"
        >
          {days.map((d, i) => {
            const pct = pctOf(d.totalMinor);
            const isActive = active === i;
            const dimmed = active !== null && !isActive;
            return (
              <button
                key={i}
                ref={(el) => {
                  buttons.current[i] = el;
                }}
                type="button"
                tabIndex={i === focusIndex ? 0 : -1}
                aria-label={t.dayLabel(
                  formatDate(d.date),
                  d.totalMinor > 0 ? formatMoney(d.totalMinor) : t.noSpending,
                  d.meetups.map((m) => m.title).join(', '),
                )}
                aria-pressed={isActive}
                onPointerEnter={() => setActive(i)}
                onFocus={() => {
                  setFocusIndex(i);
                  setActive(i);
                }}
                onClick={() => setActive(isActive ? null : i)}
                className="relative flex min-w-0 flex-1 items-end justify-center overflow-hidden rounded-t-[4px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
              >
                {d.totalMinor > 0 ? (
                  <span
                    aria-hidden="true"
                    className={`block h-full w-full max-w-[18px] rounded-t-[4px] transition-[transform,opacity,background-color] duration-500 ease-[cubic-bezier(0.34,1.3,0.64,1)] ${
                      isActive ? 'bg-accent-strong' : 'bg-accent'
                    } ${dimmed ? 'opacity-40' : ''}`}
                    style={{
                      transform: `translateY(${entered ? 100 - pct : 100}%)`,
                      transitionDelay: entered ? '0ms' : `${i * 12}ms`,
                    }}
                  />
                ) : (
                  <span
                    aria-hidden="true"
                    className="mb-0.5 block h-1 w-1 rounded-full bg-surface-3"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
      <div className="relative mt-1 h-4 text-[11px] tabular text-ink-muted" aria-hidden="true">
        {days.map((_, i) =>
          isTick(i + 1, days.length) ? (
            <span
              key={i}
              className="absolute -translate-x-1/2"
              style={{ left: `${((i + 0.5) / days.length) * 100}%` }}
            >
              {i + 1}
            </span>
          ) : null,
        )}
      </div>
      <p className="mt-2 text-xs text-ink-muted">{t.chartHint}</p>
    </div>
  );
}

/**
 * Each member's own share of the month (not what they paid), as horizontal bars in the member's
 * color. Identity also comes from avatar + name; amounts are plain text. The total row shows that
 * the shares add up to the month's total.
 */
function MemberShares({
  members,
  byMember,
  totalMinor,
}: {
  members: Member[];
  byMember: Record<string, Minor>;
  totalMinor: Minor;
}) {
  const entered = useEntered();
  const max = Math.max(0, ...members.map((m) => byMember[m.id] ?? 0));
  const sum = members.reduce((acc, m) => acc + (byMember[m.id] ?? 0), 0);
  return (
    <div>
      <p className="mb-3 text-sm text-ink-muted">{t.membersHint}</p>
      <ul className="stagger space-y-3">
        {members.map((m, i) => {
          const value = byMember[m.id] ?? 0;
          const pct = max === 0 ? 0 : (value / max) * 100;
          // Whole percent of the month, for orientation only; the exact amount is next to it.
          const ofTotal = totalMinor === 0 ? 0 : Math.round((value * 100) / totalMinor);
          return (
            <li
              key={m.id}
              className={`grid grid-cols-[minmax(0,7rem)_1fr_auto] items-center gap-x-3 ${
                value === 0 ? 'opacity-60' : ''
              }`}
            >
              <span className="flex min-w-0 items-center gap-2">
                <Avatar member={m} size="sm" />
                <span className="truncate text-sm font-medium">{m.name}</span>
              </span>
              <span
                className="block h-3.5 overflow-hidden rounded-[4px] bg-surface-2"
                title={`${m.name}: ${formatMoney(value)}`}
              >
                <span
                  className="block h-full w-full rounded-r-[4px] transition-transform duration-700 ease-[cubic-bezier(0.34,1.3,0.64,1)]"
                  style={{
                    backgroundColor: memberColor(m),
                    transform: `translateX(-${entered ? 100 - pct : 100}%)`,
                    transitionDelay: entered ? '0ms' : `${80 + i * 60}ms`,
                  }}
                />
              </span>
              <span className="text-right">
                <span className="tabular block text-sm font-semibold text-ink">
                  {formatMoney(value)}
                </span>
                <span className="tabular block text-[11px] text-ink-muted">{ofTotal}%</span>
              </span>
            </li>
          );
        })}
      </ul>
      <div className="mt-4 flex items-center justify-between border-t border-line pt-3 text-sm">
        <span className="text-ink-muted">{t.membersTotal}</span>
        <span className="tabular font-semibold text-ink">{formatMoney(sum)}</span>
      </div>
    </div>
  );
}
