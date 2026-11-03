import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { MEMBER_PALETTE } from '../lib/memberColors';
import { usePrefersReducedMotion } from '../lib/motion';
import { claimStage, releaseStage } from '../lib/skeletonStage';

/*
 * The "Hesab bərabər!" banner's own skeleton party. Deliberately self-contained: it shares no
 * component, CSS class, keyframe, timer or state with HeaderSkeletons, so either one can change
 * (or run at the same time) without touching the other. All styles live under `.bsk-*` in index.css.
 */

type Phase = 'enter' | 'dance' | 'exit';

/** Each phase's length; keep in step with the `.bsk-*` animations in index.css. */
const PHASE_MS: Record<Phase, number> = { enter: 1400, dance: 2600, exit: 1300 };
const NEXT: Record<Phase, Phase | null> = { enter: 'dance', dance: 'exit', exit: null };

function Limb({
  kind,
  back,
  upper,
  lower,
}: {
  kind: 'leg' | 'arm';
  back?: boolean;
  upper: string;
  lower: string;
}) {
  // The far limbs move half a beat behind the near ones (the delay is set in CSS via --bsk-half).
  const cls = back ? ' bsk-back' : '';
  return (
    <g opacity={back ? 0.5 : 1}>
      <g className={`bsk-${kind}${cls}`}>
        <path d={upper} />
        <g className={`bsk-${kind}-lower${cls}`}>
          <path d={lower} />
        </g>
      </g>
    </g>
  );
}

/** Same artwork as the header's runners, drawn by this component alone. */
function Skeleton({ accent }: { accent: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      className="h-full w-full overflow-visible"
    >
      <Limb kind="leg" back upper="M12 20v5" lower="M12 25v5" />
      <Limb kind="arm" back upper="M12 12v5" lower="M12 17v4" />
      <g className="bsk-bob">
        <path d="M12 10v10M9 13h6M9.5 16h5" />
        <circle cx="12" cy="6" r="4" fill="rgb(var(--c-surface))" />
        <circle cx="13.2" cy="5.6" r="0.9" fill="currentColor" stroke="none" />
        <circle cx="15" cy="5.6" r="0.7" fill="currentColor" stroke="none" />
        {accent}
      </g>
      <Limb kind="leg" upper="M12 20v5" lower="M12 25v5" />
      <Limb kind="arm" upper="M12 12v5" lower="M12 17v4" />
    </svg>
  );
}

/** a, b come in from the left; c, d from the right. Each one dances its own way. */
const DANCERS: { name: string; cycle: number; accent: ReactNode }[] = [
  {
    // Bandana: jumps on the spot, again and again.
    name: 'a',
    cycle: 0.3,
    accent: <path d="M8.3 4.2l7.4 0M8.3 4.2L4 2.6M8.3 4.2L4.5 6" stroke={MEMBER_PALETTE[6]} />,
  },
  {
    // Party hat: spins.
    name: 'b',
    cycle: 0.38,
    accent: <path d="M9 2.6l3-3.4 3 3.4z" stroke={MEMBER_PALETTE[0]} fill={MEMBER_PALETTE[0]} />,
  },
  {
    // Flat cap: sways side to side.
    name: 'c',
    cycle: 0.34,
    accent: <path d="M8 3h5.5l3.5 1" stroke={MEMBER_PALETTE[1]} strokeWidth="2.2" />,
  },
  {
    // Scarf: arms up, grooving.
    name: 'd',
    cycle: 0.46,
    accent: <path d="M9.5 10.5h5M10 10.8L5.5 13" stroke={MEMBER_PALETTE[2]} strokeWidth="2.2" />,
  },
];

/** How long after the banner appears the first party starts (if the stage is free). */
const FIRST_RUN_MS = 1_500;
/** Pause between the end of one party and the next attempt. */
export const BANNER_SKELETON_INTERVAL_MS = 20_000;
/** While the tab is in the background, check again this often. */
const HIDDEN_RETRY_MS = 2_000;
const SEQUENCE_MS = PHASE_MS.enter + PHASE_MS.dance + PHASE_MS.exit;

/**
 * Four skeletons run into the settled banner's dance floor, dance around its centre for ~2.6 s,
 * then run off to the right; this repeats every ~20 s for as long as the component is mounted
 * (i.e. while the group is settled). Runs are coordinated with the header skeletons through
 * lib/skeletonStage, so the two never play together. `paused` holds off new runs (e.g. while a
 * full-screen celebration covers the page). Under reduced motion the four just stand still.
 * Purely decorative: hidden from assistive tech, unclickable. The parent must be `relative`, and
 * an ancestor `overflow-hidden` keeps every skeleton inside the banner.
 */
export function BalanceSettledSkeletonCelebration({ paused = false }: { paused?: boolean }) {
  const reduced = usePrefersReducedMotion();
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState<Phase>('enter');
  const nextDelay = useRef(FIRST_RUN_MS);

  // Waits for the next slot, then starts a run. Re-renders do not reset it: it only re-arms when
  // a run ends or `paused`/`reduced` change.
  useEffect(() => {
    if (reduced || paused || running) return;
    let timer = 0;
    const attempt = () => {
      if (document.hidden) {
        timer = window.setTimeout(attempt, HIDDEN_RETRY_MS);
        return;
      }
      const wait = claimStage('banner', SEQUENCE_MS);
      if (wait > 0) {
        timer = window.setTimeout(attempt, wait);
        return;
      }
      setPhase('enter');
      setRunning(true);
    };
    timer = window.setTimeout(attempt, nextDelay.current);
    return () => window.clearTimeout(timer);
  }, [reduced, paused, running]);

  // Steps through the phases of a run, then hands the stage back.
  useEffect(() => {
    if (!running) return;
    const timer = window.setTimeout(() => {
      const next = NEXT[phase];
      if (next) {
        setPhase(next);
        return;
      }
      releaseStage('banner');
      nextDelay.current = BANNER_SKELETON_INTERVAL_MS;
      setRunning(false);
    }, PHASE_MS[phase]);
    return () => window.clearTimeout(timer);
  }, [running, phase]);

  // Unmounting (a debt appeared, or the page was left) ends any run and frees the stage.
  useEffect(() => () => releaseStage('banner'), []);

  if (!reduced && !running) return null;
  return (
    <div
      aria-hidden="true"
      data-banner-skeletons
      className={`bsk-lane ${reduced ? 'bsk-rest' : `bsk-${phase}`} pointer-events-none absolute inset-0 text-ink`}
    >
      {DANCERS.map((d) => (
        <div key={d.name} className={`bsk-track bsk-track-${d.name} absolute inset-0`}>
          <div
            className={`bsk-spot bsk-spot-${d.name} absolute bottom-2`}
            style={{ '--bsk-cycle': `${d.cycle}s` } as CSSProperties}
          >
            <div className="bsk-face h-full w-full">
              <div className={`bsk-body bsk-body-${d.name} h-full w-full`}>
                <Skeleton accent={d.accent} />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
