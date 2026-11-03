/*
 * One "stage" shared by the app's two skeleton animations (header runners and the settled banner's
 * dancers), so they never play at the same time. Each animation keeps its own timers and state;
 * this module only answers "may I start now?" and remembers when the next header run is due.
 *
 * Rules:
 * - Only one owner holds the stage at a time, and a cooldown follows every run.
 * - The header has priority: it keeps its own fixed schedule and books its next start here.
 * - The banner starts only if it can finish (plus cooldown) before the header's booked start;
 *   otherwise it is told how long to wait and tries again then.
 */

export type StageOwner = 'header' | 'banner';

/** Quiet time between the end of one run and the start of the next. */
export const STAGE_COOLDOWN_MS = 1500;

interface Slot {
  start: number;
  end: number;
}

let holder: { owner: StageOwner; until: number } | null = null;
let freeFrom = 0;
const booked = new Map<StageOwner, Slot>();

const now = () => performance.now();

/**
 * Tries to take the stage for `durationMs`. Returns 0 when granted; otherwise the number of ms
 * after which asking again makes sense. With `priority`, bookings and the cooldown are ignored
 * (only an actual run in progress blocks).
 */
export function claimStage(
  owner: StageOwner,
  durationMs: number,
  { priority = false }: { priority?: boolean } = {},
): number {
  const t = now();
  // A holder that never released (should not happen) stops blocking shortly after its run.
  if (holder && t > holder.until + STAGE_COOLDOWN_MS) holder = null;
  if (holder && holder.owner !== owner) {
    return Math.max(100, holder.until + STAGE_COOLDOWN_MS - t);
  }
  if (!priority) {
    if (t < freeFrom) return Math.max(50, freeFrom - t);
    for (const [other, slot] of booked) {
      if (other === owner) continue;
      const overlaps =
        t + durationMs + STAGE_COOLDOWN_MS > slot.start && t < slot.end + STAGE_COOLDOWN_MS;
      if (overlaps) return Math.max(50, slot.end + STAGE_COOLDOWN_MS - t);
    }
  }
  holder = { owner, until: t + durationMs };
  return 0;
}

/** Ends `owner`'s run (no-op if it is not the holder) and starts the cooldown. */
export function releaseStage(owner: StageOwner): void {
  if (holder?.owner !== owner) return;
  holder = null;
  freeFrom = now() + STAGE_COOLDOWN_MS;
}

/** Announces that `owner` plans to start in `inMs` and run for `durationMs`. */
export function bookStage(owner: StageOwner, inMs: number, durationMs: number): void {
  const start = now() + inMs;
  booked.set(owner, { start, end: start + durationMs });
}

export function unbookStage(owner: StageOwner): void {
  booked.delete(owner);
}
