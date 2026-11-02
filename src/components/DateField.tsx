import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type RefObject,
} from 'react';
import { isIsoDate, type IsoDate } from '../domain';
import { az } from '../i18n/az';
import { todayIso } from '../lib/dates';
import { formatDateLong } from '../lib/format';
import { addDays, addMonths, monthGrid, yearMonthOf, type YearMonth } from '../lib/localDate';
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from './icons';
import { inputClass } from './styles';

const t = az.dateField;

const DESKTOP_QUERY = '(min-width: 640px)';
const POPOVER_GAP = 6;
const VIEWPORT_MARGIN = 8;
const ARROW_DELTAS: Record<string, number> = {
  ArrowLeft: -1,
  ArrowRight: 1,
  ArrowUp: -7,
  ArrowDown: 7,
};

interface DateFieldProps {
  id: string;
  /** "YYYY-MM-DD". */
  value: IsoDate;
  onChange: (value: IsoDate) => void;
  invalid?: boolean;
}

/** Date input: a button showing the date, opening a bottom sheet (phone) or popover (desktop). */
export function DateField({ id, value, onChange, invalid }: DateFieldProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const valid = isIsoDate(value);
  const today = todayIso();
  const tag = value === today ? t.today : value === addDays(today, -1) ? t.yesterday : null;

  return (
    <>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-invalid={invalid || undefined}
        onClick={() => setOpen(true)}
        className={`${inputClass} flex items-center gap-2 py-2 text-left`}
      >
        <span className="shrink-0 text-ink-muted">
          <CalendarIcon />
        </span>
        <span className={`min-w-0 flex-1 ${valid ? '' : 'text-ink-muted'}`}>
          {valid ? formatDateLong(value) : t.placeholder}
        </span>
        {tag && (
          <span className="shrink-0 rounded-full bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent-ink">
            {tag}
          </span>
        )}
      </button>
      {open && (
        <DatePickerDialog
          triggerRef={triggerRef}
          value={valid ? value : null}
          today={today}
          onSelect={(next) => {
            onChange(next);
            setOpen(false);
          }}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function DatePickerDialog({
  triggerRef,
  value,
  today,
  onSelect,
  onClose,
}: {
  triggerRef: RefObject<HTMLButtonElement>;
  value: IsoDate | null;
  today: IsoDate;
  onSelect: (value: IsoDate) => void;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<YearMonth>(() => yearMonthOf(value ?? today));
  const [focused, setFocused] = useState<IsoDate>(value ?? today);

  const days = monthGrid(view);
  // Exactly one day is in the tab order, even after paging to a month without `focused`.
  const tabbable = days.includes(focused) ? focused : (days[0] as IsoDate);

  const focusDay = (iso: IsoDate) => {
    gridRef.current?.querySelector<HTMLElement>(`[data-date="${iso}"]`)?.focus();
  };

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    const trigger = triggerRef.current;
    if (!dialog || !trigger) return;
    if (!dialog.open) dialog.showModal();
    focusDay(tabbable);

    // Phones keep the bottom-sheet classes; desktop pins the dialog next to the field.
    const place = () => {
      if (!window.matchMedia(DESKTOP_QUERY).matches) {
        dialog.style.top = dialog.style.left = dialog.style.bottom = '';
        return;
      }
      const rect = trigger.getBoundingClientRect();
      const { offsetWidth: width, offsetHeight: height } = dialog;
      const below = rect.bottom + POPOVER_GAP;
      const fitsBelow = below + height <= window.innerHeight - VIEWPORT_MARGIN;
      const top = fitsBelow ? below : Math.max(VIEWPORT_MARGIN, rect.top - height - POPOVER_GAP);
      const left = Math.max(
        VIEWPORT_MARGIN,
        Math.min(rect.left, window.innerWidth - width - VIEWPORT_MARGIN),
      );
      dialog.style.top = `${top}px`;
      dialog.style.left = `${left}px`;
      dialog.style.bottom = 'auto';
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
    // Runs once per open: `tabbable` only sets the initial focus.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerRef]);

  // The modal keeps the trigger inert until it is gone, so focus returns after unmount.
  useEffect(() => {
    const trigger = triggerRef.current;
    return () => trigger?.focus();
  }, [triggerRef]);

  // Arrow keys may page to another month, so focus moves after that month has rendered.
  const pendingFocus = useRef<IsoDate | null>(null);
  useEffect(() => {
    if (pendingFocus.current) focusDay(pendingFocus.current);
    pendingFocus.current = null;
  });

  const onGridKeyDown = (e: KeyboardEvent) => {
    const delta = ARROW_DELTAS[e.key];
    if (delta === undefined) return;
    e.preventDefault();
    const next = addDays(tabbable, delta);
    if (!days.includes(next)) setView(yearMonthOf(next));
    setFocused(next);
    pendingFocus.current = next;
  };

  const quickChips = [
    { label: t.today, date: today },
    { label: t.yesterday, date: addDays(today, -1) },
    { label: t.dayBeforeYesterday, date: addDays(today, -2) },
  ];

  const weeks = Array.from({ length: 6 }, (_, i) => days.slice(i * 7, i * 7 + 7));

  return (
    <dialog
      ref={dialogRef}
      aria-label={t.dialogLabel}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
      className="date-sheet fixed inset-x-0 bottom-0 top-auto m-0 max-h-[90dvh] w-full max-w-none overflow-y-auto rounded-t-card bg-surface p-0 text-ink shadow-raised backdrop:bg-black/50 sm:right-auto sm:w-[22rem] sm:rounded-card sm:ring-1 sm:ring-line sm:backdrop:bg-transparent"
    >
      <div className="p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="flex gap-2">
          {quickChips.map((chip) => (
            <button
              key={chip.date}
              type="button"
              aria-pressed={value === chip.date}
              onClick={() => onSelect(chip.date)}
              className={`min-h-11 flex-1 rounded-full px-2 text-sm font-medium transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                value === chip.date
                  ? 'bg-accent text-accent-contrast'
                  : 'bg-surface-2 text-ink-soft hover:bg-surface-3'
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>

        <div className="mt-2 flex items-center justify-between">
          <button
            type="button"
            aria-label={t.prevMonth}
            onClick={() => setView((v) => addMonths(v, -1))}
            className={monthButtonClass}
          >
            <ChevronLeftIcon />
          </button>
          <h2 aria-live="polite" className="font-semibold">
            {az.common.months[view.month]} {view.year}
          </h2>
          <button
            type="button"
            aria-label={t.nextMonth}
            onClick={() => setView((v) => addMonths(v, 1))}
            className={monthButtonClass}
          >
            <ChevronRightIcon />
          </button>
        </div>

        {/* The negative margin keeps 44px day cells on a 320px wide phone. */}
        <div ref={gridRef} role="grid" onKeyDown={onGridKeyDown} className="-mx-1.5 mt-1">
          <div role="row" className="grid grid-cols-7">
            {az.common.weekdaysShort.map((label, i) => (
              <div
                key={label}
                role="columnheader"
                aria-label={az.common.weekdays[i]}
                className="py-1 text-center text-xs font-medium text-ink-muted"
              >
                {label}
              </div>
            ))}
          </div>
          {weeks.map((week) => (
            <div key={week[0]} role="row" className="grid grid-cols-7">
              {week.map((iso) => {
                const inMonth = yearMonthOf(iso).month === view.month;
                const selected = iso === value;
                return (
                  <div key={iso} role="gridcell" aria-selected={selected}>
                    <button
                      type="button"
                      data-date={iso}
                      tabIndex={iso === tabbable ? 0 : -1}
                      aria-label={formatDateLong(iso)}
                      aria-current={iso === today ? 'date' : undefined}
                      onClick={() => onSelect(iso)}
                      onFocus={() => setFocused(iso)}
                      className="group flex h-11 w-full items-center justify-center focus:outline-none"
                    >
                      <span
                        className={`tabular flex h-10 w-10 items-center justify-center rounded-full transition-colors duration-150 group-focus-visible:outline group-focus-visible:outline-2 group-focus-visible:outline-offset-1 group-focus-visible:outline-accent ${
                          selected
                            ? 'bg-accent font-semibold text-accent-contrast'
                            : `group-hover:bg-surface-2 ${inMonth ? '' : 'text-ink-muted'}`
                        } ${iso === today ? 'ring-2 ring-inset ring-accent' : ''}`}
                      >
                        {Number(iso.slice(8))}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </dialog>
  );
}

const monthButtonClass =
  'flex h-11 w-11 items-center justify-center rounded-full text-ink-soft hover:bg-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent';
