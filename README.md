# depth

Interactive NFL depth chart viewer — pick any of the 32 teams, tap any player for bio and stats.

**iOS-first (2026-08-29).** The product is the native SwiftUI app at the repo root —
see [`CLAUDE.md`](CLAUDE.md) for the operating manual. The web app (Next.js) lives under
[`web/`](web/) and is **frozen**, kept only to host the privacy policy and support
policy; new tickets default to iOS-only.

## Development

**iOS (primary):** `xcodegen generate` then open `Depth.xcodeproj` (or build via
`xcodebuild -project Depth.xcodeproj -scheme Depth`). Environment from `xcconfig/`
(Debug → local Supabase, Staging → prod). Run targeted tests only:
`xcodebuild … test -only-testing:<Suite>/<Test>` — see `CLAUDE.md` §5.

**Web (frozen, legal pages only):**

```bash
cd web
npm run dev    # dev server
npm run build  # production build
npm test       # vitest run
```

## Roadmap

The product roadmap lives in the Obsidian vault — [`Projects/depth/Roadmap.md`](../obsidian/Projects/depth/Roadmap.md) — which is the single source of truth for phase status, design decisions, and ESPN API research.

## Data

Roster, schedule, and stats data live in Supabase Postgres, shared by both clients.
Scheduled GitHub Actions ingest weekly ESPN identity/roster data and daily nflverse
stats, schedules, and market lines. Data-flow guides (ESPN/nflverse ingestion) live in the
Obsidian vault under `Projects/depth/`. iOS reads through the `DepthRepository` seam
(`Depth/Data/DepthRepository.swift`); the frozen web app (under `web/`) reads through the
`RosterSource` seam (`web/lib/roster-source.ts`) with its Postgres implementation in
`web/lib/roster-source.db.ts`. Cross-language domain fixtures (`web/fixtures/domain/*.json`)
keep shared pure logic provably identical between Swift and TypeScript.