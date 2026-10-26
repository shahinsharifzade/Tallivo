import { Link } from 'react-router-dom';
import { AvatarStack } from '../components/Avatar';
import { MeetupsArt } from '../components/illustrations';
import { ChevronRightIcon, PlusIcon } from '../components/icons';
import { buttonClass } from '../components/styles';
import { SwipeToDelete } from '../components/SwipeToDelete';
import { EmptyState, ErrorText, PageHeader } from '../components/ui';
import { formatMoney } from '../domain';
import { az } from '../i18n/az';
import { formatDate } from '../lib/format';
import { meetupIcon } from '../lib/meetupIcon';
import { useFeedback } from '../state/feedback';
import { useActions, useMeetupList } from '../state/hooks';
import { useSubmit } from '../state/useSubmit';

export function MeetupsPage() {
  const items = useMeetupList();
  const actions = useActions();
  const feedback = useFeedback();
  const { error, run } = useSubmit();

  const swipeDelete = async (id: string, title: string) => {
    if (await run(() => actions.deleteMeetup(id))) {
      feedback.undoable(az.feedback.deleted(title), () => actions.restoreMeetup(id));
    }
  };
  const newButton = (
    <Link to="/meetups/new" className={buttonClass('primary')}>
      <PlusIcon />
      {az.meetups.newMeetup}
    </Link>
  );

  return (
    <>
      <PageHeader title={az.meetups.title} actions={items.length > 0 ? newButton : undefined} />
      {error && (
        <div className="mb-3">
          <ErrorText>{error}</ErrorText>
        </div>
      )}
      {items.length > 0 && (
        <p className="-mt-2 mb-3 text-sm text-ink-muted">{az.feedback.swipeHint}</p>
      )}
      {items.length === 0 ? (
        <EmptyState
          art={<MeetupsArt />}
          title={az.meetups.emptyTitle}
          body={az.meetups.emptyBody}
          action={newButton}
        />
      ) : (
        <ul className="stagger space-y-2">
          {items.map(({ meetup, totalSpentMinor, participants, expenseCount }) => (
            <li key={meetup.id}>
              <SwipeToDelete
                className="rounded-card shadow-card"
                label={az.common.delete}
                onDelete={() => swipeDelete(meetup.id, meetup.title)}
              >
                <Link
                  to={`/meetups/${meetup.id}`}
                  draggable={false}
                  className="flex items-center gap-3 rounded-card bg-surface p-4 ring-1 ring-inset ring-line transition-[transform,box-shadow] duration-150 hover:ring-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent active:scale-[0.99]"
                >
                  <span
                    aria-hidden="true"
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-control bg-surface-2 text-2xl"
                  >
                    {meetupIcon(meetup.title)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{meetup.title}</p>
                    <p className="text-sm text-ink-muted">
                      {formatDate(meetup.date)} · {az.meetups.expenseCount(expenseCount)}
                    </p>
                    {participants.length > 0 && (
                      <div className="mt-1.5 flex items-center gap-2">
                        <AvatarStack members={participants} />
                        <span className="sr-only">
                          {participants.map((m) => m.name).join(', ')}
                        </span>
                        <span className="text-xs text-ink-muted">
                          {az.common.people(participants.length)}
                        </span>
                      </div>
                    )}
                  </div>
                  <span className="tabular shrink-0 font-semibold">
                    {formatMoney(totalSpentMinor)}
                  </span>
                  <span className="shrink-0 text-ink-muted">
                    <ChevronRightIcon />
                  </span>
                </Link>
              </SwipeToDelete>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
