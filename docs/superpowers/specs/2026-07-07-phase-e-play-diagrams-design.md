# Phase E — static play diagrams

Date: 2026-07-07
Status: approved (design)
Roadmap: Phase E / Future Ideas #7, the "softer first step" explicitly called out there:
static play diagrams (routes/assignments drawn on the field), **not** simulations.
Depends on: nothing (pairs well after the real-formations spec since it reuses
`buildRealFormation`, but works against the generic formation too).

## Goal

A browsable little playbook: pick a play ("Four Verts"), see the routes drawn over the
current team's own players on the field. Educational, shareable, reuses the field engine.

## Source facts

**No data source exists for play/route geometry** (confirmed in vault `Data Sources.md`,
re-confirmed 2026-07-07 — nflverse play-by-play is event-level, the FTN `route` column is
a per-receiver label like "GO"/"SLANT" without geometry). Plays are **our own
hand-authored dataset**, exactly like uniforms: a committed seed file is the source of
truth, append-only, curated by a human. This is the accepted model, not a gap.

## Decisions (locked)

| Decision | Choice | Why |
|---|---|---|
| Data shape | `lib/plays/data.ts` — hand-authored `PLAYS: Play[]`:<br>`interface RouteStep { x: number; y: number }`<br>`interface PlayAssignment { slotId: string; route: RouteStep[]; kind: 'route' | 'block' | 'handoff' | 'dropback' }`<br>`interface Play { id: string; name: string; description: string; formation: { alignment: 'SHOTGUN' | 'UNDER CENTER' | 'PISTOL'; personnel: string } ; assignments: PlayAssignment[] }`<br>Coordinates are the field's existing 0–100 percentage space; `route[0]` must equal the slot's own x/y (paths start at the player). `slotId` references the slot ids produced by `buildRealFormation(alignment, personnel)` — a play pins its formation, so slot ids are stable. If the real-formations spec hasn't shipped, implement `buildRealFormation` from that spec first (it's a pure function; that spec's PR2 UI is not needed). | One committed file = version control, review, tests — the proven uniforms capture loop. Pinning each play to a formation removes the "what if the layout doesn't match the routes" class of bugs entirely. |
| Rendering | `components/PlayOverlay.tsx` — an absolutely-positioned SVG over the field (same coordinate mapping as `PlayerDot`), one `<path>` per assignment: `kind: 'route'` solid 2px in the team's `uiAccent`; `block` short stub ending in a perpendicular tick; `dropback`/`handoff` dashed. Arrowhead marker on route ends. Paths drawn with a framer-motion `pathLength` 0→1 spring, staggered 60ms per assignment (a *draw-in*, not a simulation — dots never move). | Reuses the theming + motion language; visually distinguishes assignment kinds without a legend. |
| UI entry | A "Plays" icon button (lucide `Route`) in the header actions cluster (with share/history/jersey) → `BottomSheet` "Playbook": one row per play (name + one-line description + formation tag "Shotgun 11"). Selecting: (1) swaps the field to the play's formation, (2) overlays the routes, (3) chip near the team name: "{Play name} · Clear". Offense unit forced while active (switching unit clears the play). URL `?play=<id>` applied by an `ApplyPlayFromQuery` mirroring `ApplyKitFromQuery` (not stripped — shareable). | Same affordance grammar as uniforms/seasons: header icon → bottom sheet → live field change + chip + query param. |
| Player interaction while active | Dots stay tappable (card opens as usual); reorder is disabled while a play is shown (the depth being edited is invisible under routes). | Least surprise, least code. |
| Seed content (ship with exactly these five) | `hb-dive` (Under center 21 — RB1 dive over RG, everyone blocks), `four-verts` (Shotgun 10 — four go routes, RB check-release), `pa-boot-flood` (Under center 12 — play-action, TE corner / WR deep / RB flat flood right), `mesh` (Shotgun 11 — two crossing drags, corner over the top), `hb-screen-left` (Shotgun 11 — RB screen left, G/T release). Route geometry is the implementer's judgment **within** each play's textbook shape; the test suite pins structural validity, not artistic exactness. | Five recognizable, positionally-diverse plays exercise every `kind` and three formations. The descriptions above ARE the product decision; drawing them is execution. |
| Team-agnostic | Plays are league-generic in v1 (every team shows the same playbook, drawn in its own colors/players). | Per-team playbooks need per-team data nobody has. |

## Validation tests (`lib/__tests__/plays.test.ts`)

For every play in the seed: unique ids; `formation` builds (buildRealFormation returns
non-generic); every `assignments.slotId` exists in that formation's slots; every offense
slot has ≤1 assignment; `route[0]` equals the slot's `{x,y}` (±0.01); all steps within
[0,100]; ≥1 `route`-kind assignment per play; description non-empty. Plus
`ApplyPlayFromQuery` param logic (valid id applies, junk strips silently — same
contract as `?kit=`).

## Files

- `lib/plays/data.ts` (+ types), `lib/__tests__/plays.test.ts`.
- `components/PlayOverlay.tsx`, `components/PlaySheet.tsx`,
  `components/ApplyPlayFromQuery.tsx`.
- `components/DepthChartField.tsx` — header button, play state, formation swap, chip,
  reorder-disable, unit forcing.

## Task/PR breakdown

1. **PR1** — data model + seed + validation tests (no UI). The seed geometry is authored
   here.
2. **PR2** — overlay + sheet + query param + field integration. Browser verification:
   each of the five plays at 390px and 1280px, draw-in animation, clear restores base,
   `?play=four-verts` deep link works, unit switch clears.

## Out of scope

Animated player movement/simulation, per-team playbooks, user-authored plays (a "play
editor" is a whole product), defensive assignments, importing FTN route labels.
