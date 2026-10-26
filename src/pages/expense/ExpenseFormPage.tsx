import { useMemo, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MemberChips } from '../../components/MemberChips';
import { MoneyInput } from '../../components/MoneyInput';
import { buttonClass, inputClass } from '../../components/styles';
import { Card, ErrorText, Field, FieldGroup, PageHeader } from '../../components/ui';
import { formatMoney, type Expense, type Id, type Member } from '../../domain';
import { az } from '../../i18n/az';
import { useActions, useAppData, useMeetup } from '../../state/hooks';
import { useSubmit } from '../../state/useSubmit';
import { NotFoundPage } from '../NotFoundPage';
import {
  draftFromExpense,
  evaluateDraft,
  newDraft,
  type ExpenseDraft,
  type SplitMode,
} from './expenseDraft';

const t = az.expenseForm;

/** /meetups/:meetupId/expenses/new and /meetups/:meetupId/expenses/:expenseId/edit */
export function ExpenseFormPage() {
  const { meetupId = '', expenseId } = useParams();
  const { members, expenses } = useAppData();
  const { meetup } = useMeetup(meetupId);
  const expense = expenseId ? expenses.find((e) => e.id === expenseId && !e.deletedAt) : undefined;

  if (!meetup || meetup.deletedAt) return <NotFoundPage title={t.meetupMissing} />;
  if (expenseId && (!expense || expense.meetupId !== meetupId)) return <NotFoundPage />;

  return (
    <ExpenseForm
      key={expenseId ?? 'new'}
      meetupId={meetupId}
      meetupTitle={meetup.title}
      members={members}
      expense={expense}
    />
  );
}

