<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# depth — agent operating manual

Read this before writing any code. It is the distilled version of ~60 merged PRs of
house style; deviating from it is the main way agents waste Cooper's time here.

> **iOS-first (2026-08-29).** This app is now iOS-first. The product is the native
> SwiftUI app in `ios/`; the Next.js web app is **frozen and kept only to host the
> privacy policy and support policy**. **New tickets default to iOS-only** unless the
> ticket says otherwise; web UI work is out of scope, and web PRs land only for
> legal-page hosting or shared backend (Supabase, ingest, fixtures). This file still
> documents the whole repo — for anything iOS-specific, `ios/CLAUDE.md` is the primary
> operating manual and §5's iOS checklist governs. Vault record of the change:
> `Decisions.md` 2026-08-29 (supersedes the 2026-08-20 parity defaults).

## 1. What this app is

**The product is the native iOS app** (`ios/`) — an interactive NFL depth chart viewer:
pick any of the 32 teams, see the depth chart on a field, tap a player for bio/stats.
Stack: SwiftUI · Swift 6 strict concurrency · SwiftData (offline cache) · Supabase
Postgres · XcodeGen. Read `ios/CLAUDE.md` for its operating manual.

The Next.js 16 App Router web app (`app/`, `components/`, `lib/`) is **frozen** — kept
only to host the privacy policy and support policy and to share the Supabase backend
(ingest, schema, cross-language domain fixtures). Web-only feature work is out of scope
(2026-08-29). Its stack lingers as documented history: React 19 · TypeScript strict ·
Tailwind 4 · Framer Motion · Vitest.

Shared data flow (one direction, no shortcuts; both clients read the same backend):

```
ESPN unofficial APIs
  → scripts/ingest-espn.mts   (weekly GitHub Action, Wed 12:00 UTC; STRICT=1 in CI)
  → Supabase Postgres          (schema = supabase/migrations/, types = lib/database.types.ts)
  → dbRosterSource             (lib/roster-source.db.ts, the only RosterSource impl)
  → iOS DepthRepository        (ios/Depth/Data/DepthRepository.swift — the iOS seam)
  → DepthChartFieldView        (SwiftUI, receives ONE resolved roster per screen)
      (web app/team/[id]/page.tsx → DepthChartField remain the frozen web reader)
```

Design docs (specs) live in the Obsidian vault, not this repo:
`../obsidian/Projects/depth/specs/` (dated `*-design.md` + an index). Implementation
plans — checkbox task lists an agent executes against the code — live here instead, in
`docs/superpowers/plans/`. The product roadmap is also in the vault
(`../obsidian/Projects/depth/Roadmap.md`) — if you can't read the vault, the vault
specs index + README status table are the fallback; do not guess at roadmap intent.
Never write a new spec into this repo's `docs/` — that reintroduces the repo/vault
copies drifting out of sync that this split exists to prevent.
Handoff briefs follow the same rule — they live in the vault at
`../obsidian/Projects/depth/specs/`, not in this repo's `docs/`.

## 2. Architecture invariants

These are settled. Do not "improve" them; changing one is a design decision, not a
refactor (see §6). Invariants 1–10 govern the frozen web code and the shared backend;
new feature work happens in iOS, whose parallel invariants live in `ios/CLAUDE.md` §2
(`DepthRepository` seam, `DepthEnvironment` composition root, disposable SwiftData cache,
publishable-key-only in the bundle). Cross-language domain fixtures (invariant §2.6 of
that file) keep the *shared pure logic* provably identical — that stays even though the
web UI is frozen.

1. **All roster reads go through the `RosterSource` seam** (`lib/roster-source.ts`).
   Routes and components never query Supabase or import a registry directly.
2. **`lib/teams/` is a build-time seed and test fixture, not live data.** `league.ts`
   supplies the identity seed (id/city/name/abbrev) the ingest loops over. Conference,
   division, rosters, and ESPN brand colors are ingested; jersey palettes come only from
   the curated uniforms archive.
3. **`brand_colors` is machine-owned.** The weekly ingest overwrites ESPN's identity
   colors there. Never use those rows for a jersey or app chrome while a current uniform
   exists; never hand-patch them.
