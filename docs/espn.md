# ESPN data ingestion (Postgres-backed)

Rosters, depth order, photos, team colors/logos, coaches, and multi-season team stats
are ingested from ESPN's unofficial API into Postgres (Supabase project
`jiqoaqmzmvtovimnmbzl`). The app reads
from the DB at request/build time via `dbRosterSource` (`lib/roster-source.db.ts`) —
there is no committed generated-data file anymore (that was the prior static-file
plan; this repo now ingests into a real database instead).

## Architecture

- `lib/espn/types.ts` — minimal types for the ESPN JSON we read.
- `lib/espn/positions.ts` — maps ESPN depthchart keys (`lde`, `rde`, `wr`, ...) and
  site-roster bio position abbreviations (`WR`, `OT`, ...) to our `Position` enum.
- `lib/espn/standings.ts` — `parseStandings`: one standings fetch → every ESPN team id
  mapped to its `{conference, division}`, so conf/div is ESPN-sourced. `parseTeamStats`:
  the same fetch (current season, plus two explicit `?season=` fetches for prior years)
  also carries each team's win/loss/points record, parsed into `TeamStats[]` per ESPN
  team id.
- `lib/teams/league.ts` — a build-time identity seed (id/city/name/abbrev + placeholder
  rosters used only as test fixtures) the ingest loops over. Everything live (colors,
  conf/div, rosters) comes from ESPN, not here.
- `lib/espn/transform.ts` — pure functions joining the two ESPN endpoints (site roster
  for bios/photos, core depthcharts for position + rank) into our `TeamRoster` shape.
  Also exports `toDepthChartRows`, which re-ranks a position group 1..3 after ESPN's
  key-collapse (e.g. `lde`+`rde` both map to `DE`, each independently ranked) so the
  DB's `(team_id, position, depth_rank)` unique constraint never collides.
- `scripts/ingest-espn.mts` — fetches all 32 teams, runs each through the transform,
  and upserts into `teams` (including coach fields), `players`, `depth_chart_entries`,
  `special_teams_slots`, and `team_stats` (one row per team per season). Writes one
  `ingestion_runs` row per full run (`started_at`/`finished_at`/`status`/
  `teams_written`/`errors`).
- `lib/roster-source.db.ts` — `dbRosterSource`, a `RosterSource` implementation that
  queries the DB and assembles the same `TeamRoster` shape the app already renders.
- `lib/database.types.ts` — generated `Database` type (see "Generated types" below).
  Both the ingestion script and `dbRosterSource` are typed against it instead of `any`
  or hand-maintained row interfaces.

## Generated types

`lib/database.types.ts` is generated, not hand-written — **regenerate it after any
migration change** (a new/changed column, table, or type won't show up otherwise, and
row-shape mismatches only surface as a runtime error, not a type error, until you do):

```bash
npm run db:types
```

This runs `supabase gen types typescript --local`, so it reads from your **local**
Postgres (the one `supabase/migrations/` builds), not the hosted project — local
migrations are the schema's source of truth, and generating from local means anyone
can regenerate without hosted project access. Commit the regenerated file in the same
PR as the migration that changed the schema.

`db:types` (and the other local-Postgres commands below) assume a local Supabase
stack is already up — start it first with `supabase start`; there's no auto-start
wired into the script.

## Running the app against local Supabase

By default `.env.local.example`'s `SUPABASE_URL`/`SUPABASE_PUBLISHABLE_KEY` point at
the hosted prod project (`jiqoaqmzmvtovimnmbzl`), so `npm run dev` reads/writes prod
data unless you point it elsewhere. To run `next dev` fully against a local Supabase
instance instead (no prod credentials, no risk of a local test touching hosted data):

```bash
supabase start   # first run pulls Docker images; can take a few minutes
```

This applies every migration in `supabase/migrations/` and then auto-seeds from
`supabase/config.toml`'s `[db.seed] sql_paths` — `seed.sql`, `seed-nflverse.sql`,
`seed-roster-history.sql` in that order (the file's comment explains the FK
ordering: `seed.sql`'s teams/players must load before the other two, which
reference them). All three run automatically on both `supabase start` and
`supabase db reset` — no manual combining or separate step needed.

`supabase start` prints an API URL and keys block, e.g.:

```
API URL: http://127.0.0.1:54321
anon key: eyJhbGciOi...
```

(`supabase status` reprints the same block later.) Copy the local `anon key` — it's
what `SUPABASE_PUBLISHABLE_KEY`/`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` expect, despite
the CLI's older "anon key" label. Then in `.env.local`, uncomment the "Local Supabase"
block in `.env.local.example` (or hand-edit) so it overrides the prod defaults:

