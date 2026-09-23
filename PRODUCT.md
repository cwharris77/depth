# Product

<!-- impeccable:product-schema 1 -->

## Platform

iOS-first: the product is the native SwiftUI app for the App Store. The Next.js web app is frozen and kept only to host the privacy policy and support policy.

## Users

NFL fans checking a team's depth chart on their phone, often around game time. Features are built for daily use by an engaged fan and must still make sense to a first-time user.

## Product Purpose

Interactive NFL depth chart viewer for all 32 teams: pick a team, see its roster laid out on a football field, tap a player for bio and stats, toggle offense/defense/special teams. Includes a multi-era uniform archive, team comparison, and shareable chart links.

## Positioning

The field experience. Depth-chart data exists elsewhere; depth renders the roster as a living formation on an actual field — one dot per player, tap for the card. Fidelity of the underlying data serves that experience.

## Operating Context

- Data rhythm: unofficial ESPN APIs are ingested weekly (Wed 12:00 UTC), while nflverse stats, schedules, and market lines are ingested daily. Both scheduled GitHub Actions write Supabase Postgres. A failed ingest can leave source data stale but never blocks a deploy.
- A feature request with no named target defaults to iOS only.
- The web app runs on Vercel (policy pages only); protected preview deployments use a bypass token kept out of the repo.

## Capabilities and Constraints

Confirmed functionality:
- Native SwiftUI app at the repo root (same Supabase backend, its own design system) — the product. The frozen web app continues to serve the policy pages and share the backend.
- Frozen web-app capability (reference only; iOS owns feature work): prerendered per-team depth chart pages, unified team/player command-palette search, player bio/stats cards, shareable depth-chart links, `/uniforms` archive, `/compare`, sign-in with saved preferences, gated public API routes (player search, shares, overrides).

Durable constraints:
- Team colors are machine-owned: the weekly ingest overwrites them wholesale; corrections happen in the transform (`web/lib/espn/transform.ts`), never by hand-patching.
- Two-tier team-color system with different jobs: brand-true colors on large controlled surfaces, curated legible accents for text and interactive elements; every curated pair passes WCAG-AA contrast tests enforced in CI.
- Curated archives are append-only: retirement is a flag, never a delete.
- Untrusted input degrades, never throws — share params, query params, and ESPN payloads return null/skip on malformed data.
- A team page ships exactly one team's data to the client.
- Launch gates are server-evaluated flags (`web/lib/utils/flags.ts`) so prerendered pages stay static.

## Brand Commitments

- Name: **depth** — lowercase wordmark (Rows3 icon + text), header top-right opposite the switcher.
- The dark visual world (`#15161a` ground, near-black blue-gradient cards) is the identity: extend it, don't relitigate it. No generic 3-column white-card grids, no centered-everything, no decorative blobs, no icon-in-colored-circle rows.
- iOS is its own native design, not a port of web's UI.

## Evidence on Hand

- Live pipelines produce real rosters for all 32 teams; a static seed fixture (`web/lib/teams/`) supports tests.
- No testimonials, press, benchmarks, or marketing claims exist; never fabricate them.

## Product Principles

1. **Daily-use bar, public polish floor.** Features used every day must still satisfy a first-time user; neither bar is lowered for the other.
2. **The field is the product.** Every surface either strengthens reading a roster on the field or gets out of its way.
3. **League data is curated carefully.** Machine-owned values stay machine-owned, curated history is append-only, correctness beats convenience.
4. **Degrade gracefully.** Bad input, missing data, or a failed ingest costs a fallback or a stale week — never an error screen.
5. **Native where it lands.** The build surface is iOS. Where a behavior already exists on the frozen web app and still matters, share the *behavior*, never markup — the shared backend is the real cross-surface seam.

## Accessibility & Inclusion

- WCAG AA contrast is a tested product requirement for every curated color pair (≥ 4.5:1, enforced via data-looped tests like `web/lib/__tests__/uniforms.test.ts`).
- Mobile-first is the primary usage scene: glanceable during games, one-handed reach respected.
- The iOS app ships dedicated accessibility UI test suites alongside functional ones.
