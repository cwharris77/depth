# Full ESPN position taxonomy (SS/FS/FB and beyond)

Date: 2026-08-04
Status: ✅ decisions locked 2026-08-04 — implementable
Roadmap: [[Compare is missing position groups that exist on the depth chart]] (DEP-134)
Depends on: none (application-layer only — no DB migration required, see below)

## Goal

Depth's `Position` type currently collapses several real ESPN depth-chart distinctions into
one group: SS/FS → `S`, LDE/RDE → `DE`, WLB/LILB/RILB/SLB → `LB`, LCB/RCB/NB → `CB`, FB → `RB`.
Cooper: "I want every position espn offers." Pull the full granularity ESPN's depth chart
already provides instead of the collapsed set, so the depth chart, player cards, and compare
view can all show/filter on real position distinctions instead of a generic group.

## Verified source facts (2026-08-04, live `sports.core.api.espn.com` depthcharts endpoint,
sampled across 3 teams — Ravens id 33, and ids 6/21/25)

- Every sampled team's depth chart returns the **same three position groups** with the
  **same key sets** (ESPN appears to use one fixed template across all 32 teams regardless
  of each team's actual scheme — worth re-confirming against a couple more teams before
  implementation, but consistent across every team checked so far):
  - **Offense** (group name varies by personnel package, e.g. "3WR 1TE" — the position
    *keys* inside it don't): `qb, rb, fb, wr, lt, lg, c, rg, rt, te`
  - **Defense** ("Base 3-4 D" for every team sampled — see note below):
    `lde, nt, rde, wlb, lilb, rilb, slb, lcb, ss, fs, rcb, nb`
  - **Special teams**: `pk, p, h, pr, kr, ls`
- Each key resolves to a real ESPN `position.displayName`/`abbreviation` pair (e.g. `ss` →
  "Strong Safety" / "SS", `fb` → "Fullback" / "FB", `nb` → "Nickel Back" / "NB") — confirmed
  via the `position` object nested under each key's athletes list.
- **`fb` is real and populated** (not an empty template slot) — Ravens currently have 1
  athlete ranked at `fb`.
- **No DB migration needed.** `position` is a plain `text` column with no CHECK constraint
  or enum (`supabase/migrations/20260701170756_init_depth_schema.sql:24,40`) — this is purely
  an application-layer (`Position` type + transform) change.
- **Latent mismatch found**: every sampled team's depth chart names its defensive group
  "Base 3-4 D" — a 3-man front (LDE/NT/RDE) + 4 linebackers (WLB/LILB/RILB/SLB) = 7 in the
  box. Depth's current default (non-formation-specific) defensive layout
  (`lib/formations.ts:32-42`, `BASE_DEFENSE`) instead models a 4-3-shaped front: **4** down
  linemen (2×`DE` + 2×`DT`) and only **3** `LB` slots. Pulling full granularity surfaces this
  — the app's generic base look doesn't structurally match what ESPN's real depth chart data
  describes for any team. This needs a decision, not just a relabel (see Open questions).

## Locked decisions

| Decision | Choice | Why |
|---|---|---|
| Scope | Pull ESPN's full position granularity: `SS, FS` (replaces `S`), `LDE, RDE` (replaces `DE`), `NT` (splits out of `DT` — ESPN's key is `nt`, not `dt`, for every sampled team's base front; folded into this decision since it's the same "every position ESPN offers" instruction, not a separate call), `WLB, LILB, RILB, SLB` (replaces `LB`), `LCB, RCB, NB` (replaces `CB`), `FB` (splits out of `RB`). `H` (holder) stays unmodeled — see below. | Cooper, 2026-08-04: "I want every position espn offers." |
| Base defensive front shape | Move the default (no-formation-selected) `BASE_DEFENSE` from its current 4-3-shaped layout (2 DE + 2 DT + 3 LB) to a true 3-4-shaped 7-man front: LDE/NT/RDE on the line + WLB/LILB/RILB/SLB at linebacker, matching what ESPN's real depth-chart data actually describes for every team sampled. | Cooper, 2026-08-04, agreeing with recommendation: the whole point of this change is showing real position truth instead of a generic approximation; a fake 4-3 shape labeled with 3-4 position names (a "NT" in a 4-man line) would look wrong. `buildRealFormation`/`buildRealDefenseFormation` already override this default whenever real per-team formation data exists, so the default is increasingly just a fallback. |
| Field slot geometry | Mechanical extension of existing coordinate patterns once the front shape above is decided: 4 LB slots instead of 3, explicit L/R labels on the existing DE/CB slots (already at distinct x-positions), NB reuses a coordinate `DB_SLOTS` (`lib/formations.ts:272-280`) already has for nickel packages. Implement directly; review the rendered result rather than pre-specifying every coordinate here. | Cooper, 2026-08-04: no independent decision needed beyond the front-shape call above. |
| Holder (`h`) | Leave unmodeled — no `Player` entry, same as today. | Cooper, 2026-08-04, agreeing with recommendation: almost always a duplicate assignment (the punter or a backup QB), not an independent roster spot; adding it creates a position with no depth chart of its own. |
| Compare view | `COMPARE_POSITIONS` (`lib/compare.ts`) gains **every** new granular position (SS/FS, LDE/RDE/NT, WLB/LILB/RILB/SLB, LCB/RCB/NB, FB) — not just SS/FS. `KR`/`PR`/`LS` stay excluded per the existing locked decision (`lib/compare.ts:9-11` — editorial special-teams slots, not depth groups); that reasoning is unchanged. | Cooper, 2026-08-04, agreeing with recommendation: the ticket's whole premise is "everything visible on the depth chart should be comparable" — leaving some granular positions out while including others would be an arbitrary inconsistency. The mobile chip-row scroll affordance is already fixed (DEP-127) and handles a longer list. |
| Existing DB rows | No backfill. Rows transition to the new granularity naturally on the next scheduled weekly ingest; the brief window where old collapsed and new granular data coexist across teams is acceptable. | Cooper, 2026-08-04, agreeing with recommendation: self-heals within a week, nothing breaks in the meantime, matches the app's existing "ingest is decoupled from deploys, stale data degrades gracefully" invariant (AGENTS.md §2.7). |
| Data cleaning / nflverse overlap | Out of scope for this spec. Tracked separately: [[Clean and normalize position data before it enters the DB]] (DEP-145), [[Consider condensing to nflverse as the sole data source]] (DEP-146). | Cooper, 2026-08-04: "completely separate... separate idea ticket for each." |
| **nflverse real-formation slot resolution** | `resolveUnit`'s real-formation path (`lib/formations.ts:49-74`, plus `buildDlSlots`/`buildLbSlots`/`buildDbSlots` at `lib/formations.ts:244-297`) currently fills slots via an **exact** `getPlayersByPosition(roster, slot.position)` match. nflverse's `defense_personnel`/`offense_personnel` counts (what drives real formations) have no per-player archetype info — they can't say *which* linebacker is strongside vs weak, or which safety is strong vs free, or whether an RB-count includes an FB. Once players carry the new granular positions, an exact match on the old generic groups (`LB`, `S`, `RB`) returns nothing for those slots — **a functional regression** (empty LB/safety slots in every nflverse-driven real formation), not just cosmetic. **Fix**: add a `positionGroup(p: Position): 'LB' \| 'S' \| 'DL' \| ...` helper used only by the count-driven nflverse resolvers, so they keep filling slots by "any player in the broader group, by depth rank" — exactly today's behavior — while the depth chart, player cards, and compare view use the full granular positions everywhere else. | Discovered 2026-08-04 while answering Cooper's question about nflverse formation impact — not in the original spec draft. This is the single highest-risk item in the whole change; higher priority than the field-geometry work. |

