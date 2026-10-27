-- Tallivo: create the four members and link each one to a login account.
--
-- TEMPLATE: replace every EMAIL_HERE with the email of that person's account
-- (Authentication → Users), then run the whole file in the SQL Editor.
-- Run schema.sql first, and create the four users before running this.
-- Safe to run again; it never creates duplicate members.

insert into public.members (name, sort_order)
values
  ('Əşrəf', 0),
  ('Ayxan', 1),
  ('Şahin', 2),
  ('Seyid', 3)
on conflict (name) do nothing;

-- If an email is misspelled, the subquery finds no user and user_id becomes NULL:
-- the check at the bottom shows that as an empty email.
update public.members set user_id = (select id from auth.users where email = 'EMAIL_HERE') where name = 'Əşrəf';
update public.members set user_id = (select id from auth.users where email = 'EMAIL_HERE') where name = 'Ayxan';
update public.members set user_id = (select id from auth.users where email = 'EMAIL_HERE') where name = 'Şahin';
update public.members set user_id = (select id from auth.users where email = 'EMAIL_HERE') where name = 'Seyid';

-- Check: every member should show an email.
select m.sort_order, m.name, u.email
from public.members m
left join auth.users u on u.id = m.user_id
order by m.sort_order;
