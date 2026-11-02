-- Tallivo migration 003: an admin flag on members, and payment cards.
--
-- Run this whole file in the Supabase SQL Editor, after schema.sql, migration 002 and
-- link_users.sql. It is idempotent (safe to run again).
--
-- IMPORTANT: if you ever run schema.sql again, run this file again right after it. schema.sql
-- restores the older, wider members_insert policy and table grants.
--
-- Admin: only an admin can rename members, reorder them and add new ones. Everyone else can only
-- change the color of their own member row. Being admin is a flag on the member row, and the API
-- can never change it; only the SQL Editor can (see the template at the bottom of this file).
--
-- Cards: store ONLY a card number and an optional label. Never add CVV, expiry date or PIN.
-- All group members can read cards (to copy the recipient's number when paying). Each person can
-- add, change and delete only their own, and that includes admins.

-- ---------------------------------------------------------------------------------------------
-- Admin flag
-- ---------------------------------------------------------------------------------------------

alter table public.members add column if not exists is_admin boolean not null default false;

-- security definer for the same reason as is_group_member: it reads members from inside
-- members' own policies.
create or replace function public.is_group_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.members where user_id = auth.uid() and is_admin);
$$;

revoke execute on function public.is_group_admin() from public, anon;
grant execute on function public.is_group_admin() to authenticated;

-- ---------------------------------------------------------------------------------------------
-- Members: policies and privileges
-- ---------------------------------------------------------------------------------------------

drop policy if exists members_select on public.members;
create policy members_select on public.members
  for select to authenticated using (public.is_group_member());

drop policy if exists members_insert on public.members;
create policy members_insert on public.members
  for insert to authenticated
  with check (public.is_group_admin() and user_id is null and is_admin = false);

-- Which changes are allowed is decided row by row in the members_guard trigger below.
drop policy if exists members_update on public.members;
create policy members_update on public.members
  for update to authenticated
  using (public.is_group_member()) with check (public.is_group_member());

-- The API can never write user_id or is_admin: there are no column grants for them.
revoke all on public.members from anon, authenticated;
grant select on public.members to authenticated;
grant insert (name, color, sort_order), update (name, color, sort_order)
  on public.members to authenticated;

-- ---------------------------------------------------------------------------------------------
-- Members: guard against non-admin changes
-- ---------------------------------------------------------------------------------------------

-- Errors start with the stable code "admin_only:", which the app maps to a clear message.
create or replace function public.members_guard()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- No signed-in user: SQL Editor or maintenance (link_users.sql). anon has no grants anyway.
  if auth.uid() is null then
    return new;
  end if;
  if public.is_group_admin() then
    return new;
  end if;
  if old.user_id is distinct from auth.uid() then
    raise exception 'admin_only: only an admin can change another member';
  end if;
  -- Compares every column except color, so a column added later is protected by default.
  if (to_jsonb(new) - 'color') is distinct from (to_jsonb(old) - 'color') then
    raise exception 'admin_only: members can change only their own color';
  end if;
  return new;
end;
$$;

revoke execute on function public.members_guard() from public, anon, authenticated;

drop trigger if exists members_guard on public.members;
create trigger members_guard
  before update on public.members
  for each row execute function public.members_guard();

-- ---------------------------------------------------------------------------------------------
-- Payment cards
-- ---------------------------------------------------------------------------------------------

create table if not exists public.member_cards (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members (id) on delete cascade,
  label text null check (label is null or char_length(label) <= 40),
  card_number text not null check (card_number ~ '^[0-9]{13,19}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (member_id, card_number)
);

drop trigger if exists member_cards_set_updated_at on public.member_cards;
create trigger member_cards_set_updated_at
  before update on public.member_cards
  for each row execute function public.set_updated_at();

alter table public.member_cards enable row level security;

drop policy if exists member_cards_select on public.member_cards;
create policy member_cards_select on public.member_cards
  for select to authenticated using (public.is_group_member());

drop policy if exists member_cards_insert on public.member_cards;
create policy member_cards_insert on public.member_cards
  for insert to authenticated
  with check (
    exists (
      select 1 from public.members m
      where m.id = member_cards.member_id and m.user_id = auth.uid()
    )
  );

-- using: the card is yours now. with check: it stays yours (it cannot be moved to someone else).
drop policy if exists member_cards_update on public.member_cards;
create policy member_cards_update on public.member_cards
  for update to authenticated
  using (
    exists (
      select 1 from public.members m
      where m.id = member_cards.member_id and m.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.members m
      where m.id = member_cards.member_id and m.user_id = auth.uid()
    )
  );

drop policy if exists member_cards_delete on public.member_cards;
create policy member_cards_delete on public.member_cards
  for delete to authenticated
  using (
    exists (
      select 1 from public.members m
      where m.id = member_cards.member_id and m.user_id = auth.uid()
    )
  );

-- Start from nothing for both API roles, as in schema.sql: some projects grant ALL by default,
-- which would include TRUNCATE, and TRUNCATE is not subject to RLS.
revoke all on public.member_cards from anon, authenticated;
grant select, insert, update, delete on public.member_cards to authenticated;

-- ---------------------------------------------------------------------------------------------
-- Choose the admin (TEMPLATE)
-- ---------------------------------------------------------------------------------------------

-- Replace EMAIL_HERE with the admin's login email, then run this statement. Left unchanged it
-- matches nobody and does nothing, so running the whole file first is safe. Do not commit the
-- real address.
update public.members
set is_admin = true
where user_id = (select id from auth.users where lower(email) = lower('EMAIL_HERE'));

-- Check: the admin should show is_admin = true, and every member an email.
select m.name, u.email, m.is_admin
from public.members m
left join auth.users u on u.id = m.user_id
order by m.sort_order;
