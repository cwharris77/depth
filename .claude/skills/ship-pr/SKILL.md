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

Run all of these; capture output for the body:

```bash
npm run format          # Prettier — CI rejects format drift
npx tsc --noEmit        # must exit 0
npm run lint            # catches unused-var/state errors tsc won't flag
npm test                # must be green; note the test count
```

If the change is visible in the UI: start the dev server (`next-dev` in
`.claude/launch.json`; port 3050 is the sanctioned alternate), exercise the actual
flow, and write down what you saw — one concrete sentence, e.g.
"on Seahawks the arrows point at Saints ← → Steelers; clicking Next lands on the
Steelers page". That sentence goes in the body verbatim as `Verified live: …`.

**A failing or skipped verification means stop and fix — never open the PR "to see
if CI agrees".** But before treating a `npm test` failure as real, confirm the
failing file paths are inside the working tree — `.worktrees/` and
`.claude/worktrees/` sibling checkouts hold their own copy of the suite (and their
own installed deps), and a stale copy failing there is not a signal about your
change. If every failure traces to one of those paths, the run is a false
positive; if `vitest.config.*`'s `exclude` doesn't already cover the sibling
worktree directory in play, that's a config gap worth fixing rather than a
per-run workaround.

### 3. Commit

- Conventional Commit: `type(scope): message`, scope from the list in `AGENTS.md` §3.
- Squash-merge means the PR title becomes the `main` history — write the title with
  the same care as a commit message.
- End the commit message with the Claude co-author trailer.

### 4. Open the PR

Use the repo's PR template as the source shape — the heredoc below mirrors it. For
agent-generated bodies, `gh pr create` with `--body` bypasses the template, so build the
body from a template copy and let `ios/scripts/pr-screenshots.sh` handle the
`## Screenshots` section: it decides targets from the diff, captures before/after + a
boxed visual diff on a disposable simulator, uploads to Cloudinary, and fills the
section — or strips it when the PR touches no iOS UI. (Web-only UI changes on the frozen
web app: run `/pr-screenshots` and let it replace the block.)

```bash
git push -u origin <branch>

BODY=$(mktemp -d)/pr-body.md
cp .github/pull_request_template.md "$BODY"
# fill in the template's What / Why / Tests / Verified live from step 2, keeping the
# ## Screenshots section and both sentinels in place (edit "$BODY" with your editor)

# iOS UI touched → fills the ## Screenshots table; no iOS UI → strips the section.
# Stacked PR: add --base <parent-branch> so "before" is the parent, not main.
ios/scripts/pr-screenshots.sh --body-file "$BODY"

gh pr create --title "<same conventional title>" --body-file "$BODY"
```

The resulting body keeps the house shape — `## What` / `## Why` / `## Tests`
(+ `## Screenshots` for UI changes) / footer — with the screenshot table between the
sentinels:

```markdown
<!-- screenshots-start -->

## Screenshots

| Target | Before | After | Diff |
| --- | --- | --- | --- |
| field | ![before](https://…) | ![after](https://…) | ![diff](https://…) <br>_changed (2.5%)_ |

_Captured by `ios/scripts/pr-screenshots.sh` on a disposable simulator (staging, stable Bills fixture). Diff = changed regions tinted + boxed._

<!-- screenshots-end -->
```

### 5. CI, then squash-merge

```bash
gh pr checks <N> --watch     # CI = tsc + vitest; fix red, push, re-watch
gh pr merge <N> --squash --delete-branch
```

- **Squash only.** Never `--merge`, never `--rebase`.
- Stacked PR: merge the base PR first, retarget this one to `main`
  (`gh pr edit <N> --base main`), let CI rerun, then squash.

### 6. After merge

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
| Format | `npm run format` |
| Typecheck | `npx tsc --noEmit` |
| Lint | `npm run lint` |
| Tests | `npm test` (note the count) |
| Live check | dev server via launch.json; write the "Verified live" sentence |
| Title | `type(scope): message` — becomes `main` history |
| Body | What / Why / Tests (+ `## Screenshots` for UI changes) / footer |
| Merge | `gh pr merge --squash --delete-branch` only |

## Red flags — stop, you're about to violate the workflow

- "CI will catch it" — verification happens locally, first.
- "I'll describe expected behavior in the body" — the body reports observed behavior.
- "Small enough to merge-commit / push to main" — no size exemption exists.
- "I'll bundle this unrelated fix since I'm here" — one concern per PR.
- "The PR title doesn't matter, it gets squashed" — backwards: squash makes the
  title *the* history.

## Common mistakes

| Mistake | Fix |
|---|---|
| PR body written before running the app | Run step 2 first; body quotes real output |
| Stacked PR opened against `main` | Base = parent branch; retarget after parent merges |
| Scope invented (`feat(misc):`) | Use an existing scope from AGENTS.md §3; new scope only if the area is genuinely new |
| Forgot README/status sync | Check §6 of this skill before closing the task |
