# Tallivo

_Hesab bərabər._ A small shared expense tracker for a fixed group of friends. Every expense belongs
to a meetup ("hangout"). The app shows who owes whom for a single meetup and across all meetups
combined, with support for uneven splits and recorded repayments.

It runs in one of two modes:

- **Shared mode (Supabase):** the four friends sign in and see the same data, stored in a
  Supabase Postgres database. Only invited, linked accounts can read or write anything.
- **Local mode:** no backend and no network access; data stays in this browser's
  `localStorage`. Useful for development and for trying the app out.

See [docs/SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md) for the one-time database setup and
[docs/FUTURE.md](docs/FUTURE.md) for ideas not built yet.

## Install and run

Requires Node.js 18+ and npm.

```bash
npm install
npm run dev        # http://localhost:5173
```

Other scripts:

| Command             | What it does                       |
| ------------------- | ---------------------------------- |
| `npm run build`     | Type-check and build to `dist/`    |
| `npm run preview`   | Serve the production build locally |
| `npm run typecheck` | `tsc --noEmit`                     |
| `npm run lint`      | ESLint                             |
| `npm run format`    | Prettier                           |

To open the app on a phone in the same Wi-Fi, run `npm run dev -- --host` and open the printed
network address. In local mode each browser/device has its own separate data.

## Local mode vs shared mode

The mode is chosen at startup from two environment variables (see `.env.example`):

| Variable                        | Value                                              |
| ------------------------------- | -------------------------------------------------- |
| `VITE_SUPABASE_URL`             | Project URL, e.g. `https://<project>.supabase.co`  |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | The project's **publishable** key (safe to expose) |

- **Both set → shared mode.** The app shows a sign-in screen first and loads nothing until a
  linked account is signed in. Put the values in a local `.env` file (never committed) and
  follow [docs/SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md) once to create the database.
- **Either missing → local mode.** For local mode while `.env` exists, override them:
  `VITE_SUPABASE_URL= npm run dev`.

**Ayarlar** shows the current mode as a badge. In shared mode it also shows who is signed in
and a sign-out button. Members can be renamed, recolored and added but not deleted, there is no
"delete everything", and JSON import is hidden (export still works).

Never put any other Supabase key (secret / `service_role`) in `.env`, the host, or the code:
everything in a `VITE_` variable ends up in the public JavaScript bundle. Access control is
enforced in the database by Row Level Security.

## Deploy

The app is a static site: `npm run build` writes everything to `dist/`. For shared mode, set
`VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` as environment variables in the host
(Cloudflare: **Settings → Variables and Secrets**; Netlify: **Site configuration → Environment
variables**). Vite reads them at **build** time, so redeploy after changing them. Without them the
deployed site runs in local mode. `public/_redirects` (copied into `dist/`) contains `/* /index.html 200`, so deep
links such as `/meetups` still load after a refresh. `public/manifest.webmanifest` and
`public/icons/` make "Add to Home Screen" install it as a standalone app.

### Cloudflare Pages

1. Push the repo to GitHub/GitLab.
2. Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git**, pick the repo.
3. Build settings:

   | Setting                | Value           |
   | ---------------------- | --------------- |
   | Framework preset       | None (or Vite)  |
   | Build command          | `npm run build` |
   | Build output directory | `dist`          |
   | Root directory         | _(empty)_       |

4. **Save and Deploy**.

Cloudflare Pages already serves `index.html` for unknown paths when the site has no `404.html`.
It may log that the `/* /index.html 200` rule in `_redirects` is an infinite loop and ignore it;
that is harmless, deep links still work.

### Netlify

1. Push the repo to GitHub/GitLab.
2. Netlify → **Add new site → Import an existing project**, pick the repo.
3. Build settings:

   | Setting           | Value           |
   | ----------------- | --------------- |
   | Base directory    | _(empty)_       |
   | Build command     | `npm run build` |
   | Publish directory | `dist`          |

4. **Deploy**.

Netlify reads `dist/_redirects` for the SPA fallback. To deploy without Git, run `npm run build`
and drag the `dist` folder onto **Sites → Add new site → Deploy manually**.

Both hosts use a recent Node.js by default; if a build fails on the Node version, set the
`NODE_VERSION` environment variable to `20`.

## Project structure