4. **A kit stores three colors; the app decides where each one goes.** `primary/secondary/
   accent` are the exact palette of a real jersey, and nothing else is stored. Every
   surface — fill, ring, mark, text-on-a-fill, the player-card numeral — resolves from
   those three at render time through `lib/utils/team-surfaces.ts`, mirrored in
   `ios/Depth/Domain/TeamSurfaces.swift` with 105-kit fixture parity. Call sites ask for a
   surface and never compose contrast logic themselves. `uiAccent/onAccent` still exist as
   Postgres columns for iOS builds already on devices; their frozen values live in
   `lib/uniforms/legacy-accents.ts`, only the seed generator reads them, and no resolver
   may (`JerseyColors` makes it a compile error). Design:
   `../obsidian/Projects/depth/specs/2026-09-01-team-color-surface-rules-design.md`.
5. **A team page ships one team's data.** Client components receive a resolved
   `TeamRoster` prop; importing all-32 data into a client bundle is a regression.
6. **Untrusted input degrades, never throws.** Share params decode to `null` on any
   malformed input (`lib/utils/depth-chart/share.ts`); the DB reader skips dangling references;
   `getTeam` returns `undefined` → 404. ESPN fetches retry with backoff.
7. **Ingestion is decoupled from deploys.** `ingest:espn` is never part of
   `next build` or CI-for-PRs; a failed ingest leaves the DB one run stale, never
   blocks a deploy. Keep it that way.
8. **`lib/database.types.ts` is generated** (`npm run db:types`, reads *local*
   Postgres). Never hand-edit it; regenerate after every migration and commit it in
   the same PR.
9. **Uniforms are fully curated and append-only.** The archive never deletes a kit;
   retire one with `year_end` + `is_current=false`. ESPN never writes this table.
10. **RLS is on for every table** (Phase C). The base tables carry a permissive
    `"public read"` policy so `dbRosterSource` reads them with the anon key; per-user
    tables are owner-only. Writes rely on the service-role ingest bypassing RLS. Never
    enable RLS on a *new* table without a read policy for whoever reads it (anon for
    public data, `auth.uid()` for private), or that reader breaks (see `docs/espn.md`).
11. **Published data stays decodable by every supported app build.** Before an ingest,
    schema, or API change writes a value an installed client cannot decode, ship the
    compatible binary, confirm its App Store release, and use the existing forced-update
    flow to block older builds. Only then run the backfill or enable the new payload.
    A merged PR, TestFlight upload, or a configured-but-unenforced minimum build is not
    sufficient.

## 3. Conventions

### Code

- **Formatting is Prettier's job, enforced by CI.** `.prettierrc` (single quotes,
  100 width, es5 trailing commas, bracket-same-line) is the only authority — never
  hand-align or argue style. `npm run format` before committing;
  `npm run format:check` is a CI gate. `.prettierignore` exempts generated files
  (`lib/database.types.ts`), `lib/espn/fixtures/`, markdown, and `supabase/` — keep it
  that way. Note it does **not** cover `fixtures/domain/`, so regenerating the
  cross-language fixtures always leaves a format diff until `npm run format` runs.
