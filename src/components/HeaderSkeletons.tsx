import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { MEMBER_PALETTE } from '../lib/memberColors';
import { usePrefersReducedMotion } from '../lib/motion';

const FIRST_RUN_MS = 3_000;
const EVERY_MS = 15_000;
/** Matches the slowest runner in index.css. */
const SEQUENCE_MS = 4600;

function Limb({
  kind,
  back,
  cycle,
  upper,
  lower,
}: {
  kind: 'leg' | 'arm';
  back?: boolean;
  cycle: number;
  upper: string;
  lower: string;
}) {
  // The far limbs run half a stride behind the near ones.
  const style: CSSProperties = {
    animationDuration: `${cycle}s`,
    animationDelay: `${back ? -cycle / 2 : 0}s`,
  };
  return (
    <g opacity={back ? 0.5 : 1}>
      <g className={`sk-${kind}`} style={style}>
        <path d={upper} />
        <g className={`sk-${kind}-lower`} style={style}>
          <path d={lower} />
        </g>
      </g>
    </g>
  );
}

/** A tiny animated SVG skeleton; `accent` is what tells the four apart. */
function Skeleton({ cycle, accent }: { cycle: number; accent: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      className="h-[22px] w-[17px] overflow-visible sm:h-7 sm:w-[21px]"
    >
      <Limb kind="leg" back cycle={cycle} upper="M12 20v5" lower="M12 25v5" />
      <Limb kind="arm" back cycle={cycle} upper="M12 12v5" lower="M12 17v4" />
      <g className="sk-bob" style={{ animationDuration: `${cycle / 2}s` }}>
        <path d="M12 10v10M9 13h6M9.5 16h5" />
        <circle cx="12" cy="6" r="4" fill="rgb(var(--c-surface))" />
        <circle cx="13.2" cy="5.6" r="0.9" fill="currentColor" stroke="none" />
        <circle cx="15" cy="5.6" r="0.7" fill="currentColor" stroke="none" />
        {accent}
      </g>
      <Limb kind="leg" cycle={cycle} upper="M12 20v5" lower="M12 25v5" />
      <Limb kind="arm" cycle={cycle} upper="M12 12v5" lower="M12 17v4" />
    </svg>
  );
}

const RUNNERS: { name: string; cycle: number; accent: ReactNode }[] = [
  {
    // Bandana, tails flapping: the confident one out in front.
    name: 'a',
    cycle: 0.32,
    accent: <path d="M8.3 4.2l7.4 0M8.3 4.2L4 2.6M8.3 4.2L4.5 6" stroke={MEMBER_PALETTE[6]} />,
  },
  {
    // Party hat: hops over nothing, twice, for fun.
    name: 'b',
    cycle: 0.4,
    accent: <path d="M9 2.6l3-3.4 3 3.4z" stroke={MEMBER_PALETTE[0]} fill={MEMBER_PALETTE[0]} />,
  },
  {
    // Flat cap: trips, tumbles, gets up and has to catch up.
    name: 'c',
    cycle: 0.36,
    accent: <path d="M8 3h5.5l3.5 1" stroke={MEMBER_PALETTE[1]} strokeWidth="2.2" />,
  },
  {
    // Long scarf and a slow, heavy stride: last, and at peace with it.
    name: 'd',
    cycle: 0.52,
    accent: <path d="M9.5 10.5h5M10 10.8L5.5 13" stroke={MEMBER_PALETTE[2]} strokeWidth="2.2" />,
  },
];

/**
 * Four skeletons run over the header, from the start of the title to the end of the nav (on mobile,
 * to the header's right edge): first 3 s after the app is ready, then every 15 s. Between runs nothing is rendered, so the header stays static. A run
 * due in a background tab is skipped, not queued, and a run never starts over another one.
 * Purely decorative: it cannot be focused or clicked.
 */
export function HeaderSkeletons({ ready }: { ready: boolean }) {
  const reduced = usePrefersReducedMotion();
  const [running, setRunning] = useState(false);
  const isRunning = useRef(false);
  const laneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reduced || !ready) return;
    let interval = 0;
    let endTimer = 0;
    const run = () => {
      if (isRunning.current || document.hidden) return;
      isRunning.current = true;
      setRunning(true);
      endTimer = window.setTimeout(() => {
        isRunning.current = false;
        setRunning(false);
      }, SEQUENCE_MS);
    };
    const firstTimer = window.setTimeout(() => {
      run();
      interval = window.setInterval(run, EVERY_MS);
    }, FIRST_RUN_MS);
    return () => {
      window.clearTimeout(firstTimer);
      window.clearInterval(interval);
      window.clearTimeout(endTimer);
      isRunning.current = false;
      setRunning(false);
    };
  }, [reduced, ready]);

  // Follows the real layout for as long as a run is on screen, so resizing or rotating is fine.
  useLayoutEffect(() => {
    const lane = laneRef.current;
    const header = lane?.parentElement;
    if (!running || !lane || !header) return;
    const title = header.querySelector('[data-header-title]');
    const nav = header.querySelector('nav');
    const fit = () => {
      const box = header.getBoundingClientRect();
      const start = title?.getBoundingClientRect().left ?? box.left;
      // The nav measures 0 while hidden on mobile: then the lane ends at the header's right edge.
      const end = nav?.getBoundingClientRect().right || box.right;
      lane.style.left = `${start - box.left}px`;
      lane.style.width = `${end - start}px`;
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(header);
    if (title) observer.observe(title);
    if (nav) observer.observe(nav);
    return () => observer.disconnect();
  }, [running]);

  if (!running) return null;
  // Taken out of the flow, so a run starting or ending cannot move the logo or the nav.
  return (
    <div
      ref={laneRef}
      aria-hidden="true"
      data-skeletons
      className="pointer-events-none absolute inset-y-0 z-10 overflow-hidden text-ink-soft"
    >
      {RUNNERS.map((r) => (
        <div key={r.name} className={`sk-track sk-track-${r.name} absolute inset-0`}>
          <div className={`sk-body sk-body-${r.name} absolute bottom-0 left-0`}>
            <Skeleton cycle={r.cycle} accent={r.accent} />
          </div>
        </div>
      ))}
    </div>
  );
}
