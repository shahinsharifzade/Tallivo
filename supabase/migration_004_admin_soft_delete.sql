-- Tallivo migration 004: only an admin can soft-delete or restore records.
--
-- Run this whole file in the Supabase SQL Editor, after migration 003. It is idempotent (safe to
-- run again).
--
-- IMPORTANT: if you ever run schema.sql again, run migrations 003 and 004 again right after it.
-- schema.sql restores the older policies that let any group member do this.
--
-- Soft delete stays what it was: deleted_at on meetups, expenses and settlements. Nothing here
-- removes rows, and no API role has DELETE on those tables (see schema.sql).
--
-- The rule, for meetups, expenses and settlements:
--   using:      a member can only update a row that is not deleted (so they cannot restore one);
--   with check: a member can only leave a row not deleted (so they cannot delete one).
-- delete_meetup, restore_meetup and save_expense run as the caller, so the same rule covers them.
-- Being admin comes from is_group_admin(), which reads the member row of auth.uid(). The API can
-- never write is_admin (migration 003), so a client cannot claim it.

drop policy if exists meetups_insert on public.meetups;
create policy meetups_insert on public.meetups
  for insert to authenticated
  with check (public.is_group_member() and (deleted_at is null or public.is_group_admin()));
drop policy if exists meetups_update on public.meetups;
create policy meetups_update on public.meetups
  for update to authenticated
  using (public.is_group_member() and (deleted_at is null or public.is_group_admin()))
  with check (public.is_group_member() and (deleted_at is null or public.is_group_admin()));

drop policy if exists expenses_insert on public.expenses;
create policy expenses_insert on public.expenses
  for insert to authenticated
  with check (public.is_group_member() and (deleted_at is null or public.is_group_admin()));
drop policy if exists expenses_update on public.expenses;
create policy expenses_update on public.expenses
  for update to authenticated
  using (public.is_group_member() and (deleted_at is null or public.is_group_admin()))
  with check (public.is_group_member() and (deleted_at is null or public.is_group_admin()));

drop policy if exists settlements_insert on public.settlements;
create policy settlements_insert on public.settlements
  for insert to authenticated
  with check (public.is_group_member() and (deleted_at is null or public.is_group_admin()));
drop policy if exists settlements_update on public.settlements;
create policy settlements_update on public.settlements
  for update to authenticated
  using (public.is_group_member() and (deleted_at is null or public.is_group_admin()))
  with check (public.is_group_member() and (deleted_at is null or public.is_group_admin()));

-- The shares of a deleted expense are frozen too, so that restoring it brings back the original
-- split. Shares of active expenses stay writable: save_expense replaces them on every edit.
create or replace function public.can_write_shares_of(p_expense_id uuid)
returns boolean
language sql
stable
set search_path = public
as $$
  select public.is_group_member() and exists (
    select 1 from public.expenses e
    where e.id = p_expense_id and (e.deleted_at is null or public.is_group_admin())
  );
$$;

revoke execute on function public.can_write_shares_of(uuid) from public, anon;
grant execute on function public.can_write_shares_of(uuid) to authenticated;

drop policy if exists expense_shares_insert on public.expense_shares;
create policy expense_shares_insert on public.expense_shares
  for insert to authenticated with check (public.can_write_shares_of(expense_id));
drop policy if exists expense_shares_update on public.expense_shares;
create policy expense_shares_update on public.expense_shares
  for update to authenticated
  using (public.can_write_shares_of(expense_id))
  with check (public.can_write_shares_of(expense_id));
drop policy if exists expense_shares_delete on public.expense_shares;
create policy expense_shares_delete on public.expense_shares
  for delete to authenticated using (public.can_write_shares_of(expense_id));
