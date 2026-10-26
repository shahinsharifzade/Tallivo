// Small inline SVG icons (no icon library needed).
import type { SVGProps } from 'react';

function Icon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    />
  );
}

export const HomeIcon = () => (
  <Icon>
    <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />
  </Icon>
);
export const CalendarIcon = () => (
  <Icon>
    <rect x="3" y="4.5" width="18" height="16.5" rx="2" />
    <path d="M3 9.5h18M8 2.5v4M16 2.5v4" />
  </Icon>
);
export const ClockIcon = () => (
  <Icon>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Icon>
);
export const SettingsIcon = () => (
  <Icon>
    <path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0" />
    <circle cx="16" cy="6" r="2" />
    <circle cx="10" cy="12" r="2" />
    <circle cx="18" cy="18" r="2" />
  </Icon>
);
export const PlusIcon = () => (
  <Icon>
    <path d="M12 5v14M5 12h14" />
  </Icon>
);
export const ChevronLeftIcon = () => (
  <Icon>
    <path d="m15 18-6-6 6-6" />
  </Icon>
);
export const ChevronRightIcon = () => (
  <Icon width="18" height="18">
    <path d="m9 18 6-6-6-6" />
  </Icon>
);
export const PencilIcon = () => (
  <Icon width="18" height="18">
    <path d="M4 20h4L19 9l-4-4L4 16z" />
  </Icon>
);
export const TrashIcon = () => (
  <Icon width="18" height="18">
    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
  </Icon>
);
export const ArrowRightIcon = () => (
  <Icon width="16" height="16">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Icon>
);
export const CheckIcon = () => (
  <Icon width="16" height="16" strokeWidth="3">
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </Icon>
);
