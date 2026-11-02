-- Tallivo: read-only checks. Run in the SQL Editor after schema.sql, link_users.sql and the
-- migrations.
-- Nothing here changes data. Run the queries one at a time to see each result.

-- 1. All six tables exist and have Row Level Security enabled.
--    Expected: 6 rows, rls_enabled = true on every row.
select c.relname as table_name, c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relname in ('members', 'meetups', 'expenses', 'expense_shares', 'settlements',
                    'member_cards')
order by c.relname;

-- 2. Policies. Expected: 20 rows, all for role {authenticated}.
--    select/insert/update on members, meetups, expenses, settlements;
--    select/insert/update/delete on expense_shares and member_cards. No DELETE on the other four
--    tables.
select tablename, policyname, cmd, roles
from pg_policies
where schemaname = 'public'
order by tablename, cmd;

-- 3. Table privileges for the API roles. Expected: no rows for anon; authenticated has
--    SELECT/INSERT/UPDATE (plus DELETE only on expense_shares and member_cards). No TRUNCATE
--    anywhere. members has SELECT only here
--    because its INSERT/UPDATE are column-level (see query 4).
select table_name, grantee, string_agg(privilege_type, ', ' order by privilege_type) as privileges
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee in ('anon', 'authenticated')
  and table_name in ('members', 'meetups', 'expenses', 'expense_shares', 'settlements',
                     'member_cards')
group by table_name, grantee
order by table_name, grantee;

-- 4. Column privileges on members. Expected: INSERT and UPDATE on name, color, sort_order
--    for authenticated, and nothing on user_id or is_admin.
select column_name, grantee, string_agg(privilege_type, ', ' order by privilege_type) as privileges
from information_schema.column_privileges
where table_schema = 'public'
  and table_name = 'members'
  and grantee in ('anon', 'authenticated')
  and privilege_type in ('INSERT', 'UPDATE')
group by column_name, grantee
order by column_name, grantee;

-- 5. Functions. Expected: 5 rows (delete_meetup and restore_meetup only after
--    migration_002_meetup_delete.sql, is_group_admin only after migration 003). is_group_member
--    and is_group_admin security_definer = true, all others false; anon_can_execute = false and authenticated_can_execute = true for all.
select p.proname as function_name,
       p.prosecdef as security_definer,
       has_function_privilege('anon', p.oid, 'execute') as anon_can_execute,
       has_function_privilege('authenticated', p.oid, 'execute') as authenticated_can_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('is_group_member', 'is_group_admin', 'save_expense', 'delete_meetup',
                    'restore_meetup')
order by p.proname;

-- 6. Members and their linked accounts. Expected: 4 rows, each with an email, and is_admin = true
--    only for the admin you chose.
select m.sort_order, m.name, u.email, m.is_admin
from public.members m
left join auth.users u on u.id = m.user_id
order by m.sort_order;

-- 7. The admin column. Expected: 1 row: boolean, is_nullable = NO, column_default = false.
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'members' and column_name = 'is_admin';

-- 8. Who may add members. Expected: 1 row whose with_check requires is_group_admin(), user_id IS
--    NULL and is_admin = false.
select policyname, cmd, with_check
from pg_policies
where schemaname = 'public' and tablename = 'members' and cmd = 'INSERT';

-- 9. The guard trigger. Expected: 1 row: members_guard, enabled = O.
--    (O means it fires normally. D would mean it is disabled.)
select t.tgname as trigger_name, t.tgenabled as enabled, p.proname as function_name
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace n on n.oid = c.relnamespace
join pg_proc p on p.oid = t.tgfoid
where n.nspname = 'public' and c.relname = 'members' and not t.tgisinternal;

-- 10. The member_cards columns. Expected: exactly id, member_id, label, card_number, created_at,
--     updated_at. There must never be a column for CVV, expiry date or PIN.
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'member_cards'
order by ordinal_position;

-- 11. The member_cards policies. Expected: 4 rows. SELECT uses is_group_member(). INSERT, UPDATE
--     and DELETE require m.user_id = auth.uid(); is_group_admin() must not appear in them.
select policyname, cmd, qual as using_expression, with_check
from pg_policies
where schemaname = 'public' and tablename = 'member_cards'
order by cmd;

-- 12. The member_cards constraints. Expected: the primary key, the member_id foreign key (ON
--     DELETE CASCADE), the label and card_number checks, and unique (member_id, card_number).
select conname as constraint_name, pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid = 'public.member_cards'::regclass
order by conname;
