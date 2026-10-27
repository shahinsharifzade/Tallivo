-- Tallivo: read-only checks. Run in the SQL Editor after schema.sql and link_users.sql.
-- Nothing here changes data. Run the queries one at a time to see each result.

-- 1. All five tables exist and have Row Level Security enabled.
--    Expected: 5 rows, rls_enabled = true on every row.
select c.relname as table_name, c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relname in ('members', 'meetups', 'expenses', 'expense_shares', 'settlements')
order by c.relname;

-- 2. Policies. Expected: 16 rows, all for role {authenticated}.
--    select/insert/update on members, meetups, expenses, settlements;
--    select/insert/update/delete on expense_shares. No DELETE on the other four tables.
select tablename, policyname, cmd, roles
from pg_policies
where schemaname = 'public'
order by tablename, cmd;

-- 3. Table privileges for the API roles. Expected: no rows for anon; authenticated has
--    SELECT/INSERT/UPDATE (plus DELETE only on expense_shares). members has SELECT only here
--    because its INSERT/UPDATE are column-level (see query 4).
select table_name, grantee, string_agg(privilege_type, ', ' order by privilege_type) as privileges
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee in ('anon', 'authenticated')
  and table_name in ('members', 'meetups', 'expenses', 'expense_shares', 'settlements')
group by table_name, grantee
order by table_name, grantee;

-- 4. Column privileges on members. Expected: INSERT and UPDATE on name, color, sort_order
--    for authenticated, and nothing on user_id.
select column_name, grantee, string_agg(privilege_type, ', ' order by privilege_type) as privileges
from information_schema.column_privileges
where table_schema = 'public'
  and table_name = 'members'
  and grantee in ('anon', 'authenticated')
  and privilege_type in ('INSERT', 'UPDATE')
group by column_name, grantee
order by column_name, grantee;

-- 5. Functions. Expected: is_group_member security_definer = true, save_expense = false;
--    anon_can_execute = false and authenticated_can_execute = true for both.
select p.proname as function_name,
       p.prosecdef as security_definer,
       has_function_privilege('anon', p.oid, 'execute') as anon_can_execute,
       has_function_privilege('authenticated', p.oid, 'execute') as authenticated_can_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('is_group_member', 'save_expense')
order by p.proname;

-- 6. Members and their linked accounts. Expected: 4 rows, each with an email.
select m.sort_order, m.name, u.email
from public.members m
left join auth.users u on u.id = m.user_id
order by m.sort_order;
