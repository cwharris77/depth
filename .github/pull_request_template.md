## What

_What changed, user-visible first. Bullet the mechanism — name the functions/files._

## Why

_The reason this exists; one short paragraph. Omit only if What already says it._

## Tests

_Run all of these before opening the PR — the body reports what was seen, not what
should happen. The full "Any code PR" checklist (plus the iOS / schema / ingest
additions that apply to this diff) is in `AGENTS.md` §5._

- [ ] `npm run format:check` clean
- [ ] `npx tsc --noEmit` exits 0
- [ ] `npm run lint` clean
- [ ] `npm test` green — note the test count and the new/updated test files
- [ ] iOS only: `xcodebuild … test -only-testing:` scoped to the suites this diff touches
- [ ] Diff contains only the stated concern — no unrelated reformatting

Verified live: _one concrete sentence of what was actually seen — UI changes only_

## Screenshots

_**Required for ALL UI changes** — web, iOS, or both. Delete this section for non-UI PRs._

- **Web:** run `/pr-screenshots` — it captures before/after and replaces the block
  below with the generated route table.
- **iOS:** comment `/ios-screenshots` on this PR (GitHub-hosted runner, recommended),
  or run `/ios-pr-screenshots` locally — before/after captures are embedded or linked.

<!-- The sentinel comments match the markers both screenshot tools use, so this block
     is replaced idempotently on re-run. Leave them in place. -->

<!-- screenshots-start -->

_Table auto-fills here after the screenshot pass._

<!-- screenshots-end -->

<!-- Agent tooling appends the "🤖 Generated with …" footer — manual PRs can leave it off. -->