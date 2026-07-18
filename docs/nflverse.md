# nflverse data ingestion (Postgres-backed)

Player season stats are ingested from [nflverse](https://github.com/nflverse/nflverse-data)
(open community NFL data, CSV assets on GitHub releases, no API key) into Postgres
(Supabase project `jiqoaqmzmvtovimnmbzl`) — the second data source next to ESPN, using
the same pattern: external fetch → pure transform → upsert, one `ingestion_runs` row per
run. First slice: player season stats on `PlayerCard` (docs/superpowers/specs/2026-07-07-
nflverse-ingestion-and-player-stats-design.md). Later phases (contracts, historical
rosters, draft picks, formations) reuse this same scaffolding with their own specs.

## Architecture

- `lib/nflverse/csv.ts` — `parseCsv`, a hand-rolled RFC-4180 parser (quoted fields,
  embedded commas/quotes/newlines, CRLF). No dependency — the repo's runtime dep list is
  deliberately small, and nflverse's CSVs are well-formed machine output.
- `lib/nflverse/assets.ts` — `assetUrl(tag, file)` builds a release-download URL;
  `latestAvailableSeason(tag, prefix, fetchImpl)` HEAD-checks the current year and walks
  back up to 3 years, since a season's file isn't published the instant the calendar year
  starts (2025 wasn't live at spec-verification time). `fetchImpl` is injectable for tests.
- `lib/nflverse/crosswalk.ts` — `buildCrosswalk(playersCsvRows)`: nflverse's own id
  crosswalk (`players.csv`) mapped `gsis_id -> espn_id`. This is the join hub between
  nflverse's stats (keyed by `gsis_id`) and our `players` table (keyed by ESPN athlete
  id) — **no name-matching fallback**, since that's where silent data corruption comes
  from. A row missing either id is simply omitted from the map.
- `lib/nflverse/transform.ts` — `toPlayerStatsRows(statsCsvRows, crosswalk,
  knownPlayerIds)`: pure join + numeric coercion (`''` -> `null`, else `Number(...)`,
  `NaN` -> `null`). A stats row whose `gsis_id` has no crosswalk match, or whose
  crosswalked `espn_id` isn't in `knownPlayerIds` (not yet ingested by ESPN), is
  **skipped and counted** rather than guessed — the skip count is recorded on the
  `ingestion_runs` row (see below), so a growing skip count is visible, not silent.
- `lib/stat-lines.ts` — `statLine(position, stats)`: the position -> displayed-line
  mapping for the PlayerCard (QB completions/yards/TD/INT, RB carries/yards/TD [+rec],
  WR/TE receptions/yards/TD, OL/P/LS/KR/PR games-only, defense tackles/sacks/INT, K
  FG made/attempted). Returns `null` (render nothing) when `games` is null or 0 — the
  repo's "show nothing, not zeros" posture (Decisions 2026-07-02).
- `lib/nflverse/team-codes.ts` — `resolveTeamCode(code)`: nflverse's team codes ->
  our `team.id`. NOT our ESPN `abbrev` (the Rams are nflverse `LA`, our abbrev `LAR`),
  and historic relocations (`OAK`/`SD`/`STL`) fold into the current franchise. A
  hand-reviewed static map; an unknown code -> `null` (its game is skipped-and-counted).
- `lib/nflverse/games.ts` — `toScheduleAndGameRows(rows, resolveCode)`: pure transform of
  `nfldata/games.csv` into `games` rows (one per shared game) + `schedules` rows (the
  distinct `(team_id, season)` set the games imply). A row with an unresolvable team code
  or a non-numeric season is **skipped and counted**. `'' -> null` for blank scores/dates.
- `lib/schedule.ts` — `resolveSchedule(games, teamId)` (regular-season, this-team's
  perspective: home/away, opponent id, W/L/T or null-when-upcoming, ordered by week, BYE
  weeks derived from missing weeks) and `nextGame(schedule)` (earliest unplayed). Pure;
  the read layer enriches opponent ids into team metadata for the UI.
- `scripts/ingest-nflverse.mts` — fetches `players.csv` once, the latest two available
  `stats_player_reg_<season>.csv` files, transforms, and upserts `player_stats`
  (`onConflict: player_id,season,season_type`). Then `ingestGames` fetches
  `nfldata/data/games.csv` (one file, all seasons 1999+) and upserts **schedules first,
  then games** (chunked) — the games' composite FKs require the schedule rows to exist.
  Writes one `ingestion_runs` row (`source: 'nflverse'`) whose `errors` jsonb carries
  `{ seasons, player_stats_rows, games_written, schedules_written, skipped, failures }`;
  `teams_written` is repurposed as the total row count across both datasets.
- `lib/roster-source.db.ts` — `getPlayerStats(playerId)`, a standalone export (same
  shape as `searchAllPlayers`) — lazy per-player, not part of `RosterSource`, since the
  field view never needs stats. `getRosterLeaders(teamId)` — a second standalone read
  for the stats page's ROSTER LEADERS block (design spec 5a): the team's players joined
  to their `player_stats` rows in memory (two typed queries, no filter-string building),
  fed to `lib/roster-leaders.ts`. `getTeamSchedule(teamId, season?)` and
  `getNextGame(teamId)` — standalone reads for the SCHEDULE tab + the stats page's NEXT
  GAME card: a game names two teams, so "this team's games" is two `.eq` queries (home,
  away) merged, never an `.or()` string (invariant 8); opponents are enriched from team
  metadata. All three degrade to `null` on an unknown team / no data / query error.
- `lib/roster-leaders.ts` — `rosterLeaders(entries)`: pure pick of the passing/rushing/
  receiving leader for the newest season present, with each category's line preformatted
  for the UI. A category with no positive yardage degrades to `null` (show nothing, not a
  zeroed row). Colocated tests in `lib/__tests__/roster-leaders.test.ts`.
- `app/api/players/[id]/stats/route.ts` — `GET`, returns `{ stats: PlayerSeasonStats[] }`
  (200 with `{ stats: [] }` when none, never a bare array — contracts/draft-boards add
  sibling keys to this same payload later without a breaking change).
- `components/PlayerCard.tsx` — fetches on open (`AbortController` cancels on close/
  player-change), renders a "LAST SEASONS" row per season with a non-null `statLine`.
  Loading and error both render nothing.

## Crosswalk caveat + skip accounting

nflverse's `players.csv` covers every player across all eras, but not every row has an
`espn_id` (older/inactive players, or a nflverse-only id lineage). A stats row for such
a player is skipped, not force-matched by name — name-matching is exactly how prior
ingestion bugs elsewhere in this repo have introduced silent corruption. Run
`npm run ingest:nflverse` and read the console output (or the `ingestion_runs.errors`
jsonb) for the skip count each run; a sudden jump is worth investigating, a steady
baseline (players not yet in our `players` table, e.g. practice-squad/inactive) is
expected.

## Regenerate

```bash
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run ingest:nflverse
```

Requires the ESPN ingest (`npm run ingest:espn`) to have already populated `players` —
`knownPlayerIds` is read from that table, so an empty `players` table means every stats
row gets skipped. Like `ingest:espn`, this is **not** part of `next build`; nflverse's
release cadence is out of this app's control, and a failed/stale ingest should never
block a deploy.

## Regenerate types

Same as the ESPN ingest — `npm run db:types` reads **local** Postgres
(`supabase/migrations/`), not the hosted project. Regenerate and commit
`lib/database.types.ts` in the same PR as any migration change.

## Scheduling (GitHub Actions)

`.github/workflows/ingest-nflverse.yml` mirrors `ingest-espn.yml`: weekly
(`cron: '0 13 * * 3'`, an hour after the ESPN ingest so the two runs don't interleave in
`ingestion_runs`), `workflow_dispatch` for manual runs, `STRICT=1` so a partial run
(some season failed to write) turns the workflow red, and a `concurrency` group so two
runs never overlap. Same two repo secrets as the ESPN workflow
(`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`).

## License posture

nflverse's own code is MIT-licensed; the underlying NFL data is owned by the NFL/its
partners — same gray-area posture as the ESPN ingest (unofficial, no ToS grant, used
here for a non-commercial fan project). The formation/personnel dataset
(`pbp_participation`, not ingested by this ticket) is FTN-sourced and CC-BY-SA 4.0 —
**the future real-formations work must attribute FTN in the UI** when that data ships;
noted here since it shares this same `lib/nflverse/` scaffolding.

## RLS policy

`player_stats` ships with RLS enabled and a `"public read"` policy from its first
migration (AGENTS.md invariant 10) — same pattern as `team_stats` and every other base
table. Writes go through the service-role ingest script, which bypasses RLS.
