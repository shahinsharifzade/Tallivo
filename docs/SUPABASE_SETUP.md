# Supabase setup

One-time setup of the shared database for the four friends. You do everything in the Supabase
dashboard; menu names may differ slightly from what is written here.

The app only ever uses the project URL and the **publishable** key. Never put any other key in
`.env`, Netlify, or the code.

1. **Create the tables.** Open **SQL Editor → New query**, paste all of
   [`supabase/schema.sql`](../supabase/schema.sql) and click **Run**. Then do the same with
   [`supabase/migration_002_meetup_delete.sql`](../supabase/migration_002_meetup_delete.sql)
   (deleting/restoring a meetup together with its expenses). Both are safe to run again later;
   they do not delete data.

2. **Create the four users.** Go to **Authentication → Users → Add user → Create new user**. For
   each person, enter their email and a password and tick **Auto Confirm User**. Give each person
   their password privately.

3. **Turn off sign-ups.** Go to **Authentication → Sign In / Providers** (sometimes under
   **Authentication → Settings**) and switch off **Allow new users to sign up**. Save. From now
   on nobody else can create an account, and only you can add users from the dashboard.

4. **Link users to members.** Open [`supabase/link_users.sql`](../supabase/link_users.sql),
   replace each `EMAIL_HERE` with that person's email, paste it into a new SQL Editor query and
   run it. The table at the end must show an email next to all four names. If one is empty, fix
   the email and run the file again.

5. **Run the admin and cards migration.** Paste all of
   [`supabase/migration_003_admin_and_cards.sql`](../supabase/migration_003_admin_and_cards.sql)
   into a new query and click **Run**. Then choose the admin: copy the `update` statement near the end
   of the file into a new query, replace `EMAIL_HERE`
   with the admin's login email (in the query only, do not save it in the file) and run it,
   followed by the check query below it. Exactly one name should show `is_admin = true`. Only the
   SQL Editor can change who is admin; to move the role, set it to `false` on the old row and
   `true` on the new one.

6. **Verify.** Paste [`supabase/verify.sql`](../supabase/verify.sql) into a new query and run
   the queries one at a time. Each one has a comment saying what you should see.

7. **Safety check: no access without login.** In a terminal in the project folder, run:

   ```bash
   set -a; source .env; set +a
   curl -s "$VITE_SUPABASE_URL/rest/v1/members?select=*" -H "apikey: $VITE_SUPABASE_PUBLISHABLE_KEY"
   curl -s "$VITE_SUPABASE_URL/rest/v1/member_cards?select=*" -H "apikey: $VITE_SUPABASE_PUBLISHABLE_KEY"
   ```

   Each result must be an error such as `permission denied for table members`, or `[]`. If you
   see any member names or card numbers, **stop** and do not use the app yet: re-run `schema.sql`,
   then the migrations (step 5 again for 003), then step 6.
   (The commands read the values from `.env` without printing them.)

8. **Run the app.** Make sure `.env` contains `VITE_SUPABASE_URL` and
   `VITE_SUPABASE_PUBLISHABLE_KEY` (see `.env.example`), then run `npm run dev`, open
   <http://localhost:5173> and sign in with one of the four accounts.

## Updating an existing database

If you already ran `schema.sql` earlier, only run the migration files you have not run yet, in
order, in the SQL Editor:

- `supabase/migration_002_meetup_delete.sql`: without it, deleting or restoring a meetup in
  the app fails with "Server bu əməliyyat üçün hazır deyil".
- `supabase/migration_003_admin_and_cards.sql`: admin-only member changes and payment cards. After
  running it, choose the admin as described in step 5. Until someone is admin, nobody can rename
  or add members from the app.

**If you run `schema.sql` again, run migration 003 again right after it.** `schema.sql` restores
the older policy that lets any group member add members. The admin flag itself is kept.

## Adding or changing people later

- New person: create the user (step 2), then add a member in the app (as the admin) or in SQL, and link it
  with
  an `update public.members set user_id = ...` line as in `link_users.sql`. Only the SQL Editor
  can link accounts; the app cannot change `user_id`.
- Forgotten password: there is no reset or change in the app. In **Authentication → Users**, open the user
  and set a new password (or send a recovery email).
- Removing someone's access: set their member's `user_id` to `null` in SQL, or delete the user in
  **Authentication → Users** (the member row and their expenses stay).
