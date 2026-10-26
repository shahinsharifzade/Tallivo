import { formatMoney, type Id, type Member, type Minor } from '../domain';
import { Avatar } from './Avatar';

interface PaidChartProps {
  members: Member[];
  paid: Record<Id, Minor>;
}

/**
 * Horizontal bars: how much each member paid in total. One measure, so one accent hue;
 * identity comes from the avatar and name, values are plain text. Bars are square at the
 * baseline with a 4px rounded data end, and grow in with a short scaleX entrance.
 */
export function PaidChart({ members, paid }: PaidChartProps) {
  const max = Math.max(0, ...members.map((m) => paid[m.id] ?? 0));
  return (
    <ul className="stagger space-y-2">
      {members.map((m) => {
        const value = paid[m.id] ?? 0;
        const pct = max === 0 ? 0 : (value / max) * 100;
        return (
          <li
            key={m.id}
            className="grid grid-cols-[minmax(0,6.5rem)_1fr_auto] items-center gap-x-3"
          >
            <span className="flex min-w-0 items-center gap-2">
              <Avatar member={m} size="xs" />
              <span className="truncate text-sm font-medium">{m.name}</span>
            </span>
            <svg className="h-3.5 w-full overflow-visible" aria-hidden="true">
              <rect width="100%" height="100%" rx="4" className="fill-surface-2" />
              {pct > 0 && (
                <g
                  className="bar-grow"
                  style={{ transformBox: 'fill-box', transformOrigin: 'left' }}
                >
                  <svg width={`${pct}%`} height="100%" overflow="visible">
                    <rect width="100%" height="100%" rx="4" className="fill-accent" />
                    <rect width="50%" height="100%" className="fill-accent" />
                    <title>{`${m.name}: ${formatMoney(value)}`}</title>
                  </svg>
                </g>
              )}
            </svg>
            <span className="tabular text-right text-sm font-semibold text-ink">
              {formatMoney(value)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
