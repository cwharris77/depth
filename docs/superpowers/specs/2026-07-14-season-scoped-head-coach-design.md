# Season-scoped head coach

Date: 2026-07-14
Status: approved (design + implemented)
Roadmap: fixes a bug found by Cooper testing `2026-07-12-team-stats-page-design.md` +
`2026-07-14-multi-season-team-stats-design.md` — the stats page season switcher showed
the *current* head coach for every season (e.g. Bears showing Ben Johnson, hired 2025,
on the 2023 and 2024 season chips). Supersedes two prior locked decisions; see below.

## Why this reverses two earlier decisions

Both `2026-07-07-phase-e-coaches-design.md` ("coach history across seasons" — out of
scope) and `2026-07-14-multi-season-team-stats-design.md` ("Coach display: not coupled
to the season switcher") deliberately rejected season-scoped coach data, because the
live-probed fact at the time was: ESPN's roster endpoint (`.../teams/{abbr}/roster?
season=YYYY`) does not vary its `coach` array by the `season` param — no cheap
*ingested* historical signal exists, and faking one would violate "real data only, never
hand-patch" (invariant 6/9 spirit).

That constraint hasn't changed — there is still no ESPN historical-coach feed. What
changed is the decision about what to do with it: rather than leaving the field
misleading (the bug Cooper hit), curate it by hand, the same way the uniforms archive
curates data ESPN doesn't give cheaply (invariant 9: append-only, provenance-scoped,
every row's source stated). This is a deliberate, explicit override of the prior
"out of scope" lines, not drift.

## Data source

No historical-coach API exists (reconfirmed). Sourced by hand, 2026-07-14, against:
- Wikipedia's [List of current NFL head coaches](https://en.wikipedia.org/wiki/List_of_current_National_Football_League_head_coaches)
  — gives each current coach's hire year, which fixes the season boundary between the
  current coach and their predecessor.
- Team-specific head-coach history pages (e.g. *List of New York Giants head coaches*)
  and contemporaneous reporting (NFL.com, ESPN, CNN) for coaches no longer with a team,
  including in-season firings — verified by reading rendered page text in a browser, not
  a single-pass summarized fetch (an early WebFetch summarization pass produced garbled
  coach/team pairings and was discarded before any of it reached this doc).

**Methodology for in-season coaching changes**: a season's row credits whoever coached
the *majority* of that season's games (e.g. Bears 2024 stays Matt Eberflus, fired after
game 12 of 17; Jets 2024 and Saints 2024 go to the interim who finished the season,
since the fired coach lasted only 5 and 8 games respectively). This is a judgment call,
flagged as such in the seed migration, unlike every ESPN-sourced field in this schema.

## Decisions (locked)

| Decision | Choice | Why |
|---|---|---|
| Storage | New table `team_coach_seasons(team_id, season, coach_name, coach_experience, source, updated_at)`, PK `(team_id, season)`. `teams.coach_name/coach_espn_id/coach_experience` (unchanged) stays the ESPN-ingested *current* coach — nothing else reads it today, but it's still what the weekly ingest writes and isn't touched by this change. | A new table, not a column on `team_stats`, because it has its own writer/lifecycle (hand-curated, append-only) distinct from `team_stats` (ESPN-ingested, weekly-refreshed) — mixing them would blur which columns invariant 3/9 apply to. |
| Backfill scope | Seeded for exactly the 3 seasons `team_stats` currently covers (2023–2025), all 32 teams — 96 rows, one migration. | Matches the existing season window; no point curating seasons the stats page can't show. |
| Read path | `TeamStats.coach?: { name, experience }` (season-scoped, on the season object) replaces `TeamStatsPage.coach` (team-level, was ESPN-sourced). `lib/roster-source.db.ts`'s `fetchTeamStatsPage` adds a third query (`team_coach_seasons` by `team_id`), builds a `Map<season, row>`, and `toTeamStats` looks up its own season. A season with no curated row (not yet backfilled, e.g. next year before someone appends it) has `coach: undefined` — same degrade-don't-fake rule as every other optional field on `TeamStats`. | Keeps the `RosterSource` seam intact; the coach is exactly as season-scoped as the record it sits next to. |
| Display | `components/TeamStatsView.tsx` reads `active.coach` (the selected season's row) instead of a `coach` prop threaded separately — switching the season chip now switches the coach line along with the record. | Was the whole point of the fix — the two must move together. |
| Maintenance | Not self-updating. The next migration that rolls the 3-season window forward (2026 becomes "prior" once its standings are final) must also append that season's 32 curated rows — noted in the seed migration's header comment. | Same append-only expectation as the uniforms archive; no code can auto-derive this without an ESPN historical feed. |

## Files

- `supabase/migrations/20260714130000_add_team_coach_seasons.sql` — schema + RLS
  (public-read policy in the same migration, invariant 10).
- `supabase/migrations/20260714140000_seed_team_coach_seasons.sql` — the 96 curated rows,
  source citations and in-season-change methodology in the header comment.
- `lib/database.types.ts` — regenerated via `npm run db:types` against the local DB with
  both migrations applied.
- `lib/types.ts` — `TeamStats.coach?`.
- `lib/roster-source.ts` — `TeamStatsPage.coach` removed (moved onto `TeamStats`).
- `lib/roster-source.db.ts` — `team_coach_seasons` query + `toTeamStats` lookup.
- `components/TeamStatsView.tsx`, `app/team/[id]/stats/page.tsx` — read `active.coach`,
  drop the standalone `coach` prop.

## Tests

`npx tsc --noEmit` clean; `npm test` (735 passed / 9 skipped, no regressions — this
change didn't add new pure-logic branches worth a dedicated unit test beyond the
existing `toTeamStats`/`fetchTeamStatsPage` coverage, since the lookup is a plain map
`get`). Verified live: switched seasons on Bears (Matt Eberflus 2023/2024 → Ben Johnson
2025), Panthers (Frank Reich 2023 → Dave Canales 2024/2025), and Raiders (Antonio Pierce
2023/2024 → Pete Carroll 2025) in the running dev server — see PR body for the browser
check.

## Addendum: incoming coach with no season yet

Found in review (Cooper, 2026-07-14): a team that just hired a new HC before that
person has coached a game shows up in ESPN's live data as `teams.coach_experience: 0`
(e.g. Bills → Joe Brady, hired for 2026). The initial version of this fix simply had no
row for that person in `team_coach_seasons` (correctly not attached to 2023–2025), but
gave no positive signal either — worth naming explicitly rather than leaving silent.

| Decision | Choice | Why |
|---|---|---|
| Detection | `coach_experience === 0` on the live `teams` row (no separate curation — this is exactly what invariant 6's "degrade, don't fake" is for, but inverted: the live ESPN signal itself already distinguishes "hired, zero seasons coached" from every other value). | Generalizes to any team a coaching change hits, not just the Bills; zero curation lag. |
| Storage/read path | `TeamStatsPage.incomingCoach?: { name }` — a new field alongside `seasons`, computed in `fetchTeamStatsPage` from the same `teams` row already queried (re-adds `coach_name`/`coach_experience` to that query's `select`, which the original version of this fix had dropped). No new table. | It's live ESPN data, not hand-curated, so it doesn't belong in `team_coach_seasons`. |
| Display | A dashed-border chip is prepended to the season switcher, labeled the next season (`seasons[0].season + 1`, or "NEW" if `seasons` is empty). Selecting it (index `-1` in `TeamStatsView`'s season index scheme) swaps the hero record + breakdown table for a plain "New head coach / No games played yet this season" message — never a fabricated 0-0 record. Not selected by default; the page still opens on the latest played season. | Visually distinct from a real season (dashed vs. solid border) since it isn't one; message-only body since there's nothing real to show yet. |

### Files (addendum)

- `lib/roster-source.ts` — `TeamStatsPage.incomingCoach?`.
- `lib/roster-source.db.ts` — `fetchTeamStatsPage` re-select `coach_name`/`coach_experience`
  from `teams`, derive `incomingCoach`.
- `components/TeamStatsView.tsx`, `app/team/[id]/stats/page.tsx` — the incoming chip and
  its message-only render branch.

### Tests (addendum)

`npx tsc --noEmit`, `npm run format:check`, `npm test` all clean (no new pure-logic
branch worth a dedicated unit test — the derivation is a single equality check already
covered by the manual verification below). Verified live: Bills opens on 2025 (Sean
McDermott · 9th season) with a dashed "2026" chip present; selecting it shows "HC Joe
Brady · Incoming" / "New head coach" / "No games played yet this season." Bears (no
incoming-coach signal) shows no fourth chip, confirming the addition doesn't affect
teams without a pending coaching change.

## Out of scope

Coordinators/full staff (still no cheap source — unchanged from the original coaches
spec). Seasons before 2023 or after the current 3-season window. Making
`teams.coach_name` (the ESPN-ingested current coach) season-aware or removing it — it's
still read (now for the incoming-coach signal) but out of scope to restructure further.
