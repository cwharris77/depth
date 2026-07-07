# Phase D — historical seasons, cross-team moves, saved boards

Date: 2026-07-07
Status: approved (design)
Roadmap: Phase D — "Cross-team moves + saved teams; 'my all-time Seahawks'"
Depends on: Phase C spec (`2026-07-07-phase-c-auth-and-saved-boards-design.md` — auth,
`depth_overrides`, RLS) and the nflverse scaffolding spec
(`2026-07-07-nflverse-ingestion-and-player-stats-design.md` — `lib/nflverse/*`,
`player_stats`). **Do not start D before both have shipped.**

> **For agentic workers:** every product decision is made below, including the depth-rank
> heuristic for historical rosters and the exact board data model. Implement as written.

## Goal

Two user-visible features:

1. **D1 — Team through time.** Pick any season 1999–present on a team page and see that
   team's roster on the field ("the 2013 Seahawks").
2. **D2 — Boards.** Save a named, durable depth chart ("My all-time Seahawks"), add
   players **from any team and any season** to it, reorder it, and share it by link.

## Part D1 — historical rosters

### Source facts (verified 2026-07-07)

- `https://github.com/nflverse/nflverse-data/releases/download/rosters/roster_<YYYY>.csv`,
  seasons 1920–2025. Columns used: `season, team, position, depth_chart_position,
  jersey_number, status, full_name, birth_date, height, weight, college, gsis_id,
  espn_id, headshot_url, years_exp`.
- `team` is the nflverse abbreviation (e.g. `SEA`, `LA`, `WAS`); map to our slug ids via
  our existing `teams.abbrev` (one alias already known: our `WAS` = ESPN `WSH`; nflverse
  uses `WAS`, `LA` for the Rams, `LAC`, `KC`, etc. — build the map from `teams.abbrev`
  and hard-code the exceptions the ingest discovers; log any unmapped abbrev and skip it,
  never guess).
- Historical rosters have **no depth order** — rank is derived (heuristic below).

### Decisions (locked)

