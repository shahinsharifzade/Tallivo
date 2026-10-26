import type { Member } from '../domain';

/** 8 member colors; all keep white text readable (>= 4.5:1) in light and dark mode. */
export const MEMBER_PALETTE = [
  '#7C3AED', // violet
  '#0369A1', // sky
  '#B45309', // amber
  '#A21CAF', // fuchsia
  '#4F46E5', // indigo
  '#0F766E', // teal
  '#BE123C', // rose
  '#4D7C0F', // olive
] as const;

/** The member's chosen color, or a default picked by sortOrder. */
export function memberColor(member: Pick<Member, 'color' | 'sortOrder'> | undefined): string {
  if (member?.color) return member.color;
  const index = Math.abs(member?.sortOrder ?? 0) % MEMBER_PALETTE.length;
  return MEMBER_PALETTE[index] ?? MEMBER_PALETTE[0];
}

/** First letter of a name, uppercased with Azerbaijani rules (i -> İ, ə -> Ə). */
export function memberInitial(name: string): string {
  const first = Array.from(name.trim())[0] ?? '?';
  return first.toLocaleUpperCase('az');
}
