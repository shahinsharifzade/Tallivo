import { useState, type FormEvent } from 'react';
import { Avatar } from '../components/Avatar';
import { BackupPanel } from '../components/BackupPanel';
import { ColorSwatches } from '../components/ColorSwatches';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { TrashIcon } from '../components/icons';
import { buttonClass, inputClass } from '../components/styles';
import { Badge, Card, ErrorText, SectionTitle, PageHeader } from '../components/ui';
import { MAX_NAME_LENGTH, validateMemberName, type Member } from '../domain';
import { az } from '../i18n/az';
import { memberColor } from '../lib/memberColors';
import { setThemePreference, useThemePreference, type ThemePreference } from '../lib/theme';
import { useBackend } from '../state/backend';
import { useActions, useAppData, useCurrentMember, useReferencedMemberIds } from '../state/hooks';
import { useFeedback } from '../state/feedback';
import { useSubmit } from '../state/useSubmit';

const t = az.settings;

/**
 * Inline rename (saves on blur or Enter, reverts on Escape) and color picker. What is offered here
 * only reflects the rules; the database enforces them (migration 003).
 */
function MemberRow({
  member,
  members,
  inUse,
  canRename,
  canRecolor,
  onDelete,
}: {
  member: Member;
  members: Member[];
  inUse: boolean;
  canRename: boolean;
  canRecolor: boolean;
  /** Absent when members cannot be deleted at all (shared mode). */
  onDelete?: () => void;
}) {
  const actions = useActions();
  const { error, setError, run } = useSubmit();
  const [name, setName] = useState(member.name);
  const [pickingColor, setPickingColor] = useState(false);
  const current = memberColor(member);

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
        {canRecolor ? (
          <button
            type="button"
            onClick={() => setPickingColor((v) => !v)}
            aria-expanded={pickingColor}
            aria-label={t.colorLabel(member.name)}
            title={t.colorLabel(member.name)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-transform focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent active:scale-95"
          >
            <Avatar member={member} size="lg" />
          </button>
        ) : (
          <Avatar member={member} size="lg" />
        )}
        {canRename ? (
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
        ) : (
          <span className="min-w-0 flex-1 break-words font-medium">{member.name}</span>
        )}
        {!onDelete ? null : inUse ? (
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
      {pickingColor && (
        <div className="mt-2">
          <ColorSwatches
            label={t.colorLabel(member.name)}
            current={current}
            onPick={(color) => {
              setPickingColor(false);
              if (color !== current) void run(() => actions.setMemberColor(member.id, color));
            }}
          />
        </div>
      )}
      {error && <p className="mt-1 text-sm text-neg">{error}</p>}
    </li>
  );
}

/** Storage mode badge. The account itself (password, sign-out) lives on the Profile page. */
function ModeCard({ shared }: { shared: boolean }) {
  return (
    <Card>
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold text-ink">{t.accountTitle}</h2>
        <Badge>{shared ? t.modeShared : t.modeLocal}</Badge>
      </div>
      {!shared && <p className="mt-1 text-sm text-ink-muted">{t.modeLocalHint}</p>}
    </Card>
  );
}

function ThemeCard() {
  const preference = useThemePreference();
  const options: ThemePreference[] = ['system', 'light', 'dark'];
  return (
    <Card>
      <SectionTitle hint={t.themeHint}>{t.themeTitle}</SectionTitle>
      <div
        role="radiogroup"
        aria-label={t.themeTitle}
        className="grid grid-cols-3 gap-1 rounded-control bg-surface-2 p-1"
      >
        {options.map((option) => (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={preference === option}
            onClick={() => setThemePreference(option)}
            className={`min-h-11 rounded-lg font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${
              preference === option ? 'bg-surface text-ink shadow-card' : 'text-ink-soft'
            }`}
          >
            {t.themeOptions[option]}
          </button>
        ))}
      </div>
    </Card>
  );
}

export function SettingsPage() {
  const { members, cardsReady } = useAppData();
  const { memberId: myId, isAdmin } = useCurrentMember();
  const shared = useBackend().mode === 'supabase';
  const referenced = useReferencedMemberIds();
  const actions = useActions();
  const addSubmit = useSubmit();
  const feedback = useFeedback();
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
    if (await addSubmit.run(async () => void (await actions.addMember(newName)))) {
      setNewName('');
      feedback.saved();
    }
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

      <ModeCard shared={shared} />

      <Card>
        <SectionTitle
          hint={!shared ? t.membersHint : isAdmin ? t.membersHintShared : t.membersHintReadOnly}
        >
          {t.membersTitle}
        </SectionTitle>
        {!cardsReady && <p className="mb-2 text-sm text-neg">{az.errors.serverOutdated}</p>}
        <ul className="divide-y divide-line">
          {members.map((m) => (
            <MemberRow
              // Re-mount on external renames (e.g. after import) so the input shows the new name.
              key={`${m.id}:${m.name}`}
              member={m}
              members={members}
              inUse={referenced.has(m.id)}
              canRename={isAdmin}
              canRecolor={isAdmin || m.id === myId}
              onDelete={shared ? undefined : () => setMemberToDelete(m)}
            />
          ))}
        </ul>
        {isAdmin && (
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
        )}
        {addSubmit.error && <p className="mt-1 text-sm text-neg">{addSubmit.error}</p>}
      </Card>

      <ThemeCard />

      <BackupPanel allowImport={!shared} />

      {/* Shared mode never hard-deletes anything, so there is no reset there. */}
      {!shared && (
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
      )}

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
