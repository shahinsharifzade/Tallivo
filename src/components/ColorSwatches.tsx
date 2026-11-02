import { az } from '../i18n/az';
import { MEMBER_PALETTE } from '../lib/memberColors';

/** The member color palette as a radio group. */
export function ColorSwatches({
  label,
  current,
  onPick,
}: {
  label: string;
  current: string;
  onPick: (color: string) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1">
      {MEMBER_PALETTE.map((color, i) => {
        const checked = color.toLowerCase() === current.toLowerCase();
        const name = az.settings.colorNames[i];
        return (
          <button
            key={color}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-label={name}
            title={name}
            onClick={() => onPick(color)}
            className="flex h-11 w-11 items-center justify-center rounded-full transition-transform focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent active:scale-90"
          >
            <span
              style={{ backgroundColor: color }}
              className={`h-8 w-8 rounded-full ${checked ? 'ring-2 ring-ink ring-offset-2 ring-offset-surface' : ''}`}
            />
          </button>
        );
      })}
    </div>
  );
}
