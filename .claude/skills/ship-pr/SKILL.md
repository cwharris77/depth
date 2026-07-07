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
npm test                # must be green; note the test count
```

If the change is visible in the UI: start the dev server (`next-dev` in
`.claude/launch.json`; port 3050 is the sanctioned alternate), exercise the actual
flow, and write down what you saw — one concrete sentence, e.g.
"on Seahawks the arrows point at Saints ← → Steelers; clicking Next lands on the
Steelers page". That sentence goes in the body verbatim as `Verified live: …`.

**A failing or skipped verification means stop and fix — never open the PR "to see
if CI agrees".**

### 3. Commit

- Conventional Commit: `type(scope): message`, scope from the list in `AGENTS.md` §3.
- Squash-merge means the PR title becomes the `main` history — write the title with
  the same care as a commit message.
- End the commit message with the Claude co-author trailer.

### 4. Open the PR

```bash
git push -u origin <branch>
gh pr create --title "<same conventional title>" --body "$(cat <<'EOF'
## What

<what changed, user-visible first; bullet the mechanism — name the functions/files>

## Why

<the reason this exists; one short paragraph. Omit the section only if What already says it>

## Tests

<new/changed test files and what they cover; "tsc --noEmit + vitest green (N tests)">

Verified live: <the sentence from step 2, UI changes only>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
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
- `git checkout main && git pull` before starting the next thing.

## Quick reference

| Step | Command / rule |
|---|---|
| Format | `npm run format` |
| Typecheck | `npx tsc --noEmit` |
| Tests | `npm test` (note the count) |
| Live check | dev server via launch.json; write the "Verified live" sentence |
| Title | `type(scope): message` — becomes `main` history |
| Body | What / Why / Tests / footer |
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
