# Multi-season team stats

Date: 2026-07-14
Status: approved (design)
Roadmap: extends `2026-07-12-team-stats-page-design.md` (Phase E stats page). That spec
explicitly scoped out "historical/prior-season stats" — this spec is the follow-up that
adds it, driven by an imported design (`claude.ai/design` project "Team stats page
redesign", file `Team Stats.dc.html`) with a 3-season switcher.

## Why the pivot

The imported mockup redesigns the stats page around a season switcher (2024/2025/2026
chips) with a different record/streak/seed/breakdown per season. The existing
`team_stats` table is 1:1 with `teams` (current season only) — cannot represent that.
Cooper confirmed (2026-07-14) he wants real historical data, not a stub/disabled
switcher, so this is a schema change plus an ingest change, not just a UI reskin.

## Verified source facts (2026-07-14, live-probed)

- `site.api.espn.com/apis/v2/sports/football/nfl/standings?level=3` accepts an explicit
  `season=YYYY` query param and returns the same shape (`children` → conferences →
  divisions → `standings.entries[]`) for any season back to at least 2002. Each
  division node carries `standings.season` (the year that block's records belong to) —
  read directly instead of trusting the top-level document `season` field, which
  reflects the *upcoming* season once the current one has ended (verified: on
  2026-07-14, the unparameterized call embeds `standings.season: 2025` per division
  even though the document-level `season.year` is 2026).
- The site roster endpoint (`site.api.espn.com/.../teams/{abbr}/roster?season=YYYY`)
  that supplies head-coach data does **not** vary its `coach` array by the `season`
  param — it always returns the current coach regardless of what season is requested
  (verified against SEA for seasons 2020/2022/2023/2024/2025: identical
  `Mike Macdonald, experience: 2` every time). This matches the original coaches
  spec's "ESPN doesn't expose the rest of the staff cheaply" note, extended to mean
  there's no cheap *historical* coach either.

## Decisions (locked)

| Decision | Choice | Why |
|---|---|---|
| Storage | `team_stats` gets a new `season int not null` column; primary key changes from `team_id` alone to `(team_id, season)`. Existing single rows (which reflect ESPN's current unparameterized fetch) are backfilled to `season = 2025` — the value verified live above. | Minimal migration on an already-live table; composite PK is the natural shape for "N rows per team, one per season," matching the `depth_chart_entries`/`special_teams_slots` per-team-multi-row pattern already in this schema. |
| Seasons fetched | Ingest determines the latest completed/in-progress season `Y` from the unparameterized standings call's embedded `standings.season` (not hardcoded), then also fetches `season=Y-1` and `season=Y-2` explicitly — 3 standings calls total, 3 rows written per team. | Matches the 3-chip mockup. Deriving `Y` from the response (not a hardcoded year) means next year's ingest naturally rolls the window forward with zero code change — same "live-sourced, not hand-curated" principle as `lib/teams/league.ts`. |
| Parsing | `parseTeamStats` (`lib/espn/standings.ts`) reads `season` off each division's `standings.season` and includes it on every returned `TeamStats`. A division block missing `standings.season` skips all its entries (same "skip rather than half-fill" rule as a missing stat field). `TeamStats.season: number` is now part of the type in `lib/types.ts`. | One parse still handles any season's payload — no separate historical parser. |
| Coach display | **Not** coupled to the season switcher. The stats page still shows one coach line, sourced from `teams.coach_name`/`coach_experience` (current coach, unchanged from the 2026-07-12 spec) regardless of which season chip is selected. | Per the verified fact above, ESPN gives no real historical coach signal — faking a per-season coach would be hand-authored data pretending to be ingested fact, which invariant 6/9 style guidance (real data only, never hand-patch) rules out. This is a deliberate, scoped deviation from the mockup's per-season coach line. |
| Ingest write | `writeTeamStats` takes the array of up to 3 `TeamStats` for a team and upserts each row with `onConflict: 'team_id,season'`. A season with no complete entry for that team is skipped for that row only (same partial-skip rule, now per-season instead of per-team). | Same idempotent-upsert shape, extended to a multi-row case. |
| Seed script | `lib/espn/seed-sql.ts` `SeedEntry.stats` becomes `TeamStats[]`; the `team_stats` INSERT gains a `season` column and its conflict target becomes `team_id,season`. Regenerate `supabase/seed.sql` via `npm run gen:espn-seed` (it already predates this table's data — 0 rows currently — so this is a clean regen, not a diff). | Keeps the offline `supabase db reset` snapshot in sync with the ingest, as before. |
| Read path | `RosterSource.getTeamStats` return shape changes: `TeamStatsPage.stats?: TeamStats` becomes `TeamStatsPage.seasons: TeamStats[]` (possibly empty, never undefined — "no seasons" is an empty array, not a missing field, since the page always needs to know it has zero to render the "no stats" fallback). Ordered newest-season-first. `lib/roster-source.db.ts` queries `team_stats` by `team_id` only (no `.maybeSingle()`), ordered `season desc`. | Keeps the `RosterSource` seam intact (invariant 1); callers get a ready-ordered list instead of re-sorting. |
| UI | `app/team/[id]/stats/page.tsx` stays a server component (fetch via `dbRosterSource.getTeamStats`), rendering a new client component (`components/TeamStatsView.tsx`) that owns the season-switcher `useState` and renders the selected season's stats. Layout follows the imported mockup: brand ticker strip (back link + "SEASON STATS"), season switcher chips, team name + single coach line, hero record + streak + seed, HOME/ROAD/DIV/CONF/PF/PA/DIFF breakdown table, footer ticker line. | Matches invariant 5 (client component receives one team's resolved data as a prop) — the season array for one team is small (3 rows), not a fan-out concern. |
| Color mapping | Ticker strip background uses `team.colors.primary` (a large controlled surface, invariant 4) with `readableTextOn(team.colors.primary)` for its text (mirrors the OG-card pattern in `lib/colors.ts`, since not every team's primary is bright enough for fixed dark text like the mockup assumes). Season-chip fill/border, hero record, streak, diff coloring, and the back-link all use `team.colors.uiAccent`/`onAccent` (curated for the dark `#0a0e1a` body — invariant 4). | The mockup hardcodes `#0a0e1a` text on the ticker and a single `accentColor` prop for everything; real team primaries aren't uniformly bright, so the large-surface strip needs a computed contrast color instead of an assumption baked into the mockup's default palette. |
| Footer ticker copy | Current/latest season (has a `week` signal unavailable in this data model) always renders `"{season} SEASON · {games played} GAMES PLAYED ▸▸▸"` — the mockup's week-based "STANDINGS UPDATED WK N" copy is dropped since the ingest has no per-week signal, only a season snapshot. | No fabricated data; same "degrade, don't fake" principle. |

## Files

- migration `<ts>_team_stats_multi_season.sql` — add `season`, backfill to 2025, drop
  old PK, add composite PK `(team_id, season)`. `npm run db:types` rerun, regenerated
  types committed in the same PR.
- `lib/types.ts` — `TeamStats` gains `season: number`.
- `lib/espn/standings.ts` — `parseTeamStats` reads `standings.season` per division.
- `lib/espn/standings.test.ts` — fixture gains `standings.season`; new case for a
  division missing `season` entirely (skip its entries).
- `scripts/ingest-espn.mts` — fetch `season=Y`, `season=Y-1`, `season=Y-2`; multi-row
  `writeTeamStats`.
- `lib/espn/seed-sql.ts` — `SeedEntry.stats: TeamStats[]`, `season` column, new
  conflict target. Regenerate `supabase/seed.sql`.
- `lib/roster-source.ts` — `TeamStatsPage.stats` → `TeamStatsPage.seasons: TeamStats[]`.
- `lib/roster-source.db.ts` — multi-row query, `TEAM_STATS_SELECT` gains `season`,
  ordered `season desc`.
- `app/team/[id]/stats/page.tsx` — server fetch, renders `TeamStatsView`.
- `components/TeamStatsView.tsx` — new client component, season-switcher state +
  the redesigned layout.

## Tests

`parseTeamStats`: season read from `standings.season`; division missing `season`
entirely → its entries excluded. `getTeamStats` (db read path, if covered): multiple
season rows returned newest-first; zero rows → empty `seasons` array, not a throw.
Browser check at 390px: season-chip switching updates the hero record/breakdown table
without a page reload; ticker-strip contrast on a team with a dark primary (e.g. a
black/navy-primary team) and a bright one.

## Out of scope

Per-season coach (no cheap ESPN source — see verified facts). Seasons beyond the
3-season window (current + 2 prior) — no pagination/"load more" UI. Postseason-only
records (the standings endpoint's `seasonType` stays regular-season, matching the
existing single-season page's behavior).
