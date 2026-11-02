import { useLayoutEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import {
  cardDigits,
  formatCardNumber,
  isCardNumberValid,
  MAX_CARD_DIGITS,
  MAX_CARD_LABEL_LENGTH,
  passesLuhn,
  type Id,
  type MemberCard,
} from '../domain';
import { az } from '../i18n/az';
import { useActions } from '../state/hooks';
import { useFeedback } from '../state/feedback';
import { useSubmit } from '../state/useSubmit';
import { buttonClass, inputClass } from './styles';
import { ErrorText, Field } from './ui';

const t = az.cards;

/** Add or edit a card: only a number and an optional label. Never ask for CVV, expiry or PIN. */
export function CardForm({
  memberId,
  card,
  onDone,
}: {
  memberId: Id;
  card?: MemberCard;
  onDone: () => void;
}) {
  const actions = useActions();
  const feedback = useFeedback();
  const { pending, error, run } = useSubmit();
  const [digits, setDigits] = useState(card?.cardNumber ?? '');
  const [label, setLabel] = useState(card?.label ?? '');
  const [submitted, setSubmitted] = useState(false);

  // Regrouping rewrites the text, so the caret goes back after the same number of digits.
  const inputRef = useRef<HTMLInputElement>(null);
  const digitsBeforeCaret = useRef<number | null>(null);
  useLayoutEffect(() => {
    const input = inputRef.current;
    const wanted = digitsBeforeCaret.current;
    if (!input || wanted === null) return;
    digitsBeforeCaret.current = null;
    let position = 0;
    for (let seen = 0; seen < wanted && position < input.value.length; position++) {
      if (/\d/.test(input.value[position] ?? '')) seen++;
    }
    input.setSelectionRange(position, position);
  });

  const onNumberChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { value, selectionStart } = e.target;
    digitsBeforeCaret.current = cardDigits(value.slice(0, selectionStart ?? value.length)).length;
    setDigits(cardDigits(value).slice(0, MAX_CARD_DIGITS));
  };

  const valid = isCardNumberValid(digits);
  const showLuhnWarning = valid && !passesLuhn(digits);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (!valid) return;
    const ok = await run(async () => {
      await actions.saveCard({ memberId, label, cardNumber: digits }, card?.id);
    });
    if (!ok) return;
    feedback.saved();
    onDone();
  };

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-control bg-bg p-3" noValidate>
      <Field
        id="card-number"
        label={t.number}
        error={submitted && !valid ? t.numberInvalid : null}
        hint={showLuhnWarning ? <span className="text-neg">{t.luhnWarning}</span> : undefined}
      >
        <input
          ref={inputRef}
          id="card-number"
          className={`${inputClass} tabular`}
          inputMode="numeric"
          autoComplete="off"
          placeholder={t.numberPlaceholder}
          value={formatCardNumber(digits)}
          onChange={onNumberChange}
          aria-invalid={submitted && !valid}
          autoFocus
        />
      </Field>
      <Field id="card-label" label={`${t.label} (${az.common.optional})`}>
        <input
          id="card-label"
          className={inputClass}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder={t.labelPlaceholder}
          maxLength={MAX_CARD_LABEL_LENGTH}
        />
      </Field>
      {error && <ErrorText>{error}</ErrorText>}
      <div className="flex gap-2">
        <button type="submit" className={buttonClass('primary', 'flex-1')} disabled={pending}>
          {pending ? az.common.saving : az.common.save}
        </button>
        <button type="button" className={buttonClass('ghost')} onClick={onDone}>
          {az.common.cancel}
        </button>
      </div>
    </form>
  );
}