- **Comment density is deliberately high, and it's "why"-comments.** Every `lib/`
  module opens with a header comment stating its role and the design constraint it
  satisfies. Inline comments state contracts and cross-file couplings ("see
  lib/espn/transform.ts's fallback"), never line narration. When you write a module
  with no header comment, or a comment that restates the next line, you've missed the
  house style in opposite directions.
- **Pure logic lives in `lib/` with colocated tests** (`lib/__tests__/` or next to the
  file in `lib/espn/`). Components stay thin; anything worth testing gets extracted
  into a pure function first. `lib/` itself is area-scoped: React hooks live under
  `lib/hooks/<area>/` (e.g. `lib/hooks/depth-chart/`), non-hook helpers under
  `lib/utils/<area>/` — flat directly in `lib/hooks/`/`lib/utils/` only when genuinely
  cross-cutting (`lib/hooks/use-user.ts`, `lib/utils/colors.ts`). `lib/types.ts`,
  `lib/database.types.ts`, `lib/roster-source.ts`/`.db.ts`, and `lib/class-names.ts`
  (the `cn()` helper) stay at `lib/` root; ingest/domain subtrees (`lib/espn/`,
  `lib/nflverse/`, `lib/teams/`, `lib/uniforms/`, `lib/sportslogos/`, `lib/supabase/`)
  are untouched by this split. Add a new area folder before defaulting a new hook or
  util to the flat catch-all.
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
  component is a review-blocking regression, not a shortcut. Every primitive's `variant`
  prop means semantic intent and takes its values from the shared vocabulary in
  `components/ui/variants.ts` — never a per-component visual name (`chrome`/`plain`) or a
  one-off prop name (`kind`).
- **Data-integrity tests loop over the data**: one generated `it` per row/team (see
  `uniforms.test.ts`), so a failure names the offending row.
- **Launch gates are Vercel Flags SDK flags in `lib/utils/flags.ts`** — never bool/string
  consts in components, never raw `process.env` reads outside a flag's `decide()`.
  A flag is evaluated server-side in the page and threaded down as a prop; client
  components never call a flag. `decide()` stays request-free (no cookies/headers)
  so prerendered team pages stay static. Every flag carries a comment stating its
  unlock conditions. Toolbar overrides work in previews via the discovery endpoint
  (`app/.well-known/vercel/flags`, authed by `FLAGS_SECRET`).
- **Imports use the `@/*` alias.** Package manager is **npm** (package-lock.json).
- **Public, unauthenticated API routes gate input at the boundary.** The player-search
  route is the reference (`app/api/players/search/route.ts`): validate + normalize query
  params in pure `lib/` functions and reject invalid/whitespace-only/overlong input with
  400 before any DB work, escape `%`/`_`/`\` before input enters a LIKE pattern
  (`escapeLike` in `lib/utils/search/search.ts`), cap per-client hits with an in-memory
  sliding window (`lib/utils/rate-limit.ts`), and cache repeated normalized queries so
  hot searches don't hit Postgres per keystroke.
- **No new dependencies without asking.** The runtime dep list is 9 packages and that is
  a feature. Hand-roll small utilities (see base64url in `lib/utils/depth-chart/share.ts`).

### Process

- **One concern per PR.** Big multi-layer features split into stacked PRs by layer
  (PR1 data, PR2 UI — see #56/#57) using GitHub's native `gh stack` workflow, not
  manual base-then-retarget. A stack is a **linear chain** where each PR targets the
  branch below it, bottom → `main`; GitHub auto-re-targets each upper PR to `main`
  when the one below lands, so **never write "retarget to main once #N merges"** — that's
  the old manual way. Build it with `gh stack init <branch>` → commit →
  `gh stack add <next>` per layer → `gh stack submit` to open all linked PRs at once;
  merge with the stack UI or `gh stack merge`. Stacks only make sense for **linear
  dependency chains** (data → UI); parallel independent work stays separate PRs, and
  all layers must live in this repo (no cross-fork stacks).
- **Conventional Commits** for commits and PR titles. Scopes in use: `ios`, `uniforms`,
  `nav`, `search`, `player`, `field`, `depth`, `card`, `switcher`, `teams`, `colors`,
  `espn`, `ingest`, `supabase`, `scripts`, `pwa`, `seo`, `theme`, `layout`, `ci`,
  `specs`, `readme`, `auth`. Types include `a11y:` and `design:` where apt. Most work now
  scopes `ios` (see `ios/CLAUDE.md`). **`design:` is for a change to how something looks
  that fixes nothing broken** — "I wanted a different look" is not a bug, and titling it
  `fix:` files it under Bug Fixes in the release notes. It covers restyles that add no
  capability too, so reach for it over `feat:` when the diff only changes appearance.
  `style:` stays what it has always been here: code formatting, never visual design.
- **Squash-merge only** (`gh pr merge --squash`). Never merge-commit, never rebase-
  merge, never delete or force-push `main`.
- **PR bodies follow the house shape**: `## What` / `## Why` / `## Tests` (or
  `## Verification`), ending with the "Generated with Claude Code" footer. The
  verification section carries *evidence*, not claims — test counts, and a "Verified
  live: …" line describing what was actually seen in the browser. **Start every PR
  from the template** (`.github/pull_request_template.md`) and keep its sections —
  agents: `gh pr create` without `--body`, or pass `--body-file` on the template, so
  the `## Screenshots` section stays in and any UI change fills it (web:
  `/pr-screenshots`; iOS: `ios/scripts/pr-screenshots.sh --body-file <body>` — runs
  automatically for every iOS UI PR via the `ship-pr` skill).
- **Vercel preview browser QA starts with the bypass URL.** Protected preview
  deployments use Vercel's Protection Bypass for Automation. Keep the token only in
  `.env.local` as `X_VERCEL_PROTECTION_BYPASS`; never commit it. Before opening a
  `*.vercel.app` preview in an agent/browser session, run
  `npm run preview:bypass-url -- <preview-url>` and navigate to the printed URL first.
  It appends `x-vercel-protection-bypass` and `x-vercel-set-bypass-cookie=1` so Vercel
  sets the bypass cookie; later same-domain navigation can use the normal preview URL.
