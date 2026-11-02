import { formatMoney, type ExpenseShare, type Member, type Minor } from '../domain';
import { memberColor } from '../lib/memberColors';

interface SplitBarProps {
  shares: ExpenseShare[];
  totalMinor: Minor | null;
  members: Member[];
  label: string;
  /** Label every segment with its amount (inside it, or below the bar when it is too narrow). */
  showAmounts?: boolean;
}

/** Share of the bar one label character needs to fit inside a segment on a phone-width bar. */
const FRACTION_PER_LABEL_CHAR = 0.026;

/**
 * One bar for the whole amount, split into member-colored segments with proportional widths.
 * Segments are full-width layers moved with translateX/scaleX, so changes animate with
 * transforms only. Unassigned money shows as the empty track.
 */
export function SplitBar({ shares, totalMinor, members, label, showAmounts }: SplitBarProps) {
  const assigned = shares.reduce((sum, s) => sum + s.amountMinor, 0);
  const scale = Math.max(totalMinor ?? 0, assigned);
  let offset = 0;
  const segments = shares.map((s) => {
    const start = scale > 0 ? offset / scale : 0;
    const fraction = scale > 0 ? s.amountMinor / scale : 0;
    offset += s.amountMinor;
    const amount = formatMoney(s.amountMinor);
    const fits = fraction >= amount.length * FRACTION_PER_LABEL_CHAR;
    return { ...s, start, fraction, amount, fits };
  });
  const memberOf = (id: string) => members.find((m) => m.id === id);
  const narrow = showAmounts ? segments.filter((s) => !s.fits) : [];

  const bar = (
    <div
      role="img"
      aria-label={
        showAmounts
          ? `${label}: ${segments.map((s) => `${memberOf(s.memberId)?.name} ${s.amount}`).join(', ')}`
          : label
      }
      className={`relative overflow-hidden rounded-full bg-surface-3 ${showAmounts ? 'h-7' : 'h-4'}`}
    >
      {segments.map((s) => (
        <div
          key={s.memberId}
          style={{
            backgroundColor: memberColor(memberOf(s.memberId)),
            transform: `translateX(${s.start * 100}%) scaleX(${s.fraction})`,
          }}
          className="absolute inset-0 origin-left transition-transform duration-300 ease-out"
        />
      ))}
      {segments.slice(1).map((s) => (
        <div
          key={`divider-${s.memberId}`}
          style={{ transform: `translateX(${s.start * 100}%)` }}
          className="pointer-events-none absolute inset-0 transition-transform duration-300 ease-out"
        >
          <div className="h-full w-0.5 bg-surface" />
        </div>
      ))}
      {showAmounts &&
        segments
          .filter((s) => s.fits)
          .map((s) => (
            <div
              key={`amount-${s.memberId}`}
              aria-hidden="true"
              style={{ transform: `translateX(${s.start * 100}%)` }}
              className="tabular pointer-events-none absolute inset-0 flex items-center pl-2 text-xs font-semibold text-white transition-transform duration-300 ease-out"
            >
              {s.amount}
            </div>
          ))}
    </div>
  );

  if (!showAmounts) return bar;
  return (
    <div>
      {bar}
      {narrow.length > 0 && (
        <ul aria-hidden="true" className="tabular mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs">
          {narrow.map((s) => (
            <li key={s.memberId} className="flex items-center gap-1 font-semibold text-ink-soft">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: memberColor(memberOf(s.memberId)) }}
              />
              {s.amount}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
