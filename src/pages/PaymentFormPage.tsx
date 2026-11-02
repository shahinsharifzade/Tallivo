import { useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DateField } from '../components/DateField';
import { MemberChips } from '../components/MemberChips';
import { MoneyInput } from '../components/MoneyInput';
import { buttonClass, inputClass } from '../components/styles';
import { Card, ErrorText, Field, FieldGroup, PageHeader } from '../components/ui';
import { isIsoDate, parseMoney, type Id } from '../domain';
import { az } from '../i18n/az';
import { todayIso } from '../lib/dates';
import { moneyErrorMessage } from '../lib/errors';
import { useAccount } from '../state/backend';
import { useActions, useAppData } from '../state/hooks';
import { useFeedback } from '../state/feedback';
import { useSubmit } from '../state/useSubmit';

const t = az.paymentForm;

/**
 * Record a repayment. Accepts ?from=&to=&amount= to prefill from a suggested transfer; without
 * ?from= the payer defaults to the signed-in member (shared mode only).
 */
export function PaymentFormPage() {
  const [params] = useSearchParams();
  const { members } = useAppData();
  const account = useAccount();
  const actions = useActions();
  const navigate = useNavigate();
  const feedback = useFeedback();
  const { pending, error, run } = useSubmit();

  const memberParam = (key: string): Id | null => {
    const id = params.get(key);
    return id && members.some((m) => m.id === id) ? id : null;
  };

  const [from, setFrom] = useState<Id | null>(() => {
    const signedIn = account?.memberId;
    const fallback = signedIn && members.some((m) => m.id === signedIn) ? signedIn : null;
    return memberParam('from') ?? fallback;
  });
  const [to, setTo] = useState<Id | null>(() => memberParam('to'));
  const [amount, setAmount] = useState(() => params.get('amount') ?? '');
  const [date, setDate] = useState(todayIso);
  const [note, setNote] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const parsed = parseMoney(amount);
  const amountError = parsed.ok ? null : moneyErrorMessage(parsed.error);
  const fromError = from ? null : t.fromRequired;
  const sameMember = !!to && to === from;
  const toError = !to ? t.toRequired : sameMember ? t.sameMember : null;
  const dateError = isIsoDate(date) ? null : az.meetupForm.dateInvalid;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (!parsed.ok || !from || !to || toError || dateError) return;
    const ok = await run(async () => {
      await actions.createSettlement({
        fromMemberId: from,
        toMemberId: to,
        amountMinor: parsed.minor,
        date,
        note,
      });
    });
    if (!ok) return;
    feedback.saved();
    navigate('/', { replace: true });
  };

  return (
    <>
      <PageHeader title={t.title} subtitle={t.hint} backTo="/" />
      <Card>
        <form onSubmit={onSubmit} className="space-y-5" noValidate>
          <FieldGroup legend={t.from} error={submitted ? fromError : null}>
            <MemberChips
              members={members}
              selected={new Set(from ? [from] : [])}
              onToggle={setFrom}
            />
          </FieldGroup>
          <FieldGroup legend={t.to} error={submitted || sameMember ? toError : null}>
            <MemberChips members={members} selected={new Set(to ? [to] : [])} onToggle={setTo} />
          </FieldGroup>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id="payment-amount"
              label={az.common.amount}
              error={submitted || amount.trim() !== '' ? amountError : null}
            >
              <MoneyInput
                id="payment-amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                invalid={(submitted || amount.trim() !== '') && !!amountError}
                className="text-lg font-semibold"
              />
            </Field>
            <Field id="payment-date" label={az.common.date} error={submitted ? dateError : null}>
              <DateField
                id="payment-date"
                value={date}
                onChange={setDate}
                invalid={submitted && !!dateError}
              />
            </Field>
          </div>
          <Field id="payment-note" label={`${az.common.note} (${az.common.optional})`}>
            <input
              id="payment-note"
              className={inputClass}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={200}
            />
          </Field>
          {error && <ErrorText>{error}</ErrorText>}
          <div className="flex gap-2">
            <button
              type="submit"
              className={buttonClass('primary', 'flex-1')}
              disabled={pending || sameMember}
            >
              {pending ? az.common.saving : t.submit}
            </button>
            <button type="button" className={buttonClass('ghost')} onClick={() => navigate('/')}>
              {az.common.cancel}
            </button>
          </div>
        </form>
      </Card>
    </>
  );
}
