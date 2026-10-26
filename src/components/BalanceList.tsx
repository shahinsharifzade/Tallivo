import { formatMoney, type Balances, type Id, type Member } from '../domain';
import { az } from '../i18n/az';

interface BalanceListProps {
  members: Member[];
  balances: Balances;
  /** When given, only these members are listed. */
  onlyIds?: ReadonlySet<Id>;
}

/** Members with a colored balance: green = is owed, red = owes. */
export function BalanceList({ members, balances, onlyIds }: BalanceListProps) {
  const rows = onlyIds ? members.filter((m) => onlyIds.has(m.id)) : members;
  return (
    <ul className="divide-y divide-slate-100">
      {rows.map((m) => {
        const value = balances[m.id] ?? 0;
        const amount = formatMoney(Math.abs(value));
        const tone = value > 0 ? 'text-emerald-700' : value < 0 ? 'text-red-700' : 'text-slate-500';
        return (
          <li key={m.id} className="flex min-h-12 items-center justify-between gap-3 py-2">
            <span className="font-medium">{m.name}</span>
            <span className={`tabular text-right font-semibold ${tone}`}>
              {value > 0
                ? az.balance.isOwed(amount)
                : value < 0
                  ? az.balance.owes(amount)
                  : az.balance.settled}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
