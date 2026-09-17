---
name: ship-pr
description: Use when code in the depth repo is ready to leave the working tree — the user says "ship", "PR this", "merge it", "land it", or a feature/fix is complete and verified. Also use when creating a stacked PR on top of an unmerged branch.
---

# Shipping a PR (depth house workflow)

## Overview

Every change in this repo lands the same way: feature branch → verify → conventional
commit → PR with the house body → CI green → squash-merge. This skill is the exact
sequence; ~60 merged PRs follow it. The point is that verification evidence is
gathered *before* the PR exists, so the body reports what was seen, not what should
happen.

**REQUIRED BACKGROUND:** `AGENTS.md` §3 (conventions) and §5 (quality bar). The PR is
not shippable until the "Any code PR" checklist there passes.

## The sequence

### 1. Branch

- Never commit to `main`. Branch name: `<type>/<slug>` (`feat/uniform-selector`,
  `fix/switcher-affordance`).
- Stacked PR (this feature depends on an unmerged PR): branch **from that branch**,
  set it as the PR base, and put this line at the top of the body:
  `**Base is `<branch>`; retarget to `main` once #<N> merges.**`

### 2. Verify — before writing the commit message

**Run only what your diff touches — CI runs the full suite on every push, so a full
local run just duplicates it.** Scope the run to the suites the diff actually changed:

- **iOS diff:** targeted `xcodebuild … -only-testing:` scoped to the changed
  suite(s) — see `CLAUDE.md` §5 for the exact invocation. Swift Testing free
  functions need the parentheses in the filter (`DepthTests/someTest()`) or the
  filter silently matches nothing.
- **Web-touching diff** (`web/`, `supabase/`, `fixtures/`): `npm run format`,
  `npx tsc --noEmit`, `npm run lint`, and `npm test -- <path-or-pattern>` scoped to
  the changed area — not a bare `npm test`.

If the change is visible in the UI: run it (simulator for iOS, dev server —
`next-dev` in `.claude/launch.json`, port 3050 is the sanctioned alternate — for
web), exercise the actual flow, and write down what you saw — one concrete
sentence, e.g. "on Seahawks the arrows point at Saints ← → Steelers; clicking Next
lands on the Steelers page". That sentence goes in the body verbatim as
`Verified live: …`.

**A failing or skipped verification means stop and fix — never open the PR "to see
if CI agrees".** But before treating a test failure as real, confirm the failing
file paths are inside the working tree — `.worktrees/` and `.claude/worktrees/`
sibling checkouts hold their own copy of the suite (and their own installed deps),
and a stale copy failing there is not a signal about your change. If every failure
traces to one of those paths, the run is a false positive; if `vitest.config.*`'s
`exclude` doesn't already cover the sibling worktree directory in play, that's a
config gap worth fixing rather than a per-run workaround.

### 3. Shallow review — before committing

Sanity-check the diff with a second set of eyes before it becomes a commit: dispatch
the `feature-dev:code-reviewer` subagent (or, if available, a different model via
`codex exec review`) against the working-tree diff. This is a fast pass, not a full
audit — it's catching the obvious ("this doesn't do what the commit message will
claim", a leftover debug line, a logic inversion), not hunting for style nits.
Fix anything real it finds, then re-run step 2 if the fix touched tested code.

### 4. Commit

- Conventional Commit: `type(scope): message`, scope from the list in `AGENTS.md` §3.
- Squash-merge means the PR title becomes the `main` history — write the title with
  the same care as a commit message.
- End the commit message with the Claude co-author trailer.

### 5. Open the PR

Use the repo's PR template as the source shape — the heredoc below mirrors it. For
agent-generated bodies, `gh pr create` with `--body` bypasses the template, so build the
body from a template copy and fill in What / Why / Tests / Screenshots.

**Screenshots decision (required, not optional):**
- Simple UI change (single screen, no complex flow/logic): run `/ios-pr-screenshots`
  after the PR exists — it captures the changed screen and fills the `## Screenshots`
  block for you.
- Multi-screen or logic-heavy change you're validating in the simulator yourself:
  skip the capture and write one sentence in that block justifying the skip — never
  leave the placeholder text in place.

