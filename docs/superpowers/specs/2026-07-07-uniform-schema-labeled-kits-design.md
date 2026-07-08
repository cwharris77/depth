<!-- /autoplan restore point: /Users/cwharris/.gstack/projects/cwharris77-depth/feat-uniform-schema-labeled-kits-autoplan-restore-20260707-144443.md -->
# Uniform schema — labeled kits, home in-table, ESPN drift auto-promote

Date: 2026-07-07
Status: approved (design), revised after /autoplan review
Roadmap: Phase 7 — Uniform archive. Follows PR1 (data layer, depth#56) and PR2
(selector + live recolor, depth#57). Reworks the schema so every kit — including home and
away — is a first-class, labeled row, and captures ESPN color changes instead of silently
overwriting them.

**Shipping split (decided in review):**
- **PR-A (this spec's core): schema + labeled rows + real away colors.** Delivers the
  user's actual ask (away colors, and the labeled kits the swipeable selector will page
  through). No reconciler.
- **PR-B (fast-follow): ESPN drift auto-promote reconciler.** Bolts onto PR-A with no
  rework because it only ever writes the ESPN-owned `home` rows. Section below is its
  contract.

## Problem

Today the `uniforms` table holds only *extra* kits (throwbacks/alternates). A team's home
look is never stored — it is synthesized at read time from `teams.colors`
(`homeUniform()`, `lib/roster-source.db.ts:149`), and that same `teams.colors` is
overwritten wholesale by the weekly ESPN ingest (`scripts/ingest-espn.mts:157`). Two
consequences:

1. **No away (or any labeled) kit.** There is nowhere to put "white base / navy accent".
2. **Silent data loss on rebrand.** When ESPN changes a team's hexes, the old home colors
   are gone and the synthesized home kit shifts with no record it changed.

Goal: store unlimited, labeled kits per team (home, away, throwback, color rush,
alternate); ship real away colors; and (PR-B) let ESPN keep home colors current
automatically while preserving every past look.

## Core architecture — flip the source of truth

- **The `uniforms` table becomes the source of truth for the rendered kit.** Home is a
  real row (`kind='home'`); every team gets one backfilled in the migration. The field
  themes off the selected kit (already true in `DepthChartField.tsx`), defaulting to the
  current home row.
- **`teams.colors` stays the ESPN landing spot.** In PR-A it still equals each home row
  (the backfill copies it), so no surface diverges. In PR-B it becomes the drift *sensor*:
  the reconciler compares it to the current home row and pins the row on a stable change.
- **The DB is no longer fully reproducible from source files, and that's accepted.** This
  is public data pulled in, not authored content. Home rows are machine-owned; curated
  rows are seeded from committed migrations (below).

## Two provenances, one table, disjoint writers

The apparent complexity is two *provenances*, not two *sources* — and they map onto update
cadence:

| Rows | Source | Cadence | Writer | `source` |
|---|---|---|---|---|
| home (current + retired homes) | ESPN | weekly, automated (PR-B) | reconciler | `espn` |
| away, throwback, color rush, alternate | GUD / teamcolorcodes / TruColor, by hand | a few times a year | seed migration | `curated` |

A single `source text` column makes provenance explicit. Separate tables were rejected:
they force a permanent UNION in every read and fracture uniform *history* across tables
(retired homes accumulate as history too).

## Schema (PR-A)

Reshape the `uniforms` table (`20260705043556_add_uniforms_table.sql` is the current def):

```
id           text primary key      -- readable slug, `${team_id}-${slug}`
team_id      text not null references teams(id) on delete cascade
kind         text not null         -- 'home' | 'away' | 'throwback' | 'color-rush' | 'alternate'
name         text not null         -- display label: "Home", "Away", "Creamsicle"
source       text not null         -- 'espn' | 'curated'
year_start   int
year_end     int                   -- null = still in the active rotation
is_current   boolean not null default false
color_primary   text not null
color_secondary text not null
color_accent    text not null
ui_accent       text not null      -- reads on the dark app bg (#0a0e1a)
on_accent       text not null      -- text color painted on ui_accent
image_path      text               -- null -> generated jersey-SVG fallback
updated_at   timestamptz not null default now()

index uniforms(team_id, kind)
```

### Migration order (fixes the NOT-NULL-on-populated-table bug)

The table already has the 4 PR1 curated rows, so a bare `ADD COLUMN … NOT NULL` fails.
Strict order **inside one migration**:

1. `ALTER TABLE uniforms ADD COLUMN kind text;` and `ADD COLUMN source text;` (nullable).
2. Backfill the 4 existing rows: set `source='curated'` and the right `kind`
   (`throwback` for Seahawks '76 / Broncos Orange Crush / Eagles Kelly Green,
   `alternate`/`throwback` for Bucs Creamsicle — match the era).
3. Backfill one `kind='home'`, `source='espn'`, `is_current=true`,
   **`year_start=NULL`, `year_end=NULL`** row per team from current `teams.colors`
   (`id = ${team}-home`). Null years so `formatUniformYears` renders "Current", not
   "2026–present".
4. `ALTER TABLE uniforms ALTER COLUMN kind SET NOT NULL, ALTER COLUMN source SET NOT NULL;`
5. `CREATE INDEX uniforms_team_id_kind_idx ON uniforms(team_id, kind);`

### Column decisions (locked)

- **`id` stays a text slug, not numeric.** `${team_id}-${slug}` — `seahawks-home`,
  `seahawks-away`, `buccaneers-creamsicle`. The **current home is permanently
  `${team}-home`**; on a PR-B rebrand the *retired snapshot* takes the year suffix
  (`seahawks-home-2027`), never the current row — so the stable id always points at live
  data. (Home ids are not shared anyway: the launch spec omits Home from the `kit` share
  param, read in `components/ApplyKitFromQuery.tsx:22`.)
- **`kind` and `name` are separate columns.** `kind` is the indexed machine label; `name`
  is the display label.
- **`ui_accent`/`on_accent` stay.** The dark UI needs a legible accent for text, dots, and
  rings, enforced by the contrast test for curated rows. For `espn` home rows they are
  derived by `toTeamColors()` (the pop-color logic, `lib/espn/transform.ts:45`).

### `kind` is a sparse label, not a required set

Only `home` is guaranteed (backfilled for all 32). Away/color-rush/throwback exist only
when a team has one. So `(team_id, kind)` is **not unique**; consumers never assume a kind
exists; exactly one row per team is `kind='home' AND is_current=true`.

## Real away colors (PR-A deliverable — this is the point)

Making away *storable* is not the deliverable; **shipping away rows is.** PR-A seeds a
first concrete batch of `kind='away'`, `source='curated'` rows in `data.ts`, starting with
the user's example:

- **Seahawks away** — white base, navy accent: `primary #FFFFFF`, `secondary #002244`,
  `accent #69BE28`, curated `ui_accent`/`on_accent` that pass AA on `#0a0e1a`.
- Plus a starter tranche of well-known aways (see the launch spec's team list). Exact team
  count is the one open taste decision at the gate (Seahawks-only proof vs ~8-team tranche).

Remaining aways follow the launch spec's curation cadence — but PR-A does not ship with
zero aways.

## Curated seed = migration, not manual table edits

Curated kits are versioned as **append-only SQL seed migrations** so prod applies them via
the Supabase pipeline (runs on merge) — no manual `ingest:uniforms`, no hand-edited tables.

Authoring stays in `lib/uniforms/data.ts` (typed `UniformSeed[]`, guarded by the dark-UI
contrast test in `lib/__tests__/uniforms.test.ts`). A generator turns `data.ts` into an
idempotent seed migration. **The upsert must not touch machine-owned rows:**

```sql
INSERT INTO uniforms (...) VALUES (...)
ON CONFLICT (id) DO UPDATE SET ... WHERE uniforms.source = 'curated';
```

The `WHERE` clause makes the "disjoint by source" guarantee real instead of by-convention —
a curated slug that collides with an espn id can no longer overwrite it. `ingest:uniforms`
is superseded by generated migrations and removed. `ingest:espn` is unchanged.

## Read-layer changes (PR-A)

- `lib/roster-source.db.ts` — delete `homeUniform()` synthesis; read all kits from the
  table. `orderUniforms`: current home first, then other current kits by name, then retired
  kits by `year_end` newest-first. **With multiple retired homes, break `year_end` ties
  deterministically** (secondary sort on id) so ordering is stable.
- `lib/types.ts` — `Uniform` gains `kind`; drop the "synthesized Home / no DB row" comments.
- `lib/uniforms/data.ts` — `UniformSeed` gains `kind`; comments updated (home is a row;
  this file seeds only `source='curated'`).
- `components/DepthChartField.tsx` — default kit stays `uniforms[0]` (now the current home
  row). No behavior change beyond the source.
- **In PR-A, `roster.team.colors` still equals the home row**, so OG images
  (`app/team/[id]/opengraph-image.tsx`) and the team grid (`NavSwitcher` via
  `listTeams()`) stay correct with no change. See PR-B for when that stops being true.

## PR-B — ESPN drift auto-promote (fast-follow contract)

Bolts onto PR-A. ESPN is trusted; a *stable* change is taken as truth automatically; the
only human step is naming the retired kit.

A **reconcile step** runs after `teams.colors` is written each week:

1. Read the team's current home row (`kind='home' AND is_current`). **If none exists**
   (a team added after the backfill — expansion/relocation), upsert `${team}-home` from
   `teams.colors` and stop. This restores the guarantee `homeUniform()` gave for free.
2. Compare its `color_primary/secondary` to fresh `teams.color_primary/secondary`.
3. On a **qualifying** diff (stability guard below):
   - **Update `${team}-home` in place** to ESPN's new hexes + freshly derived
     `ui_accent/on_accent` — the current home keeps its stable id.
   - **Insert a retired snapshot** of the *old* colors as `${team}-home-<seasonYear>`,
     `is_current=false`, `year_end=<seasonYear>`, auto-named `"Home '<yy>"`.
   - **Fire an alert** (vault `System/Inbox.md` capture, same mechanism as
     `daily-inbox-triage`; console fallback) so a human renames the retired kit.
4. **Route the other theming surfaces through the home row.** Once the reconciler can pin
   home away from `teams.colors`, `opengraph-image.tsx` and `NavSwitcher`/`listTeams()`
   must read the current home row too, or PR-B explicitly documents the divergence. This is
   the completion of the source-of-truth flip.

### Stability guard (PR-B, required)

Promote only when the new value (a) isn't a fallback sentinel (`#000000`/`#ffffff`,
`transform.ts:39`) and (b) is confirmed by **two distinct weekly pulls**. State lives in a
**`pending_home_colors jsonb` column on `teams`** holding the candidate hexes plus the
**ESPN `season.year`+week (or `ingestion_runs` id) of first sighting** — so a retry or
manual re-run of the *same* pull cannot count as the second confirmation. The reconciler:
first qualifying diff → stage candidate + run-id; next pull with the same value and a
*different* run-id → promote + clear; any pull matching the current home (revert) or a
different value → clear/replace `pending`. The `fresh == home` branch **must** clear
`pending`.

### Contrast on auto-promote (PR-B, required)

Home rows are not in `data.ts`, so the contrast test does not cover them. An auto-promoted
home is a brand-new row shown to users with no human review. Before promoting, the
reconciler runs `contrastRatio(uiAccent, DARK_BG)` (`lib/colors.ts`); on failure it
**holds and alerts** instead of enshrining an illegible accent. Add a DB-level test
asserting every `kind='home'` row passes AA.

### Year source (PR-B)

Use ESPN `season.year` (`ingest-espn.mts:93`), not `new Date().getFullYear()`, everywhere
the flow says "current year" (`year_start`, id suffix, `"Home 'yy"`) — calendar year in
server TZ mislabels an offseason rebrand. Same-year double rebrand: on
`${team}-home-<year>` PK collision, append a sequence (`-2`).

## Curated data sourcing (reference, for the human step)

- **Gridiron Uniform Database (gridiron-uniforms.com)** — most useful single source; every
  team's home/away/alternate/throwback with color breakdowns. Best for *which kits exist*
  and the home/away distinction.
- **teamcolorcodes.com** — cleanest official hexes (already in use). **TruColor** — the
  other precise-hex reference.
- **No programmatic API**, and scraping is out of scope; hexes are typed by hand into
  `data.ts`. Cadence is low. Jersey *images* are copyrighted and stay out of scope
  (silhouette fallback via `JerseySwatch`).

## Tests

**PR-A:**
- Contrast/integrity suite (`uniforms.test.ts`) extended for the `kind` field; still guards
  every curated row (now including away rows).
- Migration: applies cleanly on a table preloaded with the 4 PR1 rows (the NOT-NULL
  ordering); backfills exactly one current home per team with null years.
- Read layer: `orderUniforms` puts current home first; renders "Current" for home; multiple
  retired homes sort deterministically (tie-break test).
- Seed generator: `data.ts` → migration is idempotent; the `ON CONFLICT … WHERE
  source='curated'` upsert cannot modify an `espn` row (test a colliding-slug case).
- Away rows present: a seeded team exposes a `kind='away'` kit that passes AA.

**PR-B:**
- Reconciler: no diff → no-op; fallback sentinel → no promote; one distinct pull → staged,
  not promoted; two distinct pulls same value → `${team}-home` updated in place + retired
  snapshot inserted/renamed; **revert (A→B→A) clears pending**; **oscillation A→B→A→B**;
  same-run re-run does not promote; new team with no home row → home created; illegible
  auto-promote → held + alerted; same-year double rebrand → no PK crash.
- Curated rows untouched by the reconciler across all cases.

## Out of scope

- Real jersey artwork (supported via `image_path`, not produced here).
- The `SHOW_UNIFORM_PICKER` launch gate + the throwback/Rivalries content seed — owned by
  the launch spec (`2026-07-07-phase-7-uniform-launch-design.md`).
- Away colors for all 32 teams — PR-A ships a first away batch; the rest follow the launch
  spec's cadence.
- The swipeable bottom-sheet selector (Caleb feedback) — separate UI change on top of the
  labeled kits this spec produces.
- Any scraping of uniform sites.

## /autoplan review — findings & decisions

Ran CEO (strategy) + Eng review with independent Claude subagents. Codex unavailable, so
`[subagent-only]` (no second outside voice). One gate answered: **split into PR-A schema /
PR-B reconciler**. Note: the eng subagent reported a prompt-injection block appended to its
task payload; it ignored it and reviewed from source. Flagged to the user.

### Decision audit trail

| # | Phase | Decision | Class | Principle | Rationale |
|---|-------|----------|-------|-----------|-----------|
| 1 | CEO | Split schema (PR-A) from reconciler (PR-B) | Gate | user | User chose; reconciler is separable (writes only espn rows) |
| 2 | Eng | Fix NOT-NULL migration ordering (nullable→backfill→SET NOT NULL) | Mechanical | P1 | Bare ADD COLUMN NOT NULL fails on the populated table |
| 3 | Eng | Current home stays `${team}-home`; retired snapshot gets year suffix | Mechanical | P5 | Stable id must point at live data, not stale |
| 4 | Eng | Backfill home with null years (renders "Current") | Mechanical | P5 | Avoid "2026–present" copy regression |
| 5 | Eng | Generator upsert `WHERE source='curated'` | Mechanical | P1 | Makes disjoint-writer guarantee enforced, not by-convention |
| 6 | CEO | PR-A ships real away rows (not just "storable") | Mechanical | P1 | The user's actual ask; away had no owner in either spec |
| 7 | Eng | Reconciler bootstraps `${team}-home` when missing | Mechanical | P1 | New teams would otherwise have zero home rows (→ PR-B) |
| 8 | Eng | Two-pull guard keyed on distinct run-id, clears on revert | Mechanical | P1 | "Two runs" ≠ "two pulls"; retries must not promote (→ PR-B) |
| 9 | Eng | Contrast check before auto-promote; hold+alert on fail | Mechanical | P1 | Home rows skip the contrast test; auto-promote is unreviewed (→ PR-B) |
| 10 | Eng | Complete the flip: OG image + NavSwitcher read home row | Mechanical | P1 | Else rebrands diverge across surfaces (→ PR-B) |
| 11 | Eng | Use ESPN season.year, not calendar year | Mechanical | P3 | Offseason rebrand mislabeled otherwise (→ PR-B) |
| 12 | Eng | Doc fix: kit param is in ApplyKitFromQuery, not share.ts | Mechanical | P5 | Grounding accuracy |

### Surfaced at the gate (not auto-decided)

- **User challenge (strategy):** the strategy voice argued to skip the home-as-row flip
  entirely and ship away as pure curated rows (keep `homeUniform()` synthesis), calling the
  flip + drift gold-plating for a hobby app. User's stated direction (home in-table so ESPN
  changes preserve history) is the default and stands unless changed.
- **Taste:** PR-A away batch size — Seahawks-only proof vs a ~8-team first tranche.

### Consensus (subagent-only; Codex N/A)

| Dimension | Eng subagent | Verdict |
|---|---|---|
| Architecture sound? | Yes, core instinct right; not impl-ready as written | Fixed in revision |
| Migration safe? | No (NOT-NULL ordering) | Fixed (#2) |
| id scheme correct? | No (inverted stability) | Fixed (#3) |
| Reconciler edge cases covered? | No (bootstrap/guard/contrast/year) | Moved to PR-B contract (#7–11) |
| Away actually delivered? | No (deferred to a cadence w/ no owner) | Fixed (#6) |
