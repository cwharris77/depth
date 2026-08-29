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

Verified live: _one concrete sentence of what was actually seen — UI changes only_

## Screenshots

_**Required for ALL UI changes** — iOS, or web only when the diff touches the frozen web app. Delete this section for non-UI PRs._

- **iOS:** comment `/ios-screenshots` on this PR (GitHub-hosted runner, recommended),
  or run `/ios-pr-screenshots` locally — before/after captures are embedded or linked.
- **Web (frozen app PRs only):** run `/pr-screenshots` — it captures before/after and replaces the block
  below with the generated route table.

<!-- The sentinel comments match the markers both screenshot tools use, so this block
     is replaced idempotently on re-run. Leave them in place. -->

<!-- screenshots-start -->

_Table auto-fills here after the screenshot pass._

<!-- screenshots-end -->

<!-- Agent tooling appends the "🤖 Generated with …" footer — manual PRs can leave it off. -->