```
src/
├─ domain/          Pure TypeScript business logic (no React)
│  ├─ types.ts        Member, Meetup, Expense, ExpenseShare, Settlement, Balances, Transfer
│  ├─ money.ts        parseMoney / formatMoney (integer qəpik, never floats)
│  ├─ split.ts        splitEqually
│  ├─ validation.ts   validateExpense, validateSettlement, validateMemberName, ...
│  ├─ balances.ts     computeBalances, computeBalancesForMeetup
│  ├─ simplify.ts     simplifyDebts (greedy), applyTransfers
│  └─ selectors.ts    totals per group / member, participants
├─ data/            Persistence
│  ├─ repository.ts   Repository interface + Snapshot type (the DB seam)
│  ├─ localStorageRepository.ts   Local mode (key "tallivo:v1")
│  ├─ supabaseRepository.ts       Shared mode (row/error mapping, RPC calls)
│  ├─ supabaseClient.ts           Creates the client from the two VITE_ variables
│  ├─ snapshot.ts     Validation + schema migration for stored data and imported JSON
│  └─ seed.ts         Default members on first run
├─ state/           React Context: AppDataProvider, actions (use cases), read hooks, backend
├─ components/      Shared UI (layout, tab bar, chips, lists, dialog, inputs), AuthGate,
│                   DataRoot (local vs. signed-in Supabase)
├─ pages/           Screens (Overview, Meetups, MeetupDetail, ExpenseForm, Payment,
│                   History, Settings, Login) and the dev-only /debug page
├─ i18n/az.ts       All user-facing text (Azerbaijani)
└─ lib/             Small helpers (ids, dates, formatting, file download)
supabase/           SQL to run in the Supabase SQL Editor (schema, migrations, checks)
```

Dependency direction: `pages/components → state → data → domain`. Components never touch
`localStorage` and never calculate balances themselves; they read results from hooks in
`src/state/hooks.ts`, which call `src/domain`. `src/main.tsx` is the only place that picks the
storage implementation.

Runtime dependencies: `react`, `react-dom`, `react-router-dom`, `@supabase/supabase-js` (shared
mode only talks to the configured Supabase project), and `@fontsource/inter` (a locally bundled
font with Latin Extended glyphs such as Ə/ə, so names render correctly without loading anything
from the internet).

## How the balance logic works

All money is stored as whole **qəpik** (1 AZN = 100 qəpik), so there are no rounding errors.

**Expenses.** An expense has a total, one payer and a list of _shares_: who took part and how much
of the total is theirs. The shares always add up exactly to the total. Anyone not in the shares
did not take part and owes nothing for that expense. The payer does not have to be a participant.

**Balances.** Each person's balance answers: "how much does the group owe me?"

- For every expense, the payer gets **+total** (they put money in) and every participant gets
  **−their share** (they consumed that much).
- For every repayment "A pays B x", A gets **+x** (A paid back) and B gets **−x** (B received
  money they were owed).
- Positive = the group owes you (shown green, "almalıdır"). Negative = you owe the group (red,
  "borcludur"). All balances always add up to exactly 0.

Example: at "Coffee" Şahin paid 30.00 and had 7.00. Şahin's balance from it is +30.00 − 7.00 =
+23.00. Ayxan had 12.00, so Ayxan is −12.00.

**Per meetup vs overall.** The meetup screen uses only that meetup's expenses (repayments are not
tied to a meetup, so they are not included there). The overview combines every meetup and every
repayment. Because each expense remembers exactly who took part, someone who was not at a meetup
is never charged for it.

**Who pays whom.** The balances are turned into a short list of payments: repeatedly, the person
who owes the most pays the person who is owed the most, as much as possible, until everyone is at 0. With n people this needs at most n − 1 payments (3 for 4 friends). Ties are broken by member
order, so the result is always the same for the same data. Tapping "Qeyd et" next to a suggested
payment opens the payment form prefilled.

**Equal split.** Each person gets the total divided by the number of participants, rounded down
to whole qəpik. Leftover qəpik go one each to participants in member order. E.g. 10.00 ₼ for
three people → 3.34, 3.33, 3.33.

**Deleting.** Nothing is really deleted. Deleted meetups, expenses and payments are hidden and
ignored in all calculations, but they stay in History and can be restored. Deleting a meetup also
hides its expenses; restoring it brings them back.

## Checking the numbers

### Quick check: `/debug`

