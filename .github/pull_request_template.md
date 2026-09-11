## What

_What changed, user-visible first. Bullet the mechanism — name the functions/files._

> iOS-first (2026-08-29): the product is iOS. Web-only UI PRs are unexpected — the web
> app is frozen (legal-page hosting + shared backend only). See `AGENTS.md` §5.

## Why

_The reason this exists; one short paragraph. Omit only if What already says it._

## Tests

_Run all of these before opening the PR — the body reports what was seen, not what
should happen. iOS-only PRs: the iOS checklist in `ios/CLAUDE.md` §5 (targeted
`-only-testing:` runs). The web-toolchain checks below apply only when the diff touches
the frozen web app/backend — see `AGENTS.md` §5._

- [ ] iOS: `xcodebuild … test -only-testing:` scoped to the suites this diff touches
- [ ] Web-touching diff only: `npm run format:check` clean; `npx tsc --noEmit` exits 0
- [ ] Web-touching diff only: `npm test` green — note the test count and new/updated test files
- [ ] Diff contains only the stated concern — no unrelated reformatting
- [ ] Schema/backend PRs only: `npm run check:ios-compat` passes — destructive migrations
      carry a `-- IOS-COMPATIBILITY:` annotation and update `ios-release-compatibility.md`
- [ ] Schema/backend PRs only: sequencing per the vault's `Reference/forced-update-gate.md` — a compatible
      build is **LIVE in the App Store** (not TestFlight) and the gate is armed before any
      destructive migration ships

Verified live: _one concrete sentence of what was actually seen — UI changes only_

<!-- Agent tooling appends the "🤖 Generated with …" footer — manual PRs can leave it off. -->