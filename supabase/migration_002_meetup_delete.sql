-- Tallivo migration 002: delete and restore a meetup together with its expenses, atomically.
--
-- Run this whole file once in the Supabase SQL Editor, after schema.sql. It is idempotent
-- (safe to run again) and does not change any data by itself.
--
-- delete_meetup sets the same deleted_at on the meetup and on all of its expenses that are not
-- already deleted. restore_meetup clears deleted_at on the meetup and on exactly those expenses
-- (the ones whose deleted_at equals the meetup's), so expenses deleted earlier on their own stay
-- deleted. Both run as the caller (security invoker), so Row Level Security applies.

create or replace function public.delete_meetup(p_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_deleted_at timestamptz;
  v_now timestamptz := now();
begin
  select deleted_at into v_deleted_at from public.meetups where id = p_id for update;
  if not found then
    raise exception 'meetup_not_found: meetup % does not exist', p_id;
  end if;
  -- Already deleted: nothing to do.
  if v_deleted_at is not null then
    return;
  end if;

  update public.meetups set deleted_at = v_now where id = p_id;
  update public.expenses set deleted_at = v_now where meetup_id = p_id and deleted_at is null;
end;
$$;

create or replace function public.restore_meetup(p_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_deleted_at timestamptz;
begin
  select deleted_at into v_deleted_at from public.meetups where id = p_id for update;
  if not found then
    raise exception 'meetup_not_found: meetup % does not exist', p_id;
  end if;
  -- Not deleted: nothing to do.
  if v_deleted_at is null then
    return;
  end if;

  update public.expenses set deleted_at = null
  where meetup_id = p_id and deleted_at = v_deleted_at;
  update public.meetups set deleted_at = null where id = p_id;
end;
$$;

revoke execute on function public.delete_meetup(uuid) from public, anon;
grant execute on function public.delete_meetup(uuid) to authenticated;
revoke execute on function public.restore_meetup(uuid) from public, anon;
grant execute on function public.restore_meetup(uuid) to authenticated;
