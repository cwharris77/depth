# Phase C — accounts + per-user settings (opt-in, account-gated)

Date: 2026-07-09
Status: approved (Cooper, 2026-07-09)
Roadmap: Phase C — the "cross-device (Postgres + auth)" half. Scopes the *first* auth
pass narrower than [`2026-07-07-phase-c-auth-and-saved-boards-design.md`](2026-07-07-phase-c-auth-and-saved-boards-design.md):
ship the account system + per-user settings (last-viewed + favorite team) **before**
depth-override sync and share-by-reference. Those two remain covered by the Phase C
spec and land in a later pass (see "Deferred" below).

> **For agentic workers:** this spec makes every product/design decision for this pass.
> Implement task-by-task. Do not re-open decisions; if one is unimplementable as
> written, stop and report.

## Goal

A visitor can **opt in** by creating an account (email magic link). Signed in, the app
remembers their **last-viewed team** and an optional **favorite team**, and opens to the
favorite (else last-viewed) on startup — synced across devices. **Signed out, we persist
nothing about them**: no account, no data. The existing localStorage `depth:my-team`
key is retired.

## Revisions made during build (2026-07-09, Cooper)

The design was refined while implementing. These override the corresponding decisions below:

- **Sign-in lives in the nav drawer + a dedicated page**, not inline in `NavSwitcher`.
  The `NavDrawer` (hamburger, off the logo) gets an account item at the bottom labeled
  "Sign in" / "Account" that links to a new **`/signin` page** (`app/signin/page.tsx` +
  `components/AccountView.tsx`). The sign-in form and the favorite control both live on
  that page — no inline form or contextual toggle in the switcher.
- **The logo is a shared component.** The header's inline mark moved to `components/Logo.tsx`
  (identical geometry — it is the brand mark, do not alter). `/signin` shows it large and
  centered above the heading; the header renders it small as before.
- **Favorite is a dropdown + a startup toggle.** The account view has a native `<select>`
  of all 32 teams (default "No favorite") and a **`start_on_favorite`** switch — "Open this
  team when I start the app" — that appears once a favorite is set and defaults on. This
  adds a column: migration `20260709130000_user_settings_start_on_favorite.sql`
  (`start_on_favorite boolean not null default true`). `resolveStartupTeam` opens the
  favorite only when the toggle is on. (Favorite-at-startup as an onboarding step is later.)