| Decision | Choice | Why |
|---|---|---|
| Season range | **1999–present** | 1999 is where `stats_player_reg_` starts; the depth heuristic needs stats. Pre-1999 would render alphabetical mush — cut honestly rather than ship garbage. |
| Player identity | Historical rows keyed by `gsis_id` + season; **no FK to `players`** (most aren't current). Store `espn_id` when present for card photos. | The two id spaces stay cleanly separated; boards bridge them with typed refs (D2). |
| Depth rank | Computed **at ingest** from that season's `stats_player_reg_` usage, stored on the row. Usage score by position: QB `attempts`; RB `carries + targets`; WR/TE `targets`; OL `games`; DE/DT/LB/CB/S `def_tackles_solo + 3*(def_sacks + def_interceptions)`; K `fg_att`; P/LS/KR/PR `games`. Rank desc within (team, position); ties by jersey number asc; cap `depth_rank` at 3, keep full `player_order`. | Best available proxy for who actually played. Ingest-time computation keeps the read path identical to today's. |
| Status | All historical players get `status: 'backup'` except rank 1 → `'starter'`. No injured/rookie flags. | Historical status is noise; the field only styles starter vs backup meaningfully. |
| UI entry point | A **History icon button** (lucide `History`) in the header row, right of the Share icon → `BottomSheet` titled "Seasons", one row per season (year + check on active), current season first, then desc. Mirrors `UniformSheet`'s row pattern exactly. | The uniform sheet is the established "alternate view of this team" affordance. |
| Viewing state | Selecting a past season: field re-renders from history data; a chip appears next to the team name: "**{year} season** · Back to today" (tap = return). URL carries `?season=2013` (applied on load by an `ApplySeasonFromQuery` component mirroring `ApplyKitFromQuery`, **not stripped** — season links are shareable). | Consistent with every existing query-param feature. |
| Historical view is read-only | No reorder, no share-as-edited, no uniform-driven recolor changes needed (kit selection still works — colors are orthogonal). PlayerCard opens normally (bio block shows season context line "2013 · {TEAM}"). | Editing history is a board (D2), not an overlay on a fact. |
| Special teams historically | K/P/LS resolve from position data; **KR/PR render empty slots** (returner assignments aren't in the data — the empty-slot-never-guess rule from Phase 1 applies). | Existing guardrail. |
| Data volume | 27 seasons × ~1,700 rows ≈ 46k rows in one table | Trivial for Postgres. Ingest all seasons in one backfill run; the weekly job re-ingests only the current season. |

### Schema (migration `<ts>_add_roster_history.sql`)

```sql
create table roster_history (
  season smallint not null,
  team_id text not null references teams(id) on delete cascade,
  gsis_id text not null,
  espn_id text,
  name text not null,
  number int,
  position text not null,          -- our Position vocabulary, mapped at ingest
  college text,
  height text,
  weight int,
  headshot_url text,
  depth_rank smallint not null check (depth_rank between 1 and 3),
  player_order smallint not null,  -- full-precision order within (team, position)
  updated_at timestamptz not null default now(),
  primary key (season, team_id, gsis_id)
);
create index roster_history_team_season_idx on roster_history(team_id, season);
create index roster_history_name_trgm_idx on roster_history using gin (name gin_trgm_ops);

alter table roster_history enable row level security;
create policy "public read" on roster_history for select to anon, authenticated using (true);
```

Position mapping: nflverse `position`/`depth_chart_position` values (e.g. `T`, `G`, `OT`,
`OG`, `FB`, `NT`, `OLB`, `ILB`, `MLB`, `FS`, `SS`, `DB`, `EDGE`) map through a new pure
`lib/nflverse/positions.ts` (mirror `lib/espn/positions.ts`'s vocabulary approach: `T→LT`,
`G→LG`, `FB→RB`, `NT→DT`, `OLB/ILB/MLB→LB`, `FS/SS/DB→S`, `EDGE→DE`, unknown → skip row +
count). Left/right assignment for collapsed OL codes: alternate L/R by usage order
(first tackle → LT, second → RT, etc.) so the field's five OL slots fill.

### Ingest + read + UI files

- `scripts/ingest-nflverse-rosters.mts` (+ `"ingest:rosters"` script) — args:
  `--seasons 1999-2025` (default: current season only, for the weekly job; the one-time
  backfill run passes the full range). Fetches `roster_<YYYY>.csv` + that season's
  `stats_player_reg_<YYYY>.csv`, joins on `gsis_id`, computes usage/rank
  (pure `lib/nflverse/depth-heuristic.ts`), upserts, one `ingestion_runs` row
  (`source: 'nflverse-rosters'`).
- `.github/workflows/ingest-nflverse.yml` — add a second job step running
  `npm run ingest:rosters` (current season only) after the stats step.
- `lib/roster-source.db.ts` — `getTeamSeason(teamId, season): Promise<TeamRoster |
  undefined>`: assembles the same `TeamRoster` shape from `roster_history` (uniforms:
  reuse the team's normal uniform list; specialTeams: K/P/LS from positions, KR/PR
  `playerId: null`). Player `id` for historical players is `gsis:<gsis_id>@<season>`
  (the typed-ref format D2 shares).
- `app/api/teams/[id]/history/[season]/route.ts` — GET → the assembled roster JSON,
  404 for unknown team/out-of-range season.
- `components/SeasonSheet.tsx` — the bottom sheet (list years from a
  `SEASONS_MIN = 1999` const to the current ingested season, passed from the server).
- `components/ApplySeasonFromQuery.tsx` — mirrors `ApplyKitFromQuery` (own Suspense
  boundary), but does not strip the param.
- `components/DepthChartField.tsx` — `season` state; when set, fetch the historical
  roster, render read-only (reorder toggle hidden, share button shares the
  `?season=` URL), show the season chip.

### Tests

- depth-heuristic: per-position score cases, tie→jersey, cap-at-3 with full order kept.
- nflverse position mapping: every listed code, unknown→skip, OL L/R alternation.
- Live-DB (skip without env): `getTeamSeason('seahawks', 2013)` returns a QB1.
- In-browser: 2013 Seahawks shows Russell Wilson QB1 (sanity check the heuristic).

## Part D2 — boards (cross-team moves + saved teams)

### Decisions (locked)

| Decision | Choice | Why |
|---|---|---|
| What a board is | A named, durable depth chart owned by a user: base team (for colors/identity) + per-position **ordered player refs**. Fully independent of the Phase-C working overlay (which stays the "live team, my order" layer). | "My all-time Seahawks" is a curated artifact, not an override of today's roster. |
| Player ref format | `espn:<playerId>` (current players) or `gsis:<gsisId>@<season>` (a player-season from `roster_history`) | One string type bridges both id spaces and pins the era ("2004 Hasselbeck" ≠ "2013 Wilson" problem solved by construction). `lib/player-ref.ts`: `parseRef/formatRef`, exhaustive tests. |
| Where cross-team moves live | **Boards only.** The regular team page keeps same-team reorder (Phase C). "Move players between teams" = add any player ref to a board. | Keeps the working overlay's semantics untouched; a "trade" onto the live Seahawks page would be a lie about the real roster. |
| Creating a board | Team page → the existing "Custom order · Reset all" chip row gains a third action: "**Save as board**" (signed in only; signed out → the Phase-C sign-in prompt). Creates a board from the current base roster + your overlay (top 3 per position captured as refs), named "{Team} board" (inline-editable on the board page). Also: "New empty board" from the account row in NavSwitcher (picks a base team via the existing team browser, starts with empty positions). | Two entry points, both on existing surfaces. |
| Board page | New route **`/board/[slug]`** (server component). Renders `DepthChartField` with a synthetic roster (base team's colors/uniforms; units: offense/defense only — the unit toggle hides Special on boards). Owner sees edit affordances; everyone else read-only. Per-board OG card: reuse the team OG template with the board name as the title line. | The field is the product; boards reuse it wholesale. |
| Adding players | On a board page, each PlayerCard's POSITION DEPTH block gets an "**Add player**" row (owner only). Tapping opens the NavSwitcher sheet in player-search mode with a new scope toggle: **Current / All-time**. Current → existing `/api/players/search`. All-time → new `/api/history/search?q=` (trgm on `roster_history.name`, grouped: one row per player-season, subtitle "{year} · {TEAM}"). Selecting appends the ref to that position's array. Remove: in reorder mode, each row gets an ✕ (removes the ref; base-roster players can be removed too — a board is fully curated). | Reuses the search surface users already know; the season-pinned ref falls directly out of the search result. |
| Sharing | Boards are public-read by slug: share button on the board page copies `/board/[slug]`. The Phase-C `shared_boards` (working-copy shares) is unchanged and unrelated. | Slug-is-capability, same model as Phase C. |
| Limits | Max 50 boards/user, max 20 refs/position (enforced in the API with 400s; UI shows "Board is full at this position") | Abuse guard; no product reason to exceed. |

### Schema (migration `<ts>_add_boards.sql`)

```sql
create table boards (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,           -- lib/slug.ts newSlug(), same as Phase C
  user_id uuid not null references auth.users(id) on delete cascade,
  team_id text not null references teams(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index boards_user_id_idx on boards(user_id);

create table board_positions (
  board_id uuid not null references boards(id) on delete cascade,
  position text not null,
  player_refs text[] not null,         -- ordered; 'espn:<id>' | 'gsis:<id>@<season>'
  primary key (board_id, position)
);

alter table boards enable row level security;
alter table board_positions enable row level security;
create policy "public read" on boards for select to anon, authenticated using (true);
create policy "own boards" on boards for insert to authenticated with check (auth.uid() = user_id);
create policy "own boards update" on boards for update to authenticated using (auth.uid() = user_id);
create policy "own boards delete" on boards for delete to authenticated using (auth.uid() = user_id);
create policy "public read" on board_positions for select to anon, authenticated using (true);
create policy "own board positions" on board_positions for all to authenticated
  using (exists (select 1 from boards b where b.id = board_id and b.user_id = auth.uid()))
  with check (exists (select 1 from boards b where b.id = board_id and b.user_id = auth.uid()));
```

### Ref resolution (the load-bearing function)

`lib/roster-source.db.ts` → `resolveBoardRoster(board, positions): Promise<TeamRoster>`:
batch the refs by kind; `espn:` ids → one `players` `.in('id', ...)` query; `gsis:@season`
→ one `roster_history` query per distinct season (`.eq('season', s).in('gsis_id', ids)`).
Missing refs (player deleted/re-ingested away) are **dropped silently from render but kept
in the stored array** (they may come back next ingest; never mutate user data on read).
Historical players carry a `bio` line "{year} · {City} {Team}" so the card shows era
context. `depthRank`/`order`/`status` are assigned from array position exactly as
`applyTeamOverride` does (reuse its rank/status logic by extracting
`assignRanks(players: Player[]): Player[]` from `lib/depth-overrides.ts` — refactor, no
behavior change, covered by existing tests).

### API

- `app/api/boards/route.ts` — `GET` (own boards list), `POST { teamId, name?, seed?:
  Record<Position, string[]> }` → `{ slug }`.
- `app/api/boards/[slug]/route.ts` — `GET` (public board payload), `PATCH { name? }`,
  `DELETE`, and `PUT { position, playerRefs }` for one position's array. Writes are
  owner-only (RLS + explicit 401/403). No collision with Phase C: its share-resolution
  route is `/api/shares/[slug]`.
- `app/api/history/search/route.ts` — `GET ?q=` → up to 12 player-season hits
  `{ ref, name, position, number, season, teamAbbrev, headshotUrl }`, ilike-on-trgm,
  newest season first, same-player seasons collapsed to the 3 most recent.

### UI files

- `app/board/[slug]/page.tsx` + `opengraph-image.tsx` — server-resolved, `notFound()` on
  unknown slug. Not statically generated (user data): plain dynamic rendering.
- `components/DepthChartField.tsx` — accepts `mode: 'team' | 'board'` + `canEdit`;
  board mode hides Special unit, wires reorder/add/remove to the board API
  (optimistic local state, PUT per change, last-write-wins — same posture as Phase C).
- `components/NavSwitcher.tsx` — account area lists "My boards" (name + team badge) →
  `/board/[slug]`; "New board" flow; player-search scope toggle (Current / All-time)
  shown **only** when opened from the Add-player flow.
- `components/PlayerCard.tsx` — "Add player" row (board owner) and per-row ✕ in reorder
  mode; historical player cards show the era line and omit live-roster-only UI
  (status pill logic unchanged — they're starter/backup by array position).

### Tests

- `player-ref`: format/parse round-trip, malformed → null.
- `assignRanks` extraction: existing depth-overrides tests still green.
- `resolveBoardRoster`: pure assembly given stubbed row sets — espn+gsis mix ordering,
  missing ref dropped from render but not from input, era bio line.
- Live-DB (skip without env): board CRUD round-trip; RLS: anon can read, cannot write
  (assert a 401/403 path).
- In-browser: create board from 2013 Seahawks QB search, add `gsis:…@2013` Wilson to a
  2026 board, reorder, open the slug in a private window (read-only), 390px + 1280px.

## Task/PR breakdown

1. **PR1 — D1 ingest**: migration, position mapping, depth heuristic, backfill +
   weekly-job step. Deliverable: `roster_history` populated 1999–now locally.
2. **PR2 — D1 UI**: `getTeamSeason`, history API route, SeasonSheet + chip + query param,
   read-only field. Deliverable: browse the 2013 Seahawks.
3. **PR3 — D2 schema + resolution**: boards migration, `player-ref`, `assignRanks`
   refactor, `resolveBoardRoster`, board APIs. No UI yet.
4. **PR4 — D2 UI**: board page + OG, create/save-as-board entry points, add/remove
   players, My-boards list, history search endpoint + scope toggle.

## Out of scope

- Pre-1999 seasons (no stats to rank by), week-by-week scrubbing within a season,
  roster-diff "what changed" views (Future Ideas #2's fuller form).
- Salary-cap validation on boards (Phase E contracts spec references boards for it).
- Board forking/copying someone else's board, comments, likes — none of it.
- Special-teams units on boards.
