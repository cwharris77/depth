# Helmet Art Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `../obsidian/Projects/depth/specs/2026-09-05-helmet-art-migration-design.md`

**Status (2026-09-05):** Base art merged-pending in depth [#711](https://github.com/cwharris77/depth/pull/711) — `lib/uniforms/helmet-base.svg` plus `scripts/uniform-draw/helmet_base.py`. This plan is the renderer half and has not been started.

**Goal:** Draw the helmet from Cooper's illustration instead of the four hand-authored `GEO` strings, on all 105 kits, without re-registering a single one of the 63 team decal layers and without flattening the shading that makes the art worth using.

**Architecture:** The illustration was drawn over the existing mannequin, so art space maps onto raw helmet space (x 139–802, y 65–674) under one uniform scale — `translate(30.83,-7.11) scale(0.50079)`, with x and y factors independently agreeing to 0.013%. Nesting the art inside the renderer's existing `translate(80.25 11) scale(0.5)` group therefore lands it in the coordinate space the decals already use, so no team file changes. The 465 baked fills become team colors through one pure resolver that re-lights the team color by each path's stored lightness offset, memoized per `(base, delta)` so the work is bounded by the distinct shades rather than 465 paths × 105 kits.

**Tech Stack:** TypeScript strict + Vitest + sharp (raster probes). No schema, no migration, no iOS change — iOS consumes the regenerated `-full.webp` only.

## Non-negotiable constraints

- **Decals do not move.** Any change that requires editing a `surface: 'helmet'` layer in `lib/uniforms/teams/` means the transform is wrong. Fix the transform, not the team file.
- **`lib/uniforms/helmet-art.ts` is generated.** Same rule as `lib/database.types.ts`: only its generator writes it, and it is committed in the same PR as a generator change. A hand-edit is silently reverted by the next run.
- **Nothing paints outside the shell silhouette.** The base has no rim and its gaps are transparent by design (five source paths are dropped at derivation). Do not add a stroke, a drop shadow, or a background rect to "tidy" the edge.
- **The shading must survive.** A shell that renders in fewer than 20 distinct shades has flattened; that is a failing outcome, not a cosmetic one.
- **No invented hexes.** Every shell and facemask shade must be a re-lit form of the kit's own color, per invariant 4 and `lib/utils/team-surfaces.ts`'s posture.
- **Raster regeneration is deterministic.** Two consecutive `npm run gen:uniform-thumbs` runs must produce byte-identical output.

## Stage 1 — Generate the typed art module

- [ ] Extend `scripts/uniform-draw/helmet_base.py` to emit `lib/uniforms/helmet-art.ts` alongside the SVG, with a generated-file header matching the SVG's.
- [ ] Export `HELMET_ART` as `readonly HelmetArtPath[]` — `{ d, tx, ty, role, fill?, dl? }`, where `hardware` carries `fill` and `shell`/`facemask` carry `dl` (HSL lightness delta from the surface base), never both.
- [ ] Export `HELMET_ART_TRANSFORM = 'translate(30.83,-7.11) scale(0.50079)'` with a comment deriving it from the two bbox correspondences, so a future reader can re-check it rather than trust it.
- [ ] Export `HELMET_ART_CLIP` — the outer silhouette (the first `<path>` in `helmet-base.svg`, `class="shell"`), in art space.
- [ ] `npm run format` (the generated `.ts` is not in `.prettierignore`).

## Stage 2 — The recolour resolver

- [ ] Add `lib/uniforms/helmet-shading.ts` with a role-and-constraint header and one export: `shadeFor(base: string, dl: number): string`.
- [ ] Port `neutralize()`'s math from `scripts/uniform-draw/helmet_base.py` — re-light `base` by `dl` in HSL, clamp lightness to `[0,1]`.
- [ ] Memoize on `(base, dl)`. Bound the cache; a page renders at most 32 team colors × 236 shades.
- [ ] Add `lib/__tests__/helmet-shading.test.ts`: clamping at both ends, memo returns an identical string for a repeated call, one known base+delta pair asserted against the Python output, and malformed input degrading rather than throwing (invariant 6).
- [ ] Add a looped integrity test over `HELMET_ART` — 465 entries, role counts 200 shell / 36 facemask / 229 hardware, and the `fill` xor `dl` invariant, one generated `it` per entry so a failure names the path index.

## Stage 3 — Rewrite the helmet group

- [ ] Delete `GEO.helmet`, `GEO.helmetVoid` and `GEO.facemask` from `components/UniformFigure.tsx:33-51`.
- [ ] Delete `HelmetDetails()` at `components/UniformFigure.tsx:95-127` and its call site. Confirmed removal, not a disable (spec D2).
- [ ] Replace the `${uid}-helmet` clipPath at `components/UniformFigure.tsx:257-270` with `HELMET_ART_CLIP` under `HELMET_ART_TRANSFORM`; drop the `${uid}-helmet-shell-mask` entirely.
- [ ] Replace the `hasHelmet` render block at `components/UniformFigure.tsx:350-378`: paint `HELMET_ART` inside `translate(80.25 11) scale(0.5)` → `HELMET_ART_TRANSFORM`, resolving `shell` against `model.helmetColor` and `facemask` against `model.facemaskColor` through `shadeFor`, `hardware` from its literal `fill`. Drop the 8px `OUTLINE` stroke — the base is deliberately outline-free, and re-stroking it puts back the halo the derivation removed.
- [ ] Keep the decal layers painting *after* the art group so team marks stay on top, matching today's order.
- [ ] Extend `UniformFigureDefs` / the `Geo` `sharedDefs` path so the archive's 104 figures reference the art once rather than re-embedding 69KB each.
- [ ] Verify `OUTLINE`, `HELMET_DETAIL_DARK` and `HELMET_RIVET` are still referenced by the jersey/pants code before deleting any of them; remove only the ones that became unused.

## Stage 4 — Fix the tests the deletion breaks

- [ ] Rewrite `lib/__tests__/uniform-figure.test.tsx:224` ("paints shared helmet details beneath team-authored helmet layers") — it asserts `data-detail-id="helmet-ear-opening"`, which no longer exists. Assert instead that the art group precedes the first `data-layer-id`, using a stable marker attribute on the art group.
- [ ] Re-derive the three probe coordinates in `lib/__tests__/uniform-figure.test.tsx:209` ("leaves the open facemask cage transparent") against the new art. The sight opening and lower cage must still be fully transparent and the front shell rim opaque — the assertion is unchanged, the sample points move.
- [ ] `npx tsc --noEmit`, `npm test`, `npm run format:check`.

## Stage 5 — Regenerate and prove the decals did not move

- [ ] Capture the 105 `-full.webp` rasters from `main` into a scratch dir before regenerating (this is the before half of the diff — a diff read is not evidence, per mistake #19).
- [ ] `npm run gen:uniform-thumbs`. Note it reads the hosted `uniforms` table in live-rows mode; that is a read, and the no-direct-prod-writes rule is not in play. If credentials are unavailable, use the curated-archive path and say so in the PR.
- [ ] Confirm only the 105 `-full` files changed bytes and the 105 jersey crops did not — the jersey viewBox excludes the helmet, so any jersey diff means something leaked.
- [ ] Add a looped raster test asserting each kit's decal centroid moved less than a threshold between before and after, one generated `it` per kit.
- [ ] Run the generator a second time and confirm zero git diff (determinism).
- [ ] Verify live in the browser on `/uniforms`: at least one team with a large wrapping decal (Bears, Seahawks), one with a distinct facemask color (Bears navy-on-navy, Rams), and one with no decal at all. Screenshot for the PR.

## Out of scope (do not do these here)

- Jersey, pants, sleeves or shoes — helmet only.
- Removing the consumer-less `helmet` variant at `lib/uniforms/figure.ts:22`. It is dead, but deleting it is a separate concern and a separate PR.
- Redrawing, restylizing or re-sourcing any team's decal.
- Any schema, migration, `lib/database.types.ts` or RLS change.
- Any Swift change.
