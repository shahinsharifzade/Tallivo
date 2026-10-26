import type { Id, Member } from '../domain';

interface MemberChipsProps {
  members: Member[];
  selected: ReadonlySet<Id>;
  onToggle: (id: Id) => void;
  disabledIds?: ReadonlySet<Id>;
}

/** Row of toggle chips, one per member. Used for single and multi selection alike. */
export function MemberChips({ members, selected, onToggle, disabledIds }: MemberChipsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {members.map((m) => {
        const isOn = selected.has(m.id);
        const disabled = disabledIds?.has(m.id) ?? false;
        return (
          <button
            key={m.id}
            type="button"
            aria-pressed={isOn}
            disabled={disabled}
            onClick={() => onToggle(m.id)}
            className={`min-h-11 rounded-full px-4 font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500 disabled:cursor-not-allowed disabled:opacity-40 ${
              isOn
                ? 'bg-accent-500 text-white hover:bg-accent-600'
                : 'bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50'
            }`}
          >
            {m.name}
          </button>
        );
      })}
    </div>
  );
}