- **Docs move with behavior.** A PR that changes data flow updates the matching source
  guide (`docs/espn.md` or `docs/nflverse.md`); a PR that ships/kills a roadmap item
  updates README's status table and, when relevant, the vault specs index
  (`../obsidian/Projects/depth/specs/2026-07-07-roadmap-specs-index.md`).

## 4. Mistakes you will make here unless you follow these rules

Each is named for what it looks like in a diff. The rule prevents it. Most of these are
web-era lessons; they still govern any PR that touches the frozen web app or shared
backend. iOS-specific failure modes (project.yml without regen, stale domain fixtures,
cached-read crashes, reaching around `DepthRepository`) are in `ios/CLAUDE.md` §4.

1. **Training-data Next.js.** You write `middleware.ts`, old metadata APIs, or
   pages-router idioms. *Rule: read the matching guide under
   `node_modules/next/dist/docs/` before touching any Next API (top of this file).*
2. **The wrong surface resolver.** You paint a mark that floats on the page with
   `teamRing` (which may borrow its contrast from the fill it encloses, so it can return a
   hex that vanishes on `#15161a`), or you label a team-colored fill using a resolver
   measured against a *different* ground — the bug that rendered Seahawks `#69BE28` on
   `#69BE28`, contrast 1.00, for 21 of 32 teams. *Rule: `teamFill` for a body, `teamRing`
   for a band around a known fill, `kitMark` for anything on the page ground, and a label
   is ALWAYS derived from the exact color behind it. Never invent a hex — uniform hexes
   come from a named source and get a comment citing it.*
3. **Hand-editing `lib/database.types.ts`.** It typechecks, then the next
   regeneration silently reverts your change. *Rule: only `npm run db:types` writes
   that file; migration and regenerated types land in the same PR.*
4. **Reaching around the seam.** A component imports `lib/teams` or creates a
   Supabase client to "just fetch one thing". *Rule: app code depends on
   `RosterSource` only; `lib/teams` may be imported by the ingest script and tests,
   nothing else.*
5. **"Fixing" `league.ts`.** You update a team's colors or division in the fixture and
   expect the app to change. *Rule: current jersey colors come from `uniforms`; ESPN
   identity colors live in `brand_colors`; conference/division come from ESPN ingest.*
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
17. **Copy-pasted div structure and duplicated ternary text.** You paste the same card/
    row/list JSX block a second time in the same file with only the inner values
    changed, or repeat the same conditional string-building logic across two-or-more
    JSX branches instead of deriving it once (shipped case: `TeamStatsView.tsx` had two
    near-identical "rounded-2xl bordered row list" blocks — postseason and roster
    leaders — and a four-way `CoachBadge` ternary chain that each recomputed the same
    name/meta pair). *Rule: this is a different axis from primitive adoption (#15's
    rule) — a block can already use `components/ui/` primitives and still be
    structurally duplicated. The second time you write (or are about to paste) the same
    div structure or the same conditional-text logic in one file, extract it: a local
    component for repeated structure (parameterize the parts that actually differ, not
    every stylistic detail), or a single derived value computed once for repeated
    ternary text, instead of a per-branch JSX ternary chain.*
18. **Stale abort clobbers a newer request's state.** A debounced/abortable fetch
    hook's `.catch`/`.finally` unconditionally calls `setLoading(false)` (or sets
    `notFound`/`error`) without checking whether *this specific request* was the one
    superseded — a slow, since-aborted request's rejection is delivered after the
    *new* request's synchronous `setLoading(true)` and silently stomps it back to
    false, so the UI reads "not loading" while a fetch is genuinely in flight (shipped
    bug, three independent instances the same night: `use-player-search.ts`,
    `use-team-schedule-season.ts`, `use-team-season.ts`). *Rule: any reject handler in
    an abortable fetch must check `controller.signal.aborted` (and/or
    `err.name === 'AbortError'`) before calling a state setter — never call
    `setLoading`/`setError`/`setNotFound` from a `.catch`/`.finally` unconditionally.
    Prefer composing on the shared abortable-fetch hook (see the tracked ticket to
    build one) over hand-rolling this per-hook.*
