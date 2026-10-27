-- Tallivo: shared database schema, access control and RPC.
--
-- Run the whole file in the Supabase SQL Editor. It is idempotent: running it again is safe
-- and does not delete data.
--
-- Rules:
-- - Money is always integer qəpik (bigint). 1 AZN = 100.
-- - Nothing is hard-deleted except expense_shares (which are replaced when an expense is
--   edited). Meetups, expenses and settlements use deleted_at; members are never deleted.
-- - Only signed-in users linked to a row in members (members.user_id) can read or write.
--   The anon role has no access at all.

-- ---------------------------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------------------------

create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  color text null,
  sort_order int not null default 0,
  user_id uuid null unique references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.meetups (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  date date not null,
  note text null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz null
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  meetup_id uuid not null references public.meetups (id),
  title text not null,
  total_minor bigint not null check (total_minor > 0),
  paid_by_member_id uuid not null references public.members (id),
  note text null,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null
);

create table if not exists public.expense_shares (
  expense_id uuid not null references public.expenses (id) on delete cascade,
  member_id uuid not null references public.members (id),
  amount_minor bigint not null check (amount_minor > 0),
  primary key (expense_id, member_id)
);

create table if not exists public.settlements (
  id uuid primary key default gen_random_uuid(),
  from_member_id uuid not null references public.members (id),
  to_member_id uuid not null references public.members (id),
  amount_minor bigint not null check (amount_minor > 0),
  date date not null,
  note text null,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  deleted_at timestamptz null,
  check (from_member_id <> to_member_id)
);

create index if not exists expenses_meetup_id_idx on public.expenses (meetup_id);
create index if not exists expenses_paid_by_member_id_idx on public.expenses (paid_by_member_id);
create index if not exists expense_shares_member_id_idx on public.expense_shares (member_id);
create index if not exists settlements_from_member_id_idx on public.settlements (from_member_id);
create index if not exists settlements_to_member_id_idx on public.settlements (to_member_id);

-- ---------------------------------------------------------------------------------------------
-- Keep expenses.updated_at current
-- ---------------------------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists expenses_set_updated_at on public.expenses;
create trigger expenses_set_updated_at
  before update on public.expenses
  for each row execute function public.set_updated_at();

revoke execute on function public.set_updated_at() from public, anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- Group membership check
-- ---------------------------------------------------------------------------------------------

-- security definer so it can read members without going through members' own RLS policy
-- (which itself calls this function).
create or replace function public.is_group_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.members where user_id = auth.uid());
$$;

revoke execute on function public.is_group_member() from public, anon;
grant execute on function public.is_group_member() to authenticated;

-- ---------------------------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------------------------

alter table public.members enable row level security;
alter table public.meetups enable row level security;
alter table public.expenses enable row level security;
alter table public.expense_shares enable row level security;
alter table public.settlements enable row level security;

-- members, meetups, expenses, settlements: select, insert, update. No delete policy.

drop policy if exists members_select on public.members;
create policy members_select on public.members
  for select to authenticated using (public.is_group_member());
drop policy if exists members_insert on public.members;
create policy members_insert on public.members
  for insert to authenticated with check (public.is_group_member());
drop policy if exists members_update on public.members;
create policy members_update on public.members
  for update to authenticated
  using (public.is_group_member()) with check (public.is_group_member());

drop policy if exists meetups_select on public.meetups;
create policy meetups_select on public.meetups
  for select to authenticated using (public.is_group_member());
drop policy if exists meetups_insert on public.meetups;
create policy meetups_insert on public.meetups
  for insert to authenticated with check (public.is_group_member());
drop policy if exists meetups_update on public.meetups;
create policy meetups_update on public.meetups
  for update to authenticated
  using (public.is_group_member()) with check (public.is_group_member());

drop policy if exists expenses_select on public.expenses;
create policy expenses_select on public.expenses
  for select to authenticated using (public.is_group_member());
drop policy if exists expenses_insert on public.expenses;
create policy expenses_insert on public.expenses
  for insert to authenticated with check (public.is_group_member());
drop policy if exists expenses_update on public.expenses;
create policy expenses_update on public.expenses
  for update to authenticated
  using (public.is_group_member()) with check (public.is_group_member());

drop policy if exists settlements_select on public.settlements;
create policy settlements_select on public.settlements
  for select to authenticated using (public.is_group_member());
drop policy if exists settlements_insert on public.settlements;
create policy settlements_insert on public.settlements
  for insert to authenticated with check (public.is_group_member());
drop policy if exists settlements_update on public.settlements;
create policy settlements_update on public.settlements
  for update to authenticated
  using (public.is_group_member()) with check (public.is_group_member());

-- expense_shares: select, insert, update, delete (shares are replaced when an expense changes).

drop policy if exists expense_shares_select on public.expense_shares;
create policy expense_shares_select on public.expense_shares
  for select to authenticated using (public.is_group_member());
drop policy if exists expense_shares_insert on public.expense_shares;
create policy expense_shares_insert on public.expense_shares
  for insert to authenticated with check (public.is_group_member());
drop policy if exists expense_shares_update on public.expense_shares;
create policy expense_shares_update on public.expense_shares
  for update to authenticated
  using (public.is_group_member()) with check (public.is_group_member());
drop policy if exists expense_shares_delete on public.expense_shares;
create policy expense_shares_delete on public.expense_shares
  for delete to authenticated using (public.is_group_member());

-- ---------------------------------------------------------------------------------------------
-- Table privileges
-- ---------------------------------------------------------------------------------------------

