import type { ExpenseShare, Member, Minor } from '../domain';
import { memberColor } from '../lib/memberColors';

interface SplitBarProps {
  shares: ExpenseShare[];
  totalMinor: Minor | null;
  members: Member[];
  label: string;
}

/**
 * One bar for the whole amount, split into member-colored segments with proportional widths.
 * Segments are full-width layers moved with translateX/scaleX, so changes animate with
 * transforms only. Unassigned money shows as the empty track.
 */
export function SplitBar({ shares, totalMinor, members, label }: SplitBarProps) {
  const assigned = shares.reduce((sum, s) => sum + s.amountMinor, 0);
  const scale = Math.max(totalMinor ?? 0, assigned);
  let offset = 0;
  const segments = shares.map((s) => {
    const start = scale > 0 ? offset / scale : 0;
    const fraction = scale > 0 ? s.amountMinor / scale : 0;
    offset += s.amountMinor;
    return { ...s, start, fraction };
  });

  return (
    <div
      role="img"
      aria-label={label}
      className="relative h-4 overflow-hidden rounded-full bg-surface-3"
    >
      {segments.map((s) => (
        <div
          key={s.memberId}
          style={{
            backgroundColor: memberColor(members.find((m) => m.id === s.memberId)),
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
    </div>
  );
}