## Resolved — folded into Locked decisions above

The open questions from the first draft (base front shape, field geometry, holder, compare
scope, existing DB rows) were all reviewed and resolved 2026-08-04 — see the table above.

## Files

- `lib/types.ts` — widen `Position` union: `SS, FS, LDE, RDE, NT, WLB, LILB, RILB, SLB, LCB,
  RCB, NB, FB`.
- `lib/positions.ts` — `POSITION_FULL_NAMES` (a total `Record<Position, string>`, so TS
  forces every new value to get a real name — e.g. "Weakside Linebacker" for `WLB`).
- `lib/espn/positions.ts` — `DEPTH_POSITION` and `BIO_POSITION` maps: stop collapsing
  `ss`/`fs`/`lde`/`rde`/`nt`/`wlb`/`lilb`/`rilb`/`slb`/`lcb`/`rcb`/`nb`/`fb` into their current
  grouped targets; map each to its own `Position` value instead.
- `lib/formations.ts`:
  - `BASE_DEFENSE` (formerly `DEFENSE_FORMATION`) — rebuild as the true 3-4-shaped 7-man
    front (locked decision above).
  - `buildDlSlots`/`buildLbSlots`/`buildDbSlots`/`buildRealDefenseFormation`, and
    `buildRealFormation`'s RB slot generation — add the `positionGroup()` fallback so
    nflverse's count-only data keeps resolving players correctly (locked decision above).
    **This is the load-bearing fix; do it before or alongside the type widening, not after**
    — otherwise every real-formation defense (and any team whose real formation includes an
    FB) silently breaks between the type change landing and this fix landing.
  - `DB_SLOTS` — add explicit LCB/RCB/NB labeling alongside the existing SS/FS/CB slots.
- `lib/compare.ts` — `COMPARE_POSITIONS` gains all new granular positions.
- `lib/stat-table.ts` — per-position stat columns; check whether the new granular positions
  need their own column sets or can reuse their parent group's (e.g. `WLB` reuses `LB`'s).
- Every exhaustive `Record<Position, ...>` / `switch` over `Position` elsewhere in the
  codebase — TypeScript will surface these as compile errors once the union widens, which
  makes this migration safe to do incrementally (fix each one the compiler flags).
- `supabase/seed-nflverse.sql` / `lib/teams/` fixtures — regenerate/update so tests and local
  dev reflect the new granularity (no migration, but seed data does need refreshing).

## Tests

- `lib/espn/__tests__/positions.test.ts` (new, if it doesn't exist) — every new ESPN key
  (`ss`, `fs`, `fb`, `lde`, `rde`, `nt`, `wlb`, `lilb`, `rilb`, `slb`, `lcb`, `rcb`, `nb`) maps
  to its own distinct `Position`, not a collapsed group.
- `lib/formations.ts` tests:
  - The existing "7 onLine" / no-overlap invariant tests need to keep passing for the new
    3-4-shaped `BASE_DEFENSE`.
  - **New**: a roster with only granularly-tagged players (no plain `LB`/`S`/`RB`-for-FB
    entries) still fully populates a `buildRealDefenseFormation`/`buildRealFormation` layout
    — the regression test for the `positionGroup()` fix above.
- `lib/compare.ts` tests — `COMPARE_POSITIONS` includes every new granular position, still
  excludes `KR`/`PR`/`LS`.

## Out of scope

- Data cleaning/normalization between ESPN and nflverse position vocabularies — [[Clean and normalize position data before it enters the DB]] (DEP-145).
- Evaluating nflverse as a sole replacement data source — [[Consider condensing to nflverse as the sole data source]] (DEP-146).
- Backfilling historical (pre-this-change) `roster_history` rows to the new granularity.
