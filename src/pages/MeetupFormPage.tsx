import { useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { buttonClass, inputClass } from '../components/styles';
import { Card, ErrorText, Field, PageHeader } from '../components/ui';
import { isIsoDate } from '../domain';
import { az } from '../i18n/az';
import { todayIso } from '../lib/dates';
import { useActions, useMeetup } from '../state/hooks';
import { useFeedback } from '../state/feedback';
import { useSubmit } from '../state/useSubmit';
import { NotFoundPage } from './NotFoundPage';

/** Create a meetup (/meetups/new) or edit one (/meetups/:meetupId/edit). */
export function MeetupFormPage() {
  const { meetupId } = useParams();
  const { meetup } = useMeetup(meetupId);
  if (meetupId && !meetup) return <NotFoundPage />;
  return <MeetupForm key={meetupId ?? 'new'} meetupId={meetupId} initial={meetup} />;
}

function MeetupForm({
  meetupId,
  initial,
}: {
  meetupId: string | undefined;
  initial: { title: string; date: string; note?: string } | undefined;
}) {
  const actions = useActions();
  const navigate = useNavigate();
  const feedback = useFeedback();
  const { pending, error, run } = useSubmit();
  const [title, setTitle] = useState(initial?.title ?? '');
  const [date, setDate] = useState(initial?.date ?? todayIso());
  const [note, setNote] = useState(initial?.note ?? '');
  const [submitted, setSubmitted] = useState(false);

  const titleError = title.trim() === '' ? az.meetupForm.titleRequired : null;
  const dateError = isIsoDate(date) ? null : az.meetupForm.dateInvalid;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (titleError || dateError) return;
    let targetId = meetupId;
    const ok = await run(async () => {
      const input = { title, date, note };
      if (meetupId) await actions.updateMeetup(meetupId, input);
      else targetId = (await actions.createMeetup(input)).id;
    });
    if (!ok || !targetId) return;
    feedback.saved();
    navigate(`/meetups/${targetId}`, { replace: true });
  };

  const backTo = meetupId ? `/meetups/${meetupId}` : '/meetups';

  return (
    <>
      <PageHeader
        title={meetupId ? az.meetupForm.editTitle : az.meetupForm.newTitle}
        backTo={backTo}
      />
      <Card>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <Field
            id="meetup-title"
            label={az.meetupForm.title}
            error={submitted ? titleError : null}
          >
            <input
              id="meetup-title"
              className={inputClass}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={az.meetupForm.titlePlaceholder}
              aria-invalid={submitted && !!titleError}
              aria-describedby={submitted && titleError ? 'meetup-title-error' : undefined}
              autoFocus={!meetupId}
              maxLength={80}
            />
          </Field>
          <Field id="meetup-date" label={az.common.date} error={submitted ? dateError : null}>
            <input
              id="meetup-date"
              type="date"
              className={inputClass}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              aria-invalid={submitted && !!dateError}
            />
          </Field>
          <Field id="meetup-note" label={`${az.common.note} (${az.common.optional})`}>
            <input
              id="meetup-note"
              className={inputClass}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={200}
            />
          </Field>
          {error && <ErrorText>{error}</ErrorText>}
          <div className="flex gap-2">
            <button type="submit" className={buttonClass('primary', 'flex-1')} disabled={pending}>
              {pending ? az.common.saving : meetupId ? az.common.save : az.meetupForm.create}
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
