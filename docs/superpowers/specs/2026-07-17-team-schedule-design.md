# Team schedule + next game

Date: 2026-07-17
Status: approved (design)
Roadmap: vault ticket "Add team schedules page" (Phase E / Vision Features). Placement was
decided 2026-07-17 by the imported design `claude.ai/design` project, file
`Team Page - Final (5a).dc.html`: **team page, as the SCHEDULE tab** of the existing
ROSTER / SCHEDULE / STATS pill — not main nav. The header already ships that pill with
SCHEDULE rendered disabled (`components/TeamPageHeader.tsx`, from depth#128/#129); this
spec is the data + ingest + build work that turns the placeholder into a real tab, plus
the mock's NEXT GAME card on the stats page. Sibling: it also gives the stats page real
"next game" content, adjacent to the ROSTER LEADERS block shipped in depth#131.

## Why nflverse, not ESPN

The ticket's open data question ("does ESPN expose schedule data — needs research") is
answered by using the source already wired in: nflverse. `nfldata/data/games.csv` (the
long-standing Lee Sharpe games file) is one CSV covering **every** game 1999→current,
past results and future scheduled games alike, and it reuses the existing `lib/nflverse`
scaffolding (CSV parser, retry, `ingestion_runs`). No new external dependency, no ESPN
schedule scraping, and it directly serves Cooper's stated want: **historic season data
for future use**, not just the current season.

## Verified source facts (2026-07-17, live-probed against `games.csv`)

- **One shared row per game**, keyed by `game_id` (e.g. `2026_01_NE_SEA`). Each row has
  both `away_team` and `home_team` columns — a game is a single shared entity between two
  teams, **not** duplicated per team. This settles the open question in the ask: since
  nflverse does not duplicate SEA-vs-JAX into two rows, the schema models a game as one
  row linked to *both* teams' schedules (see Decisions), rather than per-team game rows.
- Columns used: `game_id, season, game_type, week, gameday, gametime, away_team,
  away_score, home_team, home_score`. Upcoming games carry **empty** `away_score`/
  `home_score` (verified: all 2026 rows, kickoff 2026-09-09 onward, have blank scores) —
  "upcoming" is representable as null scores, no separate flag needed.
- `game_type` ∈ `{REG, WC, DIV, CON, SB}` (regular season + the four postseason rounds).
  No `PRE` rows present today.
- Seasons present: 1999–2026 (7,549 rows). The current season (2026) is fully scheduled
  with results still blank.
- **Team codes are nflverse's own, not our `abbrev`.** Rams are `LA` (not `LAR`),
  Washington is `WAS`, Chargers `LAC`. Historic relocations appear under old codes:
  `OAK` (→ Raiders/`LV`), `SD` (→ Chargers), `STL` (→ Rams). A static crosswalk from
  nflverse code → our `team.id` is required; a plain join on `abbrev` would silently miss
  the Rams and every relocated franchise.

## Decisions (locked)

| Decision | Choice | Why |
|---|---|---|
| **Two tables: `schedules` + `games`** | A `schedules` table is the per-`(team_id, season)` anchor Cooper asked for; a `games` table holds one row per actual game. | Matches the requested relationship (a per-team-season container that games hang off of) and keeps the granular game data normalized. |
| **A game is shared, linked to two schedules** | `games` is one row per `game_id` with `home_team_id` + `away_team_id`. It links to schedules via **two composite foreign keys**: `(home_team_id, season) → schedules(team_id, season)` and `(away_team_id, season) → schedules(team_id, season)`. Not per-team-duplicated rows. | nflverse's native shape is one shared row (verified above); duplicating per team would double every game and make a score correction a two-row write. Two FKs is the faithful "reflect the shared game in the schedule schema" the ask calls for when the source isn't duplicated. Composite FKs also enforce that both teams have a `schedules` row for that season — no orphan games. |
| **`schedules` is lean in v1** | Columns: `team_id`, `season`, `updated_at`, PK `(team_id, season)`. No record/points columns yet. | Season record already lives in the ESPN-sourced `team_stats` (also keyed `(team_id, season)`); duplicating win/loss/points into `schedules` would create two sources of truth for the same fact and cross provenance (invariant 9 — machine writers touch only their own rows). `schedules` is provenance-scoped to nflverse and is the documented home for **schedule-derived** aggregates later (games played, home/away split, strength of schedule — all computable from `games`), which `team_stats` does not carry. Flagged for sign-off: if you want record-from-games on `schedules` now, that's a scope add. |
| **Why not fold into `team_stats`** | Kept separate even though both are per-`(team_id, season)`. | `team_stats` is ESPN-sourced standings; `schedules`/`games` are nflverse-sourced. Merging would mix two ingest provenances in one table (invariant 9) and couple the schedule feature to the ESPN standings fetch. A future consolidation is possible but is its own decision, out of scope here. |
| **`games` columns** | `game_id text primary key` (nflverse's), `season smallint not null`, `game_type text not null`, `week smallint`, `gameday date`, `gametime text`, `home_team_id text`, `away_team_id text`, `home_score smallint`, `away_score smallint`, `updated_at`. Scores nullable (upcoming = null). `game_type` stored as nflverse's raw value with **no** restrictive check (comment lists the known set) so a future value degrades instead of failing the ingest (invariant 6). | Stores enough to render the grid and derive per-team W/L/T; the redundant nflverse `result` (home margin) is dropped since it's derivable from scores. `gameday`/`gametime` nullable because far-future or TBD-time games can lack them. |
| **Team-code crosswalk** | `lib/nflverse/team-codes.ts`: a static `Record<nflverseCode, teamId>` covering the current 32 **plus** historic aliases (`OAK`, `SD`, `STL`) mapped to the current franchise `team.id`. A game whose home or away code doesn't resolve is **skipped and counted** (recorded on the `ingestion_runs` row), never guessed — same posture as the player-stats crosswalk. | Codes are nflverse's own and include relocations; a static, reviewed map is the only correct join. Skip-and-count keeps a bad/new code visible instead of silently corrupting or crashing. |
| **Ingest source + order** | Extend `scripts/ingest-nflverse.mts` to also fetch `https://github.com/nflverse/nfldata/raw/master/data/games.csv` (a single file, all seasons — **not** a season-suffixed release asset, so no `latestAvailableSeason` walk). Pure transform in `lib/nflverse/games.ts` produces schedule rows (the distinct `(team_id, season)` set derived from the games) and game rows. The script upserts **schedules first, then games** (the composite FK requires the schedule rows to exist), each idempotent (`onConflict` on the PKs), and writes one `ingestion_runs` row (`source: 'nflverse'`) with the skip count. | Reuses the decoupled, retrying, standalone-runnable ingest (invariant 7); pure logic stays in `lib/nflverse/` with tests, the script stays I/O glue (§5). FK ordering is a real constraint, not incidental. |
| **Ingest all seasons** | Ingest every season in the file (1999→current), not just the latest. | Cooper wants historic data for future use; the volume is trivial (~7.5k games, ~850 schedule rows) and the crosswalk covers every 1999+ code. |
| **Read layer** | Two standalone reads (like `getPlayerStats`/`getRosterLeaders`, **not** on `RosterSource`, since the field view never needs them): `getTeamSchedule(teamId, season?)` → the team's games for a season (default: the latest season present for that team) resolved to a UI shape, and `getNextGame(teamId)` → the next unplayed game. Pure shaping (opponent resolution, per-team W/L/T, upcoming detection, BYE-week insertion, next-game pick) lives in `lib/schedule.ts` with tests; the DB reads are query + map. | Keeps the `RosterSource` seam intact (invariant 1); pure logic is unit-tested without a DB (§3). |
| **BYE weeks are derived** | nflverse has no BYE row. `resolveSchedule` fills any REG week (1–18) in which the team has no game with a BYE placeholder, so the weekly grid matches the mock's "BYE" card. | A team's bye is the absence of a game that week — computed, not stored. Real logic worth extracting + testing. |
| **v1 UI shows the latest season only** | Historic seasons are stored but the SCHEDULE tab renders only the latest season present for the team; no schedule season switcher in v1. | Matches the mock (one season, weekly card grid). Historic-season browsing is a future add on stored data. |
| **Enable the SCHEDULE tab** | `components/TeamPageHeader.tsx` stops rendering SCHEDULE as a disabled span and wires it to `/team/[id]/schedule` with the same active/link pattern ROSTER/STATS already use (`activePage="schedule"`). | The ticket's placement decision: once data lands, wire the existing pill. Removing the disabled placeholder is the intended behavior change, not cleanup. |

## Files

**PR1 — data (base: `main`)**

- migration `<ts>_add_schedules_and_games.sql` — `schedules` (`team_id`, `season`, PK
  `(team_id, season)`, `team_id → teams(id)`), `games` (columns above, PK `game_id`, two
  composite FKs to `schedules`), the explicit `grant` + `enable row level security` +
  `"public read"` policy on **both** tables (invariant 10 — anon reads them). Indexes:
  `games(season)` and `games(home_team_id, season)` / `games(away_team_id, season)` to
  back the per-team-season read.
- `npm run db:types` rerun; regenerated `lib/database.types.ts` committed in the same PR.
- `lib/nflverse/team-codes.ts` (+ test) — nflverse-code → `team.id` map incl. historic
  aliases; a `resolveTeamCode(code): string | null` that returns null for unknowns.
- `lib/nflverse/games.ts` (+ test) — `toScheduleAndGameRows(gamesCsvRows, resolveCode)`:
  pure transform → `{ schedules, games, skipped }`, skipping (and counting) any row whose
  home or away code doesn't resolve; derives the distinct `(team_id, season)` schedule set.
- `lib/schedule.ts` (+ test) — `resolveSchedule(games, teamId)` (per-team UI shape:
  home/away, opponent, teamScore/oppScore, `result: 'W'|'L'|'T'|null`, ordered by week,
  BYE placeholders) and `nextGame(games)` (earliest unplayed).
- `lib/types.ts` — `Game`, `TeamScheduleGame`, `TeamSchedule`, `NextGame`.
- `lib/roster-source.db.ts` — `getTeamSchedule(teamId, season?)`, `getNextGame(teamId)`;
  both degrade to `null`/empty on error, like `getRosterLeaders`.
- `scripts/ingest-nflverse.mts` — fetch `games.csv`, transform, upsert schedules then
  games, record skip count on `ingestion_runs`.
- `docs/nflverse.md` — document the games/schedules read + ingest addition.

**PR2 — UI (base: PR1 branch; retarget to `main` once PR1 merges)**

- `app/team/[id]/schedule/page.tsx` — server component, ISR `revalidate` matching the
  stats route, `generateStaticParams` one per team, fetches `getTeamSchedule`, 404s an
  unknown id, renders `TeamScheduleView`.
- `components/TeamScheduleView.tsx` — client component (invariant 5: one team's resolved
  schedule as a prop), shared `TeamPageHeader` with `activePage="schedule"`, weekly card
  grid: one card per REG week — opponent code chip in opponent colors, date, HOME/AWAY
  badge (uiAccent for HOME per the mock), final score + W/L for played games, BYE weeks
  called out.
- `components/TeamPageHeader.tsx` — SCHEDULE becomes an active-capable link (drop the
  disabled branch).
- `components/TeamStatsView.tsx` + `app/team/[id]/stats/page.tsx` — NEXT GAME card
  (mock's card: "NEXT GAME · WEEK N", `vs`/`@ OPP · DATE`, opponent chip), fetched via
  `getNextGame`, rendered above ROSTER LEADERS; omitted entirely when there's no upcoming
  game (offseason / season complete).

## Tests

- `resolveTeamCode`: current-code hit; historic alias (`OAK`→raiders, `SD`→chargers,
  `STL`→rams) maps to the current franchise id; unknown code → null.
- `toScheduleAndGameRows`: a shared game yields one game row with both team ids + a
  schedule row for each team-season; a row with an unresolved code is skipped and counted;
  distinct `(team_id, season)` schedule set has no duplicates across a team's many games.
- `resolveSchedule`: played game → correct `W`/`L`/`T` from the team's perspective (home
  and away cases); upcoming game (null scores) → `result: null`; a missing REG week →
  BYE placeholder at the right week; games ordered by week; opponent resolved to the
  *other* team.
- `nextGame`: picks the earliest unplayed game; all games played → null.
- DB reads (if covered): `getTeamSchedule` returns the latest season's games for a team
  that is home in some and away in others; `getNextGame` null when the season is complete.
- Browser at 390px: SCHEDULE tab active-state + navigation from ROSTER/STATS; weekly grid
  renders played + upcoming + BYE; NEXT GAME card on the stats page for an in-progress
  season and its absence when the season is over; a relocated-franchise team (e.g. Rams,
  nflverse `LA`) resolves and renders.

## Out of scope

- Schedule **season switcher** — historic seasons are stored, but v1 renders only the
  latest. Browsing prior seasons is a later add on the stored data.
- **Postseason bracket** UI — `game_type` WC/DIV/CON/SB rows are ingested and stored, but
  the v1 grid is the REG weeks 1–18; rendering the playoff rounds is deferred.
- **Record/points on `schedules`** — deriving win/loss/SoS from `games` onto the schedule
  anchor (flagged above for sign-off; not built in v1 to avoid dual source of truth with
  `team_stats`).
- **Box scores / play-by-play / live in-progress state** — no realtime; freshness is
  bounded by ISR + the decoupled ingest cadence, same as every other read.
- Wiring the stats page's dead-end `▸▸▸` glyph (its own vault ticket) — the NEXT GAME
  card and this schedule route could later make it a real link, but that's not locked here.
- `PRE`season games — not present in the source today; no handling added.
```
