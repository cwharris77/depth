---
name: implement-spec
description: Use when asked to implement, build, or continue a roadmap phase or design doc in the depth repo — anything referencing docs/superpowers/specs/, "the spec", a phase name (Phase C, 5d, nflverse, compare view, uniform launch), or "next thing on the roadmap".
---

# Implementing a design spec

## Overview

Specs in `docs/superpowers/specs/` are written to be handed to an implementing agent
as-is: decisions are already made and marked **locked**. Your job is faithful
execution plus mechanical adaptation to code drift — not re-design. The failure modes
this skill prevents: relitigating locked decisions, doing out-of-scope work, and
implementing from the spec's *description* of the code instead of the code itself.

**REQUIRED BACKGROUND:** `AGENTS.md` — especially §2 (invariants) and §6 (escalation).

## The sequence

### 1. Load context, in this order

1. The spec itself, fully — including **Out of scope** and **Tests**.
2. `2026-*-roadmap-specs-index.md` — confirm the spec's status and its dependencies
   ("Requires C first" means C, first; don't start a blocked spec).
3. **Every file the spec names.** Read the current code — the spec was written on a
   given date and the code may have moved. Note each mismatch you find.
4. The Next.js guide under `node_modules/next/dist/docs/` for any Next API involved
   (this repo's Next 16 differs from training data).

### 2. Classify spec-vs-code drift before writing anything

| Drift | Action |
|---|---|
| Mechanical (file renamed, signature changed, line moved) | Adapt silently; note in PR body |
| A named helper/table already exists in different shape | Adapt to reality; note in PR body |
| The spec's *approach* no longer fits the current code | **Stop and ask** — do not improvise a new design |

### 3. Plan the PR split

- Honor the spec's own PR structure if it has one (PR1 data / PR2 UI is the house
  pattern — depth#56/#57).
- Each PR must be independently green and reviewable. Stacked PRs base on each other
  (see the `ship-pr` skill).

### 4. Implement

- **Locked decisions are settled.** If a locked decision looks wrong, implement it
  anyway and record your objection in the PR body — unless it would break tests,
  types, or an AGENTS.md invariant, in which case stop and ask. Do not quietly build
  the "better" version.
- **Out of scope stays out.** The spec's Out-of-scope list is a fence, not a
  suggestion. Findings that tempt you across it go in the PR body as follow-ups.
- **The spec's Tests section is the minimum test list.** Implement every bullet; add
  malformed-input cases even when unlisted (AGENTS.md invariant 6).
- New pure logic goes in `lib/` with tests; components stay thin. New modules get a
  role-and-constraint header comment.

### 5. Ship

Use the `ship-pr` skill per PR. In the body's **What**, link the spec file. List any
drift you adapted to under a `## Spec drift` heading.

### 6. Close the loop

After the final PR merges:
- Update the specs index row (status → shipped, link the PR numbers).
- Update README's status table if a roadmap phase moved.
- If the spec deferred anything to "the launch spec" / a later phase, confirm that
  pointer still exists; if it doesn't, say so rather than silently dropping the ball.

## Red flags — stop, you're about to go off-spec

- "The spec's choice here is suboptimal, I'll just…" — locked means locked; object
  in the PR body, or ask.
- "While I'm in this file…" — out of scope. Follow-up note, not code.
- "The spec says the function is at lib/X so I'll write the call that way" — the
  code is the truth for what exists; read it.
- "I'll skip the reconciler edge-case tests, they're unlikely" — the Tests section
  is a contract.
- "This phase is blocked but I can stub the dependency" — blocked means pick a
  different spec or ask.

## Common mistakes

| Mistake | Fix |
|---|---|
| Implementing from the spec's code snippets verbatim | Snippets are illustrative; the surrounding real code wins on naming/shape |
| Treating "implementation-plan detail" notes as unspecified | They're delegated to you — decide, and document the decision in the PR body |
| One giant PR for a multi-PR spec | Split as the spec says; each PR green on its own |
| Forgetting the index/README update | Step 6 is part of the task, not optional cleanup |