function ExpenseForm({
  meetupId,
  meetupTitle,
  members,
  expense,
}: {
  meetupId: Id;
  meetupTitle: string;
  members: Member[];
  expense: Expense | undefined;
}) {
  const actions = useActions();
  const navigate = useNavigate();
  const { pending, error, run } = useSubmit();
  const [draft, setDraft] = useState<ExpenseDraft>(() =>
    expense ? draftFromExpense(expense, members) : newDraft(members),
  );
  const [submitted, setSubmitted] = useState(false);

  const evaluation = useMemo(
    () => evaluateDraft(draft, members, meetupId),
    [draft, members, meetupId],
  );
  const { errors, customErrors, totalMinor, remainingMinor, assignedMinor } = evaluation;

  const update = (patch: Partial<ExpenseDraft>) => setDraft((d) => ({ ...d, ...patch }));

  const toggleParticipant = (id: Id) =>
    setDraft((d) => {
      const next = new Set(d.participants);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { ...d, participants: next };
    });

  const backTo = `/meetups/${meetupId}`;
  const customMismatch = draft.mode === 'custom' && remainingMinor !== null && remainingMinor !== 0;
  const totalTyped = draft.total.trim() !== '';
  const showTotalError = (submitted || totalTyped) && errors.total;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    const input = evaluation.input;
    if (!input) return;
    const ok = await run(async () => {
      if (expense) await actions.updateExpense(expense.id, input);
      else await actions.createExpense(input);
    });
    if (ok) navigate(backTo, { replace: true });
  };

  return (
    <>
      <PageHeader
        title={expense ? t.editTitle : t.newTitle}
        subtitle={meetupTitle}
        backTo={backTo}
      />
      <Card>
        <form onSubmit={onSubmit} className="space-y-5" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="expense-title" label={t.title} error={submitted ? errors.title : null}>
              <input
                id="expense-title"
                className={inputClass}
                value={draft.title}
                onChange={(e) => update({ title: e.target.value })}
                placeholder={t.titlePlaceholder}
                aria-invalid={submitted && !!errors.title}
                autoFocus={!expense}
                maxLength={80}
              />
            </Field>
            <Field id="expense-total" label={t.total} error={showTotalError ? errors.total : null}>
              <MoneyInput
                id="expense-total"
                value={draft.total}
                onChange={(e) => update({ total: e.target.value })}
                invalid={!!showTotalError}
                className="text-lg font-semibold"
              />
            </Field>
          </div>

          <FieldGroup legend={t.paidBy} error={submitted ? errors.paidBy : null}>
            <MemberChips
              members={members}
              selected={new Set(draft.paidBy ? [draft.paidBy] : [])}
              onToggle={(id) => update({ paidBy: id })}
            />
          </FieldGroup>

          <FieldGroup
            legend={t.participants}
            error={submitted || draft.participants.size === 0 ? errors.participants : null}
            aside={
              draft.participants.size < members.length && (
                <button
                  type="button"
                  className="min-h-11 px-2 text-sm font-medium text-accent-ink hover:underline"
                  onClick={() => update({ participants: new Set(members.map((m) => m.id)) })}
                >
                  {t.selectAll}
                </button>
              )
            }
          >
            <MemberChips
              members={members}
              selected={draft.participants}
              onToggle={toggleParticipant}
            />
          </FieldGroup>

          <FieldGroup legend={t.splitMode}>
            <div className="grid grid-cols-2 gap-1 rounded-control bg-surface-2 p-1">
              {(['equal', 'custom'] as SplitMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  aria-pressed={draft.mode === mode}
                  onClick={() => update({ mode })}
                  className={`min-h-11 rounded-lg font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${
                    draft.mode === mode ? 'bg-surface text-ink shadow-card' : 'text-ink-soft'
                  }`}
                >
                  {mode === 'equal' ? t.splitEqual : t.splitCustom}
                </button>
              ))}
            </div>
          </FieldGroup>

          {draft.mode === 'equal' && evaluation.shares && (
            <div className="rounded-control bg-bg p-3">
              <p className="mb-1 text-sm font-medium text-ink-soft">{t.equalPreview}</p>
              <ul className="tabular space-y-0.5 text-sm">
                {evaluation.shares.map((s) => (
                  <li key={s.memberId} className="flex justify-between">
                    <span>{members.find((m) => m.id === s.memberId)?.name}</span>
                    <span>{formatMoney(s.amountMinor)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {draft.mode === 'custom' && evaluation.orderedParticipants.length > 0 && (
            <div className="space-y-3">
              {evaluation.orderedParticipants.map((m) => {
                const raw = draft.custom[m.id] ?? '';
                const rowError = (submitted || raw.trim() !== '') && customErrors[m.id];
                return (
                  <div
                    key={m.id}
                    className="grid grid-cols-[minmax(0,1fr)_9rem] items-center gap-3"
                  >
                    <label htmlFor={`share-${m.id}`} className="truncate font-medium">
                      {m.name}
                    </label>
                    <MoneyInput
                      id={`share-${m.id}`}
                      aria-label={t.customAmountLabel(m.name)}
                      value={raw}
                      invalid={!!rowError}
                      onChange={(e) =>
                        update({ custom: { ...draft.custom, [m.id]: e.target.value } })
                      }
                    />
                    {rowError && (
                      <p className="col-span-2 -mt-2 text-right text-sm text-neg">{rowError}</p>
                    )}
                  </div>
                );
              })}
              <p
                aria-live="polite"
                className={`tabular rounded-control px-3 py-2 text-sm font-medium ${
                  totalMinor !== null && remainingMinor === 0
                    ? 'bg-pos-soft text-pos'
                    : 'bg-neg-soft text-neg'
                }`}
              >
                {t.assigned(
                  formatMoney(assignedMinor),
                  totalMinor === null ? '—' : formatMoney(totalMinor),
                )}
                {remainingMinor !== null && remainingMinor !== 0 && (
                  <>
                    {', '}
                    {remainingMinor > 0
                      ? t.remaining(formatMoney(remainingMinor))
                      : t.over(formatMoney(-remainingMinor))}
                  </>
                )}
              </p>
              {submitted && errors.customAmounts && <ErrorText>{errors.customAmounts}</ErrorText>}
              {submitted && errors.customSum && <ErrorText>{errors.customSum}</ErrorText>}
            </div>
          )}

          <Field id="expense-note" label={`${az.common.note} (${az.common.optional})`}>
            <input
              id="expense-note"
              className={inputClass}
              value={draft.note}
              onChange={(e) => update({ note: e.target.value })}
              maxLength={200}
            />
          </Field>

          {error && <ErrorText>{error}</ErrorText>}

          <div className="flex gap-2">
            <button
              type="submit"
              className={buttonClass('primary', 'flex-1')}
              disabled={pending || customMismatch}
            >
              {pending ? az.common.saving : az.common.save}
            </button>
            <button type="button" className={buttonClass('ghost')} onClick={() => navigate(backTo)}>
              {az.common.cancel}
            </button>
          </div>
        </form>
      </Card>
    </>
  );
}
