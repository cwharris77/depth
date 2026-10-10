# stat-files

The writer for the stat-history objects served from Cloudflare R2. It knows nothing about football — only the v1 object layout, gzip JSON encoding, cache headers, and change detection. The builders (career files, game logs) produce values and hand them to `createPublisher`; the iOS reader consumes the resulting objects.

## Layout

`layout.ts` is the single source of the key grammar, so every producer and the local server agree on it:

| Key | Object | Cache-Control |
| --- | --- | --- |
| `v1/manifest.json` | schema version, `generated_at`, per-source coverage, crosswalk misses | `public, max-age=3600` |
| `v1/players/{espn_id}/seasons.json` | one player's career ledger | `public, max-age=3600` |
| `v1/players/{espn_id}/games/{season}.json` | one player-season game log | current season `max-age=3600`, completed `max-age=604800` |
| `v1/players/{espn_id}/highlights.json` | one player's regular-season career highs with their league ranks | `public, max-age=3600` |
| `v1/records/{stat}.json` | league-wide single-game and single-season records for one stat | `public, max-age=3600` |
| `v1/teams/{team_id}/seasons.json` | one team's per-game lines, defense-allowed rates and ranks | `public, max-age=3600` |
| `v1/_build/season-rows/{season}.json` | publisher checkpoint (private) | `no-store` |
| `v1/_build/team-rows/{season}.json` | team-game checkpoint (private) | `no-store` |
| `v1/_build/record-rows/{season}.json` | record-row checkpoint (private) | `no-store` |
| `v1/_build/publish-index.json` | key → sha256 of the last uploaded body (private) | `no-store` |

Every served object is gzip JSON with `Content-Type: application/json` and `Content-Encoding: gzip`. `_build/*` is working state and is never cached. `cacheControlFor(key, currentSeason)` derives the header; `currentSeason` is the canonical `nflSeasonState()` value, never a source's own label. A breaking shape change bumps `STAT_FILES_SCHEMA_VERSION` and writes a new `v2/` prefix.

## Targets

`targets.ts` puts two stores behind the same `StatFileTarget` seam (`get` / `put`):

- `FileSystemStatFileTarget(root)` — for local runs with no Cloudflare credentials. Writes each gzip body to `<root>/<key>` plus a sidecar `<key>.headers.json`, so the local server can replay the exact headers a bucket would return.
- `R2StatFileTarget` / `r2StatFileTargetFromEnv()` — Cloudflare R2 over `@aws-sdk/client-s3`. The endpoint is `https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com`; credentials come from the environment only (`R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_ACCOUNT_ID`). Transient failures (5xx, throttling, dropped connections) are retried with linear backoff; a missing object returns `null` so it is treated as "not uploaded yet".

## Publishing

`publish.ts`'s `createPublisher(target, { currentSeason })` is the writer every stat file goes through. `put(key, value)` serializes deterministically, hashes the uncompressed body, skips the upload when the hash matches the last publish (`v1/_build/publish-index.json`), and otherwise gzips and writes with the right headers. `writeManifest(...)` writes `v1/manifest.json`; `flush()` persists the index and must be called once after all puts. The returned `uploaded` / `skipped` counts are what keeps a daily run far below R2's Class-A operation budget — an unchanged second publish uploads zero objects.

## Game logs

