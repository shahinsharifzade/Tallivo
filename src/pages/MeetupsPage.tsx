import { Link } from 'react-router-dom';
import { ChevronRightIcon, PlusIcon } from '../components/icons';
import { buttonClass } from '../components/styles';
import { EmptyState, PageHeader } from '../components/ui';
import { formatMoney } from '../domain';
import { az } from '../i18n/az';
import { formatDate } from '../lib/format';
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
          {items.map(({ meetup, totalSpentMinor, participantCount, expenseCount }) => (
            <li key={meetup.id}>
              <Link
                to={`/meetups/${meetup.id}`}
                className="flex items-center gap-3 rounded-card bg-surface p-4 shadow-card ring-1 ring-line hover:ring-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{meetup.title}</p>
                  <p className="text-sm text-ink-muted">
                    {formatDate(meetup.date)} · {az.common.people(participantCount)} ·{' '}
                    {az.meetups.expenseCount(expenseCount)}
                  </p>
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
