import { useMemo, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MemberChips } from '../../components/MemberChips';
import { Avatar } from '../../components/Avatar';
import { HeroMoneyInput, MoneyInput } from '../../components/MoneyInput';
import { SplitBar } from '../../components/SplitBar';
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
          <div>
            <HeroMoneyInput
              id="expense-total"
              label={t.total}
              value={draft.total}
              onChange={(e) => update({ total: e.target.value })}
              invalid={!!showTotalError}
              aria-describedby={showTotalError ? 'expense-total-error' : undefined}
              autoFocus={!expense}
            />
            {showTotalError && (
              <p id="expense-total-error" className="mt-1 text-center text-sm text-neg">
                {errors.total}
              </p>
            )}
          </div>

          <Field id="expense-title" label={t.title} error={submitted ? errors.title : null}>
            <input
              id="expense-title"
              className={inputClass}
              value={draft.title}
              onChange={(e) => update({ title: e.target.value })}
              placeholder={t.titlePlaceholder}
              aria-invalid={submitted && !!errors.title}
              maxLength={80}
            />
          </Field>

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
            <div className="space-y-3 rounded-control bg-bg p-3">
              <SplitBar
                shares={evaluation.shares}
                totalMinor={totalMinor}
                members={members}
                label={t.splitBarLabel}
              />
              <p className="text-sm font-medium text-ink-soft">{t.equalPreview}</p>
              <ul className="tabular grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                {evaluation.shares.map((s) => {
                  const m = members.find((x) => x.id === s.memberId);
                  return (
                    <li key={s.memberId} className="flex min-w-0 items-center gap-2">
                      <Avatar member={m} size="xs" />
                      <span className="min-w-0 flex-1 truncate">{m?.name}</span>
                      <span className="font-semibold">{formatMoney(s.amountMinor)}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {draft.mode === 'custom' && evaluation.orderedParticipants.length > 0 && (
            <div className="space-y-3">
              <SplitBar
                shares={evaluation.validCustomShares}
                totalMinor={totalMinor}
                members={members}
                label={t.splitBarLabel}
              />
              {evaluation.orderedParticipants.map((m) => {
                const raw = draft.custom[m.id] ?? '';
                const rowError = (submitted || raw.trim() !== '') && customErrors[m.id];
                return (
                  <div
                    key={m.id}
                    className="grid grid-cols-[minmax(0,1fr)_9rem] items-center gap-3"
                  >
                    <label
                      htmlFor={`share-${m.id}`}
                      className="flex min-w-0 items-center gap-2 font-medium"
                    >
                      <Avatar member={m} size="sm" />
                      <span className="truncate">{m.name}</span>
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
                className={`tabular flex flex-wrap items-baseline justify-between gap-x-3 rounded-control px-3 py-2 text-sm transition-colors duration-300 ${
                  totalMinor !== null && remainingMinor === 0
                    ? 'bg-pos-soft text-pos'
                    : 'bg-neg-soft text-neg'
                }`}
              >
                <span>
                  {t.assigned(
                    formatMoney(assignedMinor),
                    totalMinor === null ? '—' : formatMoney(totalMinor),
                  )}
                </span>
                <span className="text-base font-bold">
                  {remainingMinor !== null && remainingMinor < 0
                    ? t.over(formatMoney(-remainingMinor))
                    : t.remaining(formatMoney(remainingMinor ?? 0))}
                </span>
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