```bash
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_PUBLISHABLE_KEY=<anon key from `supabase start`/`supabase status`>
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<same anon key>
```

Restart `npm run dev` after editing `.env.local` (Next.js only reads env files at
startup). `SUPABASE_SECRET_KEY` (for `npm run ingest:espn`) has a local equivalent too
— `supabase status` prints a `service_role key` — but ingesting against local Postgres
means overwriting your local seed data with a live ESPN pull, which is rarely what you
want; the checked-in seed files already give you a full local dataset.

Stop the stack with `supabase stop` when done (`supabase stop --no-backup` also drops
the local DB volume, forcing a fresh `supabase start` re-seed next time).

**iOS**: unlike web, native Debug builds/tests point at local Supabase by default —
`ios/xcconfig/Debug.xcconfig` bakes in `http://127.0.0.1:54321` and the CLI's
deterministic local publishable key (same value on every machine, derived from
`supabase/config.toml`'s `project_id` + the CLI's default JWT secret — not a
per-developer secret). Run `supabase start` before building/testing the app in
Xcode/Simulator, same as web. `ios/xcconfig/Staging.xcconfig` still points at prod
(`TODO(DEP-40 Lane B)`) until a hosted staging Supabase project exists.

## Regenerate

```bash
SUPABASE_URL=... SUPABASE_SECRET_KEY=... npm run ingest:espn
```

The service role key is required (bypasses RLS-equivalent restrictions for writes) and
must never be committed or exposed client-side. Run this by hand when rosters drift
(weekly in-season is reasonable). It is **not** part of `next build` — ESPN's API is
unofficial and can change shape; a failed ingestion should never block a deploy, only
leave the DB one run stale.

## How it works

- Site roster API (`site.api.espn.com/.../teams/{abbr}/roster`) → bios, jersey, age,
  college, experience, height, weight, status, headshot, and head coach (`toCoach`).
  Flat list, no depth order.
- Core depthcharts API (`sports.core.api.espn.com/.../depthcharts`) → position + rank
  order, players as `$ref` URLs. Joined to the site roster by athlete id (parsed from
  the `$ref`).
