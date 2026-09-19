# Shipping (depth)

Depth-specific rules layered on the global `ship-pr` skill (its step 0 reads this file first; where the two conflict, this file wins). The general flow — find the board ticket, branch, verify, shallow review, commit, PR, CI, squash-merge, close the ticket — lives in that skill. This file only carries what is different here. Background: `CLAUDE.md` §3 (conventions) and §5 (quality bar). The PR is not shippable until §5's "Any code PR" checklist passes.

## Verify (skill step 3)

**Run only what your diff touches — CI runs the full suite on every push, so a full local run just duplicates it.**

- **iOS diff:** targeted `xcodebuild … -only-testing:` scoped to the changed suite(s) — invocation in `CLAUDE.md` §5. Swift Testing free functions need the parentheses in the filter (`DepthTests/someTest()`) or the filter silently matches nothing and xcodebuild still prints `** TEST SUCCEEDED **`.
- **Web-touching diff** (`web/`, `supabase/`, `fixtures/`): `npm run format`, `npx tsc --noEmit`, `npm run lint`, and `npm test -- <path-or-pattern>` scoped to the changed area — never a bare `npm test`.
- **UI-visible change:** run it (simulator for iOS; dev server for web — `next-dev` in `.claude/launch.json`, port 3050 is the sanctioned alternate), exercise the actual flow, and write one concrete sentence of what you saw, e.g. "on Seahawks the arrows point at Saints ← → Steelers; clicking Next lands on the Steelers page". It goes in the PR body verbatim as `Verified live: …`.
- **False-positive test failures:** before treating a failure as real, confirm the failing file paths are inside the working tree. `.worktrees/` and `.claude/worktrees/` sibling checkouts hold their own copy of the suite and deps; a stale copy failing there says nothing about your change. If every failure traces to one of those paths, the run is a false positive — and if `vitest.config.*`'s `exclude` doesn't already cover the sibling worktree directory in play, fix the config rather than working around it per run.

## Commit (skill step 5)

Scope comes from the list in `CLAUDE.md` §3; a new scope only if the area is genuinely new (no `feat(misc):`).

## PR (skill step 6)

`gh pr create --body` bypasses the template, so build the body from a copy of `.github/pull_request_template.md` and fill What / Why / Tests / Verified live / Screenshots.

**The `## Screenshots` section is required, not optional.** The screenshot CI gate was removed 2026-09-10, but simple UI changes still get a capture (PR #833):

- **Simple UI change** (single screen, no complex flow or logic): after the PR exists, run `/ios-pr-screenshots` — it captures the changed screen and fills the block between the `screenshots-start` / `screenshots-end` sentinels.
- **Multi-screen or logic-heavy change** you are validating in the simulator yourself: skip the capture and replace the block with one sentence justifying the skip (`gh pr edit <N> --body-file`). Never leave the placeholder text in place.

Stacked PRs use `gh stack` (see the global workflow) — do not retarget by hand.

## After merge (skill step 8)

- If the PR shipped or killed a roadmap item, update the README's status table (and the specs index if a spec's status changed) — as its own small `docs(readme):` PR if it didn't fit in this one.
- If uncommitted work has to survive `git checkout main && git pull`, never pair an unconditional `git stash` with an unconditional `git stash pop`: the stash is a shared, session-spanning stack, and a no-op push (nothing was dirty) followed by a blind pop can resurrect an unrelated older stash. Check `git status --porcelain` first and skip the pair on a clean tree; otherwise capture the stash's identity (`git stash list` before and after, or `git stash create`) and pop only that ref. A pop that conflicts in a file you never touched means you popped the wrong stash — stop and inspect, don't resolve through it.

## Red flags specific to this repo

- "It's a simple UI tweak, screenshots are overkill" — that is exactly what `/ios-pr-screenshots` is for; skipping is only for multi-screen/logic work, and even then the section needs a sentence, not silence.
- "I'll describe expected behavior in the body" — the body reports observed behavior.
- "I'll run the whole suite to be safe" — CI already does; a targeted run is the point.
