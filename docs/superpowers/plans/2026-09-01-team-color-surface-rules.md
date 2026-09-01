# Team Color Surface Rules Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `../obsidian/Projects/depth/specs/2026-09-01-team-color-surface-rules-design.md` (all decisions locked 2026-09-01)

**Goal:** Stop storing "what color goes here" as data. Every surface resolves from the kit's real jersey colors (`primary`/`secondary`/`accent`) through one shared helper; `uiAccent`/`onAccent` become frozen legacy columns that new clients never read. The player-card numeral becomes an outlined jersey numeral in two real team colors (spec direction 3).

**Architecture:** A new pure module (`lib/utils/colors/surfaces.ts`, mirrored in `ios/Depth/Support/TeamSurfaces.swift`) exposes one resolver per surface — fill, ring, text-on-fill, numeral. Call sites ask for a surface and never compose contrast logic themselves. The 105 legacy `uiAccent`/`onAccent` values move off the curation surface into a frozen map that only the seed generator reads. Cross-language domain fixtures prove the Swift and TS resolvers agree on all 105 kits.

**Tech Stack:** TypeScript strict + Vitest (shared logic, seed generation), Swift 6 + XCTest (the product), Supabase Postgres (the seed target).

## Global Constraints

- **Do not drop or null `ui_accent`/`on_accent` in this plan.** Shipped iOS builds name them in their PostgREST selects and decode them non-optionally; removing either 400s the team page, team list and uniform archive for every installed copy. DEP-425 (forced-update gate) makes retirement possible later — see the spec's "Retirement path" section — but it does not unblock it for builds that predate the gate, and nothing here depends on the drop. See `lib/uniforms/data.ts`'s header.
- iOS-first: the product is `ios/`. The frozen web app changes only where a shared module or a stale comment forces it — no web UI sweep (`AGENTS.md` §1, 2026-08-29).
- Formatting is Prettier's job — `npm run format` before every commit. `npm run format:check` is a CI gate.
- Every new/changed `lib/` module needs a role-and-constraint header comment; inline comments state contracts and cross-file couplings, never line narration.
- Pure logic lives in `lib/` with colocated tests; components stay thin. Data-integrity tests loop over the data so a failure names the offending kit.
- No new dependencies.
- Conventional Commits, scope from: `uniforms`, `colors`, `ios`, `card`, `field`, `supabase`, `readme`.
- One concern per PR. The tasks below are grouped into six PRs and are ordered so each is independently shippable and revertible.
- `npx tsc --noEmit` exits 0 and `npm test` is green before any commit touching shared types. iOS runs are **targeted** (`-only-testing:`), never the full suite (`ios/CLAUDE.md` §5).

---

## PR 1 — Shared surface resolvers (TypeScript, no callers changed)

### Task 1: The resolver module

**Files:**
- Create: `lib/utils/colors/surfaces.ts`
- Create: `lib/__tests__/surfaces.test.ts`

**Interfaces:**
- Produces: `teamFill(colors): string` — always `primary`.
- Produces: `teamRing(colors): string` — `secondary`, falling back to `accent` when `secondary` separates from neither `primary` (< 2.0) nor the app ground (< 2.0). Only Ravens home and black-alt take the fallback.
- Produces: `textOnFill(colors, fill): string` — `secondary` when it clears 4.5 against `fill`, else `readableTextOn(fill)`.
- Produces: `numeralColors(colors): { fill: string; stroke: string }` — spec direction 3, see Task 2.
- Consumes: `contrastRatio`, `readableTextOn`, `DARK_BG` from `lib/utils/colors.ts`.

- [ ] **Step 1: Write `surfaces.ts`** with a role-and-constraint header stating that this module is the only place a team color is matched to a surface, and that it exists because storing that answer per-kit is what produced 63 invented hexes (link the spec).
- [ ] **Step 2: Write the tests.** Loop over all 105 `UNIFORMS` rows generating one `it` per kit, asserting: every resolver returns a color drawn from that kit's own three hexes, pure white, or the app ground — nothing else. This is the test that makes an invented hex a CI failure rather than a review catch.
- [ ] **Step 3:** Assert the Ravens fallback explicitly by id (`ravens-home-1996`, `ravens-black-alt-2004` → `#9E7C0C`), so a future data change that silently removes the only two fallback cases is visible.
- [ ] **Step 4:** `npx tsc --noEmit` + `npm test`. No existing test should change — nothing consumes this yet.

### Task 2: The numeral resolver (spec direction 3)

**Files:**
- Modify: `lib/utils/colors/surfaces.ts`, `lib/__tests__/surfaces.test.ts`

