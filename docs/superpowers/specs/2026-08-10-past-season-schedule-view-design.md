# Past-season schedule view

Date: 2026-08-10
Status: approved (design)
Roadmap: extends the team schedule feature ([`2026-07-17-team-schedule-design.md`](2026-07-17-team-schedule-design.md),
vault ticket "Add team schedules page"). That spec explicitly scoped out a schedule **season
switcher** ("historic seasons are stored, but v1 renders only the latest; browsing prior
seasons is a later add on the stored data") and the data backfill spec `2026-08-01-historic-
nflverse-coverage-design` (vault `Projects/depth/specs/`) flagged the same UI gap as a
separate follow-up. This spec is that follow-up: `games`/`schedules` now carry full
1999–present history (depth#241's `--seasons` backfill), and nothing in the UI reads it.

## Why this shape

The SCHEDULE tab has always rendered one season — whatever `getTeamSchedule(id)` returns
(the latest season present for the team). The read layer already accepts an optional
`season` arg and degrades to `null` on a season with no games, so this is a UI surface,
not data plumbing. The open questions were settled by leaning on the precedent the depth
chart's Phase D1 season picker already established in this app.

## Decisions (locked)

| Decision | Choice | Why |
|---|---|---|
| **Picker placement & pattern** | Reuse the depth chart's `SeasonSheet` (Phase D1) inside a `BottomSheet`, triggered from the schedule page's season-label row — the "{season} SEASON" line becomes a tappable control (History icon + season + chevron) that opens the sheet. | `SeasonSheet` already renders exactly the content this page needs (current-season row + descending past rows, active-row check, accent tinting) inside `BottomSheet`'s flex column; it takes `currentSeason`/`minSeason`/`activeSeason`/`accent`/`onSelect`/`onClose` — no fork needed. The season label row is where a schedule-season picker belongs; it is the one piece of chrome the page already has above the grid. |
| **URL/state persistence** | `?season=<year>` query param on `/team/[id]/schedule`, shareable and kept in the URL — matching how SeasonSheet's selection works on the depth chart (`?season=` written via `router.replace`, applied on mount/Back-Forward by the existing `ApplySeasonFromQuery`). **Not** the formations picker's component-state-only precedent, and not a nested `/schedule/[season]` route segment. | A past season is a linkable fact (same rationale as the depth chart's Phase D1 locked decision); local-only state would make a viewed 2010 season unshareable. A nested route segment was rejected because it forks the tab's URL shape for the sake of static generation that a query param + client fetch already preserves. |
| **How past seasons load (static generation preserved)** | The page stays a statically prerendered server component for the default season; a past season's schedule is fetched client-side from a new `app/api/teams/[id]/schedule/[season]/route.ts` (mirrors the existing history route) via a new `lib/use-team-schedule-season.ts` hook (mirrors `use-team-season.ts`). | Reading `searchParams` server-side would make the route dynamic per request (a regression for the default view). The depth chart already solves exactly this problem for rosters — same shape: static page + `?season=` + client hook + API route. |
| **Past-vs-current card treatment** | No separate "completed season" card variant. A past season's REG grid is all-played (nflverse stores final scores for every past game), so the existing `GameCard` already renders it correctly — result + score per week, no upcoming games, BYE weeks as today. The differences are confined to what surrounds the grid: the `isUpcoming` badge applies only to the default view, and `SchedulePanel`'s NEXT GAME card auto-disappears for a completed season (`scheduleSummary.nextGame` is null once every game is played). | Building a second card layout for "history" would duplicate the same grid for zero visual difference; the data, not the layout, is what makes a past season read as history. |
| **"Current" season definition** | The picker's "current" row is `schedule.season` — the season the default view shows (the latest season present for the team, which during the off-season is the upcoming, already-scheduled season) — falling back to the league's current season when there's no schedule. Selecting it is "back to today" (`null`), same semantic as the depth chart. | The picker's top row must match what the page actually renders by default, otherwise the active-row check disagrees with the view. Using `schedule.season` (not the roster page's `currentSeason` definition) keeps them aligned in every season-timing edge case (in-season, off-season, January postseason). |
| **Season range** | Flat, scrollable 27-row `SeasonSheet` list from `currentSeason` down to `SEASONS_MIN` (1999) — the exact range and list shape the depth chart already ships in a `BottomSheet`. | The roster picker already accepts this range in this exact control; `BottomSheet`'s 70% height cap + the sheet's own `flex: 1 1 auto` scroll make a 27-row list usable on the smallest phone. A decade-grouped or stepper alternative would be a bespoke control that contradicts the "reuse the primitive" rule for zero real benefit. |
| **Degradation (invariant 6)** | A malformed/out-of-range `?season=` param (non-integer, below `SEASONS_MIN`, or above the current season) clamps to the default view. A season with no ingested games for the team (e.g. a franchise founded after 1999) shows "No schedule available for the {team} in {season}." — never a zeroed grid. A fetch in flight shows "Loading {season} season…" in place of the grid (no stale-season flash, invariant 16). Unknown team id → existing 404. | Same "show nothing, not zeros" posture as the rest of the app. The `?season=` param is untrusted input and must never throw. |
| **Reading an explicit `?season=<currentSeason>`** | Normalizes to the default view (`null`), not a separate "current season fetched from the API" state. | The default view IS the current season; treating the same season via the param as a distinct state would double the fetch and make the picker's active-row logic inconsistent. |

## Files

- `docs/superpowers/specs/2026-08-10-past-season-schedule-view-design.md` — this spec.
- `lib/schedule.ts` (+ `lib/__tests__/schedule.test.ts`) — add pure
  `normalizeViewedSeason(season, currentSeason, minSeason): number | null`: null → default
  view; clamps anything below `minSeason`, above `currentSeason`, or equal to
  `currentSeason` to null.
- `lib/use-team-schedule-season.ts` — client hook mirroring `use-team-season.ts`
  (abort-on-change, `loading`/`notFound` gating) fetching
  `/api/teams/[id]/schedule/[season]` → `{ schedule: TeamSchedule }`.
- `app/api/teams/[id]/schedule/[season]/route.ts` — mirrors the history route: validates
  `Number.isInteger(season) && season >= SEASONS_MIN`, 404s an unknown team or a season
  with no games, returns `{ schedule }`.
- `app/team/[id]/schedule/page.tsx` — fetch `getNflSeasonState` alongside the existing
  reads, compute `currentSeason = schedule?.season ?? (isOffseason ? upcomingSeason :
  upcomingSeason - 1)`, pass `currentSeason` + `SEASONS_MIN` to the view.
- `components/TeamScheduleView.tsx` — own the season-picker state: `viewedSeason`
  (`null` = default), the season-label trigger, `BottomSheet` + `SeasonSheet`, the
  fetch-states branch (loading / not-found / grid), `ApplySeasonFromQuery` for mount and
  Back/Forward, `router.replace` on pick. The top-level content div gains `relative` so
  `BottomSheet` has an anchored ancestor (its contract).

## Tests

- `normalizeViewedSeason`: null → null; a season within `[minSeason, currentSeason - 1]` →
  that season; `minSeason` itself → kept; below `minSeason` → null; above `currentSeason`
  → null; equal to `currentSeason` → null (default view).
- Manual/browser: opening the sheet from the season label and picking a past season swaps
  the grid to that season's results without a reload and marks the picked row active;
  "Current" row returns to the default; a shared `/team/[id]/schedule?season=2010` link
  opens on 2010; the UPCOMING badge shows only on the default off-season view; the
  NEXT GAME panel card is absent for a completed season; a season with no data for the
  team (e.g. a 2000-season team that didn't exist until later) shows the empty message;
  `?season=abc` / `?season=1998` / `?season=3000` all render the default view; grid +
  sheet render at 390px and on the xl layout with the aside panel.

## Out of scope

- **Nested `/schedule/[season]` route segment** — rejected; query param + client fetch
  preserves static generation without forking the URL shape.
- **Postseason bracket UI** — still deferred from the original schedule spec; REG-only
  grid unchanged.
- **Record/points on `schedules`** — still deferred; `SchedulePanel` derives record from
  the games, not a stored aggregate.
- **Season-scoped compare links** — `GameCard`'s `/compare?...&from=schedule` links keep
  pointing at the compare view's current-roster behavior; a past-season compare is its own
  feature.
- **`player_stats` / roster history backfill** — unrelated to this UI; gated on the
  historic-coverage spec's open identity question.
