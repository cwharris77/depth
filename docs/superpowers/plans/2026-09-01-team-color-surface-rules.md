# Team Color Surface Rules Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `../obsidian/Projects/depth/specs/2026-09-01-team-color-surface-rules-design.md` (rewritten 2026-09-01 after implementation)

**Status (2026-09-01):** PRs 1–4 are **built and open** — [#593](https://github.com/cwharris77/depth/pull/593), [#594](https://github.com/cwharris77/depth/pull/594), [#596](https://github.com/cwharris77/depth/pull/596), [#598](https://github.com/cwharris77/depth/pull/598) — as a linear stack onto `main`. PR 4 shipped a different rule than this plan originally described: see its rewritten section below. PRs 5 and 6 are renumbered and PR 5 is split in two, because only half of it is safe to merge.

**Goal:** Stop storing "what color goes here" as data. Every surface resolves from **the selected kit's** real jersey colors (`primary`/`secondary`/`accent`) through one shared helper, so changing the uniform changes every team-colored surface; `uiAccent`/`onAccent` become frozen legacy columns that new clients never read. The player-card numeral becomes an outlined jersey numeral in two real team colors (spec direction 3).

**Architecture:** A new pure module (`lib/utils/team-surfaces.ts`, mirrored in `ios/Depth/Domain/TeamSurfaces.swift`) exposes one resolver per surface — fill, ring, **mark**, text-on-fill, numeral. `mark` is the one this plan originally lacked: a color painted straight on the page has no fill to borrow contrast from, so it takes the kit's colors in the order `secondary → accent → primary` against the ground. Call sites ask for a surface and never compose contrast logic themselves. The 105 legacy `uiAccent`/`onAccent` values move off the curation surface into a frozen map that only the seed generator reads. Cross-language domain fixtures prove the Swift and TS resolvers agree on all 105 kits.

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

## PR 1 — Shared surface resolvers (TypeScript, no callers changed) — **DONE, [#593](https://github.com/cwharris77/depth/pull/593)**

### Task 1: The resolver module

**Files:**
- Create: `lib/utils/team-surfaces.ts` — flat, not `lib/utils/colors/surfaces.ts`: a `colors/` directory beside the existing `lib/utils/colors.ts` makes `@/lib/utils/colors` ambiguous, and `AGENTS.md` names that file as a sanctioned flat cross-cutting util. The name also matches the Swift mirror.
- Create: `lib/__tests__/team-surfaces.test.ts`

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
- Modify: `lib/utils/team-surfaces.ts`, `lib/__tests__/team-surfaces.test.ts`

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

## PR 2 — Generator owns the legacy columns — **DONE, [#594](https://github.com/cwharris77/depth/pull/594)**

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

## PR 3 — Swift mirror + cross-language parity — **DONE, [#596](https://github.com/cwharris77/depth/pull/596)**

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

## PR 4 — iOS views route through the resolvers (replaces DEP-424) — **DONE, [#598](https://github.com/cwharris77/depth/pull/598)**

**This section was rewritten after implementation.** The original plan said "anything that was bare team-colored text becomes a chip." That was built, reviewed on device, and rejected as visually heavy. What shipped instead keeps bare team-colored marks and makes them legible by *choosing the right one of the kit's own colors* — the `mark` resolver. See the spec's "Rejected during implementation" section for the two other approaches that were built and dropped.

### Task 5: Migrate the call sites — DONE

- [x] Added `kitMark`/`TeamSurfaces.mark` and routed every surface painted on the page ground through it: unit-tab underline, tab-bar tint, overflow menu, chip labels and borders, stats accents, player-card watermark. Fills stay `fill`; bands around a fill stay `ring`.
- [x] `CurrentTeamStore` publishes the active kit's `JerseyColors`; `refine(_:)` keeps its behaviour so the picked kit drives chrome.
- [x] **Threaded `kitColors` into `PlayerDetailView`.** Not in the original plan and the most user-visible part: the card read `team.colors`, which the read layer overlays with the *home* kit, so the watermark, headshot ring, headshot ground and every accent ignored the uniform picker.
- [x] Text on a fill is always `readableTextOn` of that same fill. A `ring` fill paired with a `textOnFill` label collapsed to one hex for 21 of 32 teams (Seahawks `#69BE28` on `#69BE28`, contrast 1.00).
- [x] `DesignTokens.Colors.accent` kept as the pre-resolution fallback.
- [x] **`TeamBadgeOverride` kept, not deleted** — reversing this plan's Step 3. It solves logo-on-background blending (Buccaneers, Broncos), which is image content the color rules cannot see. Only the Panthers row was retired, since it pinned an invented `#36A7E0`.
- [x] Targeted runs: `DepthTests` (389 pass; 4 pre-existing local-stack integration failures unrelated to the diff), `DepthUITests/PlayerCardReorderUITests` 5/5.

**Not done:** screenshots. `ios/scripts/pr-screenshots.sh` rebuilds the base side from a fresh worktree every run and builds both sides against production, so it cannot show a local-only change — follow-up ticket filed in the vault ("iOS PR screenshot flow should reuse baselines and hit the local stack").

---

## PR 5a — Stop selecting the legacy columns (client-side only)

**Safe to merge whenever.** The columns stay in the database, so builds already on devices are unaffected — this build simply stops asking for them. Split from the `DROP COLUMN` work (PR 5b) on Cooper's call 2026-09-01; conflating them was an error in the original plan's Task 6.

**Files:**
- Modify: `ios/Depth/Data/SupabaseDepthRepository.swift` (4 select strings), `TeamSnapshotDTO.swift` (3 DTO field pairs), `CachedSnapshotModels.swift`, `TeamSnapshotMapper.swift`, `ios/Depth/Domain/Team.swift`
- Modify: `ios/DepthTests/TeamSnapshotMapperTests.swift`, `CachingDepthRepositoryTests.swift`, `UniformArchiveTests.swift`

- [ ] **Step 1:** Drop `ui_accent, on_accent` from `teamSnapshotSelect`, `teamListSelect`, `uniformListingSelect` and the flat uniform select.
- [ ] **Step 2:** Drop the fields from `TeamColorUniformDTO`, the flat uniform DTO and the archive DTO; drop `uiAccent`/`onAccent` from the app's `TeamColors` and from `CachedTeamListEntry`. `JerseyColors` already makes them unreachable from the resolvers, so this is the last read path.
- [ ] **Step 3:** The SwiftData shape change needs no migration — `DepthEnvironment.swift:40-59` wipes and retries on an incompatible store by design. **Verify on a simulator upgraded from a pre-change build, not a clean install**, since a clean install never exercises that path. Say so in the PR body.
- [ ] **Step 4:** Targeted `DepthTests` runs for the data/domain suites.

---

## PR 5b — Drop the columns (BLOCKED)

**Blocked on DEP-425 plus install drain.** Do not schedule by date. A version gate only blocks builds that contain the gate; the build currently in App Store review has no version check, so dropping a column 400s it regardless of any minimum-version value. File as its own ticket with `blocked-by: DEP-425`. See the spec's "Retirement path" section.

- [ ] Migration dropping `ui_accent`/`on_accent` from `uniforms`
- [ ] Delete `lib/uniforms/legacy-accents.ts` and its read in `lib/uniforms/seed-sql.ts`
- [ ] `npm run db:types` regenerated and committed in the same PR

---

## PR 6 — The player-card numeral

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

## PR 7 — Documentation reconciliation

### Task 9: Correct every stale claim

Additional stale claims found while implementing (2026-09-01), beyond whatever this task already lists:

- [ ] `AGENTS.md` §3 says `.prettierignore` exempts fixtures. It exempts `lib/espn/fixtures/` only, so `fixtures/domain/` churns on every regeneration until `npm run format` runs.
- [ ] `ios/CLAUDE.md` §5 shows `-only-testing:<Suite>/<Test>` without parentheses. Swift Testing free functions need them — `-only-testing:'DepthTests/teamSurfacesParity()'`. Without, the run matches nothing and prints `Executed 0 tests` **and** `** TEST SUCCEEDED **`, which reads as a pass. This silently hid a broken filter during PR 3.
- [ ] Surviving `#0a0e1a` references in `lib/roster-source.db.ts` and `lib/utils/colors.ts` — the ground moved to `#15161a` in DEP-274.
- [ ] `AGENTS.md` invariant 4 and its §5 quality-bar row assert every curated pair passes AA. False by design now: `uiAccent`/`onAccent` are frozen compat columns, and the live rules derive contrast at render time.

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