**Interfaces:**
- `numeralColors(colors)` resolves in this order, against the app ground at the WCAG **large-text** threshold of 3.0:
  1. `secondary` clears 3.0 → `{ fill: primary, stroke: secondary }` (52 kits)
  2. else `primary` clears 3.0 → `{ fill: secondary, stroke: primary }` — the swap (39 kits)
  3. else → `{ fill: primary, stroke: '#FFFFFF' }` (14 kits)

- [ ] **Step 1: Implement**, with a comment naming why the swap exists: `primary` is white on every away kit, so an unconditional white stroke collapses the away half of the archive into a solid slab.
- [ ] **Step 2: Test the three branches by count** — assert exactly 52 / 39 / 14 across the archive, so a data change that shifts kits between branches is surfaced rather than absorbed.
- [ ] **Step 3: Test the anchor cases by id:** `seahawks-home-1996` → navy fill / green stroke; `seahawks-away-1996` → navy fill / white stroke (swapped); `chiefs-home-1963` → red fill / gold stroke; `ravens-home-1996` → purple fill / white stroke.
- [ ] **Step 4:** Assert `fill !== stroke` for all 105 kits — the collapse bug, caught structurally.

---

## PR 2 — Generator owns the legacy columns

**Why this is safe:** the regenerated migration must be **byte-identical** to `supabase/migrations/20260901120000_restore_legacy_ui_accent_legibility.sql`. That is the proof that this is a pure refactor with zero effect on shipped builds.

### Task 3: Freeze the legacy values out of the curation surface

**Files:**
- Create: `lib/uniforms/legacy-accents.ts`
- Modify: `lib/uniforms/data.ts`, `lib/uniforms/seed-sql.ts`, `lib/types.ts`
- Modify: `lib/__tests__/uniforms.test.ts`
- Create: `supabase/migrations/<ts>_uniform_seed_regen.sql` (only if not byte-identical — see Step 5)

**Interfaces:**
- Produces: `LEGACY_ACCENTS: Record<string, { uiAccent: string; onAccent: string }>` keyed by `${teamId}-${slug}-${yearStart}`, containing all 105 pairs verbatim. Frozen — a header comment states that these are not team colors, are never re-derived (including `onAccent`), and exist only so already-installed builds keep rendering.
- Changes: `UniformSeed['colors']` narrows to `{ primary, secondary, accent }`. `TeamColors` (the app-facing read model) is unchanged in this PR — iOS still decodes five fields until PR 4.

