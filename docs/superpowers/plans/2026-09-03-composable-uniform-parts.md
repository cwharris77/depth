# Composable Uniform Parts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `../obsidian/Projects/depth/specs/2026-09-03-composable-uniform-parts-design.md`

**Status (2026-09-03):** Stage A1 **merged** (depth [#656](https://github.com/cwharris77/depth/pull/656)) — the parts model plus Bears and Seahawks migrated, 2872 tests green, all 210 committed rasters regenerated with zero diff. Stage A2+ is the remaining 30 teams. Stage B is **UNBLOCKED** — Cooper decided 2026-09-03 to keep the club marks and make fidelity the bar rather than provenance; `TRACE-PENDING-STYLIZE` is retired (depth [#658](https://github.com/cwharris77/depth/pull/658)).

**Goal:** Make a kit a *combination* of independently-authored helmet, jersey and pants parts, so that swapping a home helmet onto an away jersey is three string references rather than a re-transcription — and so that a new uniform from the monitor is a small, mechanical diff instead of an artwork exercise.

**Architecture:** `lib/uniforms/teams/parts.ts` is an authoring layer, not a runtime. A team declares a named palette plus part registries; `compileParts()` assembles each kit's three references into the flat `TeamUniformDefinition` that `resolveUniformModel` already consumes. Nothing downstream changes — not `types.ts`, not `model.ts`, not `UniformFigure.tsx`, not any caller — so teams migrate one at a time and each migration is independently verifiable. Parts name colors from the team palette rather than the kit row's `primary`/`secondary`/`accent`, because those are kit-relative and would repaint a shared part; and parts are *total* (every generic mannequin layer is stripped, generic marks kept explicitly via `fromGeneric`) because a surviving generic layer reintroduces that same kit-relative resolution.

**Tech Stack:** TypeScript strict + Vitest. No schema, no migration, no iOS change — iOS consumes rows and prerendered rasters only.

## Non-negotiable constraints

- **Row ids never change.** `image_path` derives from `${teamId}-${slug}-${yearStart}`; a renamed kit 404s its artwork on every installed iOS build.
- **`npm run gen:uniform-thumbs` must produce zero git diff** after any Stage A change. This is the migration's real acceptance test and the thing that protects installed builds.
- **One team per PR** from A2 onward. A team's migration is mechanical and self-verifying; batching them makes a failure harder to attribute.

---

## Stage A1 — parts model + first two teams (built)

- [x] `lib/uniforms/teams/parts.ts` — `TeamPartsDefinition`, `UniformPart`, `PartLayer`, `compileParts()`, `fromGeneric()`, authoring-time palette/part validation
- [x] `lib/uniforms/teams/bears.parts.ts` — 1 helmet + 3 jerseys + 1 pants (the flat form authored the decal and pant stripe three times each)
- [x] `lib/uniforms/teams/seahawks.parts.ts` — 3 helmets + 4 jerseys + 4 pants across four kits, including the 1976 collar's inherited-index paint order
- [x] `lib/uniforms/teams/index.ts` points `bears` and `seahawks` at the compiled definitions
- [x] `parts.test.ts` — 9 unit tests over the compiler's guarantees
- [x] `parts-parity.test.ts` — per-kit, per-variant byte-identical raster gate plus within-surface paint-order equality
- [x] `definitions.test.ts` updated: the Seahawks home assertion filters by prefix instead of comparing the whole authored list, since totality makes previously-inherited generic layers explicit
- [x] Verified: `npx tsc --noEmit` clean, 2872 tests pass, `npm run format` clean, `gen:uniform-thumbs` zero diff

## Stage A2+ — remaining 30 teams

Per team, in its own PR:

- [ ] Read the flat definition and identify which parts are actually shared across its kits (this is the step that finds the duplication; Bears collapsed 3 kits to 5 parts, Seattle 4 kits to 11)
- [ ] Author `<team>.parts.ts`: palette from the curated row hexes, parts, kit references
- [ ] Add the team to `MIGRATED` in `parts-parity.test.ts`
- [ ] Point `index.ts` at `<TEAM>_UNIFORMS_FROM_PARTS`
- [ ] Confirm parity tests pass and `gen:uniform-thumbs` produces zero diff
- [ ] Keep the flat definition in the tree — it is the parity test's baseline until every team has migrated

Teams (unmigrated): bengals, bills, broncos, browns, buccaneers, cardinals, chargers, chiefs, colts, commanders, cowboys, dolphins, eagles, falcons, giants, jaguars, jets, lions, niners, packers, panthers, patriots, raiders, rams, ravens, saints, steelers, texans, titans, vikings.

Expect these to be harder than Bears and easier than Seattle. Seattle exercised every awkward case at once: per-kit generic stripping, partial `number` overrides inheriting from the generic model, literal-hex colors already in the flat form, and a same-id layer replacement whose paint order depends on the *inherited* index rather than source order.

## Stage A-last — retire the flat authoring path

- [ ] Delete every flat `*_UNIFORMS` definition and `parts-parity.test.ts` together, in one PR, once all 32 teams are migrated
- [ ] Consider folding the parts types into `types.ts` if the two-file split has stopped earning its keep
- [ ] Keep the geometry constant exports — the parts files import them

## Stage B — decal pipeline (unblocked 2026-09-03)

A trace from a gate-passing reference is acceptable output, not a scaffold. Hand-drawing is the fallback for a mark that cannot be traced, not the default. Accuracy is judged against the **helmet** reference, not the logo — placement (scale, rotation, extent, which logo elements appear) is a separate failure axis from linework and is measured from the GUD helmet composite.

- [ ] B1. Reference gate as a drawkit check: thinnest critical stroke >= 2px (p5 horizontal run in the mark's carrying color) AND component count stable under a 0.75x downscale. Validated on Bears (hairline keyline, 0.65% stroke fraction) and Seahawks (fat white channels, 1.67%); both reject below 128px and accept at/above. Aim for >=256px references
- [ ] B2. Ticket format: mark artwork attached at unveiling time (SportsLogos 403s automated fetches and GUD returns empty, so an agent cannot fetch it; the Wikimedia API can be fetched and returns licence metadata)
- [ ] B3. Per-team decal re-authoring, one team per PR, each with a before/after at true thumbnail scale on the shell color. TWO axes, both required (spec decision 7): (a) linework, from a gate-passing mark reference; (b) application geometry — scale, rotation, extent, silhouette clipping, and which logo elements actually appear — measured from the GUD **helmet** reference, where 46px is fine. Bake any rotation into the path coordinates; `UniformLayer` has no transform field. Acceptance is a side-by-side against the helmet reference, not the logo

Note that B changes artwork at existing URLs, so installed iOS builds pick it up immediately. That is a product decision, not a technical one.

## Gotchas already paid for

- `Omit<UnionType, K>` collapses to the keys the union members share — it silently dropped `fillRule`/`lineCap` from a derived layer type, which would have painted a decal's counters solid. `PartLayer` is written out explicitly for this reason; do not "simplify" it back.
- An unknown palette key must throw. Falling through to `resolveColor`'s `return colors.primary` paints a plausible-but-wrong color that the raster test reports as *different*, not as *wrong*, which wastes the diagnosis.
- Cross-surface layer order changes under parts (helmet → jersey → pants). That is safe because `UniformFigure` groups by surface before painting; within-surface order is the load-bearing property and is asserted separately.