19. **Primitive/hook behavior change verified only against the callers in your diff.**
    You fix or extract a shared primitive/hook and confirm the call sites you touched
    look right, but every *other* existing caller — the ones you never opened — also
    inherits the new behavior, silently (shipped bug: routing `SectionLabel` through
    `cn()` correctly started applying its base `px-5 py-2` for the first time to ~10
    existing callers that a JS-default-parameter footgun had been silently skipping it
    for, visibly misaligning two live pages; a separate extraction the same night also
    dropped a `Promise.all` on the home page, serializing what had been a parallel
    fetch). *Rule: before merging a primitive/hook behavior change, `grep` every call
    site across the whole repo, not just the ones your diff touches. For anything
    render-affecting, verify with a real before/after screenshot (spin up the base
    branch on a second port) rather than trusting a diff read — typecheck/lint/test
    do not catch a visual regression or a dropped `Promise.all`.*

## 5. Quality bar per deliverable

Adjectives don't count; these boxes do.

**iOS-first (2026-08-29):** most PRs are iOS-only — their full checklist lives in
`ios/CLAUDE.md` §5 (targeted `xcodebuild -only-testing:`, `xcodegen generate`,
fixture regen, `DesignTokens.swift` sync). The web-toolchain checks below apply only
when the diff touches the frozen web app or shared backend.

**Any code PR**
- [ ] Web-touching diff only: `npm run format:check` clean; `npx tsc --noEmit` exits 0; `npm test` green, new pure logic has new tests (malformed/empty input included)
- [ ] UI-visible change verified in the running app — web: browser; iOS: simulator — PR body says what was seen
- [ ] New UI composed from `components/ui/` primitives — no bespoke re-implementation
      of an existing primitive; new primitives (if any) live in `components/ui/`
