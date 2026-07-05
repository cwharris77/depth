# Uniform archive — data layer (Phase 7, PR1)

Date: 2026-07-04
Status: approved (design)
Roadmap: Phase 7 — Uniform archive (see the depth vault `Roadmap.md`, `Data Sources.md`)

## Goal

Stand up the data foundation for a browsable **uniform archive**: a team can eventually render
in any of its kits — current *or* historical — and old kits are never deleted. This PR ships the
data layer only: table, type, hand-curated seed, ingestion, and the DB read wiring. No UI, no
color-threading, no jersey rendering — those are PR2.

## Key facts that shape the design

- **No structured uniform source exists.** GUD, TruColor, SportsLogos, teamcolorcodes are all
  human-browsable references; none expose per-jersey colors as an API or export
  (`Data Sources.md`). Uniforms are a **hand-curated** dataset.
- **ESPN can't supply detailed kits.** ESPN gives only two base colors + logos — enough for the
  team's home/primary look (already stored on the `teams` row via `toTeamColors`), never the away
  or color-rush kit. So the ESPN ingest must not own uniform rows.
- **Team colors already come from ESPN at ingest time** (`lib/espn/transform.ts` `toTeamColors`),
  not a curated seed. So the "current/home" kit is not a new row — it *is* `team.colors`.

## Data model

New `uniforms` table — **hand-curated only; the ESPN ingest never touches it**:

| column          | type        | notes |
|-----------------|-------------|-------|
| `id`            | text PK     | stable slug `${team_id}-${slug}`, e.g. `buccaneers-creamsicle` |
| `team_id`       | text        | `references teams(id) on delete cascade` |
| `name`          | text        | display name: "Creamsicle", "Color Rush", "1994 Throwback" |
| `year_start`    | int         | nullable |
| `year_end`      | int         | nullable; null = still in rotation |
| `is_current`    | boolean     | active-rotation flag; **NOT unique** — a team wears several kits at once |
| `color_primary` | text        | brand-true |
| `color_secondary`| text       | brand-true |
| `color_accent`  | text        | brand-true |
| `ui_accent`     | text        | curated to read ≥4.5:1 on `#0a0e1a` |
| `on_accent`     | text        | text color on `ui_accent` |
| `image_path`    | text        | nullable; null → generated jersey-SVG fallback (PR2) |
| `updated_at`    | timestamptz | `default now()` |

Plus `index on team_id` and the same grant pattern as
`20260701171029_grant_default_table_privileges.sql`. There is deliberately **no** uniqueness on
`is_current` and **no** `${team_id}-current` auto-row — the default kit is synthesized (below).

### Type (`lib/types.ts`)

```ts
export interface Uniform {
  id: string;
  teamId: string;
  name: string;
  yearStart: number | null;
  yearEnd: number | null;
  isCurrent: boolean;
  colors: TeamColors;
  imagePath?: string;
}
```

Extend `TeamRoster` with `uniforms: Uniform[]`.

## Read layer (`lib/roster-source.db.ts`)

`fetchTeamRoster` additionally selects the team's `uniforms` rows (small per-team query, additive)
and returns:

```
uniforms = [ synthesizedHome, ...dbRows ]
```

- **Synthesized Home** is built from `team.colors` — no DB row: `{ id: `${team.id}-home`, teamId,
  name: "Home", yearStart: null, yearEnd: null, isCurrent: true, colors: team.colors }`. This makes
  "default" identical to "what the page shows today," with zero new rows and no ingest change.
- **Ordering:** Home first → other `is_current` kits (by name) → retired kits (`year_end` desc).
- **Default rendered kit** = `uniforms[0]` (the synthesized Home).

## Seed (`lib/uniforms/data.ts`)

Hand-authored, **append-only**, mirroring `lib/teams/league.ts`'s curated-data role. One entry per
non-home kit: `{ teamId, slug, name, yearStart, yearEnd, isCurrent, colors, imagePath? }`.

Initial seed (a mix of active alternates and retired throwbacks to exercise both `is_current`
states): **Seahawks** ('90s throwback), **Buccaneers** (creamsicle), **Eagles** (kelly green),
**Broncos** (navy/orange throwback). Real hexes sourced at implementation from teamcolorcodes /
press images; `uiAccent`/`onAccent` curated with `contrastRatio` + `DARK_BG` from `lib/colors.ts`.

## Ingestion (`scripts/ingest-uniforms.mts`, `npm run ingest:uniforms`)

Mirrors `scripts/ingest-espn.mts`'s env/upsert/`ingestion_runs` pattern:

- Reads the committed seed file — **never scrapes** the reference sites (they're human-only).
- Upserts each row by `id` (`onConflict: "id"`). **Never deletes** — the archive is append-only.
- Records one `ingestion_runs` row with `source: "uniforms"`.
- Requires `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`; not part of `next build`.

"Ingesting from the sites" (reference → seed hex) stays **manual** — the human-judgment capture
step. The script only moves our seed into Postgres.

## Tests (`lib/__tests__/uniforms.test.ts`, Vitest)

- **Contrast:** every seed uniform's `uiAccent` ≥4.5:1 on `#0a0e1a`, and `onAccent` ≥4.5:1 on
  `uiAccent`. (These are hand-curated, so strict AA is enforceable — unlike the ESPN-derived team
  colors, whose test was deliberately relaxed.)
- **Integrity:** unique `id`s, all color fields valid 6-digit `#rrggbb`, `year_end ≥ year_start`
  when both are set, `id` starts with `${teamId}-`.

`lib/database.types.ts` regenerated via `npm run db:types` after the migration.

## Out of scope (PR2)

Selector UI, jersey-silhouette SVG rendering (the `image_path`-null fallback), threading the
selected uniform's colors through `DepthChartField`/`PlayerDot`, and the `?kit=`/localStorage
selection state.
