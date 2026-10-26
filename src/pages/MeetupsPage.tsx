import { Link } from 'react-router-dom';
import { AvatarStack } from '../components/Avatar';
import { ChevronRightIcon, PlusIcon } from '../components/icons';
import { buttonClass } from '../components/styles';
import { EmptyState, PageHeader } from '../components/ui';
import { formatMoney } from '../domain';
import { az } from '../i18n/az';
import { formatDate } from '../lib/format';
import { meetupIcon } from '../lib/meetupIcon';
import { useMeetupList } from '../state/hooks';

export function MeetupsPage() {
  const items = useMeetupList();
  const newButton = (
    <Link to="/meetups/new" className={buttonClass('primary')}>
      <PlusIcon />
      {az.meetups.newMeetup}
    </Link>
  );

  return (
    <>
      <PageHeader title={az.meetups.title} actions={items.length > 0 ? newButton : undefined} />
      {items.length === 0 ? (
        <EmptyState title={az.meetups.emptyTitle} body={az.meetups.emptyBody} action={newButton} />
      ) : (
        <ul className="space-y-2">
          {items.map(({ meetup, totalSpentMinor, participants, expenseCount }) => (
            <li key={meetup.id}>
              <Link
                to={`/meetups/${meetup.id}`}
                className="flex items-center gap-3 rounded-card bg-surface p-4 shadow-card ring-1 ring-line transition-[transform,box-shadow] duration-150 hover:ring-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent active:scale-[0.99]"
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
                      <span className="sr-only">{participants.map((m) => m.name).join(', ')}</span>
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
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
