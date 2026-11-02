import { useEffect, useRef, useState } from 'react';
import { formatCardNumber, maskCardNumber, type Member, type MemberCard } from '../domain';
import { az } from '../i18n/az';
import { copyText } from '../lib/clipboard';
import { memberColor } from '../lib/memberColors';
import { useFeedback } from '../state/feedback';
import { CheckIcon } from './icons';

const t = az.cards;

const COPIED_MS = 1400;

interface PaymentCardProps {
  card: MemberCard;
  member: Member | undefined;
  /** Shows "•••• 1234" instead of the full number. Tapping still copies all the digits. */
  masked?: boolean;
  className?: string;
}

/** Card-shaped button in the member's color. Tapping copies the digits, without spaces. */
export function PaymentCard({ card, member, masked = false, className = '' }: PaymentCardProps) {
  const feedback = useFeedback();
  const [copied, setCopied] = useState(false);
  const timer = useRef<number>();
  const color = memberColor(member);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = async () => {
    if (!(await copyText(card.cardNumber))) {
      feedback.error(t.copyFailed);
      return;
    }
    feedback.copied();
    setCopied(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), COPIED_MS);
  };

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={t.copyLabel(member?.name ?? '', card.label, card.cardNumber.slice(-4))}
      style={{
        backgroundColor: color,
        backgroundImage: `linear-gradient(135deg, ${color}, color-mix(in srgb, ${color} 62%, black))`,
      }}
      className={`relative flex aspect-[1.586] flex-col justify-between overflow-hidden rounded-card p-4 text-left text-white shadow-card transition-transform duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-[0.98] ${className}`}
    >
      <span className="flex items-start justify-between gap-2">
        <span className="min-w-0 truncate text-sm font-semibold">{card.label ?? member?.name}</span>
        <ChipIcon />
      </span>
      <span
        className={`tabular whitespace-nowrap font-semibold ${
          !masked && card.cardNumber.length > 16 ? 'text-sm' : 'text-base tracking-wide sm:text-lg'
        }`}
      >
        {masked ? maskCardNumber(card.cardNumber) : formatCardNumber(card.cardNumber)}
      </span>
      {copied && (
        <span className="settle-in absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/55 font-semibold">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-pos-bar">
            <CheckIcon />
          </span>
          {t.copied}
        </span>
      )}
    </button>
  );
}

function ChipIcon() {
  return (
    <svg
      width="34"
      height="26"
      viewBox="0 0 34 26"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      <rect x="0.75" y="0.75" width="32.5" height="24.5" rx="5" fill="#fff" fillOpacity="0.3" />
      <rect
        x="0.75"
        y="0.75"
        width="32.5"
        height="24.5"
        rx="5"
        stroke="#fff"
        strokeOpacity="0.7"
        strokeWidth="1.5"
      />
      <path
        d="M1 9h9m-9 8h9m14-8h9m-9 8h9M10 1v24m14-24v24"
        stroke="#fff"
        strokeOpacity="0.7"
        strokeWidth="1.5"
      />
    </svg>
  );
}
