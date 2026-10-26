import { useState, type FormEvent } from 'react';
import { BackupPanel } from '../components/BackupPanel';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { TrashIcon } from '../components/icons';
import { buttonClass, inputClass } from '../components/styles';
import { Badge, Card, ErrorText, SectionTitle, PageHeader } from '../components/ui';
import { MAX_NAME_LENGTH, validateMemberName, type Member } from '../domain';
import { az } from '../i18n/az';
import { useActions, useAppData, useReferencedMemberIds } from '../state/hooks';
import { useSubmit } from '../state/useSubmit';

const t = az.settings;

/** Inline rename: saves on blur or Enter, reverts on Escape. */
function MemberRow({
  member,
  members,
  inUse,
  onDelete,
}: {
  member: Member;
  members: Member[];
  inUse: boolean;
  onDelete: () => void;
}) {
  const actions = useActions();
  const { error, setError, run } = useSubmit();
  const [name, setName] = useState(member.name);

  const commit = async () => {
    if (name === member.name) return;
    const problem = validateMemberName(name, members, member.id);
    if (problem) {
      setError(t.nameErrors[problem]);
      return;
    }
    await run(() => actions.renameMember(member.id, name));
  };

  return (
    <li className="py-2">
      <div className="flex items-center gap-2">
        <input
          className={inputClass}
          value={name}
          maxLength={MAX_NAME_LENGTH}
          aria-label={t.renameLabel(member.name)}
          aria-invalid={!!error}
          onChange={(e) => {
            setName(e.target.value);
            setError(null);
          }}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
            if (e.key === 'Escape') {
              setName(member.name);
              setError(null);
            }
          }}
        />
        {inUse ? (
          <span className="shrink-0">
            <Badge>{t.memberInUse}</Badge>
          </span>
        ) : (
          <button
            type="button"
            className={buttonClass('danger', 'shrink-0 px-3')}
            onClick={onDelete}
            aria-label={`${az.common.delete}: ${member.name}`}
            title={az.common.delete}
          >
            <TrashIcon />
          </button>
        )}
      </div>
      {error && <p className="mt-1 text-sm text-neg">{error}</p>}
    </li>
  );
}

export function SettingsPage() {
  const { members } = useAppData();
  const referenced = useReferencedMemberIds();
  const actions = useActions();
  const addSubmit = useSubmit();
  const generalSubmit = useSubmit();
  const [newName, setNewName] = useState('');
  const [memberToDelete, setMemberToDelete] = useState<Member | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  const addMember = async (e: FormEvent) => {
    e.preventDefault();
    const problem = validateMemberName(newName, members);
    if (problem) {
      addSubmit.setError(t.nameErrors[problem]);
      return;
    }
    if (await addSubmit.run(async () => void (await actions.addMember(newName)))) setNewName('');
  };

  const deleteMember = async () => {
    const m = memberToDelete;
    setMemberToDelete(null);
    if (m) await generalSubmit.run(() => actions.deleteMember(m.id));
  };

  const resetAll = async () => {
    setConfirmReset(false);
    setResetDone(false);
    if (await generalSubmit.run(() => actions.resetAll())) setResetDone(true);
  };

  return (
    <div className="space-y-4">
      <PageHeader title={t.title} />
      {generalSubmit.error && <ErrorText>{generalSubmit.error}</ErrorText>}

      <Card>
        <SectionTitle hint={t.membersHint}>{t.membersTitle}</SectionTitle>
        <ul className="divide-y divide-line">
          {members.map((m) => (
            <MemberRow
              // Re-mount on external renames (e.g. after import) so the input shows the new name.
              key={`${m.id}:${m.name}`}
              member={m}
              members={members}
              inUse={referenced.has(m.id)}
              onDelete={() => setMemberToDelete(m)}
            />
          ))}
        </ul>
        <form onSubmit={addMember} className="mt-3 flex gap-2" noValidate>
          <input
            className={inputClass}
            value={newName}
            maxLength={MAX_NAME_LENGTH}
            placeholder={t.newMemberPlaceholder}
            aria-label={t.newMemberLabel}
            aria-invalid={!!addSubmit.error}
            onChange={(e) => {
              setNewName(e.target.value);
              addSubmit.setError(null);
            }}
          />
          <button
            type="submit"
            className={buttonClass('primary', 'shrink-0')}
            disabled={addSubmit.pending}
          >
            {t.addMember}
          </button>
        </form>
        {addSubmit.error && <p className="mt-1 text-sm text-neg">{addSubmit.error}</p>}
      </Card>

      <BackupPanel />

      <Card>
        <SectionTitle hint={t.resetHint}>{t.resetTitle}</SectionTitle>
        <button
          type="button"
          className={buttonClass('danger', 'ring-1 ring-neg/30')}
          onClick={() => setConfirmReset(true)}
        >
          {t.resetButton}
        </button>
        {resetDone && (
          <p role="status" className="mt-2 text-sm text-pos">
            {t.resetDone}
          </p>
        )}
      </Card>

      <ConfirmDialog
        open={memberToDelete !== null}
        title={memberToDelete ? t.deleteMemberTitle(memberToDelete.name) : ''}
        confirmLabel={az.common.delete}
        destructive
        onConfirm={deleteMember}
        onCancel={() => setMemberToDelete(null)}
      />
      <ConfirmDialog
        open={confirmReset}
        title={t.resetConfirmTitle}
        confirmLabel={t.resetButton}
        destructive
        onConfirm={resetAll}
        onCancel={() => setConfirmReset(false)}
      >
        {t.resetConfirmBody}
      </ConfirmDialog>
    </div>
  );
}
