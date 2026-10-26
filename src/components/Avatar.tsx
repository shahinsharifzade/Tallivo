import type { Member } from '../domain';
import { memberColor, memberInitial } from '../lib/memberColors';

const sizes = {
  xs: 'h-5 w-5 text-[10px]',
  sm: 'h-7 w-7 text-xs',
  md: 'h-9 w-9 text-sm',
  lg: 'h-11 w-11 text-base',
} as const;

interface AvatarProps {
  member: Pick<Member, 'name' | 'color' | 'sortOrder'> | undefined;
  size?: keyof typeof sizes;
  /** Adds a ring in the page background color (for overlapping stacks). */
  ringed?: boolean;
  className?: string;
}

/** Colored circle with the member's first letter. Decorative: the name is always shown nearby. */
export function Avatar({ member, size = 'md', ringed = false, className = '' }: AvatarProps) {
  return (
    <span
      aria-hidden="true"
      style={{ backgroundColor: memberColor(member) }}
      className={`inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold leading-none text-white ${sizes[size]} ${ringed ? 'ring-2 ring-surface' : ''} ${className}`}
    >
      {member ? memberInitial(member.name) : '?'}
    </span>
  );
}

/** Overlapping row of small avatars. */
export function AvatarStack({ members, max = 5 }: { members: Member[]; max?: number }) {
  const shown = members.slice(0, max);
  const extra = members.length - shown.length;
  return (
    <span className="flex items-center -space-x-1.5">
      {shown.map((m) => (
        <Avatar key={m.id} member={m} size="sm" ringed />
      ))}
      {extra > 0 && (
        <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-surface-3 px-1 text-xs font-semibold text-ink-soft ring-2 ring-surface">
          +{extra}
        </span>
      )}
    </span>
  );
}
