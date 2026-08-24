# Uniform Color Separation — Curate `uniforms`, add `brand_colors`, remove drift

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Vault spec linkage:** `../obsidian/Projects/depth/specs/2026-08-24-uniform-color-separation-design.md` (decisions locked 2026-08-24).

**Goal:** Make `uniforms` the sole, fully-curated authority for every jersey's exact GUD-sourced hexes; stop the ESPN brand-vs-jersey confusion and the reconcile machinery that manufactures home colors from ESPN; move ESPN brand colors into a separate `brand_colors` table; keep chrome tied to the current jersey via `withHomeColors`.

**Locked model (from the spec):**
- Two domains, two tables, no overlap: `uniforms` (fully curated — hexes from teamcolorcodes, patterns/era years from GUD, `source` dropped) and `brand_colors` (ESPN-sourced, written each ingest, not read by uniforms/chrome while a current kit exists).
- `uniforms` id: `{teamId}-{slug}-{yearStart}` (deterministic; id stable across a kit's life; ending a kit = set `year_end` + `is_current=false`).
- Current-ness = workflow-kept `is_current` boolean; `year_end IS NULL` as backstop; `is_current = true ⟺ year_end IS NULL`.
- `kind` stays (UI grouping/ordering label). `source` column dropped.
- Data integrity: backfill missing `year_start`/`year_end`, then `NOT NULL` on `year_start`.
- `teams.color_*` → migrate into `brand_colors`, then drop the columns.
- Retired `-home-<year>` snapshots kept as history.
- Every uniform kind gets accurate GUD hexes (not just home).

## Global Constraints

- Do not modify uniform *geometry* definitions (`lib/uniforms/teams/*.ts`) — only palette/sourcing change. The Broncos-jersey rework (`lib/uniforms/teams/broncos.ts:17`) is out of scope here.
- Do not add dependencies.
- Every curated hex cites its source in a comment (teamcolorcodes) and every era-year range cites GUD, per the repo convention.
- Append-only curation discipline (`AGENTS.md` invariant 9): never delete a kit row; retire via `year_end`/`is_current`.
- Do not write to the hosted DB outside a committed migration (AGENTS.md §6).
- Run Prettier only on files changed by this plan.

---

### Task 1: DB — `brand_colors` table + migrate `teams.color_*` + drop columns

**Files:**
- Create: `supabase/migrations/<stamp>_add_brand_colors.sql`
- Edit: `lib/database.types.ts`, `lib/supabase/tables.ts`

**Steps:**
- [ ] Create `brand_colors` table: `team_id` (PK, FK → teams), `color_primary`, `color_secondary`, `color_accent`, `ui_accent`, `on_accent`, `updated_at` (mirror the current `teams.color_*` shape so migration is a straight copy).
- [ ] Backfill `brand_colors` from `teams.color_*` (single INSERT … SELECT).
- [ ] Drop `color_primary`, `color_secondary`, `color_accent`, `ui_accent`, `on_accent` from `teams` (after the backfill, in the same migration).
- [ ] Update `lib/database.types.ts` (regenerate via `npm run db:types` if local supabase is up; else hand-edit the Table type) and add `brand_colors` to `lib/supabase/tables.ts`.

### Task 2: DB — `uniforms` id shape + `source` drop + data-integrity backfill + indexes

**Sequencing note:** this task depends on Task 4 (curated `data.ts` + regenerated seed) landing first, so the `year_start`/`year_end` backfill values line up with the curated rows. Execute Task 4 before this one.

**Files:**
- Create: `supabase/migrations/<stamp>_uniforms_curated_integrity.sql`
- Edit: `lib/database.types.ts`

**Steps:**
- [ ] Backfill `year_start`/`year_end` on rows currently missing them (source: the curated data.ts after Task 4 lands).
- [ ] Add `NOT NULL` on `year_start`.
- [ ] Re-issue ids that don't match `{teamId}-{slug}-{yearStart}` (UPDATE id where malformed; preserve `image_path` pointing at the new id's artifact URL).
- [ ] Drop the `source` column.
- [ ] Add indexes: `uniforms(team_id, is_current)`, `uniforms(team_id)`, `uniforms(year_start, year_end)`.
- [ ] Add a DB-level consistency check (check constraint or trigger) that `is_current = true ⟺ year_end IS NULL`.

### Task 3: Remove the drift machinery

**Files:**
- Delete: `lib/uniforms/reconcile.ts`, `lib/uniforms/reconcile-db.ts`
- Edit: `scripts/ingest-espn.mts` (remove the "home-drift reconcile" block ~line 231-247; keep the `teams` write but repoint to `brand_colors`)
- Delete: `supabase/migrations/20260708100000_teams_pending_home_colors.sql` (drop `pending_home_colors` column in a new migration)
- Edit: `lib/uniforms/art.tsx` header comment (drop the "espn home rows" mention)

