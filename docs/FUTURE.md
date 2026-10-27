# Future work (not implemented)

The shared Supabase backend with sign-in is built (see [SUPABASE_SETUP.md](SUPABASE_SETUP.md)
and the `supabase/` folder). These are the remaining ideas, roughly in order of usefulness.

## 1. Keep-alive against free-tier pausing

Supabase pauses free-tier projects after about one week without activity. A paused project must
be restored from the dashboard before the app works again; until then the app shows
"Serverə qoşulmaq alınmadı". That is confusing when the group has not met for a while.

Options, simplest first:

- Open the app at least once a week.
- A scheduled ping, e.g. a GitHub Actions cron (`0 9 */3 * *`) that runs
  `curl "$SUPABASE_URL/rest/v1/" -H "apikey: $SUPABASE_PUBLISHABLE_KEY"` with both values stored
  as repository secrets. Any request to the API counts as activity; it needs no login and reads
  no data.
- A paid plan, which does not pause.

Keep regular JSON exports (**Ayarlar → JSON ixrac et**) as a backup either way.

## 2. Realtime updates

Today the app reloads all data after each write and whenever the tab becomes visible again, so
a friend's new expense appears when you come back to the app, not while you are looking at it.

- Enable Realtime for the five tables (Database → Publications → `supabase_realtime`).
- In `AppDataProvider`, subscribe with `client.channel('tallivo').on('postgres_changes', …)` for
  each table and call the existing `reload()` (debounced, e.g. 300 ms) on any change. RLS also
  applies to Realtime, so only group members receive events.
- Unsubscribe on sign-out (the provider unmounts then).

## 3. Monthly summary

A screen (or a section in **Ümumi**) per calendar month: total spent, spent per person, number
of meetups, and the balance change during that month.

- Pure functions in `src/domain` over the existing `Expense` / `Settlement` arrays, filtered by
  `meetup.date` / `settlement.date` (both `YYYY-MM-DD`), so no database change is needed.
- Check the numbers on `/debug` with a small reference scenario, like the existing checks.

## Smaller ideas

- **Offline queue:** today a write without connection fails with a message and the form keeps
  its input. Queuing writes and sending them later would need conflict handling; probably not
  worth it for four people.
- **Edit history:** `created_by` is already stored on expenses and settlements; showing "added
  by X" in **Tarixçə** is a small UI change (map `created_by` to `members.user_id`).
- **Import into shared mode:** JSON import is disabled in shared mode on purpose (it would
  replace everyone's data). If ever needed, write it as one SQL function so it is all-or-nothing.
