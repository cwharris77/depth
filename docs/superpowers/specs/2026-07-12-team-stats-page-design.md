# Team stats page

Date: 2026-07-12
Status: approved (design)
Roadmap: Phase E / Future Ideas #3 ("Show coaches"), broadened in review. Supersedes the
*display* decision in `2026-07-07-phase-e-coaches-design.md` (coach was going to sit in the
field-view header; it moves to this new page instead). The storage decision from that spec
— `teams.coach_name` / `coach_espn_id` / `coach_experience`, populated by `toCoach` in the
ESPN ingest — is unchanged and is not re-litigated here.

## Goal

A dedicated team stats page: head coach + season record, reachable from the field view via
a header icon button. The field view (`DepthChartField`) goes back to showing only the
depth chart — no coach line competing with the team-switcher pill.

## Why the pivot

PR depth#95 shipped the coach line as a header subtitle under the wordmark. In review it
read as a floating, disconnected element no matter how it was grouped with the switcher
pill (three repositioning variants were mocked — grouped badge, two-line pill, icon tag —
and none of them earned their spot on the primary field view). The team already has a
natural second surface for this class of info: a stats page, which also gives win-loss
record somewhere to live.

## Verified source facts (2026-07-12, live-probed)

The standings endpoint the ingest already fetches for conference/division
(`site.api.espn.com/apis/v2/sports/football/nfl/standings?level=3`) has a `stats` array
per team entry with all of the following (`type` → `displayValue`, real data pulled live):

```
wins=14  losses=3  ties=0  winPercent=.824
streak=W3  playoffSeed=2
pointsFor=490  pointsAgainst=320  pointDifferential=+170
overall(total)=14-3  Home=6-3  Road=8-0  vs. Div.=5-1  vs. Conf.=9-3
divisionWins=5 divisionLosses=1 divisionTies=0
```

`overall`/`Home`/`Road`/`vs. Div.`/`vs. Conf.` are pre-formatted `"W-L"` strings
(`type: total/home/road/vsdiv/vsconf`); the rest are discrete numbers. `divisionWins`/
`divisionLosses`/`divisionTies` duplicate `vs. Div.` and are not stored separately.

## Decisions (locked)

