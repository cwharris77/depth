# Phase C remainder — accounts, server-side overlays, share-by-reference

Date: 2026-07-07
Status: approved (design)
Roadmap: Phase C — Custom rosters, the pending "cross-device (Postgres + auth)" half
(see the depth vault `Roadmap.md`, `Decisions.md` 2026-07-03/2026-07-04, `Backlog.md`
"Durable roster sharing")

> **For agentic workers:** this spec makes every product/design decision. Implement it
> task-by-task (each task = one PR-sized unit with its own tests). Do not re-open the
> decisions; if a decision turns out to be unimplementable as written, stop and report
> rather than substituting your own design.

> **Superseded (sign-in mechanism only, 2026-07-15):** see the same note in
> [`2026-07-09-auth-account-and-user-settings-design.md`](2026-07-09-auth-account-and-user-settings-design.md)
> — magic-link `/auth/confirm` was replaced by a 6-digit code verified in-page. The
> override-sync/share-by-reference/RLS scope this doc covers is unaffected.

## Goal

A user can sign in, and their custom depth-chart edits sync across devices. A user can
share their edited roster **by reference** (a short link that keeps updating as they edit)
instead of the interim URL-encoded `?order=` blob. Opening someone else's shared board
never silently clobbers your own edits. Signed-out behavior stays exactly as it is today
(localStorage only).

## What already exists (read these files first)

