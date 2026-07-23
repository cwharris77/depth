<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# depth — agent operating manual

Read this before writing any code. It is the distilled version of ~60 merged PRs of
house style; deviating from it is the main way agents waste Cooper's time here.

## 1. What this app is

Interactive NFL depth chart viewer: pick any of the 32 teams, see the depth chart on a
field, tap a player for bio/stats. Stack: Next.js 16 App Router · React 19 · TypeScript
strict · Tailwind 4 · Framer Motion · Vitest · Supabase Postgres.

Data flow (one direction, no shortcuts):

```
ESPN unofficial APIs
  → scripts/ingest-espn.mts   (weekly GitHub Action, Wed 12:00 UTC; STRICT=1 in CI)
  → Supabase Postgres          (schema = supabase/migrations/, types = lib/database.types.ts)
  → dbRosterSource             (lib/roster-source.db.ts, the only RosterSource impl)
  → app/team/[id]/page.tsx     (server, prerendered per team)
  → DepthChartField            (client, receives ONE resolved roster as a prop)
```

Design docs live in `docs/superpowers/specs/` (dated `*-design.md` + an index). The
product roadmap is in the Obsidian vault (`../obsidian/Projects/depth/Roadmap.md`) —
if you can't read the vault, the specs index + README status table are the fallback;
do not guess at roadmap intent.

## 2. Architecture invariants

These are settled. Do not "improve" them; changing one is a design decision, not a
refactor (see §6).

1. **All roster reads go through the `RosterSource` seam** (`lib/roster-source.ts`).
   Routes and components never query Supabase or import a registry directly.
2. **`lib/teams/` is a build-time seed and test fixture, not data.** `league.ts` is an
   identity seed (id/city/name/abbrev) the ingest loops over. Colors, conf/div, and
   rosters all come from ESPN at ingest time. Two doc PRs (#42, #46) exist because
   this keeps getting misread.
3. **`teams.colors` is machine-owned.** The weekly ingest overwrites it wholesale.
   Never hand-patch team colors in the DB or the seed; fix `lib/espn/transform.ts`.
4. **Two color systems, different jobs.** `primary/secondary/accent` are brand-true —
   large controlled surfaces only (field tint, header, OG cards). `uiAccent/onAccent`
   are curated/derived to read on the dark bg `#0a0e1a` — text, dots, rings, stat
   accents. PR #25 was a bug from mixing these up. Every curated color pair must pass
   the WCAG-AA contrast test (`lib/__tests__/uniforms.test.ts` pattern, `lib/colors.ts`).
5. **A team page ships one team's data.** Client components receive a resolved
   `TeamRoster` prop; importing all-32 data into a client bundle is a regression.
6. **Untrusted input degrades, never throws.** Share params decode to `null` on any
   malformed input (`lib/share.ts`); the DB reader skips dangling references;
   `getTeam` returns `undefined` → 404. ESPN fetches retry with backoff.
7. **Ingestion is decoupled from deploys.** `ingest:espn` is never part of
   `next build` or CI-for-PRs; a failed ingest leaves the DB one run stale, never
   blocks a deploy. Keep it that way.
8. **`lib/database.types.ts` is generated** (`npm run db:types`, reads *local*
   Postgres). Never hand-edit it; regenerate after every migration and commit it in
   the same PR.
9. **Curated data is append-only and provenance-scoped.** The uniforms archive never
   deletes a kit. Where machine-written and hand-curated rows share a table, each
   writer touches only its own `source` rows.
10. **RLS is on for every table** (Phase C). The base tables carry a permissive
    `"public read"` policy so `dbRosterSource` reads them with the anon key; per-user
    tables are owner-only. Writes rely on the service-role ingest bypassing RLS. Never
    enable RLS on a *new* table without a read policy for whoever reads it (anon for
    public data, `auth.uid()` for private), or that reader breaks (see `docs/espn.md`).

## 3. Conventions

### Code

- **Formatting is Prettier's job, enforced by CI.** `.prettierrc` (single quotes,
  100 width, es5 trailing commas, bracket-same-line) is the only authority — never
  hand-align or argue style. `npm run format` before committing;
  `npm run format:check` is a CI gate. `.prettierignore` exempts generated files
  (`lib/database.types.ts`), fixtures, markdown, and `supabase/` — keep it that way.
