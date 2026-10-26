import { useEffect, useRef, type ReactNode } from 'react';
import { az } from '../i18n/az';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  children?: ReactNode;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Modal confirmation built on the native <dialog> element (focus trap and Esc for free). */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel = az.common.confirm,
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onCancel();
      }}
      className="w-[calc(100%-2rem)] max-w-sm rounded-card bg-surface p-0 text-ink shadow-raised backdrop:bg-black/50"
    >
      <div className="p-5">
        <h2 className="text-lg font-semibold">{title}</h2>
        {children && <div className="mt-2 text-sm text-ink-soft">{children}</div>}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-11 rounded-control px-4 font-medium text-ink-soft hover:bg-surface-2"
          >
            {az.common.cancel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`min-h-11 rounded-control px-4 font-semibold ${
              destructive
                ? 'bg-neg-solid text-white hover:bg-neg-solid/90'
                : 'bg-accent text-accent-contrast hover:bg-accent-strong'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
