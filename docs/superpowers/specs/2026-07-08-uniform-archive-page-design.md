# Uniform archive page — design

Date: 2026-07-08
Status: approved (design)
Roadmap: Phase 7 — Uniform archive. Extends the shipped data layer (depth#56/#57) and the
72-kit curated seed (depth#67–#71). The Phase 7 *launch* spec
([`2026-07-07-phase-7-uniform-launch-design.md`](2026-07-07-phase-7-uniform-launch-design.md))
explicitly scoped "uniform pages / archive browsing outside the picker" **out**; this spec is
that follow-on feature. It is independent of the in-page picker launch — either can ship first.

## What this is

A browsable gallery at `/uniforms` showing every curated kit for all 32 teams, each rendered as
a **generated vector uniform** (our own SVG, driven by the kit's colors), grouped by team, with
client-side filters. No jersey photos: only the color/striping/layout *facts* are used, which are
not copyrightable — the specific photos are (this is the Gridiron Uniform Database model). Zero
external image assets, zero licensing exposure.

## Locked decisions

| Decision | Choice | Why |
|---|---|---|
| Imagery | Our own generated vector uniforms from `TeamColors`. No hosted third-party photos/diagrams. Wikimedia CC-BY-SA diagrams may be used later as *reference* only. `imagePath` (already on every kit) still overrides the generated figure if committed art is ever added. | Facts (colors/striping/layout) aren't copyrightable; specific photos are. Recreating is the only license-clean path for a public site (Cooper, 2026-07-08). |
| Renderer | Generalize the existing `components/JerseySwatch.tsx` into one composable `UniformFigure`. Uniform **parts** (`Helmet`, `Jersey`, `Pants`) are separate SVG sub-renderers taking `TeamColors`; a `variant` is a preset in a `VARIANTS` map naming which parts + the `viewBox`. `jersey` variant = today's swatch. | One color contract, reused by BOTH the picker and the archive. New variants (`helmet`, `jersey+helmet`, …) are a one-line map entry — no new geometry. |
| Picker compatibility | The existing picker (`components/UniformSheet.tsx`) keeps using `variant="jersey"`; its rendered output is byte-identical to today's `JerseySwatch`. | The selector must not regress. `JerseySwatch` becomes a thin re-export/wrapper of `UniformFigure variant="jersey"`. |
| Fidelity | Generic plate colored per kit (`primary`=body/helmet, `secondary`=sleeves/stripes/pants stripe, `accent`=trim, number = `readableTextOn(primary)`). No per-kit striping data. | Renders all 72 kits instantly from data we already own; recognizable by color. Per-kit striping is a future enrichment, not v1 (YAGNI). |
| Layout | One global `/uniforms` page, server-rendered/prerendered, grouped **conference → division → team** (same convention as the switcher). Each team lists its kits as labeled `UniformFigure variant="full"` cards. | One route, one scannable page; matches "an archive for people to see." |
| Scope of kits | Include **home** kits (ESPN-owned rows) alongside curated. The archive shows every kind. | Completeness — the archive is the one place home is browsable next to alternates. |
| Data seam | Add `listUniforms(): Promise<UniformListing[]>` to `RosterSource`. Returns lightweight rows: `{ teamId, teamName, conference, division, id, kind, name, colors, yearStart, yearEnd, isCurrent }` — no player data. DB impl adds a `Pick<>` row type + SELECT string beside the existing ones and joins team meta. | This is kit *metadata*, not rosters — invariant 5 (no all-32 *roster* bundles) is respected. One query set, resolved server-side. |
| Filters | Three independent client controls: **kind** (home/away/throwback/alternate/color-rush), **era** (decade buckets derived from `yearStart`; kits with null years fall in an "Undated" bucket), and a **current-only** toggle (on `isCurrent`). Era and current-only are separate axes — a reintroduced throwback (`yearStart: 1976, isCurrent: true`) shows in the "1970s" era bucket and passes current-only. Bucketing + predicates are pure functions in `lib/uniforms/filter.ts`; the client component holds filter state only. Filter state is in-memory (no URL params in v1). | Interactive as requested; testable pure logic; thin component. |
| Launch gate | New Vercel Flags SDK flag `show-uniform-archive` in `lib/flags.ts` (server-evaluated, `decide()` request-free, default off), gating the `/uniforms` route (→ `notFound()` when off) and any nav link. Mirrors `show-uniform-picker`. | House style: launch gates are flags. Ships dark; flips on when ready. |
| Performance | `/uniforms` is a separate code-split route; it never loads on the `/`→team critical path. `UniformFigure` is inline SVG (no assets, no runtime fetch on the client). The ~72-kit metadata list is small and passed from the server component to the client filter component. | Keeps the archive off the known home-load slowness (Backlog: "Home-load feels slow — the `/` redirect hop"). |

## Components & files

- `components/UniformFigure.tsx` (new) — composable parts + `VARIANTS` map; default export renders
  the selected variant from `colors` + `size`. Honors `imagePath` (renders the image instead of the
  generated figure when present).
- `components/JerseySwatch.tsx` — becomes a thin wrapper: `UniformFigure variant="jersey"`. Keeps its
  current props/signature so `UniformSheet` is untouched.
- `lib/uniforms/filter.ts` (new) — `eraBucket(kit)`, `matchesFilters(kit, filters)`,
  `groupByDivision(kits)`; pure, colocated tests.
- `lib/roster-source.ts` / `lib/roster-source.db.ts` — add `listUniforms()` + `UniformListing` type,
  `Pick<>` row + SELECT string.
- `app/uniforms/page.tsx` (new, server) — evaluates `showUniformArchive()`; `notFound()` if off; else
  fetches `listUniforms()`, groups server-side, renders the grouped shell + a client
  `<UniformArchive>` for filtering.
- `components/UniformArchive.tsx` (new, client) — holds filter state, renders controls + the filtered
  grid of `UniformFigure` cards.
- `lib/flags.ts` (+ `lib/flag-decisions.ts`) — `showUniformArchive` flag, unlock-condition comment.

## Tests

- `lib/__tests__/uniform-figure.test.tsx` — for each `variant`, the expected parts render and each
  part is filled from the right color slot (`primary`/`secondary`/`accent`); number color =
  `readableTextOn(primary)`; `imagePath` present → `<img>` instead of SVG.
- `lib/__tests__/uniform-filter.test.ts` — `eraBucket` (decade from `yearStart`; null years →
  "Undated"); `matchesFilters` for each control and combinations;
  `groupByDivision` shape; empty-result case.
- `lib/roster-source.db.test.ts` — `listUniforms()` returns all kinds incl. home, joins team meta,
  skips dangling refs (env-gated, as today).
- Flag: `showUniformArchive` off → `/uniforms` 404s; on → renders. `decide()` request-free.
- Browser (post-merge, flag on in preview): `/uniforms` renders all teams grouped; a filter narrows
  the grid; the picker still shows identical jersey swatches; 390px layout holds.

## Out of scope

Per-kit striping/number/helmet-logo fidelity (future enrichment via new variants + optional per-kit
design data); committed jersey art (`imagePath` supports it, none produced here); URL-encoded filter
state / deep links; a per-team `/team/[id]/uniforms` route; fixing the home-load redirect slowness
(separate Backlog ticket); the 2026 Rivalries wave and retired historical deep-cut kits.