- **Comment density is deliberately high, and it's "why"-comments.** Every `lib/`
  module opens with a header comment stating its role and the design constraint it
  satisfies. Inline comments state contracts and cross-file couplings ("see
  lib/espn/transform.ts's fallback"), never line narration. When you write a module
  with no header comment, or a comment that restates the next line, you've missed the
  house style in opposite directions.
- **Pure logic lives in `lib/` with colocated tests** (`lib/__tests__/` or next to the
  file in `lib/espn/`). Components stay thin; anything worth testing gets extracted
  into a pure function first.
- **Every page is composed from `components/ui/` primitives — no bespoke one-offs.**
  Before hand-rolling a styled `<div>`/`<button>`/pill/input, `ls components/ui/` and
  use the primitive that fits (`Button`, `IconButton`, `Badge`, `Card`, `Input`,
  `Toggle`, `SegmentedControl`, `StatGrid`, `FilterPill`, `Avatar`, …). This holds even
  when you're sure the control is a one-off nobody else will reuse — "one-off" is how
  the same control gets rebuilt five different ways across pages (the ROSTER/SCHEDULE/
  STATS switcher shipped as a bespoke div group and had to be migrated back onto
  `SegmentedControl`). **Extend an existing primitive with a prop before forking a new
  component** (see `SegmentedControl`'s `size`/`fullWidth`/`href` — added rather than
  cloned); only add a *new* primitive to `components/ui/` (props-driven, token-styled,
  with a role-and-constraint header) when none fits. Bespoke inline UI in a page/feature
  component is a review-blocking regression, not a shortcut.
- **Data-integrity tests loop over the data**: one generated `it` per row/team (see
  `uniforms.test.ts`), so a failure names the offending row.
- **Launch gates are Vercel Flags SDK flags in `lib/flags.ts`** — never bool/string
  consts in components, never raw `process.env` reads outside a flag's `decide()`.
  A flag is evaluated server-side in the page and threaded down as a prop; client
  components never call a flag. `decide()` stays request-free (no cookies/headers)
  so prerendered team pages stay static. Every flag carries a comment stating its
  unlock conditions. Toolbar overrides work in previews via the discovery endpoint
  (`app/.well-known/vercel/flags`, authed by `FLAGS_SECRET`).
- **Imports use the `@/*` alias.** Package manager is **npm** (package-lock.json).
- **No new dependencies without asking.** The runtime dep list is 9 packages and that
  is a feature. Hand-roll small utilities (see base64url in `lib/share.ts`).

### Process

- **One concern per PR.** Big features split into stacked PRs by layer (PR1 data,
  PR2 UI — see #56/#57). A stacked PR's base is the previous branch; note "retarget
  to main once #N merges" in the body.
- **Conventional Commits** for commits and PR titles. Scopes in use: `uniforms`,
  `nav`, `search`, `player`, `field`, `depth`, `card`, `switcher`, `teams`, `colors`,
  `espn`, `ingest`, `supabase`, `scripts`, `pwa`, `seo`, `theme`, `layout`, `ci`,
  `specs`, `readme`. Types include `a11y:` where apt.
- **Squash-merge only** (`gh pr merge --squash`). Never merge-commit, never rebase-
  merge, never delete or force-push `main`.
- **PR bodies follow the house shape**: `## What` / `## Why` / `## Tests` (or
  `## Verification`), ending with the "Generated with Claude Code" footer. The
  verification section carries *evidence*, not claims — test counts, and a "Verified
  live: …" line describing what was actually seen in the browser.
- **Docs move with behavior.** A PR that changes data flow updates `docs/espn.md`; a
  PR that ships/kills a roadmap item updates README's status table and, when relevant,
  the specs index.

## 4. Mistakes you will make here unless you follow these rules

Each is named for what it looks like in a diff. The rule prevents it.

1. **Training-data Next.js.** You write `middleware.ts`, old metadata APIs, or
   pages-router idioms. *Rule: read the matching guide under
   `node_modules/next/dist/docs/` before touching any Next API (top of this file).*
2. **The wrong color knob.** You style text/dots with `primary` (unreadable navy on a
   dark bg) or paint a header with `uiAccent`. *Rule: uiAccent/onAccent for anything
   that must be legible on `#0a0e1a`; primary/secondary for brand surfaces; never
   invent a hex — brand hexes come from a named source and get a comment citing it.*
3. **Hand-editing `lib/database.types.ts`.** It typechecks, then the next
   regeneration silently reverts your change. *Rule: only `npm run db:types` writes
   that file; migration and regenerated types land in the same PR.*
4. **Reaching around the seam.** A component imports `lib/teams` or creates a
   Supabase client to "just fetch one thing". *Rule: app code depends on
   `RosterSource` only; `lib/teams` may be imported by the ingest script and tests,
   nothing else.*
5. **"Fixing" `league.ts`.** You update a team's colors or division in the seed and
   expect the app to change. *Rule: the seed is identity-only; live values come from
   ESPN — change the transform or wait for ingest.*
6. **Coupling ingest to build.** You add `ingest:espn` to CI/`next build` "so data is
   fresh". *Rule: ESPN is an unofficial API; ingestion failures must never block a
   deploy (invariant 7).*
7. **Throwing on bad input.** You `JSON.parse` a query param and let it explode, or
   crash on a dangling DB reference. *Rule: share links, query params, and ESPN
   payloads are untrusted — return `null`/`undefined`/skip, and unit-test the
   malformed case.*
8. **String-building PostgREST filters.** You interpolate user text into an `.or(...)`
   filter. *Rule: user input never enters filter syntax — run separate typed queries
   and merge, as `searchAllPlayers` does.*
9. **Deleting curated history.** You remove a retired kit "because it's unused".
   *Rule: archives are append-only; retirement is a flag (`isCurrent`/`yearEnd`),
   never a delete.*
10. **Enabling RLS on a new table without a read policy.** You add a table, turn RLS on
    to satisfy the advisor, and its reader silently gets zero rows. *Rule: ship the read
    policy in the same migration as `enable row level security` — anon for public data,
    `auth.uid()` for per-user (invariant 10).*
11. **Comment-stripping and terse modules.** Generic "clean code" instincts delete
    the rationale comments that are this repo's documentation. *Rule: preserve
    existing comments through refactors and write a role-and-constraint header on
    every new module (§3).*
12. **Kitchen-sink PRs.** You fix the task plus three things you noticed. *Rule: one
    concern per PR; out-of-scope findings go in the PR body or a spec, not the diff.*
13. **Claiming done without evidence.** "Should work now." *Rule: the quality bar in
    §5 is a checklist; a claim of done cites `tsc`/`vitest` output and a live check.*
14. **Format drift.** You hand-format, or commit without running Prettier, and CI
    goes red (or the next PR carries your format noise). *Rule: `npm run format`
    before every commit — the repo is already fully formatted, so any format diff
    you create is yours.*
15. **Bespoke one-off UI.** You hand-roll a styled `<button>`/`<div>` group in a page
    or feature component instead of reaching for a `components/ui/` primitive, and the
    same control gets rebuilt (differently) elsewhere. *Rule: `ls components/ui/` first;
    reuse the primitive that fits, extend one with a prop before forking, add a new
    primitive only when none fits — even for a control you're sure is a one-off (§3).*
16. **Flash-then-jump on unresolved async.** A component renders a default/placeholder
    value before its data resolves, then jumps to the real value once it does (shipped
    bugs: settings page showing "No favorite" before `getSettings()` resolved; the
    stats section popping in without reserving space). *Rule: every data-driven
    component gates rendering on an explicit `loading` flag (see `PlayerCard.tsx`'s
    `statsLoading`) — render a skeleton sized to the eventual content while loading
    (`PlayerCard.tsx`'s stat-row skeletons, sized against `statColumns`), a distinct
    empty state once resolved-but-empty, and only the real content once loaded. Never
    let a component render its post-load shape from data that hasn't arrived yet.*

## 5. Quality bar per deliverable

Adjectives don't count; these boxes do.

**Any code PR**
- [ ] `npm run format:check` clean
- [ ] `npx tsc --noEmit` exits 0
- [ ] `npm test` green; new pure logic has new tests (malformed/empty input included)
- [ ] UI-visible change verified in a running browser; PR body says what was seen
- [ ] New UI composed from `components/ui/` primitives — no bespoke re-implementation
      of an existing primitive; new primitives (if any) live in `components/ui/`
- [ ] Diff contains only the stated concern; no unrelated reformatting
- [ ] New/changed modules carry a role-and-constraint header comment
- [ ] Conventional-commit title with a scope from the list in §3
- [ ] PR body has What/Why/Tests-or-Verification and the footer
- [ ] No new dependency (or explicit sign-off recorded in the PR body)

**Schema change (additionally)**
- [ ] New file under `supabase/migrations/`, never an edit to an applied migration
- [ ] `npm run db:types` rerun; regenerated types committed in the same PR
- [ ] `lib/roster-source.db.ts` `Pick<>` row types + SELECT strings updated together
- [ ] Ingest/seed writes are idempotent upserts; provenance scoping respected
- [ ] RLS untouched (or the PR is the auth phase and ships read policies)

**Design spec**
- [ ] File is `docs/superpowers/specs/YYYY-MM-DD-<slug>-design.md`
- [ ] Has: Status line, roadmap linkage, locked decisions with rationale,
      Tests section (a concrete list), Out of scope section
- [ ] Self-contained: an agent can implement from it without asking product questions
- [ ] Index (`*-roadmap-specs-index.md`) row added/updated

**Curated data (kits, seeds)**
- [ ] Every hex cites its source in a comment (teamcolorcodes / GUD / TruColor / press release)
- [ ] Contrast tests pass for every new row (uiAccent vs `#0a0e1a`, onAccent vs uiAccent ≥ 4.5)
- [ ] Append-only respected; ids follow `${teamId}-${slug}`

**Ingest / script change**
- [ ] Pure transform logic stays in `lib/espn/` with tests; the script stays I/O glue
- [ ] Fetch paths retry; a partial run is recorded (`ingestion_runs`) and STRICT
      semantics preserved
- [ ] Still runs standalone via `npm run …` with `.env.local` auto-load

## 6. When uncertain — escalation rules

**Proceed without asking** when the work is covered by an approved spec in
`docs/superpowers/specs/`, or is a bugfix/small feature that follows the invariants
above. Locked decisions in a spec are settled — implement them; do not relitigate.

**Ask first (blocking)** before any of:
- adding a dependency,
- a schema change not written in an approved spec,
- enabling RLS, touching auth, or anything that writes to the hosted DB outside a
  migration or the existing ingest script,
- flipping a launch gate in a deployed environment (a `lib/flags.ts` flag, e.g.
  `show-uniform-picker` — changing its env var in Vercel or its `decide()` default),
- changing CI, the ingest cadence, or repo secrets,
- removing user-visible behavior (even "obviously dead" — #54 removed arrows shipped
  in #53 *by decision*, not by cleanup).

**Flag in the PR body but proceed** when a spec has drifted from the code it
describes: the code is the truth for what exists; the spec is the truth for what to
build next. Adapt mechanically (renamed file, changed signature) and note the drift.
If the drift is *conceptual* (the spec's approach no longer fits), stop and ask.

**Stop and report — do not work around** when: tests fail for reasons unrelated to
your change; ESPN data looks wrong (never hand-patch the DB); the vault is
unreachable and the task depends on roadmap context the specs don't carry; or an
instruction here conflicts with a direct request from Cooper (his request wins —
say which rule you're overriding).

**Never**: force-push or delete `main`; commit a service-role key
(`SUPABASE_SERVICE_ROLE_KEY` lives only in `.env.local` and GitHub Actions secrets —
the anon key is public-safe by design); merge-commit; hand-edit generated files;
delete archive rows.
