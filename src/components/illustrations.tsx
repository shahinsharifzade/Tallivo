// Small decorative SVGs for empty states. Colors come from design tokens.

const svgProps = {
  width: 112,
  height: 84,
  viewBox: '0 0 112 84',
  fill: 'none',
  'aria-hidden': true,
} as const;

/** Two cups on a table: no meetups yet. */
export function MeetupsArt() {
  return (
    <svg {...svgProps}>
      <ellipse cx="56" cy="74" rx="44" ry="6" className="fill-surface-3" />
      <rect
        x="22"
        y="36"
        width="28"
        height="30"
        rx="8"
        className="fill-accent-soft stroke-accent"
        strokeWidth="2.5"
      />
      <path
        d="M50 44h4a6 6 0 0 1 0 12h-4"
        className="stroke-accent"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <rect
        x="62"
        y="30"
        width="28"
        height="36"
        rx="8"
        className="fill-surface-2 stroke-ink-muted"
        strokeWidth="2.5"
      />
      <path
        d="M90 40h4a6 6 0 0 1 0 12h-4"
        className="stroke-ink-muted"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M30 26c0-4 4-4 4-8M38 26c0-4 4-4 4-8M72 20c0-4 4-4 4-8"
        className="stroke-ink-muted"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** A receipt with an equals sign: nothing to balance yet. */
export function ReceiptArt() {
  return (
    <svg {...svgProps}>
      <ellipse cx="56" cy="76" rx="36" ry="5" className="fill-surface-3" />
      <path
        d="M34 8h44v62l-7.3-5-7.4 5-7.3-5-7.3 5-7.4-5L34 70z"
        className="fill-surface stroke-ink-muted"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <rect x="44" y="22" width="24" height="5" rx="2.5" className="fill-accent" />
      <rect x="44" y="33" width="24" height="5" rx="2.5" className="fill-accent" />
      <path
        d="M44 50h24M44 57h14"
        className="stroke-surface-3"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** A clock over stacked cards: empty history. */
export function HistoryArt() {
  return (
    <svg {...svgProps}>
      <rect x="20" y="40" width="60" height="16" rx="6" className="fill-surface-2" />
      <rect x="20" y="60" width="60" height="16" rx="6" className="fill-surface-3" />
      <circle cx="78" cy="30" r="20" className="fill-accent-soft stroke-accent" strokeWidth="2.5" />
      <path d="M78 19v11l7 5" className="stroke-accent" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
