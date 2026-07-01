# ESPN roster data (Postgres-backed)

Rosters, depth order, photos, and team colors/logos are ingested from ESPN's
unofficial API into Postgres (Supabase project `jiqoaqmzmvtovimnmbzl`). The app reads
from the DB at request/build time via `dbRosterSource` (`lib/roster-source.db.ts`) —
there is no committed generated-data file anymore (that was the prior static-file
plan; this repo now ingests into a real database instead).

## Architecture

- `lib/espn/types.ts` — minimal types for the ESPN JSON we read.
- `lib/espn/positions.ts` — maps ESPN depthchart keys (`lde`, `rde`, `wr`, ...) and
  site-roster bio position abbreviations (`WR`, `OT`, ...) to our `Position` enum.
- `lib/espn/transform.ts` — pure functions joining the two ESPN endpoints (site roster
  for bios/photos, core depthcharts for position + rank) into our `TeamRoster` shape.
  Also exports `toDepthChartRows`, which re-ranks a position group 1..3 after ESPN's
  key-collapse (e.g. `lde`+`rde` both map to `DE`, each independently ranked) so the
  DB's `(team_id, position, depth_rank)` unique constraint never collides.
- `scripts/ingest-espn.mts` — fetches all 32 teams (skips Seahawks, see below), runs
  each through the transform, and upserts into `teams`, `players`,
  `depth_chart_entries`, and `special_teams_slots`. Writes one `ingestion_runs` row per
  full run (`started_at`/`finished_at`/`status`/`teams_written`/`errors`).
- `lib/roster-source.db.ts` — `dbRosterSource`, a `RosterSource` implementation that
  queries the DB and assembles the same `TeamRoster` shape the app already renders.

## Regenerate

```bash
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run ingest:espn
```

The service role key is required (bypasses RLS-equivalent restrictions for writes) and
must never be committed or exposed client-side. Run this by hand when rosters drift
(weekly in-season is reasonable). It is **not** part of `next build` — ESPN's API is
unofficial and can change shape; a failed ingestion should never block a deploy, only
leave the DB one run stale.

## How it works

- Site roster API (`site.api.espn.com/.../teams/{abbr}/roster`) → bios, jersey, age,
  college, experience, height, weight, status, headshot. Flat list, no depth order.
- Core depthcharts API (`sports.core.api.espn.com/.../depthcharts`) → position + rank
  order, players as `$ref` URLs. Joined to the site roster by athlete id (parsed from
  the `$ref`).
- Team list API (`site.api.espn.com/.../teams`) → brand colors + logos + numeric ESPN
  team ids, resolved by abbreviation (with one alias: our `WAS` == ESPN's `WSH`).
- A KR/PR/K/P/LS can be a player ranked outside the normal top-3-per-position cap
  (e.g. a low-depth-chart WR who's still the primary punt returner) — `toTeamRoster`
  adds them to `players` anyway via a bio-position fallback, so `specialTeams` never
  references a player missing from the roster (and the DB's
  `special_teams_slots.player_id` foreign key never breaks).
- `uiAccent`/`onAccent` stay hand-curated per team (not sourced from ESPN) for
  dark-UI contrast; `toTeamColors` merges them with ESPN's `primary`/`secondary`.

## Seahawks stays hand-authored

`lib/teams/seahawks.ts` is the showcase team with richer bios/stats and is
intentionally excluded from ingestion. `dbRosterSource.getTeam("seahawks")` checks the
DB first (in case it's ever ingested later) and falls back to the hand-authored data.

## Fallback behavior

`dbRosterSource.getTeam(id)`:

- Known team in the DB → assembled from Postgres.
- `"seahawks"`, not yet in the DB → hand-authored `SEAHAWKS` roster.
- Any other id not in the DB (not yet ingested) → `undefined` (404), same as an
  unknown id. There is no static-file fallback for the other 31 teams in this
  DB-first architecture — run `npm run ingest:espn` before `next build`/`next dev` if
  the DB is empty.

## Environment variables

See `.env.local.example`:

- `SUPABASE_URL` / `SUPABASE_ANON_KEY` — used by the app (`dbRosterSource`) for reads.
  Safe to commit (the example file's values are this project's real anon/publishable
  key and URL — anon key is public-safe by design).
- `SUPABASE_SERVICE_ROLE_KEY` — used only by `scripts/ingest-espn.mts` for writes.
  Secret. Never commit; put the real value in your local `.env.local` (gitignored).

## Deferred: scheduling

This task does **not** implement automatic/nightly ingestion. `scripts/ingest-espn.mts`
is run by hand today. Follow-up options for scheduling it:

- **Supabase Edge Function + `pg_cron`**: deploy `ingest-espn.mts`'s logic as an Edge
  Function (Deno-compatible fetch/upsert calls), then schedule it with
  `pg_cron`/`pg_net` inside the Supabase project itself. Keeps the schedule
  co-located with the data; needs the transform logic ported to Deno-friendly imports
  (or bundled) since Edge Functions don't share this repo's Node toolchain directly.
- **External scheduler** (e.g. GitHub Actions cron, a small VM cron job, or a
  serverless cron trigger) calling `npm run ingest:espn` in this repo on a schedule
  (e.g. weekly during the season). Simpler to wire up since it reuses the existing
  script verbatim, but requires a place to run Node with the service role key as a
  secret.

Either approach needs: a secret store for `SUPABASE_SERVICE_ROLE_KEY`, alerting on a
`status: 'failure'` `ingestion_runs` row, and a decision on cadence (weekly is likely
sufficient outside of injury-report-heavy weeks).

## Deferred: RLS policies

All tables currently have RLS disabled (flagged by Supabase's advisor). This is
deliberate for now — auth/policy design is a separate phase. Do not enable RLS without
also adding read policies for the anon role used by `dbRosterSource`, or the app will
break.