**Steps:**
- [ ] Delete `reconcile.ts` + `reconcile-db.ts`.
- [ ] In `scripts/ingest-espn.mts`, remove the reconcile call + alert output; change the write from `teams.color_*` to a `brand_colors` upsert (same transformed values via `toBrandColors`).
- [ ] New migration to drop `teams.pending_home_colors`.
- [ ] Remove the reconcile tests (`lib/__tests__/reconcile.test.ts`) and any others asserting ESPN→home behavior.

### Task 4: Curate all uniform hexes in `data.ts` (GUD-sourced)

**Files:**
- Edit: `lib/uniforms/data.ts` (add current home rows; the existing curated rows already carry hexes — verify all against GUD and update any that drift)
- Edit: `lib/uniforms/seed-sql.ts` (id now `{teamId}-{slug}-{yearStart}`, drop `source` from the emitted columns)

**Steps:**
- [ ] Add the 32 current uniform rows to `data.ts` (`kind` per row, `source` removed from the shape, populated `yearStart`/`yearEnd`, hexes from `teamcolorcodes.com` + era years from GUD, source comments).
- [ ] Verify/update every existing curated row's hexes against `teamcolorcodes.com` and era years against GUD (all kinds, not just home).
- [ ] Update `seed-sql.ts` id derivation to `{teamId}-{slug}-{yearStart}` and drop `source` from COLUMNS.
- [ ] Regenerate the seed migration via `npm run gen:uniform-seed`.
- [ ] Regenerate rasters via `npm run gen:uniform-thumbs` (id-derived artifact URLs change).

### Task 5: Read layer — `withHomeColors` + `toTeamColors` → `toBrandColors`

**Files:**
- Edit: `lib/roster-source.db.ts` (drop `teams.color_*` from the SELECT columns; keep `withHomeColors` reading `uniforms` current kit)
- Edit: `lib/espn/transform.ts` (rename/repurpose `toTeamColors` → `toBrandColors` for the `brand_colors` write; drop its jersey-body semantics)

**Steps:**
- [ ] Remove `color_*`/`ui_accent`/`on_accent` from the `teams` SELECT in `roster-source.db.ts` (lines ~61, 71-74, 112-115); `toTeam` falls back to `withHomeColors`-overlaid uniform colors.
- [ ] Rename `toTeamColors` → `toBrandColors` (or a new `toBrandColors` fn) and point the ingest write at it; the jersey `primary/secondary/accent` mapping is no longer produced from ESPN.
- [ ] Ensure `withHomeColors` (unchanged mechanism) reads the current kit via `is_current` — confirm the query still filters `kind`/`is_current` correctly.

### Task 6: `UniformFigure` geometry slug — strip `-yearStart` suffix

**Files:**
- Edit: `components/UniformFigure.tsx` (line ~179-181)

**Steps:**
- [ ] Update the slug derivation so a `{teamId}-{slug}-{yearStart}` id resolves to the geometry slug by stripping both the `${teamId}-` prefix and the trailing `-{yearStart}`.
- [ ] Keep the existing behavior for any id that has no trailing year (defensive).
- [ ] Update `lib/uniforms/model.ts` tests / `uniform-figure.test.tsx` to cover the new id shape.

### Task 7: Tests + verification

**Files:**
- Edit: `lib/__tests__/uniforms.test.ts`, `lib/__tests__/uniform-archive.test.tsx`, `lib/__tests__/uniform-seed-gen.test.ts`, `lib/__tests__/uniform-filter.test.ts`, `lib/__tests__/roster-source.db.test.ts`, `lib/__tests__/art.test.ts`

**Steps:**
- [ ] Update tests asserting the old `${teamId}-${slug}` id and `teams.color_*` sourcing.
- [ ] Update seed-gen test for the new id shape + `source` drop.
- [ ] Add a test that a current kit is resolved via `is_current` and a retired one via `year_end`/`is_current=false`.
- [ ] `npx tsc --noEmit`, `npm test`, `npm run lint`, `npm run format` all green.

### Task 8: Docs

- [ ] Remove the "espn home rows / drift" wording in `lib/uniforms/*` header comments and `lib/roster-source.db.ts` (withHomeColors comment).
- [ ] Update the vault spec Status → done once shipped; mark the Roadmap row.
- [ ] PR body notes the vault spec + this plan.

## Out of scope

- Uniform geometry definitions (`lib/uniforms/teams/*.ts`) — the Broncos jersey rework (`broncos.ts:17`) is separate.
- Rendering `brand_colors` anywhere (future use).
- nflverse ingest / cache revalidation.
- iOS code changes (reads the same `uniforms` data; color contract unchanged).
