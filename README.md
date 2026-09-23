# depth

Interactive NFL depth chart viewer — pick any of the 32 teams, tap any player for bio and stats.

**iOS-first.** The product is the native SwiftUI app at the repo root —
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

## Data

Roster, schedule, and stats data live in Supabase Postgres, shared by both clients.
Scheduled GitHub Actions ingest weekly ESPN identity/roster data and daily nflverse
stats, schedules, and market lines. iOS reads through the `DepthRepository` seam
(`Depth/Data/DepthRepository.swift`); the frozen web app (under `web/`) reads through the
`RosterSource` seam (`web/lib/roster-source.ts`) with its Postgres implementation in
`web/lib/roster-source.db.ts`. Cross-language domain fixtures (`web/fixtures/domain/*.json`)
keep shared pure logic provably identical between Swift and TypeScript.