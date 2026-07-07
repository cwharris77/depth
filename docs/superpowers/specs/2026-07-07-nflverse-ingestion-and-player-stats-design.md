# nflverse ingestion scaffolding + player season stats

Date: 2026-07-07
Status: approved (design) — supersedes the vault's `nflverse-ingestion-plan.md` outline;
its "Task 0: verify the source" is DONE and the verified facts are inlined below.
Roadmap: feeds Phase D (historical rosters) and Phase E (contracts, draft boards, real
formations). This spec ships the shared scaffolding + the first slice (player season
stats on the PlayerCard).

> **For agentic workers:** all source URLs, file names, and columns below were verified
> against the live nflverse release assets on 2026-07-07. Implement as written; if an
> asset 404s, the fallback rule is "use the newest season that exists" (helper below),
> not guessing new names.

## Goal

Add nflverse (open community NFL data, CSV assets on GitHub releases, no API key) as the
second data source next to ESPN, using the same ingestion pattern (`external fetch → pure
transform → upsert Postgres`, one `ingestion_runs` row per run). First slice: **player
season stats** rendered on the `PlayerCard`.

## Verified source facts (2026-07-07)

Base URL for every asset:
`https://github.com/nflverse/nflverse-data/releases/download/<tag>/<file>`

| Dataset | Tag | File | Notes |
|---|---|---|---|
| Player id crosswalk | `players` | `players.csv` | THE join hub. Columns include `gsis_id, espn_id, otc_id, pfr_id, display_name, position, latest_team, ...`. One row per player, all eras. |
| Season player stats | `player_stats` | `stats_player_reg_<YYYY>.csv` | Verified available 1999–2024 (2025 not yet published at check time). Keyed by `player_id` (= gsis_id). Also exists: `stats_player_post_`, `stats_player_regpost_`, `stats_player_week_`. |
| Season rosters | `rosters` | `roster_<YYYY>.csv` | 1920–2025. **Has `espn_id` directly** — historical rosters don't need the crosswalk file. Columns: `season, team, position, depth_chart_position, jersey_number, status, full_name, first_name, last_name, birth_date, height, weight, college, gsis_id, espn_id, ..., headshot_url, years_exp, entry_year, rookie_year, draft_club, draft_number`. |
| Contracts | `contracts` | `historical_contracts.csv.gz` | gzip. Columns: `player, position, team, is_active, year_signed, years, value, apy, guaranteed, apy_cap_pct, inflated_value, inflated_apy, inflated_guaranteed, player_page, otc_id, date_of_birth, height, weight, college, draft_year, draft_round, draft_overall, draft_team, season_history`. **No gsis/espn id** — join via `players.csv` (`otc_id → espn_id`). |
| Draft picks | `draft_picks` | `draft_picks.csv` | Single all-history file (1980+... actually starts earlier; take as-is). Columns: `season, round, pick, team, gsis_id, pfr_player_id, cfb_player_id, pfr_player_name, hof, position, category, side, college, age, to, allpro, probowls, seasons_started, w_av, car_av, dr_av, games, pass_completions, ..., def_solo_tackles, def_ints, def_sacks`. |
| Formation/personnel | `pbp_participation` | `pbp_participation_<YYYY>.csv` | **2016–2025 all exist** (the vault note "2023+ only" was wrong — 2016–22 is NGS-sourced, 2023+ is FTN-sourced). Columns: `nflverse_game_id, old_game_id, play_id, possession_team, offense_formation, offense_personnel, defenders_in_box, defense_personnel, number_of_pass_rushers, players_on_play, offense_players, defense_players, n_offense, n_defense, ..., route, defense_man_zone_type, defense_coverage_type, ...`. FTN data is CC-BY-SA 4.0 → **attribute FTN in the UI** when formation data is surfaced (that's the real-formations spec, not this one). |

Key stat columns in `stats_player_reg_<YYYY>.csv` (the display set is a subset; full
header captured 2026-07-07): `player_id, player_display_name, position, season,
season_type, recent_team, games, completions, attempts, passing_yards, passing_tds,
passing_interceptions, carries, rushing_yards, rushing_tds, receptions, targets,
receiving_yards, receiving_tds, def_tackles_solo, def_sacks, def_interceptions,
fg_made, fg_att, fg_pct, fantasy_points, ...`

## Decisions (locked)

| Decision | Choice | Why |
|---|---|---|
| Crosswalk strategy | Fetch `players.csv` once per run, build `Map<gsis_id, espn_id>`; join stats rows to our `players.id` (= ESPN athlete id) through it. Rows with no `espn_id` or no matching player row are **skipped and counted**; the skip count goes in the `ingestion_runs.errors` jsonb. No name+team fallback in v1. | Verified the crosswalk exists and is one file. Name-matching is where silent data corruption comes from; a logged skip is honest. |
| Which stats file | `stats_player_reg_<season>.csv` season totals, current + previous season | The card shows season lines, not game logs. Weekly is a later enrichment. |
| Display set (the `player_stats` columns) | `games, completions, attempts, passing_yards, passing_tds, passing_interceptions, carries, rushing_yards, rushing_tds, receptions, targets, receiving_yards, receiving_tds, def_tackles_solo, def_sacks, def_interceptions, fg_made, fg_att` | Covers QB/RB/WR-TE/defense/K card lines without ingesting the ~110-column frame. All nullable ints except games. |
| Season selection | `latestAvailableSeason(tag, prefix)` helper: try current calendar year, walk back up to 3 years, take the first 200 response (HEAD request) | 2025 wasn't published at verification time; the ingest must not hard-code a year. |
| CSV parsing | A tiny hand-rolled RFC-4180 parser in `lib/nflverse/csv.ts` (~40 lines: quoted fields, embedded commas/quotes/newlines) — no new dependency | Matches the repo's minimum-complexity bar; the files are well-formed machine output. Unit-tested against quoted-field fixtures. |
| Gzip (contracts, later) | `node:zlib` `gunzipSync` in the script (Node-only, never client) | stdlib, no dep. |
| Stats read path | Lazy per-player: `getPlayerStats(playerId)` in `lib/roster-source.db.ts`, called from a new `app/api/players/[id]/stats/route.ts`, fetched client-side when a `PlayerCard` opens | The field view never needs stats; don't bloat the per-team query. Mirrors the `/api/players/search` pattern. |
| Card rendering | A "LAST SEASONS" block under the existing stat tiles: one row per (season, season_type=REG) with the position-relevant line (mapping below). No stats row → render nothing (no zeros, no empty state) | Matches Decisions 2026-07-02 posture ("show nothing, not zeros"). |

Position → displayed line (exhaustive; `lib/stat-lines.ts`, pure):
- QB: `{completions}/{attempts} · {passing_yards} yds · {passing_tds} TD · {passing_interceptions} INT`
- RB: `{carries} car · {rushing_yards} yds · {rushing_tds} TD` (+ ` · {receptions} rec` when receptions > 0)
- WR/TE: `{receptions} rec · {receiving_yards} yds · {receiving_tds} TD`
- OL (LT/LG/C/RG/RT): `{games} games` (OL have no stat line; games played is the honest number)
- DE/DT/LB/CB/S: `{def_tackles_solo} tkl · {def_sacks} sk · {def_interceptions} INT` (omit zero sacks/INT segments)
- K: `{fg_made}/{fg_att} FG`
- P/LS/KR/PR: `{games} games`
Numbers may be null (nullable columns) — treat null as 0 for display, but if games is null/0 skip the row entirely.

## Schema (migration `supabase/migrations/<ts>_add_player_stats.sql`)

```sql
create table player_stats (
  player_id text not null references players(id) on delete cascade,
  season smallint not null,
  season_type text not null default 'REG' check (season_type in ('REG', 'POST')),
  games smallint,
  completions int, attempts int, passing_yards int, passing_tds int, passing_interceptions int,
  carries int, rushing_yards int, rushing_tds int,
  receptions int, targets int, receiving_yards int, receiving_tds int,
  def_tackles_solo int, def_sacks numeric, def_interceptions int,
  fg_made int, fg_att int,
  updated_at timestamptz not null default now(),
  primary key (player_id, season, season_type)
);
create index player_stats_player_id_idx on player_stats(player_id);

alter table player_stats enable row level security;
create policy "public read" on player_stats for select to anon, authenticated using (true);
```

(`def_sacks` is numeric — half-sacks exist.) If Phase C's RLS migration hasn't landed
yet when this ships, still include the enable+policy lines — they're independent.
Regenerate `lib/database.types.ts` (`npm run db:types`) in the same PR.

## Files

- `lib/nflverse/csv.ts` — `parseCsv(text): Record<string, string>[]`. Pure.
- `lib/nflverse/assets.ts` — `assetUrl(tag, file)`; `latestAvailableSeason(tag, prefix,
  fetchImpl)` (injectable fetch for tests).
- `lib/nflverse/crosswalk.ts` — `buildCrosswalk(playersCsvRows): Map<string, string>`
  (gsis_id → espn_id; rows missing either are omitted). Pure.
- `lib/nflverse/transform.ts` — `toPlayerStatsRows(statsCsvRows, crosswalk, knownPlayerIds:
  Set<string>): { rows: PlayerStatsInsert[], skipped: number }`. Pure. Number coercion:
  `''` → null, else `Number(...)`; NaN → null.
- `lib/nflverse/fixtures/` — small captured CSV excerpts (players.csv 10 rows,
  stats_player_reg 10 rows spanning QB/RB/WR/DEF/K) — the fixtures-not-network discipline
  `lib/espn/fixtures/` already uses.
- `scripts/ingest-nflverse.mts` — mirrors `scripts/ingest-espn.mts`: `requireEnv`
  SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY, fetch players.csv + latest two seasons'
  `stats_player_reg_*.csv`, transform, upsert `player_stats` (onConflict
  `player_id,season,season_type`), one `ingestion_runs` row `source: 'nflverse'` with
  `{ seasons, rows_written, skipped }` in the counts/errors fields. Retry each fetch 3×
  with backoff (copy the `getJson` retry shape from ingest-espn, generalized to text).
  `STRICT=1` env → non-zero exit on any season failing (same contract as ingest-espn).
- `package.json` — `"ingest:nflverse": "tsx scripts/ingest-nflverse.mts"`.
- `lib/stat-lines.ts` + `lib/__tests__/stat-lines.test.ts` — the position→line mapping.
- `lib/roster-source.db.ts` — add `getPlayerStats(playerId): Promise<PlayerSeasonStats[]>`
  (ordered season desc, REG only in v1).
- `app/api/players/[id]/stats/route.ts` — GET, returns `{ stats: PlayerSeasonStats[] }`
  (200 with `{ stats: [] }` when none). An object, not a bare array, on purpose: the
  contracts and draft-boards specs later add `contract` and `draft` keys to this same
  payload without a breaking change.
- `components/PlayerCard.tsx` — fetch on open (abort on close), render the block with the
  existing stat-tile styling; loading state renders nothing (the block pops in — fine at
  these payload sizes), error renders nothing.
- `docs/nflverse.md` — pattern doc mirroring `docs/espn.md`: assets, crosswalk caveat +
  skip accounting, regen command, license posture (nflverse code MIT; data owned by its
  owners — same gray-area posture as ESPN; FTN attribution requirement noted for the
  future formations work).
- `.github/workflows/ingest-nflverse.yml` — weekly, `cron: '0 13 * * 3'` (an hour after
  the ESPN ingest so runs don't interleave in `ingestion_runs`), `workflow_dispatch`,
  `STRICT=1`, same two repo secrets, same concurrency-group pattern as
  `ingest-espn.yml`.

## Tests (Vitest, all pure except the live-DB read)

- csv: quoted fields, embedded comma, embedded quote (`""`), CRLF, trailing newline.
- crosswalk: happy, missing espn_id omitted, duplicate gsis keeps first.
- transform: happy QB row; unmatched gsis → skipped count; player not in `knownPlayerIds`
  → skipped; empty-string numerics → null; POST rows pass through with season_type.
- stat-lines: one case per position bucket incl. null-games skip and zero-segment omission.
- `roster-source.db.test.ts` addition: `getPlayerStats` against live local DB (skip
  without env), seeded by running the ingest against the local stack.

## Task/PR breakdown

1. **PR1 — scaffolding + schema + ingest.** Everything except the UI read path. Deliverable:
   `npm run ingest:nflverse` populates `player_stats` locally; `ingestion_runs` shows the
   run with skip counts.
2. **PR2 — read + card.** `getPlayerStats`, the API route, `lib/stat-lines.ts`,
   `PlayerCard` block. Verify in-browser: a QB card (line renders), an OL card (games
   only), a rookie with no rows (block absent), at 390px + 1280px.
3. **PR3 — schedule.** The workflow file. Add nothing else.

## Out of scope

- Weekly/game-log stats, POST display, fantasy points.
- Contracts, historical rosters, draft picks, participation — they reuse
  `lib/nflverse/{csv,assets,crosswalk}.ts` and get their own specs (Phase D / Phase E).
- Any change to the ESPN ingest.