- [ ] **Step 1: Generate `legacy-accents.ts` mechanically** from the current `data.ts` — do not retype hexes. Write a throwaway script under the scratchpad that reads `UNIFORMS` and emits the map, then delete it.
- [ ] **Step 2: Remove `uiAccent`/`onAccent` from all 105 rows in `data.ts`** and narrow the `UniformSeed` colors type. Update the file header: the "legacy compatibility pair" paragraph moves to `legacy-accents.ts`, and `data.ts` now says its rows are jersey facts only.
- [ ] **Step 3: `seed-sql.ts` reads `LEGACY_ACCENTS`** for the two columns, keyed by the id it already computes. Throw a clear error if a kit id is missing from the map — a new kit must get an explicit legacy pair (use `teamRing`'s result for a new kit, which is by construction legible).
- [ ] **Step 4: Move the accent assertions** in `uniforms.test.ts` off `UNIFORMS` and onto `LEGACY_ACCENTS`: every `uiAccent` clears AA 4.5 against `#15161a` (the #590 regression), every `onAccent` clears 4.5 against its `uiAccent`, and the map's keys exactly equal the archive's ids.
- [ ] **Step 5: Regenerate and diff.** `npm run gen:uniform-seed -- /tmp/regen.sql`, then `diff /tmp/regen.sql supabase/migrations/20260901120000_restore_legacy_ui_accent_legibility.sql` **must be empty**. If it isn't, the refactor changed data — stop and fix rather than committing a new migration. No new migration ships in this PR if the diff is clean.
- [ ] **Step 6:** `npm run format`, `npx tsc --noEmit`, `npm test`. Note the count in the PR body.

---

## PR 3 — Swift mirror + cross-language parity

### Task 4: `TeamSurfaces.swift`

**Files:**
- Create: `ios/Depth/Support/TeamSurfaces.swift`
- Modify: `fixtures/generate.mts`
- Create: `fixtures/domain/team-surfaces.json`
- Create: `ios/DepthTests/TeamSurfacesTests.swift`
- Modify: `ios/project.yml` only if a new group is needed (then `xcodegen generate` and commit `Depth.xcodeproj`)

**Interfaces:**
- Produces: Swift `TeamSurfaces` with `fill`, `ring`, `textOnFill`, `numeral` — same four resolvers, same thresholds, operating on the app's `TeamColors`.
- Produces: `fixtures/domain/team-surfaces.json` — for all 105 kits, the four resolved outputs. TS is the oracle (`fixtures/generate.mts`'s existing contract).

- [ ] **Step 1: Port the contrast helpers** if `contrastRatio`/`readableTextOn` are not already mirrored in Swift; reuse the existing mirror if one exists rather than adding a second.
- [ ] **Step 2: Implement the four resolvers**, keeping the branch order identical to the TS module. Comment the swap branch with the same rationale.
- [ ] **Step 3: Extend `fixtures/generate.mts`** to emit `team-surfaces.json` keyed by kit id, then run `npx tsx fixtures/generate.mts` and commit the JSON.
- [ ] **Step 4: `TeamSurfacesTests`** loads the fixture and asserts Swift matches TS **exactly** for all 105 kits, all four resolvers — the invariant that keeps the two implementations from drifting (`ios/CLAUDE.md` §2.6).
- [ ] **Step 5:** `xcodebuild … test -only-testing:DepthTests/TeamSurfacesTests`.

---

## PR 4 — iOS views route through the resolvers (replaces DEP-424)

**Note:** this supersedes DEP-424's task list. Its "sweep every foreground `uiAccent` to white" step is obsolete — under these rules team color never lands on bare text, so there is nothing to recolor; the call sites change *what they ask for*, not *what color they hardcode*. Rewrite the ticket rather than implementing it as written.

### Task 5: Migrate the call sites

**Files:**
- Modify: `ios/Depth/Features/Teams/TeamListView.swift`, `Features/TeamDetail/PlayerDetailView.swift`, `Features/TeamDetail/TeamDetailView.swift`, `Features/Compare/CompareView.swift`, `Features/Compare/CompareLensesView.swift`, `Features/Stats/TeamStatsView.swift`, `Features/Schedule/ScheduleView.swift`, `Features/TeamDetail/DepthChartFieldView.swift`
- Delete: `ios/Depth/Features/Teams/TeamBadgeOverride.swift` and `ios/DepthTests/TeamBadgeOverrideTests.swift`
- Modify: `ios/Depth/Support/CurrentTeamStore.swift`

- [ ] **Step 1: Replace every `colors.uiAccent` read** with the matching `TeamSurfaces` call. Fills stay fills; rings become `TeamSurfaces.ring`; anything that was bare team-colored text becomes a chip (fill + `textOnFill`).
- [ ] **Step 2: `CurrentTeamStore`** stores the resolved *kit colors* rather than a single `uiAccent` hex, so downstream views can ask for any surface. Keep `refine(_:)`'s behaviour — the picked kit still drives chrome.
- [ ] **Step 3: Delete `TeamBadgeOverride`.** Its per-team entries (e.g. the Panthers' blue background) exist only because the fill/ring rule wasn't uniform; verify the Panthers badge still reads correctly under the uniform rule before deleting, and say so in the PR body.
- [ ] **Step 4: Keep `DesignTokens.Colors.accent` as the pre-resolution fallback** wherever no team is resolved yet (`RootTabView`'s `.tint` at fresh launch). That is app chrome, not team color — out of scope per the spec.
- [ ] **Step 5:** Targeted runs: `DepthUITests`, `AccessibilityUITests` for the flows touched.
- [ ] **Step 6: Simulator-verify** the eight teams #590 changed plus **both Seahawks kits** — the home/away inversion is the case that breaks naive rules. Screenshots via `ios/scripts/pr-screenshots.sh --body-file <body>`.

### Task 6: Stop selecting the legacy columns

**Files:**
- Modify: `ios/Depth/Data/SupabaseDepthRepository.swift` (4 select strings), `ios/Depth/Data/TeamSnapshotDTO.swift` (3 DTO field pairs), `ios/Depth/Data/CachedSnapshotModels.swift`, `ios/Depth/Data/TeamSnapshotMapper.swift`
- Modify: `ios/DepthTests/TeamSnapshotMapperTests.swift`, `CachingDepthRepositoryTests.swift`, `UniformArchiveTests.swift`

- [ ] **Step 1: Drop `ui_accent, on_accent`** from `teamSnapshotSelect`, `teamListSelect`, `uniformListingSelect` and the flat uniform select. The columns stay in the database — this only stops the *new* build asking for them.
- [ ] **Step 2: Drop the fields** from `TeamColorUniformDTO`, the flat uniform DTO, and the archive DTO; drop `uiAccent`/`onAccent` from the app's `TeamColors` and from `CachedTeamListEntry`.
- [ ] **Step 3: The SwiftData shape change needs no migration.** `DepthEnvironment.swift:40-59` already wipes and retries the store when it fails to open against a changed schema, by design ("this cache is disposable"). Confirm on a device/simulator upgraded from a pre-change build rather than a clean install, and note that in the PR body — a clean install does not exercise this path.
- [ ] **Step 4:** Targeted runs for `DepthTests` (data/domain suites).

---

## PR 5 — The player-card numeral

### Task 7: Outlined numeral, iOS

**Files:**
- Modify: `ios/Depth/Features/TeamDetail/PlayerDetailView.swift`
- Modify: `ios/DepthUITests/AccessibilityUITests.swift`

- [ ] **Step 1: Replace the 26%-opacity watermark** (`:141-147`) with a stroked numeral from `TeamSurfaces.numeral`. SwiftUI has no text-stroke modifier — build an `AttributedString` with `.strokeWidth` set **negative** (fills *and* strokes; a positive value strokes without filling) and `.strokeColor`. Stroke width scales with the numeral, ~5% of point size.
- [ ] **Step 2: Remove `.accessibilityHidden(true)`.** The numeral stops being decorative and becomes content, so give it a real label (`"Number \(player.number)"`) — and note in the PR body that this is a deliberate hierarchy change, not a recolor.
- [ ] **Step 3: Keep `@ScaledMetric`** so it still grows with Dynamic Type, and re-check the largest accessibility size — a thick stroke at a large size can close the counters on `8`/`0`.
- [ ] **Step 4: Screenshot all five anchor kits** (Seahawks home, Seahawks away, Jets, Chiefs, Ravens) — these cover all three resolver branches plus the away swap.

### Task 8: Web parity (frozen app, shared module only)

**Files:**
- Modify: `components/PlayerCardHeader.tsx`

- [ ] **Step 1:** Web is frozen, but `PlayerCardHeader` is the parity reference the iOS comments point at. Apply the same treatment via `-webkit-text-stroke` + `paint-order: stroke fill` so the two don't diverge in the record, and keep the comment cross-reference accurate. Skip if it expands the diff beyond this one component.

---

## PR 6 — Documentation reconciliation

### Task 9: Correct every stale claim

**Files:**
- Modify: `AGENTS.md` (invariant 4, mistake #2, §5 curated-data quality bar)
- Modify: `lib/types.ts:136-144`, `lib/utils/colors.ts:4,40,65`, `lib/roster-source.db.ts:373,976`
- Modify: `README.md` status table
- Modify (vault): the specs index row → done, with the PR numbers

- [ ] **Step 1: `AGENTS.md` invariant 4** currently asserts every curated pair passes WCAG-AA. Rewrite it as the surface rules: fill/ring/text-on-fill/numeral resolve from real jersey colors through `surfaces.ts`; `uiAccent`/`onAccent` are frozen legacy columns.
- [ ] **Step 2: Mistake #2** ("the wrong color knob") is now about reaching for a raw color instead of a resolver, not about `uiAccent` vs `primary`. Rewrite.
- [ ] **Step 3: §5 curated-data checklist** — replace "uiAccent vs `#0a0e1a`" (wrong hex *and* wrong rule) with the resolver assertions from Task 1.
- [ ] **Step 4: Sweep the stale `#0a0e1a` references** in the files above; the app ground has been `#15161a` since DEP-274.
- [ ] **Step 5: Update the vault index row** to ✅ done with the shipped PR numbers, and add a `Decisions.md` entry — the 2026-07-03 "uiAccent = ESPN secondary" decision is superseded by this spec for the uniform path.

---

## Verification (whole plan)

- [ ] `npm run format:check` clean, `npx tsc --noEmit` exits 0, `npm test` green
- [ ] PR 2's regenerated migration is byte-identical to `20260901120000` — the no-op proof
- [ ] `grep -rn "uiAccent\|ui_accent" ios/Depth` returns **no hits** outside a comment (the columns are gone from the client entirely, not merely relegated to fills)
- [ ] `grep -rn "uiAccent" lib components app` returns hits only in `legacy-accents.ts`, `seed-sql.ts`, and their tests
- [ ] Cross-language fixture parity green for all 105 kits
- [ ] Simulator: the eight #590 teams plus both Seahawks kits, screenshot-verified
- [ ] Upgrade path exercised from a pre-change build (SwiftData store wipe), not just a clean install

## Out of scope

- Dropping the `ui_accent`/`on_accent` **columns** from Postgres. Blocked on DEP-425 (forced-update gate) *and* on pre-gate installs draining — file it `blocked-by: DEP-425`, not on a date.
- `brand_colors` — still written by the weekly ingest and read by nothing, deliberately (2026-08-24 spec).
- Uniform geometry (`lib/uniforms/teams/*.ts`) — its `ColorRef` system is the model this plan generalises; no changes.
- The app-wide accent token (DEP-273's policy question).
- Re-curating the 63 legacy `uiAccent` values that are invented hues — that column is compat-only and frozen, so they are no longer claims about the team.