| Decision | Choice | Why |
|---|---|---|
| Storage | New table `team_stats`, one row per team, PK `team_id references teams(id)`: `overall_wins int, overall_losses int, overall_ties int, win_percent numeric, home_wins int, home_losses int, road_wins int, road_losses int, division_wins int, division_losses int, conference_wins int, conference_losses int, points_for int, points_against int, point_differential int, streak text, playoff_seed int`. All nullable (missing standings entry → skip the row, never partial garbage). | A 1:1 side table, not more `teams` columns — mirrors `depth_chart_entries`/`special_teams_slots` already separating from `teams`. Keeps `teams` from growing into an identity+brand+coach+stats grab bag. Typed columns + generated types, no JSONB, matching house style. |
| Parsing | `lib/espn/standings.ts` gains `parseTeamStats(json: EspnStandings): Map<string, TeamStats>`, reading the same `EspnStandings` payload `parseStandings` already parses — one fetch, two pure extractions. `TeamStats` type lives in `standings.ts` next to the parser. | Zero new fetches; keeps the pure-extraction-with-fixture-test pattern the ingest already uses everywhere. |
| Ingest | `scripts/ingest-espn.mts`: after `parseStandings`, also call `parseTeamStats` on the same JSON; `writeTeam` (or a sibling `writeTeamStats`) upserts into `team_stats` keyed by `team_id`, `onConflict: 'team_id'`. Missing entry for a team → skip that team's stats row (no crash, no partial row). | Same idempotent-upsert shape as every other ingest write. |
| Read path | `RosterSource` (`lib/roster-source.ts`) gains `getTeamStats(id: string): Promise<TeamStats | undefined>`. Implemented in `lib/roster-source.db.ts`, one query against `team_stats` joined with the `teams` coach columns (`coach_name`, `coach_experience`) already shipped in depth#95 — the page needs team identity + coach + stats together. | Keeps the `RosterSource` seam intact (invariant 1) — the new page never queries Supabase directly. |
| Coach display | `Team.coach` field and the `DepthChartField` header line / `generateMetadata` sentence added in depth#95 are **removed**. Coach only renders on the new stats page. `toCoach`, the `coach_*` columns, and the ingest write are untouched — only the *display* wiring in `DepthChartField.tsx` and `app/team/[id]/page.tsx` reverts. | Per pivot decision above — coach doesn't belong on the field view. |
| Route | New page `app/team/[id]/stats/page.tsx`. Server component, same shape as `app/team/[id]/page.tsx`: fetch via `dbRosterSource.getTeamStats(id)` (+ `listTeams()` for the id→team lookup used by the header/back nav), `notFound()` on missing team. Static params via `generateStaticParams` mirroring the existing team route. | Real navigable/shareable URL, per review decision — not a sheet. Reuses the existing per-team prerender pattern. |
| Page content | In order: team name/colors header (reuse the existing team-color theming, `#0a0e1a` bg), head coach line (`HC {name} · {ordinal(experience)} season`, absent if no coach — same `ordinal()` from `lib/format.ts`), then a record section: overall record + streak prominent, then a stat grid (home/road, div/conf, PF/PA, point differential, playoff seed). Any missing/null field (no `team_stats` row, or a null column) → that row/section omitted, never a placeholder dash grid. | Matches "untrusted/absent input degrades, never throws" (invariant 6) applied to a fully-null stats row (bye-week ingest gap, expansion team). |
| Entry point | New icon button in `DepthChartField`'s header row, alongside the existing search/share icon buttons (`lucide-react`, pick `BarChart2` or `ChartBar` — whichever `lucide-react` ships — to match the existing 14px icon-in-circle style). Links to `/team/${id}/stats`. | Confirmed in review: header icon button, not nav-drawer or pill-tap. |

## Files

- migration `<ts>_add_team_stats.sql` — new `team_stats` table, `enable row level
  security` + `"public read"` policy (same shape as the `teams` RLS policy — invariant
  10, anon reads this table too) + `npm run db:types`.
- `lib/espn/standings.ts` — `TeamStats` type + `parseTeamStats`, fixture test in
  `lib/espn/standings.test.ts` (present entry, entry with a missing/partial `stats`
  array, team id absent from standings entirely).
- `scripts/ingest-espn.mts` — call `parseTeamStats`, upsert `team_stats`.
- `lib/roster-source.ts` — `getTeamStats` on the `RosterSource` interface.
- `lib/roster-source.db.ts` — implementation, `Pick<>` row type + SELECT string.
- `app/team/[id]/stats/page.tsx` — new route + `generateStaticParams` +
  `generateMetadata` (title: `"{team} Stats · Depth"`).
- `components/DepthChartField.tsx` — add the stats icon button; **remove** the coach
  header line added in depth#95.
- `app/team/[id]/page.tsx` — **remove** the coach sentence from `generateMetadata`
  added in depth#95.
- `lib/types.ts` — **remove** `Team.coach` (moves to the `getTeamStats` return shape
  instead — coach is no longer part of `Team`/`TeamRoster`).
- `lib/espn/transform.ts` — `toTeamRoster` stops attaching `coach` to `Team`; `toCoach`
  itself (the ESPN-payload extractor) is untouched and still feeds the ingest write.

## Tests

`parseTeamStats`: present stats array (real fixture numbers above), missing `stats`
array on an entry, team id with no standings entry at all → not in the map.
`getTeamStats` (db read path): row present, row absent (unident team / pre-ingest),
individual null columns. Page-level: coach absent → coach line omitted, not blank.
Browser check at 390px: stats page layout, and the field-view header icon button
placement/tap target alongside search/share.

## Out of scope

Historical/prior-season stats (this is always current-season standings). Full staff
beyond head coach (unchanged from the coaches spec — no cheap source). A stats
comparison across teams (that's the existing `5d` compare-view spec's territory, not
this one).
