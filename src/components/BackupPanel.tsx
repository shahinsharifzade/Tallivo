import { useRef, useState } from 'react';
import { az } from '../i18n/az';
import { downloadTextFile } from '../lib/download';
import { todayIso } from '../lib/dates';
import { errorMessage } from '../state/errorMessage';
import { useActions } from '../state/hooks';
import { ConfirmDialog } from './ConfirmDialog';

type Feedback = { kind: 'success' | 'error'; text: string } | null;

/** Export / import of all data as a JSON backup file. Import is local mode only. */
export function BackupPanel({ allowImport }: { allowImport: boolean }) {
  const actions = useActions();
  const fileInput = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const handleExport = async () => {
    try {
      const json = await actions.exportJson();
      downloadTextFile(`${az.backup.fileNamePrefix}-${todayIso()}.json`, json, 'application/json');
      setFeedback({ kind: 'success', text: az.backup.exportSuccess });
    } catch (e) {
      setFeedback({ kind: 'error', text: errorMessage(e) });
    }
  };

  const handleImport = async () => {
    const file = pendingFile;
    setPendingFile(null);
    if (!file) return;
    try {
      const summary = await actions.importJson(await file.text());
      setFeedback({
        kind: 'success',
        text: az.backup.importSuccess(summary.meetups, summary.expenses, summary.settlements),
      });
    } catch (e) {
      setFeedback({ kind: 'error', text: errorMessage(e) });
    }
  };

  const buttonClass =
    'min-h-11 flex-1 rounded-control border border-line bg-surface px-4 font-medium hover:bg-surface-2';

  return (
    <section className="rounded-card bg-surface p-4 shadow-card ring-1 ring-line">
      <h2 className="font-semibold">{az.backup.title}</h2>
      <p className="mt-1 text-sm text-ink-soft">
        {allowImport ? az.backup.description : az.backup.descriptionShared}
      </p>
      <div className="mt-3 flex gap-2">
        <button type="button" className={buttonClass} onClick={handleExport}>
          {az.backup.export}
        </button>
        {allowImport && (
          <>
            <button
              type="button"
              className={buttonClass}
              onClick={() => fileInput.current?.click()}
            >
              {az.backup.import}
            </button>
            <input
              ref={fileInput}
              type="file"
              accept="application/json,.json"
              className="hidden"
              aria-label={az.backup.import}
              onChange={(e) => {
                setPendingFile(e.target.files?.[0] ?? null);
                e.target.value = '';
              }}
            />
          </>
        )}
      </div>
      {feedback && (
        <p
          role="status"
          className={`mt-3 text-sm ${feedback.kind === 'success' ? 'text-pos' : 'text-neg'}`}
        >
          {feedback.text}
        </p>
      )}
      <ConfirmDialog
        open={pendingFile !== null}
        title={az.backup.importConfirmTitle}
        confirmLabel={az.backup.importConfirm}
        destructive
        onConfirm={handleImport}
        onCancel={() => setPendingFile(null)}
      >
        {pendingFile && az.backup.importConfirmBody(pendingFile.name)}
      </ConfirmDialog>
    </section>
  );
}