- [ ] No div structure or conditional-text logic pasted a second time in the same file
      (mistake #17) — extracted into a local component or a single derived value instead
- [ ] Diff contains only the stated concern; no unrelated reformatting
- [ ] New/changed modules carry a role-and-constraint header comment
- [ ] Conventional-commit title with a scope from the list in §3
- [ ] PR body starts from `.github/pull_request_template.md` (What/Why/Tests + footer);
      the `## Screenshots` section is filled in for any UI change, not deleted
- [ ] No new dependency (or explicit sign-off recorded in the PR body)

**Schema change (additionally)**
- [ ] New file under `supabase/migrations/`, never an edit to an applied migration
- [ ] `npm run db:types` rerun; regenerated types committed in the same PR
- [ ] `lib/roster-source.db.ts` `Pick<>` row types + SELECT strings updated together
- [ ] Ingest/seed writes are idempotent upserts; provenance scoping respected
- [ ] RLS untouched (or the PR is the auth phase and ships read policies)

**iOS app (additionally)** — see [`ios/CLAUDE.md`](ios/CLAUDE.md) for the full iOS
operating manual (architecture, conventions, parity mechanisms). Quality-bar summary:
- [ ] Targeted test runs only, never the full suite: `xcodebuild -project ios/Depth.xcodeproj
      -scheme Depth -destination 'platform=iOS Simulator,id=…' test
      -only-testing:<Suite>/<Test>` scoped to the suites the diff touches
      (DepthTests for data/domain, DepthUITests/AccessibilityUITests/ShareUITests for
      the flows changed). This is a pre-release app — the full run is minutes long and
      not worth it on every change.
- [ ] `xcodegen generate` run and `Depth.xcodeproj` committed if `project.yml` changed
- [ ] `fixtures/domain/*.json` regenerated (`npx tsx fixtures/generate.mts`) if
      `formations.ts`/`roster.ts` changed
- [ ] `ios/Depth/Support/DesignTokens.swift` updated in the same PR if a shared web
      token changed

**Design spec**
- [ ] File is `../obsidian/Projects/depth/specs/YYYY-MM-DD-<slug>-design.md` — the
      vault, never this repo's `docs/`
- [ ] Has: Status line, roadmap linkage, locked decisions with rationale,
      Tests section (a concrete list), Out of scope section
- [ ] Self-contained: an agent can implement from it without asking product questions
- [ ] Vault index (`*-roadmap-specs-index.md`) row added/updated

**Implementation plan**
- [ ] File is `docs/superpowers/plans/YYYY-MM-DD-<slug>.md` — this repo, not the vault
- [ ] Header links the vault spec it implements (relative path)

**Curated data (kits, seeds)**
- [ ] Every hex cites its source in a comment (teamcolorcodes / GUD / TruColor / press release)
- [ ] Resolver tests pass for every new row: each surface returns one of the kit's own
      three colors, white, or the app ground — never an invented hex
      (`lib/__tests__/team-surfaces.test.ts` loops the archive, one `it` per kit)
- [ ] Append-only respected; ids follow `${teamId}-${slug}-${yearStart}`

**Ingest / script change**
- [ ] Pure transform logic stays in `lib/espn/` with tests; the script stays I/O glue
- [ ] Fetch paths retry; a partial run is recorded (`ingestion_runs`) and STRICT
      semantics preserved
- [ ] Still runs standalone via `npm run …` with `.env.local` auto-load

## 6. When uncertain — escalation rules

**Proceed without asking** when the work is covered by an approved spec in the vault
(`../obsidian/Projects/depth/specs/`), or is a bugfix/small feature that follows the
invariants above. Locked decisions in a spec are settled — implement them; do not
relitigate.

**Ask first (blocking)** before any of:
- adding a dependency,
- a schema change not written in an approved spec,
- enabling RLS, touching auth, or anything that writes to the hosted DB outside a
  migration or the existing ingest script,
- flipping a launch gate in a deployed environment (a `lib/utils/flags.ts` flag, e.g.
  `show-uniform-picker` — changing its env var in Vercel or its `decide()` default),
- changing CI, the ingest cadence, or repo secrets,
- removing user-visible behavior (even "obviously dead" — #54 removed arrows shipped
  in #53 *by decision*, not by cleanup),
- reverting or disabling a previously-adopted architectural setting (a `next.config.ts`
  feature flag like `cacheComponents`, a caching strategy, a build-time toggle) to
  route around a conflict with your current task — even when the conflict is real and
  the revert would fix your task's symptom (shipped near-miss: a ticket asking for
  `dynamicParams = false` hit a real Next.js constraint — `cacheComponents: true` is
  all-or-nothing and incompatible with route-segment `export const revalidate` — and
  silently reverted Cache Components app-wide to route around it, undocumented in the
  PR, without verifying the revert actually fixed the target page; it didn't). *Surface
  the conflict and the trade-off instead of resolving it unilaterally — check `git log`
  for why the setting was adopted before touching it.*

**Flag in the PR body but proceed** when a spec has drifted from the code it
describes: the code is the truth for what exists; the spec is the truth for what to
build next. Adapt mechanically (renamed file, changed signature) and note the drift.
If the drift is *conceptual* (the spec's approach no longer fits), stop and ask.

**Stop and report — do not work around** when: tests fail for reasons unrelated to
your change; ESPN data looks wrong (never hand-patch the DB); the vault is
unreachable and the task depends on roadmap context the specs don't carry; or an
instruction here conflicts with a direct request from Cooper (his request wins —
say which rule you're overriding).

**A verification test you cannot pass is a signal, not a waiver.** When your own
test/check fails, route around the failure only after you've investigated the root
cause and named it — the test may be asserting an assumption the code (or the
migration's premise) never actually enforced (DEP-322: a "restrictive" Postgres
grant was a silent no-op against Supabase's default `ALL` on every public table).
A red check recorded in the PR body as "blocked" is a red flag you're shipping a
contract that isn't true; fix the code or the test, don't document the exception.

**Never**: force-push or delete `main`; commit a service-role key
(`SUPABASE_SECRET_KEY` lives only in `.env.local` and GitHub Actions secrets —
the anon key is public-safe by design); merge-commit; hand-edit generated files;
delete archive rows.

## Skill routing

When the user's request matches an available skill, invoke it via the Skill tool. When in doubt, invoke the skill.

Key routing rules:
- Product ideas/brainstorming → invoke /office-hours
- Strategy/scope → invoke /plan-ceo-review
- Architecture → invoke /plan-eng-review
- Design system/plan review → invoke /design-consultation or /plan-design-review
- Full review pipeline → invoke /autoplan
- Bugs/errors → invoke /investigate
- QA/testing site behavior → invoke /qa or /qa-only
- Code review/diff check → invoke /review
- Visual polish → invoke /design-review
- Ship/deploy/PR → invoke /ship or /land-and-deploy
- Save progress → invoke /context-save
- Resume context → invoke /context-restore
- Author a backlog-ready spec/issue → invoke /spec
