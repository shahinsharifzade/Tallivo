import type { Id, Member } from '../domain';
import { memberColor } from '../lib/memberColors';
import { Avatar } from './Avatar';

interface MemberChipsProps {
  members: Member[];
  selected: ReadonlySet<Id>;
  onToggle: (id: Id) => void;
  disabledIds?: ReadonlySet<Id>;
}

/** Row of toggle chips, one per member. Selected chips take the member's color. */
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
            style={isOn ? { backgroundColor: memberColor(m) } : undefined}
            className={`flex min-h-11 items-center gap-2 rounded-full py-1 pl-1.5 pr-4 font-medium transition-[transform,background-color,color,box-shadow] duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 ${
              isOn
                ? 'chip-pop text-white shadow-card'
                : 'bg-surface text-ink-soft ring-1 ring-line-strong hover:bg-surface-2'
            }`}
          >
            <Avatar
              member={m}
              size="sm"
              className={isOn ? 'bg-white/25 ring-1 ring-white/60' : ''}
            />
            {m.name}
          </button>
        );
      })}
    </div>
  );
}
