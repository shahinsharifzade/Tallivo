import type { Id, Member } from './types';

/** Members ordered by sortOrder (ties broken by id for full determinism). */
export function sortMembers(members: readonly Member[]): Member[] {
  return [...members].sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id));
}

/** Returns a comparator over member ids that follows member sortOrder; unknown ids go last. */
export function memberOrderComparator(members: readonly Member[]): (a: Id, b: Id) => number {
  const rank = new Map<Id, number>();
  sortMembers(members).forEach((m, i) => rank.set(m.id, i));
  return (a, b) => {
    const ra = rank.get(a) ?? Number.MAX_SAFE_INTEGER;
    const rb = rank.get(b) ?? Number.MAX_SAFE_INTEGER;
    return ra - rb || a.localeCompare(b);
  };
}