- `lib/depth-overrides.ts` — the v0 overlay: `TeamDepthOverride = Partial<Record<Position,
  string[]>>` (position → user's ordered player ids), stored in localStorage under
  `depth:overrides` as `Record<teamId, TeamDepthOverride>`. `applyTeamOverride(roster,
  override)` is the pure function everything renders through. **This shape is the shipped
  semantics; the DB model must match it, not the other way around.**
- `lib/share.ts` — interim sharing: `?order=base64url(JSON(override))`, decoded
  defensively by `decodeDepthOrder` (malformed → null). `components/ApplySharedOrder.tsx`
  applies + persists it on arrival, then strips the param.
- `components/DepthChartField.tsx` — client component owning override state (`useState` +
  the localStorage helpers), the Share button, and the header (`team pill · search icon ·
  share icon`).
- `supabase/migrations/20260701170756_init_depth_schema.sql` — includes a stubbed
  `roster_overlays` table (`user_id, team_id, player_id, depth_rank`, unique
  `(user_id, team_id, player_id)`). **It is empty, was never wired, and its shape cannot
  represent the shipped ordered-array overlay** (no order past rank 3, no per-position
  arrays). It gets replaced (see Schema below).
- RLS is **disabled on every table** (flagged in vault `Schema.md`). Auth arriving means
  RLS must be designed in the same phase — that's part of this spec.
- `app/api/players/search/route.ts` — the repo's existing route-handler pattern; new
  server endpoints follow it.
- CI (`.github/workflows/`) runs `tsc --noEmit` + Vitest on PRs; live-DB tests skip
  gracefully without env (see `lib/__tests__/roster-source.db.test.ts` for the pattern).

## Verified platform facts (2026-07-07)

- Server-side auth uses **`@supabase/ssr`** (`@supabase/auth-helpers` is deprecated).
  Install `@supabase/ssr`; `@supabase/supabase-js` is already a dependency.
- This repo is **Next 16** — middleware is renamed **`proxy.ts`** (project root, exports
  `proxy(request)` + `config.matcher`). The Supabase session-refresh file goes there, NOT
  `middleware.ts`. Read `node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md`
  before writing it.
- Supabase legacy `anon` / `service_role` keys keep working until end of 2026; the repo
  uses them (`SUPABASE_URL`/`SUPABASE_ANON_KEY`). Keep those names. Add the two
  `NEXT_PUBLIC_`-prefixed vars (below) because the browser now needs a Supabase client
  for auth; the values are the same public-safe URL + anon key already in
  `.env.local.example`.

## Decisions (locked)

| Decision | Choice | Why |
|---|---|---|
| Auth method | **Email magic link** (Supabase `signInWithOtp`), no password, no OAuth in v1 | Zero external console setup (Google OAuth needs GCP config — a manual, non-codeable step). One input, one email, done. OAuth can be added later without schema changes. |
| Overlay table shape | **`depth_overrides(user_id, team_id, position, player_ids text[])`**, one row per (user, team, position) | 1:1 with the shipped `TeamDepthOverride` semantics. Replaces the stubbed `roster_overlays` (dropped — it's empty and can't represent ordered arrays). |
| Sync model | localStorage stays the always-on cache; signed in → every override write also PUTs to the server (fire-and-forget, last-write-wins); on sign-in, one-time merge (rules below) | Simple, offline-tolerant (the app is a PWA), no realtime machinery. |
| Merge on sign-in | Teams with a local override but no server rows → push local up. Teams with server rows → **server wins**, local replaced. Deterministic, no prompts. | The server copy is the durable, cross-device one; a prompt-per-team merge UI is not worth it for depth-chart orders. |
| Share model | **`shared_boards(slug, user_id, team_id)`** — a share is a *reference to the owner's live override for that team*, resolved at view time | Exactly what the Backlog asks: short links that update as the sender keeps editing. No snapshot copies to keep in sync. |
| Share link URL | `/team/[id]?board=<slug>` (same page, same pattern as `?player=`/`?order=`) | No new route; OG cards, static generation, and the field all keep working. |
| Viewing a shared board | **Preview mode, not auto-apply**: banner "Viewing {owner}'s custom depth chart" + buttons **Apply to my chart** / **Dismiss**. The `?board=` param is NOT stripped on arrival (the link stays shareable/refreshable); it is stripped when the viewer taps Apply or Dismiss. | Fixes the known v0 flaw where opening a shared link silently overwrites the recipient's own saved order. |
| Legacy `?order=` links | Keep working unchanged (ApplySharedOrder stays). The Share button now produces `?board=` links when signed in, `?order=` links when signed out. | Old links in the wild must not break; signed-out users still get the zero-infra share. |
| Owner display name | The share banner shows the owner's email local-part (before `@`) — there is no profile/username system in v1 | YAGNI; a `profiles` table is not needed for this feature. Stored denormalized on the share row (below) so viewing needs no auth-schema access. |
| RLS | Enabled on **all** tables in this phase (policies below) | Auth is the reason RLS was deferred; shipping auth without RLS would expose every user's overrides. |
| Sign-in entry points | (1) An **account row at the bottom of `NavSwitcher`'s idle view** ("Sign in — sync your custom depth charts" / signed in: email + "Sign out"), (2) a contextual one-line prompt inside the existing "Custom order · Reset all" chip row: "Sign in to keep this" (only when edits exist and signed out) | The nav is the app's primary surface (Decisions 2026-07-02); the contextual prompt converts exactly the users who have something to lose. No new header icon — the header is intentionally `pill · search · share`. |

## Schema (one migration: `supabase/migrations/<ts>_auth_overlays_and_shares.sql`)

```sql
-- The v0 stub never matched the shipped overlay semantics and holds no data.
drop table roster_overlays;

-- One row per (user, team, position): the user's ordered player ids at that position.
-- Mirrors lib/depth-overrides.ts TeamDepthOverride exactly.
create table depth_overrides (
  user_id uuid not null references auth.users(id) on delete cascade,
  team_id text not null references teams(id) on delete cascade,
  position text not null,
  player_ids text[] not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, team_id, position)
);

create table shared_boards (
  slug text primary key,                -- 10-char base62, crypto-random (lib/slug.ts)
  user_id uuid not null references auth.users(id) on delete cascade,
  team_id text not null references teams(id) on delete cascade,
  owner_name text not null,             -- denormalized email local-part at share time
  created_at timestamptz not null default now(),
  unique (user_id, team_id)             -- one live share per user per team
);

-- RLS: everything on, least privilege.
alter table teams enable row level security;
alter table players enable row level security;
alter table depth_chart_entries enable row level security;
alter table special_teams_slots enable row level security;
alter table uniforms enable row level security;
alter table ingestion_runs enable row level security;
alter table depth_overrides enable row level security;
alter table shared_boards enable row level security;

-- Base data: public read (the app reads with the anon key), writes only via the
-- service-role ingest (service role bypasses RLS — no write policies needed).
create policy "public read" on teams for select to anon, authenticated using (true);
create policy "public read" on players for select to anon, authenticated using (true);
create policy "public read" on depth_chart_entries for select to anon, authenticated using (true);
create policy "public read" on special_teams_slots for select to anon, authenticated using (true);
create policy "public read" on uniforms for select to anon, authenticated using (true);
-- ingestion_runs: no select policy — it's operational, nothing client-side reads it.

-- Overrides: owner-only, full CRUD.
create policy "own overrides" on depth_overrides
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Shares: anyone can resolve a slug; only the owner manages their shares.
create policy "public read" on shared_boards for select to anon, authenticated using (true);
create policy "own shares" on shared_boards
  for insert to authenticated with check (auth.uid() = user_id);
create policy "own shares delete" on shared_boards
  for delete to authenticated using (auth.uid() = user_id);
```

After the migration: `npm run db:types` and commit the regenerated
`lib/database.types.ts` in the same PR (see `docs/espn.md` "Generated types").

**RLS regression risk (important):** `dbRosterSource` reads with the anon key. Enabling
RLS without the public-read policies breaks every page. The migration above creates the
policies in the same transaction as `enable row level security`, so there is no window —
but the live-DB Vitest suite (`roster-source.db.test.ts`) must pass against a
`supabase db reset` local stack before this merges.

## Auth plumbing

**Files:**
- `lib/supabase/client.ts` — `createBrowserClient(NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY)` from `@supabase/ssr`. Singleton.
- `lib/supabase/server.ts` — `createServerClient(...)` reading/writing cookies via
  `next/headers` `cookies()`, per the current `@supabase/ssr` docs
  (https://supabase.com/docs/guides/auth/server-side/creating-a-client). Used by route
  handlers and server components.
- `proxy.ts` (project root) — session refresh: create a server client bound to
  request/response cookies, call `supabase.auth.getUser()`, return the response.
  `config.matcher` excludes `_next/static`, `_next/image`, icons, and `/api/players/search`
  (public). This is the Next-16 rename of the middleware pattern in the Supabase docs.
- `app/auth/confirm/route.ts` — magic-link landing: reads `token_hash` + `type` search
  params, calls `supabase.auth.verifyOtp({ type, token_hash })`, redirects to `next`
  param (default `/`). On error, redirect to `/?auth_error=1` (the account row shows
  "Sign-in link expired — try again" when it sees that param, then strips it).
- Env: add to `.env.local.example` (public-safe values, same as the existing ones):
  `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

**Sign-in UI (in `NavSwitcher` idle view, below the conference team browser):**
- Signed out: a single row — user icon (lucide `User`) + "Sign in" + subtitle "Sync your
  custom depth charts". Tapping expands an inline email input + "Send link" button
  (same visual language as the search input: dark field, `uiAccent` focus ring). After
  send: "Check your email — link sent to {email}". Errors: "Couldn't send — try again".
- Signed in: same row shows the email + a "Sign out" text button.
- No modal, no separate page. Keyboard: Enter submits.

**Manual step (flag in the PR description, not automatable):** in the Supabase dashboard,
set Auth → URL Configuration → Site URL to the production origin and add
`http://localhost:3000` to Additional Redirect URLs.

## Overlay sync

**Files:**
- `app/api/overrides/route.ts` — `GET` → all of the signed-in user's rows, shaped as
  `Record<teamId, TeamDepthOverride>`; `PUT` body `{ teamId, override: TeamDepthOverride }`
  → replace that team's rows in one transaction (delete team's rows, insert current
  positions; empty override = just delete). 401 when signed out. Uses the server client
  (RLS scopes rows to the user automatically).
- `lib/overrides-sync.ts` (client) — small module used by `DepthChartField`:
  - `pushTeamOverride(teamId, override)` — fire-and-forget `fetch PUT`; swallow network
    errors (localStorage already has the change; the next edit retries).
  - `mergeOnSignIn()` — runs once when auth state becomes signed-in (listen via
    `supabase.auth.onAuthStateChange`): `GET /api/overrides`; for each local team not on
    the server, `PUT` it up; for each server team, `setTeamOverride(teamId, serverValue)`
    locally (server wins). Guarded by an in-flight flag so it never runs concurrently.
- `components/DepthChartField.tsx` — after every existing localStorage write
  (`setPositionOrder`, `clearPositionOrder`, `clearTeamOverride`, `setTeamOverride`), if
  signed in, call `pushTeamOverride` with the team's new override. Auth state comes from a
  tiny `useUser()` hook (`lib/use-user.ts`, wraps `onAuthStateChange` + `getUser`).

**Tests (Vitest):**
- `lib/__tests__/overrides-sync.test.ts` — merge rules as a pure function: extract
  `planMerge(local, server) → { pushes: teamId[], pulls: Record<teamId, TeamDepthOverride> }`
  and test: local-only team → push; server-only team → pull; both → pull (server wins);
  empty both → no ops.
- Route handler: happy path + 401 signed-out, following the live-DB skip pattern.

## Share-by-reference

**Files:**
- `lib/slug.ts` — `newSlug(): string`, 10 chars from `[A-Za-z0-9]` via
  `crypto.getRandomValues`. Pure, tested (length, alphabet, uniqueness over 1k draws).
- `app/api/share/route.ts` — `POST` body `{ teamId }`: upsert the user's
  `shared_boards` row for that team (keep existing slug if present — links stay stable),
  `owner_name` = email local-part. Returns `{ slug }`. 401 signed out.
- `app/api/shares/[slug]/route.ts` — `GET`: resolve slug → `{ teamId, ownerName,
  override: TeamDepthOverride }` by joining `shared_boards` → `depth_overrides` for that
  (user, team). 404 unknown slug. Public (anon readable per RLS). (Named `shares`, not
  `boards` — the Phase-D spec introduces `/api/boards/*` for a different object.)
- `components/SharedBoardBanner.tsx` — client. When the page URL has `?board=<slug>`:
  fetch the board; if `teamId` mismatches the current page, link to the right team page;
  otherwise render a slim banner pinned above the field: "**{ownerName}'s** custom
  {TEAM} depth chart" + [Apply to my chart] [Dismiss]. While previewing, the field
  renders `applyTeamOverride(roster, sharedOverride)` **without persisting**. Apply →
  `setTeamOverride` + `pushTeamOverride` + strip the param. Dismiss → strip the param,
  local state untouched. Malformed/unknown slug → strip the param silently (same
  defensive posture as `decodeDepthOrder`).
- `components/DepthChartField.tsx` — Share button behavior: signed in → `POST /api/share`,
  share `origin + /team/{id}?board={slug}`; signed out → existing `rosterShareUrlPath`
  (`?order=`). Same native-share-sheet/clipboard affordance as today.
- Preview-mode plumbing: `DepthChartField` gets a `previewOverride: TeamDepthOverride |
  null` state; when non-null it takes precedence over the user's own override in the
  `applyTeamOverride` call, and reorder mode is disabled (view-only until Apply).

**UX states:**

| State | What the user sees |
|---|---|
| Open own share link | Banner still shows (you're "previewing" your own board) — acceptable, no special case |
| Unknown/deleted slug | Param stripped, normal page, no banner, no error toast |
| Shared link, owner has since cleared all edits | Board resolves with empty override → field shows default order + banner; Apply clears the viewer's override for that team (consistent: "apply what I see") |
| Signed-out viewer taps Apply | Works — Apply writes localStorage only (no account needed to receive) |

**Tests:** slug purity; `planMerge` (above); banner logic extracted pure where possible
(`resolveBoardParam(searchParams, fetched) → 'preview' | 'strip' | 'redirect'`); live-DB
route tests with the skip pattern.

## Task/PR breakdown (implement in order)

1. **PR1 — migration + types + RLS.** The SQL above (fix the `user_id uuid` callout),
   `npm run db:types`, and green live-DB suite against a reset local stack. No app code.
2. **PR2 — auth plumbing + sign-in UI.** `@supabase/ssr` dep, `lib/supabase/*`,
   `proxy.ts`, `app/auth/confirm/route.ts`, `lib/use-user.ts`, NavSwitcher account row +
   contextual chip prompt. Deliverable: sign in / sign out works locally end-to-end.
3. **PR3 — overlay sync.** `/api/overrides`, `lib/overrides-sync.ts`, DepthChartField
   write-through + merge-on-sign-in. Deliverable: edit on device A, see it on device B.
4. **PR4 — share-by-reference.** `lib/slug.ts`, `/api/share`, `/api/boards/[slug]`,
   `SharedBoardBanner`, Share button switch. Deliverable: shared link previews without
   clobbering, Apply persists, link updates as the owner keeps editing.

Each PR: `tsc --noEmit`, `npm run test`, and an in-browser verification at 390px + 1280px
noted in the PR body. Squash-merge (repo convention).

## Out of scope (explicitly)

- OAuth providers (Google/Apple) — additive later; nothing here blocks them.
- Profiles/usernames, avatars, multiple named boards per team (that's Phase D's saved
  boards), board discovery/browse.
- Realtime sync (websockets) — last-write-wins fire-and-forget is the whole model.
- Backlog UX refinements shipped separately: reorder-mode-exits-after-move fix and a
  global edit toggle are independent of auth and stay in the Backlog.
