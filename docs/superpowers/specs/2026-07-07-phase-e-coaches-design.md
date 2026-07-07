# Phase E — coaches

Date: 2026-07-07
Status: approved (design)
Roadmap: Phase E / Future Ideas #3 ("Show coaches"). Independent of every other spec;
smallest Phase E item — good first pick.

## Goal

Show each team's head coach. That's it — ESPN only exposes the head coach cheaply, and
the head coach is what a fan actually asks about.

## Verified source facts (2026-07-07, live-probed)

- The **site roster endpoint the ingest already fetches**
  (`site.api.espn.com/.../teams/{abbr}/roster`) has a top-level `coach` array:
  `[{ "id": "5044374", "firstName": "Mike", "lastName": "Macdonald", "experience": 2 }]`.
  `experience` = seasons as this team's HC counting the current one.
- There is **no working coach headshot URL** (the `a.espncdn.com/i/coaches/...` pattern
  404s). Coaches ship text-only. Do not invent an image URL.

## Decisions (locked)

| Decision | Choice | Why |
|---|---|---|
| Storage | Three nullable columns on `teams`: `coach_name text`, `coach_espn_id text`, `coach_experience int` | One coach per team from this source; a `coaches` table is YAGNI until a staff source exists. |
| Ingest | `scripts/ingest-espn.mts`: the roster payload is already fetched — read `coach[0]`, write the columns in the existing team upsert. Missing/empty `coach` array → nulls (never a crash; expansion/interim situations happen). Pure extraction `toCoach(rosterJson)` in `lib/espn/transform.ts` + fixture test. | Zero new fetches. |
| Display | Team page header: one small line under the team-name pill row, muted text: `HC {name} · {ordinal(experience)} season` (e.g. "HC Mike Macdonald · 2nd season"). Null coach → line absent. `ordinal()` goes in `lib/format.ts` (1st/2nd/3rd/Nth, tested). Also add the same string to per-team `generateMetadata` description. | "Surface the coaching staff somewhere" with zero new views; the header is the team-identity surface. |
| Type | `Team.coach?: { name: string; experience: number }` threaded through `toTeam` in `lib/roster-source.db.ts` | Optional — seeds and old rows stay valid. |

## Files

- migration `<ts>_add_team_coach.sql` (three columns; no RLS change — `teams` policies
  cover them) + `npm run db:types`.
- `lib/espn/transform.ts` `toCoach` + fixture in `lib/espn/fixtures/`.
- `scripts/ingest-espn.mts` — include the columns in the upsert.
- `lib/types.ts`, `lib/roster-source.db.ts` — the optional field.
- `lib/format.ts` `ordinal` + test.
- `components/DepthChartField.tsx` — the header line.

## Tests

`toCoach`: present, absent, empty-array. `ordinal`: 1→1st, 2→2nd, 3→3rd, 4→4th, 11→11th,
21→21st. Live-DB roster test asserts `coach` populated after a local ingest (skip
pattern). Browser check at 390px (line must not wrap the header).

## Task/PR breakdown

Single PR. Requires one `npm run ingest:espn` against local to verify end-to-end.

## Out of scope

Coordinators/full staff (no cheap source), coach photos (no URL exists), coach history
across seasons, a coaches view/page.