-- Start from nothing for both API roles (some projects grant ALL by default, which would
-- include TRUNCATE, and TRUNCATE is not subject to RLS), then grant only what is needed.
revoke all on public.members, public.meetups, public.expenses, public.expense_shares,
  public.settlements from anon, authenticated;

-- members: users may change name, color and sort order, but never user_id. Linking accounts
-- to members is done only by the admin in the SQL Editor (link_users.sql).
grant select on public.members to authenticated;
grant insert (name, color, sort_order), update (name, color, sort_order)
  on public.members to authenticated;

grant select, insert, update on public.meetups, public.expenses, public.settlements
  to authenticated;
grant select, insert, update, delete on public.expense_shares to authenticated;

-- ---------------------------------------------------------------------------------------------
-- save_expense: create or update an expense and replace its shares atomically
-- ---------------------------------------------------------------------------------------------

-- Input (jsonb):
--   { "id"?: uuid, "meetup_id": uuid, "title": text, "total_minor": int,
--     "paid_by_member_id": uuid, "note"?: text,
--     "shares": [ { "member_id": uuid, "amount_minor": int }, ... ] }
-- Without "id" a new expense is created; with "id" that expense is updated.
-- Returns the expense id. Runs as the caller (security invoker), so RLS applies.
-- Errors are raised with a message starting with a stable code, e.g. "shares_sum_mismatch: ...".
create or replace function public.save_expense(p jsonb)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id uuid;
  v_meetup_id uuid;
  v_title text;
  v_total bigint;
  v_payer uuid;
  v_note text;
  v_shares jsonb;
  v_share_count int;
  v_distinct_count int;
  v_sum numeric;
  v_unknown_members int;
begin
  if p is null or jsonb_typeof(p) <> 'object' then
    raise exception 'invalid_input: expected a JSON object';
  end if;

  v_id := nullif(p ->> 'id', '')::uuid;
  v_meetup_id := (p ->> 'meetup_id')::uuid;
  v_title := btrim(p ->> 'title');
  v_total := (p ->> 'total_minor')::bigint;
  v_payer := (p ->> 'paid_by_member_id')::uuid;
  v_note := nullif(btrim(p ->> 'note'), '');
  v_shares := p -> 'shares';

  if v_meetup_id is null then
    raise exception 'missing_meetup: meetup_id is required';
  end if;
  if v_title is null or v_title = '' then
    raise exception 'missing_title: title is required';
  end if;
  if v_total is null or v_total <= 0 then
    raise exception 'invalid_total: total_minor must be a positive integer';
  end if;
  if v_payer is null then
    raise exception 'missing_payer: paid_by_member_id is required';
  end if;

  if v_shares is null or jsonb_typeof(v_shares) <> 'array' or jsonb_array_length(v_shares) = 0
  then
    raise exception 'no_shares: at least one share is required';
  end if;

  -- Each share: member_id present, amount_minor a positive integer. (CASE, because OR does not
  -- guarantee evaluation order and the numeric cast must only run on JSON numbers.)
  if exists (
    select 1
    from jsonb_array_elements(v_shares) s
    where case
      when jsonb_typeof(s) <> 'object' then true
      when nullif(s ->> 'member_id', '') is null then true
      when jsonb_typeof(s -> 'amount_minor') is distinct from 'number' then true
      else (s ->> 'amount_minor')::numeric <= 0
        or (s ->> 'amount_minor')::numeric <> trunc((s ->> 'amount_minor')::numeric)
    end
  ) then
    raise exception 'invalid_share: every share needs a member_id and a positive integer amount_minor';
  end if;

  select count(*), count(distinct (s ->> 'member_id')::uuid), sum((s ->> 'amount_minor')::numeric)
  into v_share_count, v_distinct_count, v_sum
  from jsonb_array_elements(v_shares) s;

  if v_distinct_count <> v_share_count then
    raise exception 'duplicate_share_member: a member appears more than once in shares';
  end if;
  if v_sum <> v_total then
    raise exception 'shares_sum_mismatch: shares sum to %, total_minor is %', v_sum, v_total;
  end if;

  if not exists (select 1 from public.meetups where id = v_meetup_id) then
    raise exception 'meetup_not_found: meetup % does not exist', v_meetup_id;
  end if;
  if not exists (select 1 from public.members where id = v_payer) then
    raise exception 'payer_not_found: member % does not exist', v_payer;
  end if;

  select count(*)
  into v_unknown_members
  from jsonb_array_elements(v_shares) s
  where not exists (select 1 from public.members m where m.id = (s ->> 'member_id')::uuid);
  if v_unknown_members > 0 then
    raise exception 'share_member_not_found: a share refers to a member that does not exist';
  end if;

  if v_id is null then
    insert into public.expenses (meetup_id, title, total_minor, paid_by_member_id, note)
    values (v_meetup_id, v_title, v_total, v_payer, v_note)
    returning id into v_id;
  else
    update public.expenses
    set meetup_id = v_meetup_id,
        title = v_title,
        total_minor = v_total,
        paid_by_member_id = v_payer,
        note = v_note
    where id = v_id;
    if not found then
      raise exception 'expense_not_found: expense % does not exist', v_id;
    end if;
    delete from public.expense_shares where expense_id = v_id;
  end if;

  insert into public.expense_shares (expense_id, member_id, amount_minor)
  select v_id, (s ->> 'member_id')::uuid, (s ->> 'amount_minor')::bigint
  from jsonb_array_elements(v_shares) s;

  return v_id;
end;
$$;

revoke execute on function public.save_expense(jsonb) from public, anon;
grant execute on function public.save_expense(jsonb) to authenticated;