- **Auth = magic link only.** Password login was considered and dropped (Cooper: "just do a
  magic link, doesn't need to be super robust").
- **`/auth/confirm` handles both link styles.** It exchanges a PKCE `code`
  (`exchangeCodeForSession`, the default Supabase email template) and falls back to
  `token_hash` + `type` (`verifyOtp`). Errors redirect to `/signin?auth_error=1`.
- **Local redirect allow-list.** `supabase/config.toml` `site_url` +
  `additional_redirect_urls` now permit `http://localhost:3000/**` and `127.0.0.1` so the
  magic link lands on `/auth/confirm`. Prod mirrors this in the dashboard.

## The product change vs. the Phase C spec (read this)

The Phase C spec keeps **localStorage always-on** as an offline cache; auth merely syncs.
Cooper's call for this app inverts that: **persistence is account-gated**. No account →
no stored data, stated plainly to the user. This is a deliberate override of the Phase C
spec's "localStorage stays the always-on cache" decision, for the last-viewed/favorite
surface. (Depth-override localStorage is untouched *this* pass — see Deferred.)

## What already exists (read first)

- `app/page.tsx` — home route. Server-renders `DEFAULT_TEAM_ID`'s chart statically (no
  redirect hop, depth#79), then `components/HomeTeamSwap.tsx` swaps client-side to the
  visitor's saved team from localStorage.
- `lib/my-team.ts` — the 5a localStorage helper (`depth:my-team`). **Retired by this
  spec.** `components/RememberTeam.tsx` (on `/team/[id]`) and `HomeTeamSwap` are its
  callers and get rewired to the server settings.
- `app/team/[id]/page.tsx` — records "my team" via `RememberTeam`.
- `components/NavSwitcher.tsx` — the app's primary nav surface; the sign-in row lives in
  its idle view (Phase C spec's decision, unchanged).
- `lib/roster-source.db.ts` — reads with the anon key. RLS on existing tables would break
  it without public-read policies; see RLS note below.
- `app/api/players/search/route.ts` — the route-handler pattern new endpoints follow.

## Verified platform facts

Same as the Phase C spec §"Verified platform facts": `@supabase/ssr` (not the deprecated
auth-helpers); Next 16 middleware is **`proxy.ts`** (read
`node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md` first); legacy
anon/service_role keys keep working through end of 2026. Browser needs a Supabase client
now, so add `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` (same public-safe
values already in `.env.local.example`).

## Decisions (locked)

| Decision | Choice | Why |
|---|---|---|
| Auth method | **Email magic link** (`signInWithOtp`), no password, no OAuth v1 | Zero external console setup; OAuth is additive later. Matches Phase C spec. |
| Persistence model | **Account-gated.** Signed out = nothing stored. | Cooper's product call; clean "no account, no data" promise. |
| Settings table | **`user_settings(user_id pk, favorite_team_id, last_team_id, updated_at)`** | One row per user; both settings are nullable team refs. |
| Startup team | Precedence **favorite → last-viewed → default**. | "Show my favorite on startup"; last-viewed is the fallback for users who haven't set a favorite. |
| Home route for signed-in | `/` reads the session server-side, resolves the target team, and redirects to `/team/<id>`. Signed-out keeps the static default render. | Only signed-in users pay a redirect; the common (signed-out) path keeps the depth#79 no-hop win. |
| RLS scope | Enable RLS **only on `user_settings`** (with its owner-only policy in the same migration). Existing 6 tables stay RLS-off. | The full RLS rollout in the Phase C spec bundles public-read policies for the base tables; adding them belongs with override-sync, not here. Enabling RLS on base tables now — without those policies — would break every anon read (invariant 10). |
| Sign-in entry point | A single account row at the bottom of `NavSwitcher`'s idle view. Signed out: "Sign in — sync your teams & settings". Signed in: email local-part + "Sign out". Favorite-team control lives in the same account area. | No new header icon (header stays `pill · search · share`). |
| Favorite-team control | A "Set as favorite" affordance on the account row's current context (star toggle keyed to the team the user is viewing) — minimal; full settings UI is later. | YAGNI for a two-field settings surface. |

## Schema (one migration: `supabase/migrations/<ts>_user_settings.sql`)

```sql
create table user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  favorite_team_id text references teams(id) on delete set null,
  last_team_id text references teams(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table user_settings enable row level security;

create policy "own settings" on user_settings
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

After the migration: `npm run db:types` (reads *local* Postgres) and commit the
regenerated `lib/database.types.ts` in the same PR. No `Pick<>` row types in
`roster-source.db.ts` change (that reader doesn't touch this table).

## Auth plumbing (from Phase C spec §"Auth plumbing")

- `lib/supabase/client.ts` — `createBrowserClient(...)`, singleton.
- `lib/supabase/server.ts` — `createServerClient(...)` reading/writing cookies via
  `next/headers`.
- `proxy.ts` (root) — session refresh; `config.matcher` excludes `_next/static`,
  `_next/image`, icons, `/api/players/search`.
- `app/auth/confirm/route.ts` — verifies `token_hash` + `type`, redirects to `next`
  (default `/`); on error → `/?auth_error=1`.
- `lib/use-user.ts` — `useUser()` hook wrapping `getUser` + `onAuthStateChange`.
- `.env.local.example` — add the two `NEXT_PUBLIC_` vars.
- **Manual, non-codeable (flag in PR):** Supabase dashboard → Auth → URL Configuration:
  Site URL = prod origin; add `http://localhost:3000` to Additional Redirect URLs.

## Settings read/write

- `app/api/settings/route.ts` — `GET` → the signed-in user's `user_settings` row (or an
  empty default); `PUT` body `{ favoriteTeamId?, lastTeamId? }` → upsert the row (partial:
  only provided fields change). 401 signed out. Server client (RLS scopes to the user).
- `components/RememberTeam.tsx` — on `/team/[id]`, if signed in, `PUT { lastTeamId }`
  (fire-and-forget). Signed out: no-op (was localStorage; now nothing).
- Home route: `app/page.tsx` becomes a thin server component that, when a session exists,
  reads settings server-side and `redirect()`s to `/team/<favorite ?? last ?? default>`;
  no session → render the default chart as today. `HomeTeamSwap` (localStorage swap) is
  removed.
- `lib/home-team.ts` — pure `resolveStartupTeam(settings, validIds, defaultId)`:
  favorite if valid, else last if valid, else default. Guards stale ids (team removed).

## Tests (Vitest)

- `lib/__tests__/home-team.test.ts` — `resolveStartupTeam`: favorite wins; favorite unset
  → last; both unset → default; stale favorite id → falls through to last/default; stale
  last id → default.
- `app/api/settings` route: happy-path GET/PUT + 401 signed-out, using the live-DB skip
  pattern (`lib/__tests__/roster-source.db.test.ts`).
- Delete `lib/__tests__/my-team.test.ts` with `lib/my-team.ts`.

## Task/PR breakdown

1. **PR1 — migration + types + RLS + this spec.** The SQL above, `npm run db:types`,
   green live-DB suite against a `supabase db reset` local stack, spec + index row. No
   app code.
2. **PR2 — auth plumbing + settings wiring.** `@supabase/ssr` dep, `lib/supabase/*`,
   `proxy.ts`, `app/auth/confirm/route.ts`, `lib/use-user.ts`, `app/api/settings/route.ts`,
   NavSwitcher account row + favorite toggle, home-route + RememberTeam rewire, retire
   `lib/my-team.ts` + `HomeTeamSwap`. Deliverable: sign in → set favorite → reopen app
   on another device → lands on favorite; sign out → nothing persisted.

Each PR: `tsc --noEmit`, `npm run test`, in-browser verification at 390px + 1280px in the
body. Squash-merge.

## Deferred (explicitly, to a later pass — covered by the Phase C spec)

- **Depth-override sync** (`depth_overrides` table, `/api/overrides`, write-through +
  merge-on-sign-in). Until then, custom drag-reorder stays on its existing localStorage
  (`depth:overrides`) — **not** removed this pass, so the shipped feature keeps working.
  Account-gating custom order happens when its server sync ships.
- **Share-by-reference** (`shared_boards`, `?board=` preview banner). The interim
  `?order=` URL share stays as-is.
- **Full RLS rollout** on the base tables (with public-read policies) — rides with
  override-sync, per the Phase C spec's migration.
- Profiles/usernames, OAuth providers, multiple named boards.
