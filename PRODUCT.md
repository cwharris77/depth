# Product

<!-- impeccable:product-schema 1 -->

## Platform

iOS-first (2026-08-29): the product is the native SwiftUI app for the App Store. The Next.js web app is frozen and kept only to host the privacy policy and support policy.

## Users

Cooper first: he built depth for his own daily use and dogfoods every feature. Product and design decisions weigh a general NFL fan's expectations too — personal-first, public-ready. Secondary audience: NFL fans checking a team's depth chart on their phone, often around game time.

## Product Purpose

Interactive NFL depth chart viewer for all 32 teams: pick a team, see its roster laid out on a football field, tap a player for bio and stats, toggle offense/defense/special teams. Includes a multi-era uniform archive, team comparison, and shareable chart links. Success is Cooper using it routinely while it stays good enough to hand to a stranger.

## Positioning

The field experience. Depth-chart data exists elsewhere; depth renders the roster as a living formation on an actual field — one dot per player, tap for the card — which a table-based competitor cannot copy without rebuilding its core. Fidelity of the underlying data serves that experience.

## Operating Context

- Data rhythm: unofficial ESPN APIs are ingested weekly (Wed 12:00 UTC), while nflverse
  stats, schedules, and market lines are ingested daily. Both scheduled GitHub Actions
  write Supabase Postgres; the app reads through its server-side data layer
  (`lib/roster-source.db.ts`). A failed ingest can leave source data stale but never
  blocks a deploy.
- Uniform-archive curation is a measured craft workflow: reference images (internal-only, never committed or redistributed), 1–3 teams per pass, every hex cites its source (`docs/uniform-model-brief.md`).
- Specs and roadmap live in the Obsidian vault (`../obsidian/Projects/depth/`); implementation plans live in this repo (`docs/superpowers/plans/`). Never write specs into this repo's `docs/`.
- Multi-surface parity process (vault spec, 2026-08-20): **reversed 2026-08-29** — a feature request with no named target defaults to **iOS only**. The web app is frozen and retained solely to host the privacy policy and support policy. See Decisions.md 2026-08-29.
- The web app runs on Vercel (frozen; legal pages only); protected preview deployments use a bypass token kept out of the repo.

## Capabilities and Constraints

Confirmed functionality:
- Native SwiftUI app in `ios/` (same Supabase backend, its own design system) — the product. The frozen web app continues to serve the legal pages and share the backend.
- Frozen web-app capability (reference only; iOS owns feature work): prerendered per-team depth chart pages, unified team/player command-palette search, player bio/stats cards, shareable depth-chart links, `/uniforms` archive, `/compare`, sign-in with saved preferences ("my team", defaults to Seahawks), gated public API routes (player search, shares, overrides).

Durable constraints:
- Team colors are machine-owned: the weekly ingest overwrites them wholesale; corrections happen in the transform (`lib/espn/transform.ts`), never by hand-patching.
- Two-tier team-color system with different jobs: brand-true colors on large controlled surfaces, curated legible accents for text and interactive elements; every curated pair passes WCAG-AA contrast tests enforced in CI.
- Curated archives are append-only and provenance-scoped: retirement is a flag, never a delete.
- Untrusted input degrades, never throws — share params, query params, and ESPN payloads return null/skip on malformed data.
- A team page ships exactly one team's data to the client.
- Launch gates are server-evaluated flags (`lib/utils/flags.ts`) so prerendered pages stay static.

Explicitly undecided:
- Desktop layout direction: the centered-column cap is an interim state; a real "use the space" pass is open design work (vault Design Brief item 5).
- A dedicated animation pass beyond current spring defaults is deferred.
- Vision-tier ideas (custom rosters, all-time teams, draft boards) are backlog, not commitments.

## Brand Commitments

- Name: **depth** — lowercase wordmark (Rows3 icon + text), header top-right opposite the switcher.
- The dark visual world (`#0a0e1a` ground, near-black blue-gradient cards) is the incumbent identity: extend it, don't relitigate it (Design Brief, 2026-07-02). Guardrails from the prior review remain in force: no generic 3-column white-card grids, no centered-everything, no decorative blobs, no icon-in-colored-circle rows.
- iOS is deliberately its own native design, not a port of web's UI ("iOS is its own design", 2026-08-18).

## Evidence on Hand

- Live weekly pipeline produces real rosters for all 32 teams; a static seed fixture (`lib/teams/`) supports tests.
- Uniform archive rows carry source-cited hexes (teamcolorcodes / GUD / TruColor / press releases).
- Prior formal design review scored the shipped app 8/10 ("not AI-slop"); a new-user QA walkthrough on desktop and mobile is dated 2026-07-27 (vault).
- Absences future work must not fabricate: no testimonials, press, benchmarks, or marketing claims exist anywhere; uniform reference images are internal-only and must never be redistributed.

## Product Principles

1. **Personal dogfood bar, public polish floor.** Features Cooper uses daily must still satisfy a first-time stranger; neither bar is lowered for the other.
2. **The field is the product.** Every surface either strengthens reading a roster on the field or gets out of its way; fidelity serves the experience, not a spreadsheet.
3. **League data deserves provenance.** Machine-owned values stay machine-owned, curated history is append-only, every color cites its source — correctness beats convenience.
4. **Degrade gracefully.** Bad input, missing data, or a failed ingest costs a fallback or a stale week — never an error screen or a broken promise.
5. **Native where it lands.** The build surface is iOS, and iOS is its own design (2026-08-18). Where a behavior already exists on the frozen web app and still matters, share the *behavior*, never markup — the shared backend is the real cross-surface seam.

## Accessibility & Inclusion

- WCAG AA contrast is a tested product requirement for every curated color pair (≥ 4.5:1 accent-on-accent pattern, enforced via data-looped tests like `lib/__tests__/uniforms.test.ts`).
- Mobile-first is the primary usage scene: glanceable during games, one-handed reach respected.
- The iOS app ships dedicated accessibility UI test suites alongside functional ones.
