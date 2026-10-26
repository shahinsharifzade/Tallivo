import type { Repository } from './repository';

/** Members created on first run (data, not UI text). */
export const DEFAULT_MEMBER_NAMES = ['Əşrəf', 'Ayxan', 'Şahin', 'Seyid'] as const;

export async function seedDefaultMembers(repository: Repository): Promise<void> {
  for (const [sortOrder, name] of DEFAULT_MEMBER_NAMES.entries()) {
    await repository.createMember({ name, sortOrder });
  }
}

async function isEmpty(repository: Repository): Promise<boolean> {
  const [members, meetups, expenses, settlements] = await Promise.all([
    repository.listMembers(),
    repository.listMeetups(),
    repository.listExpenses(),
    repository.listSettlements(),
  ]);
  return (
    members.length === 0 &&
    meetups.length === 0 &&
    expenses.length === 0 &&
    settlements.length === 0
  );
}

// One seeding attempt per repository instance, so concurrent callers (e.g. React StrictMode
// running effects twice) cannot create the default members twice.
const seeding = new WeakMap<Repository, Promise<void>>();

/** Seeds the default members if there is no data at all (first run). */
export function ensureSeeded(repository: Repository): Promise<void> {
  let pending = seeding.get(repository);
  if (!pending) {
    pending = (async () => {
      if (await isEmpty(repository)) await seedDefaultMembers(repository);
    })();
    seeding.set(repository, pending);
  }
  return pending;
}
