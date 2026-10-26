import { formatMoney, type Balances, type Id, type Member } from '../domain';
import { az } from '../i18n/az';
import { useCountUp } from '../lib/motion';
import { Avatar } from './Avatar';

interface BalanceBarsProps {
  members: Member[];
  balances: Balances;
  /** When given, only these members are listed. */
  onlyIds?: ReadonlySet<Id>;
}

/**
 * One row per member: avatar, name, amount and a bar growing from a center line
 * (right/green = is owed, left/coral = owes), scaled to the largest absolute balance.
 */
export function BalanceBars({ members, balances, onlyIds }: BalanceBarsProps) {
  const rows = onlyIds ? members.filter((m) => onlyIds.has(m.id)) : members;
  const maxAbs = Math.max(0, ...rows.map((m) => Math.abs(balances[m.id] ?? 0)));

  return (
    <ul className="stagger space-y-3">
      {rows.map((m) => {
        const value = balances[m.id] ?? 0;
        const ratio = maxAbs === 0 ? 0 : Math.abs(value) / maxAbs;
        return (
          <li key={m.id}>
            <div className="flex min-h-11 items-center gap-3">
              <Avatar member={m} />
              <span className="min-w-0 flex-1 truncate font-medium">{m.name}</span>
              <BalanceLabel value={value} />
            </div>
            <div className="relative mt-1.5" aria-hidden="true">
              <div className="relative h-2.5 overflow-hidden rounded-full bg-surface-2">
                {value !== 0 && (
                  <div
                    style={{ transform: `scaleX(${ratio})` }}
                    className={`bar-grow absolute top-0 h-full w-1/2 transition-transform duration-300 ease-out ${
                      value > 0
                        ? 'left-1/2 origin-left rounded-r-full bg-pos-bar'
                        : 'right-1/2 origin-right rounded-l-full bg-neg-bar'
                    }`}
                  />
                )}
              </div>
              <div className="absolute -top-1 left-1/2 h-[18px] w-0.5 -translate-x-1/2 rounded-full bg-line-strong" />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** Wording and color follow the real value; only the displayed amount counts up. */
function BalanceLabel({ value }: { value: number }) {
  const shown = useCountUp(value);
  const amount = formatMoney(Math.abs(shown));
  const tone = value > 0 ? 'text-pos' : value < 0 ? 'text-neg' : 'text-ink-muted';
  return (
    <span className={`tabular shrink-0 text-right font-semibold transition-colors ${tone}`}>
      {value > 0
        ? az.balance.isOwed(amount)
        : value < 0
          ? az.balance.owes(amount)
          : az.balance.settled}
    </span>
  );
}