- Team list API (`site.api.espn.com/.../teams`) → brand colors + logos + numeric ESPN
  team ids, resolved by abbreviation (with one alias: our `WAS` == ESPN's `WSH`).
- Standings API (`site.api.espn.com/apis/v2/.../standings?level=3`) → conference +
  division for every team in one call. `parseStandings` (`lib/espn/standings.ts`) maps
  each ESPN team id → `{conference, division}`; the ingest writes these, so conf/div is
  ESPN-sourced, not hand-curated. `lib/teams/league.ts` is now just an identity seed
  (id/city/name/abbrev) the ingest loops over. The same fetch (plus one explicit
  `?season=` call for the prior year, unflagged -- this + last season) also carries
  each team's win/loss/points record, which `parseTeamStats` still parses in full --
  but as of the DEP-146 re-own the ingest writes only **`playoff_seed`** from it. Every
  W-L column in `team_stats` is nflverse's now, computed REG-only from game rows
  (`lib/nflverse/records.ts`). Reason: this endpoint aggregates whatever season type is
  currently live, with no way to tell from the response which it was, so through August
  it reports *preseason* games as the season record (DEP-200 -- observed 2026-08-21,
  every team carrying a preseason W-L weeks before Week 1). Playoff seed has no nflverse
  equivalent, so it stays here. The two ingests share each `team_stats` row via
  column-scoped upserts: PostgREST's on-conflict update only touches columns present in
  the payload, so neither clobbers the other's. A `--seasons` backfill widens the range
  (see Scheduling below).
- A KR/PR/K/P/LS can be a player ranked outside the normal top-3-per-position cap
  (e.g. a low-depth-chart WR who's still the primary punt returner) — `toTeamRoster`
  adds them to `players` anyway via a bio-position fallback, so `specialTeams` never
  references a player missing from the roster (and the DB's
  `special_teams_slots.player_id` foreign key never breaks).
- `uiAccent`/`onAccent` are derived from ESPN's own colors, not hand-curated:
  `toTeamColors` uses the real `secondary` as the accent, falls back to `primary` when
  the secondary is a neutral black/white (8 teams), with one override (Ravens → official
  gold, since both ESPN colors are too dark). `onAccent = readableTextOn(uiAccent)`.
- The ingest retries each fetch a few times with backoff — ESPN's unofficial API blips
  intermittently (a roster can 404 on one call, 200 the next), which would otherwise skip
  a team for the whole run.

## Fallback behavior

`dbRosterSource.getTeam(id)`:

- Known team in the DB → assembled from Postgres.
- Any team not in the DB (not yet ingested, or unknown id) → `undefined` (404). There
  is no hand-authored fallback for any team, including Seahawks — `lib/teams/seahawks.ts`
  was deleted once Seahawks joined the same live-ingestion path as the other 31 teams.
  Run `npm run ingest:espn` before `next build`/`next dev` if the DB is empty.

## Environment variables

See `.env.local.example`:

- `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY` — used by the app (`dbRosterSource`) for reads.
  Safe to commit (the example file's values are this project's real anon/publishable
  key and URL — anon key is public-safe by design). To read/write local Postgres
  instead of prod, override these with the local Supabase URL/key — see "Running the
  app against local Supabase" above.
- `SUPABASE_SECRET_KEY` — used only by `scripts/ingest-espn.mts` for writes.
  Secret. Never commit; put the real value in your local `.env.local` (gitignored).

## Scheduling (GitHub Actions)

Ingestion runs on a schedule via `.github/workflows/ingest-espn.yml`, which just runs
`npm run ingest:espn` verbatim — no separate copy of the logic. It's still not part of
`next build`; a failed ingestion leaves the DB one run stale, never blocks a deploy.

- **Cadence:** daily, `cron: '0 20 * * *'` (Noon PT — PST; cron doesn't shift for DST,
  so this lands around 1pm during PDT). Adjust the cron to change it.
- **Manual runs:** the workflow also has `workflow_dispatch`, so you can trigger it
  on demand from the repo's Actions tab (or `gh workflow run ingest-espn.yml`).
- **`team_stats` backfill:** with no `seasons` input, `ingest:espn` writes `team_stats`
  (win/loss record, points for/against, streak, playoff seed) for just the current
  season + the prior season (this + last season), same as always. A full-range backfill
  (e.g. `2002-2025` — the
  verified floor of ESPN's `standings?season=YYYY` endpoint) is a manual
  `workflow_dispatch` run with the `seasons` input, not a terminal command — from the
  Actions tab, "Run workflow" on `Ingest ESPN data` and fill in `seasons`, or
  `gh workflow run ingest-espn.yml -f seasons=2002-2025`. The input is passed as
  `--seasons` to `ingest:espn` (parsed by the same `parseSeasonsArg` the nflverse
  scripts use — `--seasons 2013` for a single year works too), fetched in small chunks
  rather than one giant burst of standings calls, with prod secrets already wired into
  the job. Rosters/depthcharts/coaches are unaffected by `seasons` — they're always
  current-only, `team_stats` is the only part that backfills. See
  `2026-08-19-espn-full-history-team-stats-design.md` (vault) for the full design.
- **Failure = red run:** the workflow sets `STRICT=1`, which makes the script exit
  non-zero on a **partial** run (some teams failed to write), not just a total failure.
  So a half-stale ingestion turns the run red and fires GitHub's built-in failure
  email, instead of silently going green. Hand-runs (no `STRICT`) stay lenient and
  exit 0 on partial. Every run still records one `ingestion_runs` row either way.
- **Overlap guard:** a `concurrency` group prevents two ingestions running at once.

### Required repo secrets

The workflow needs these under **Settings → Secrets and variables → Actions**:

- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY`

Without them the run fails loudly on the `requireEnv` check — the intended behavior,
not a silent no-op.

### Other options considered

- **Supabase Edge Function + `pg_cron`** — co-locates the schedule with the data but
  requires porting the transform to Deno (a second copy of the logic to keep in sync).
- **Vercel Cron** — would put the service-role key in the web runtime and fight
  serverless timeouts for a 30–60s, 32-team job.

GitHub Actions was chosen because it reuses the existing script with zero logic changes.

## RLS policies

**RLS is enabled on every table** (Phase C complete). Writes are unaffected throughout: the
ESPN ingest writes with the service-role key, which bypasses RLS.

- **Public base tables** — `teams`, `players`, `depth_chart_entries`, `special_teams_slots`,
  `uniforms` have a permissive `"public read"` policy (`select to anon, authenticated`), so
  `dbRosterSource` keeps reading them with the anon key. Enabling RLS **closed** the prior gap
  where the anon key could also write/delete them — there are no write policies, so anon writes
  are now denied. `ingestion_runs` is operational-only: RLS on, **no read policy**, so anon sees
  zero rows (nothing client-side reads it).
- **Per-user private tables** — `user_settings` and `depth_overrides` have owner-only policies
  (`auth.uid() = user_id`); `depth_overrides` additionally allows public read of a row **only
  when a `shared_boards` row references it** (share-by-reference). `shared_boards` is public-read
  with owner-only insert/delete.