```bash
git push -u origin <branch>

BODY=$(mktemp -d)/pr-body.md
cp .github/pull_request_template.md "$BODY"
# fill in the template's What / Why / Tests / Verified live from step 2
# (Stacked PR: add --base <parent-branch> so "before" is the parent, not main.)

gh pr create --title "<same conventional title>" --body-file "$BODY"
# then, per the Screenshots decision above:
#   simple UI change  -> run /ios-pr-screenshots
#   complex/logic-only -> `gh pr edit <N> --body-file` with the justification filled in
```

The resulting body keeps the house shape — `## What` / `## Why` / `## Tests` /
`## Screenshots` / footer.

### 6. CI, then squash-merge

```bash
gh pr checks <N> --watch     # CI runs the full suite; fix red, push, re-watch
gh pr merge <N> --squash --delete-branch
```

- **Squash only.** Never `--merge`, never `--rebase`.
- Stacked PR: merge the base PR first, retarget this one to `main`
  (`gh pr edit <N> --base main`), let CI rerun, then squash.

### 7. After merge

- If the PR shipped or killed a roadmap item: update README's status table (and the
  specs index if a spec's status changed) — as its own small `docs(readme):` PR if it
  didn't fit in this one.
- `git checkout main && git pull` before starting the next thing. If uncommitted work
  needs to survive the switch, never pair an unconditional `git stash` with an
  unconditional `git stash pop` — the stash is a shared, session-spanning stack, and
  a no-op push (nothing was dirty) followed by a blind pop can resurrect an unrelated,
  older stash instead. Check `git status --porcelain` first and skip the pair entirely
  on a clean tree; otherwise capture the stash's identity (`git stash list` before and
  after, or `git stash create`) and pop only that ref. A pop that conflicts in a file
  you never touched is the signal you popped the wrong stash — stop and inspect, don't
  resolve through it.

## Quick reference

| Step | Command / rule |
|---|---|
| iOS tests | `xcodebuild … -only-testing:<Suite>` scoped to the diff — never the full suite |
| Web format | `npm run format` |
| Web typecheck | `npx tsc --noEmit` |
| Web lint | `npm run lint` |
| Web tests | `npm test -- <path>` scoped to the diff — never a bare `npm test` |
| Live check | simulator / dev server; write the "Verified live" sentence |
| Shallow review | `feature-dev:code-reviewer` subagent (or another model) on the diff, before commit |
| Screenshots | Simple UI → `/ios-pr-screenshots`; complex/logic-only → one-sentence justification |
| Title | `type(scope): message` — becomes `main` history |
| Body | What / Why / Tests / Screenshots / footer |
| Merge | `gh pr merge --squash --delete-branch` only |

## Red flags — stop, you're about to violate the workflow

- "CI will catch it" — verification happens locally, first, but scoped to the diff, not the full suite.
- "I'll describe expected behavior in the body" — the body reports observed behavior.
- "Small enough to merge-commit / push to main" — no size exemption exists.
- "I'll bundle this unrelated fix since I'm here" — one concern per PR.
- "The PR title doesn't matter, it gets squashed" — backwards: squash makes the
  title *the* history.
- "It's a simple UI tweak, screenshots are overkill" — simple UI changes are exactly
  what `/ios-pr-screenshots` is for; skipping it is only for multi-screen/logic work
  you're validating in the simulator, and even then the section needs a sentence,
  not silence.
- "I'll run the whole suite locally to be safe" — CI already runs the full suite;
  a targeted `-only-testing:`/scoped `npm test` run is the point, not a shortcut.

## Common mistakes

| Mistake | Fix |
|---|---|
| PR body written before running the app | Run step 2 first; body quotes real output |
| Full test suite run locally | Scope to `-only-testing:`/a path pattern for the diff; CI covers the rest |
| Stacked PR opened against `main` | Base = parent branch; retarget after parent merges |
| Scope invented (`feat(misc):`) | Use an existing scope from AGENTS.md §3; new scope only if the area is genuinely new |
| `## Screenshots` left as placeholder text | Simple UI → run `/ios-pr-screenshots`; complex → write the justification sentence |
| Forgot README/status sync | Check §7 of this skill before closing the task |
