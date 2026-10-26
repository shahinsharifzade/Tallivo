# Future work (not implemented)

This document describes the planned path from the current local-only app to a shared,
hosted version. Nothing here is implemented yet.

## 1. Supabase Postgres schema

The tables mirror `src/domain/types.ts` one to one. Money stays in integer minor units (qəpik).

```sql
create table members (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(trim(name)) between 1 and 40),
  sort_order  integer not null,
  user_id     uuid references auth.users (id), -- links a member to a login
  created_at  timestamptz not null default now()
);

create table meetups (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  date        date not null,
  note        text,
  created_at  timestamptz not null default now(),
  deleted_at  timestamptz
);

create table expenses (
  id                 uuid primary key default gen_random_uuid(),
  meetup_id          uuid not null references meetups (id),
  title              text not null,
  total_minor        bigint not null check (total_minor > 0),
  paid_by_member_id  uuid not null references members (id),
  note               text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  deleted_at         timestamptz
);

create table expense_shares (
  expense_id    uuid not null references expenses (id) on delete cascade,
  member_id     uuid not null references members (id),
  amount_minor  bigint not null check (amount_minor > 0),
  primary key (expense_id, member_id)
);

create table settlements (
  id              uuid primary key default gen_random_uuid(),
  from_member_id  uuid not null references members (id),
  to_member_id    uuid not null references members (id),
  amount_minor    bigint not null check (amount_minor > 0),
  date            date not null,
  note            text,
  created_at      timestamptz not null default now(),
  deleted_at      timestamptz,
  check (from_member_id <> to_member_id)
);
```

Notes:

- `members.id` foreign keys (without `on delete cascade`) enforce the rule that a referenced
  member cannot be deleted, just like `LocalStorageRepository.deleteMember` does today.
- "Shares sum to total" spans two tables. Enforce it by writing an expense and its shares
  together in a single Postgres function (RPC), e.g. `save_expense(expense jsonb, shares jsonb)`,
  that validates the sum and raises otherwise. The same applies to the cascading soft delete of a
  meetup and its expenses (today in `src/state/actions.ts`), which should become one transaction.
- Export/Import can keep using the `Snapshot` JSON format from `src/data/repository.ts`.

## 2. Supabase Auth: 4 invited emails only

- Disable public sign-ups in the Supabase dashboard.
- Invite exactly the 4 friends by email (magic link or email + password).
- Keep an allow-list table, e.g. `group_users (user_id uuid primary key references auth.users)`,
  or link logins through `members.user_id`.

## 3. Row Level Security

Enable RLS on every table and allow access only to group members:

```sql
alter table meetups enable row level security;

create policy "group members can read and write meetups"
  on meetups for all
  using (exists (select 1 from group_users g where g.user_id = auth.uid()))
  with check (exists (select 1 from group_users g where g.user_id = auth.uid()));
-- Repeat for members, expenses, expense_shares and settlements.
```

Hard deletes can be blocked for `meetups`, `expenses` and `settlements` (soft delete only) by
omitting a `delete` policy.

## 4. SupabaseRepository

- Add `src/data/supabaseRepository.ts` implementing the existing `Repository` interface with
  `@supabase/supabase-js`. Map snake_case columns to the camelCase domain types.
- Pick the implementation in `src/main.tsx`, the only place that creates a repository.
  Components, hooks and `src/domain` stay unchanged.
- Add a login screen and session handling (wrapping `AppDataProvider`).
- Optional: Supabase Realtime subscriptions to reload when another friend adds an expense.
- The Supabase URL and the **anon** key go in `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`
  environment variables (never committed). The anon key is safe in the browser only because
  of RLS. Never ship the service-role key to the frontend.

## 5. Deployment (free tier)

- Cloudflare Pages or Netlify: build command `npm run build`, output directory `dist`.
- Add an SPA fallback so deep links work: `public/_redirects` with `/* /index.html 200`
  (works on both hosts).
- Set the two `VITE_SUPABASE_*` variables in the host's dashboard.

## Caveat: free Supabase projects pause

Supabase pauses free-tier projects after about one week of inactivity. A paused project must be
restored from the dashboard before the app works again, which can be confusing when the group
has not met for a while. Options: open the app at least weekly, use a scheduled ping (e.g. a
GitHub Actions cron that runs a trivial query), or move to a paid plan. Keep regular JSON exports
as a backup either way.