`stat-files:build` also writes `v1/players/{espn_id}/games/{season}.json` from the same weekly parse as the season ledgers (`player-games.ts`). One row per player-week (REG and POST, a traded player's weeks stay on the team played for), each carrying the same `box` / `snaps` / `pfr` / `ngs` / `qbr` sections as a season row; a source with no row that week omits its section. `game_id` and `opponent` come from the nfldata schedule keyed by (season, week, team); a week with no schedule match omits them. Pass `--no-games` to rebuild only the season ledgers. Seasons are processed one at a time, so memory stays bounded by one season's weekly rows.

## Team files

`stat-files:build -- --teams` also writes `v1/teams/{team_id}/seasons.json` (`team-seasons.ts`), keyed by our team id (`bills`, `rams`), from nflverse `stats_team_week`. The flag is off by default, and the scheduled workflow does not pass it; a manual dispatch with `team_files` set does. Seasons are listed newest first.

- **`games`** is source-faithful: per game `offense` (the team's own row), `allowed` (the opponent's offensive row for the same game, so no play-by-play fold is needed), `game_id`, `opponent`, `season_type` (REG or POST) and `week`. Source columns keep their nflverse names; a blank cell is omitted, never zero.
- **`derived`** is our arithmetic over regular-season games that have an allowed line; playoff games are never ranked. `allowed_per_game` holds per-game `passing_yards`, `rushing_yards`, `total_yards`, `passing_epa`, `rushing_epa`, plus `passing_epa_per_dropback` (over attempts plus sacks) and `rushing_epa_per_carry`. A metric is omitted when any contributing game lacks an input, so a gap reads as absent rather than a smaller total.
- **`ranks`** put 1 on the team that allowed the least (rank 4 of 32 is the fourth-best defense, rank 29 the fourth-worst); ties share a rank. A team needs at least two games to be ranked, and `ranked_teams` is the denominator. `derived.recent` repeats the rates and ranks over the team's last three regular-season games (`recent_window` in the file), with `through_week` marking where the window ends.
- **Coverage.** `stats_team_week` has every game paired and all 32 teams from 2003; 1999-2002 have blank team cells, unpaired games or a missing franchise, so the floor is 2003 and the manifest records the seasons actually built.
- **Checkpoints and guard.** Each season's team-games are stored at `v1/_build/team-rows/{season}.json` and run through the same shrink guard as player seasons. A season with no stored team checkpoint is built from source instead of failing the run, since the source is one small file per season.

## Record and highlight files

`stat-files:build -- --records` also writes `v1/records/{stat}.json` for six stats (`passing_tds`, `passing_yards`, `receiving_tds`, `receiving_yards`, `rushing_tds`, `rushing_yards`) and `v1/players/{espn_id}/highlights.json` (`records.ts`), computed from nflverse `stats_player_week`. The flag is off by default for hand runs; the scheduled workflow always passes it, and a manual dispatch passes it when `record_files` is set. These are derived values, kept apart from the source-faithful career and game-log files, and every file states its `scope`, `source` and `coverage` (`from_season`, `to_season`).

- **Scope.** Regular season only. Playoff games are never ranked, and a stat a game lacks is absent, never zero. `coverage.from_season` is the first season of the weekly source (1999), so a rank means "since that season", never all time.
- **Performances.** A single game is one player-team-week. A single season is one player-team-season total, so a traded player has one season mark per team (the career ledger's one-row-per-team rule) and a season mark never adds games played for two clubs together.
- **Ranks.** 1 is the best value and ties share a rank. `players_at_or_above` counts distinct players whose best performance reaches the value, which is what "only N players have done it" needs. In a highlight, `all_time_rank` compares each player's best across players, and `team_rank` compares each player's best with that team (omitted when the team is unknown).
- **League files.** Each stat file holds `single_game` and `single_season` sections: `top` lists performances through rank 25 (ties at the cutoff included), and `thresholds` counts performances and distinct players at fixed milestones (`RECORD_THRESHOLDS` in `records.ts`).
- **Highlights.** One file per player with at least one positive mark, keyed by stat then kind, carrying the value, season, week and opponent for a game, and both ranks.
- **Checkpoints and guard.** Each season's record rows are stored at `v1/_build/record-rows/{season}.json` and run through the shrink guard. Ranks need every season, so a season with no stored record checkpoint is built from source (one weekly file per season) instead of failing the run; the first dispatch backfills every season on its own.

## Publishing to R2

```
npm run stat-files:build -- --target r2 --bucket <bucket> --seasons 1999-2026   # backfill
npm run stat-files:build -- --target r2 --bucket <bucket>                       # daily window
```

Credentials come from `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID` and `R2_SECRET_ACCESS_KEY`; `--bucket` sets `R2_BUCKET`. The `stat-files` job in `.github/workflows/ingest-nflverse.yml` runs this for the production bucket and then the staging bucket, independently of the Supabase ingest job.

- **Daily window.** With no `--seasons`, the build rebuilds the live season and the one just completed, and reads every other season's checkpoint (`v1/_build/season-rows/{season}.json`) from the bucket, so complete careers are rewritten without refetching 28 seasons of weekly files. A missing checkpoint fails the run with the backfill command; a partial career ledger is never published.
- **All or nothing.** Every season is built and checked before anything is uploaded. A failed source, a tripped shrink guard or a missing checkpoint uploads zero `v1/` objects and leaves the last good files served. The manifest uploads last.
- **Shrink guard** (`shrink-guard.ts`). Each rebuilt season is compared with the checkpoint it replaces: a completed season may lose at most 2% of its player rows and 10% of any field's non-null count, and an in-progress season may only grow. `--allow-shrink <season>` overrides one season and is recorded in the run's `errors`.
- **Raw archive** (`raw-archive.ts`). Every fetched source file is stored gzipped at `_raw/{source}/{season}/{asset}.gz` with a `.meta.json` (URL, fetch time, release `updated_at`, header columns, body hash), and an unchanged re-fetch writes nothing. `--from-raw` rebuilds from the archive without touching nflverse, byte-identical to the build that archived it.
- **Run record.** When `SUPABASE_URL` and `SUPABASE_SECRET_KEY` are set, each run inserts an `ingestion_runs` row with source `stat-files`: `uploaded`/`skipped` counts and per-source crosswalk misses in `errors`.

## Serving locally

```
npm run stat-files:build -- --seasons 1999-2026 --out .stat-files
npm run stat-files:serve
```

`stat-files:serve` starts a Node `http` server (no dependency) on `127.0.0.1:54330` over `.stat-files/`, replaying each sidecar's headers. Override with `-- --host <host> --port <port> --root <dir>`. Then:

```
curl -sD - http://127.0.0.1:54330/v1/manifest.json | gunzip
```

The `Content-Encoding: gzip` and `Cache-Control` in the response are the same ones a real bucket returns. `web/.stat-files/` is gitignored.

## Edge caching

The `stats` and `stats-staging` hostnames carry a Cloudflare Cache Rule (eligible for cache, edge TTL from the origin `Cache-Control`) covering `/v1/players/*`, `/v1/teams/*`, `/v1/records/*` and `/v1/manifest.json`, with Tiered Cache enabled. `_build/` and `_raw/` are outside the rule and are never edge-cached. A republished object can therefore stay stale at the edge for up to its TTL (an hour for current-season files and team files, a week for a completed season's game logs); after a correction backfill, purge the hostname under Caching → Configuration → Purge Cache.