Run `npm run dev` and open <http://localhost:5173/debug>. The page loads the reference scenario
into memory (nothing is saved), runs the domain functions and lists every computed value next to
the expected one with **OK** / **MISMATCH**. The banner at the top must be green. The page only
exists in development (`npm run dev`), not in production builds.

### Full check through the real UI

Do this in **local mode**, so the test data does not end up in the shared database. Start from
empty data: **Ayarlar → Hamısını sil → confirm** (or use a fresh browser profile). The members
are Əşrəf, Ayxan, Şahin, Seyid in that order.

Add the three meetups. For each one: **Görüşlər → Yeni görüş**, type the name, **Görüşü yarat**,
then **Xərc əlavə et** and fill in the expense:

1. **Garden**
   - Nə üçün: `Garden`, Ümumi məbləğ: `30`
   - Kim ödədi: **Ayxan**
   - Kimlər iştirak etdi: tap **Əşrəf** to deselect it (Ayxan, Şahin, Seyid stay selected)
   - Bölgü: **Fərdi məbləğlər**. Ayxan `10`, Şahin `10`, Seyid `10`
   - **Yadda saxla**
2. **PlayStation**
   - Nə üçün: `PlayStation`, Ümumi məbləğ: `20`
   - Kim ödədi: **Şahin**
   - Kimlər iştirak etdi: deselect **Seyid**
   - Bölgü: **Fərdi məbləğlər**. Əşrəf `6.66`, Ayxan `6.67`, Şahin `6.67`
   - **Yadda saxla**
3. **Coffee**
   - Nə üçün: `Coffee`, Ümumi məbləğ: `30`
   - Kim ödədi: **Şahin**
   - Kimlər iştirak etdi: deselect **Seyid**
   - Bölgü: **Fərdi məbləğlər**. Əşrəf `11`, Ayxan `12`, Şahin `7`
   - The indicator must read "Bölünüb: 30.00 ₼ / 30.00 ₼" before **Yadda saxla** becomes active.

(Explicit shares are used so the numbers do not depend on who receives a leftover qəpik.)

Now check:

| Where                                   | Expected                                                                                                      |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Coffee** meetup screen, balance       | Şahin 23.00 ₼ almalıdır · Ayxan 12.00 ₼ borcludur · Əşrəf 11.00 ₼ borcludur · Seyid not listed (0)            |
| **Coffee** meetup screen, who pays whom | Ayxan → Şahin 12.00 ₼ · Əşrəf → Şahin 11.00 ₼                                                                 |
| **Ümumi** (overview), total             | 80.00 ₼                                                                                                       |
| **Ümumi**, balances                     | Şahin 26.33 ₼ almalıdır · Ayxan 1.33 ₼ almalıdır · Seyid 10.00 ₼ borcludur · Əşrəf 17.66 ₼ borcludur          |
| **Ümumi**, who pays whom                | At most 3 rows that settle everyone. Currently: Əşrəf → Şahin 17.66 · Seyid → Şahin 8.67 · Seyid → Ayxan 1.33 |

Then record the repayment: **Ümumi → Ödəniş qeyd et**, Kim ödədi: **Əşrəf**, Kimə ödədi:
**Şahin**, Məbləğ `10`, **Ödənişi yadda saxla**. The overview must now show **Şahin 16.33 ₼
almalıdır** and **Əşrəf 7.66 ₼ borcludur** (Ayxan +1.33 and Seyid −10.00 unchanged).

Optional: in **Tarixçə**, delete that payment. Şahin goes back to 26.33 ₼. **Bərpa et** restores
it.

## Backups

**Shared mode:** data lives in the Supabase database; nothing is ever hard-deleted from the app.
**Ayarlar → JSON ixrac et** downloads a copy of everything (same format as local mode). Do this
now and then, especially because free Supabase projects pause when unused (see
[docs/FUTURE.md](docs/FUTURE.md)).

**Local mode:** data lives only in this browser's `localStorage`, which can be cleared by the browser or the user.
Use **Ayarlar → JSON ixrac et** regularly. **JSON idxal et** validates the file completely
(structure, amounts, shares summing to totals, references) and only then replaces all current
data. If stored data is ever unreadable, the app starts empty and keeps the unreadable copy under
a `tallivo:v1:corrupt:<timestamp>` localStorage key instead of throwing it away.
