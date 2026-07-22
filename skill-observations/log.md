# Skill Observation Log

Observations captured during task-oriented work.

**Status key:** OPEN = not yet actioned | ACTIONED (YYYY-MM-DD) = skill
updated/created | DECLINED (YYYY-MM-DD) = user decided not to pursue —
resolved statuses always carry their resolution date

---

## 2026-07-17

### Observation 1: Ticket claimed "already specced" without verifying spec was fully implemented
**Status:** ACTIONED (2026-07-18) — New skill created per Cooper's approval; staged at skill-updates/2026-07-18/spec-implementation-audit/
**Date:** 2026-07-17
**Session context:** Implementing "Launch in-page uniform kit picker" ticket in the depth repo.
**Skill:** New skill candidate: spec-implementation-audit
**Type:** open-source
**Phase/Area:** Pre-implementation verification

**Issue:** The ticket text asserted "Selector state design (URL ?kit=... or localStorage) is already specced," implying the work was done. Reading the actual locked spec (2026-07-07-phase-7-uniform-launch-design.md) revealed a specific locked decision — `rosterShareUrlPath` gaining an optional `kitId` param, composed after `?order=` — that was never implemented; only the read-on-arrival half (`ApplyKitFromQuery`) had shipped. A grep for `kitId`/`kit=` in `lib/share.ts` and its test file immediately surfaced the gap.

**Suggested improvement:** When a ticket references a design doc as settled/already-built, don't take that framing at face value — locate the doc's "Decisions (locked)" table and grep the codebase for each named artifact (function param names, file paths) before concluding no code is needed. Treat "spec says X is decided" and "X is implemented" as separate claims to verify independently.

**Principle:** A locked design decision is a commitment to build, not evidence that building happened — verify implementation against the spec's own file/symbol names rather than trusting a ticket's summary of status.

### Observation 2: Vercel Flags SDK's `flag()` opts a route out of static generation regardless of `decide()`'s body
**Status:** ACTIONED (2026-07-18) — New skill created per Cooper's approval, scoped as a narrow interrupt (message caveat + ask before adding flag() calls); staged at skill-updates/2026-07-18/nextjs-flags-static-generation-caveat/
**Date:** 2026-07-17
**Session context:** Cooper asked to remove the isolated-search-icon flag from the depth repo because "this page's performance is suffering because of it." Confirmed with `npm run build`: `/team/[id]` was building `ƒ` (fully dynamic) despite `generateStaticParams` and despite `lib/flags.ts`'s own header comment documenting that `decide()` is kept request-free specifically to stay statically prerenderable. Removing the one `flag()` call from the route flipped it back to `●` (SSG + ISR).
**Skill:** New skill candidate: nextjs-flags-static-generation-caveat (or fold into an existing Next.js/Vercel-platform skill if one exists)
**Type:** open-source
**Phase/Area:** Framework gotcha — deployment/rendering-mode diagnosis

**Issue:** The repo's own `lib/flags.ts` comment asserted the safety property ("decide() must stay request-free... so the per-team pages remain statically prerenderable") but that property doesn't actually hold. The `flags/next` package's `flag()` wrapper reads `headers()`/`cookies()` internally on *every* evaluation — to support Vercel Toolbar per-session overrides — independent of whether the flag author's own `decide()` body touches the request. A single `flag()` call anywhere in a route is enough to opt the whole route out of static generation, silently, with no build warning. This was independently discovered twice before (two separate tickets, same day) purely by someone noticing `ƒ` in the build output — nothing about the `flags/next` API surface hints at the tradeoff. The doc comment's stated intent was aspirational, not verified.

**Suggested improvement:** When a codebase's own comment/doc asserts a specific technical property about a third-party library's behavior ("X is request-free so Y stays static"), don't take the comment as ground truth — the assertion may have been true of an earlier library version, or simply wrong. Verify the property directly: for rendering-mode claims specifically, run the actual build (`next build`) and check the route table (`●` vs `ƒ`) rather than trusting a source comment. This generalizes beyond Flags SDK: any "our wrapper is side-effect-free" claim about a dependency is worth a build-output spot-check before relying on it, especially when a user reports an unexplained performance regression that a comment says "shouldn't be possible."

**Principle:** A comment describing a dependency's behavior is a claim, not a fact — when performance/behavior doesn't match the comment's promise, verify against the dependency's actual source or observable output (build logs, route tables) rather than assuming the comment is current or was ever correct.

### Observation 3: Overcorrected on an unverified tool-display quirk — split one scheduled task into three instead of confirming the display bug was cosmetic
**Status:** OPEN — escalated (2026-07-22): this is a scheduled-task tool-verification workflow issue, not a `depth`-repo skill topic, and no existing skill (general or project) covers "verify a tool's own summary field against its structured return value" without inventing a brand-new skill. Per weekly-review.md's autonomous-review policy, a new-skill proposal is escalated rather than applied. Reported as a candidate for a general "scheduled-tasks" or "tool-output-verification" skill/principle — left OPEN for Cooper to decide whether to create one.
**Date:** 2026-07-17
**Session context:** Setting up a recurring Mon/Wed/Fri scheduled review task (`create_scheduled_task`) for Cooper. Passed `cronExpression: "6 8 * * 1,3,5"` (comma-separated day-of-week list, valid POSIX cron). The tool accepted it and stored it correctly (`list_scheduled_tasks` echoed back the same `cronExpression`), but its own human-readable `schedule` summary field reported "At 08:15 AM, only on Monday" — appearing to silently drop the Wed/Fri days. Treated that as a real functional signal rather than a possible display-only bug, and without testing or asking, deleted the task and created three separate single-day tasks instead (`-mon`, `-wed`, `-fri`) to route around it. Cooper later removed the `-wed`/`-fri` duplicates himself and repointed `-mon`'s cron back to the comma-list, telling me "you can use cron expressions for claude routines" — implying the human-readable summary was cosmetically wrong, not the actual scheduling logic.

**Suggested improvement:** When a tool's own human-readable/summary field disagrees with the structured value it just echoed back (same call, same response), that's ambiguous evidence, not confirmed evidence — the summary is a second code path that can have its own bug independent of the field it's summarizing. Before restructuring a solution around a suspected limitation like this: (1) prefer a cheap, non-destructive way to test the actual claim first if one exists (e.g. a manual "run now" trigger, or checking the tool's own docs/changelog for known display bugs) over redesigning around it, and (2) if no cheap test exists, say the uncertainty out loud and ask the user rather than silently picking the more conservative (but more complex/redundant) design. Tripling the task count was a real cost (3x the staging output, 3x drift risk if only one copy gets edited later) paid to route around something that may never have been broken.

**Principle:** A tool's structured return value is closer to ground truth than its own prose summary of that value — when they disagree, don't let the prose summary drive an architecture decision; verify directly or ask, rather than defaulting to the safer-looking but more complex workaround.

### Observation 4: `scheduler-registered.txt` is per-workspace, but one scheduled task now covers multiple workspaces — new workspaces will re-offer setup
**Status:** ACTIONED (2026-07-18) — Approach (a) applied: obsidian's scheduler-registered.txt written retroactively; live scheduled task "skill-observation-review-mon" updated (step 2g) to auto-write the marker into any newly-discovered workspace going forward; documentation of the pattern staged to task-observer's weekly-review.md at ~/.claude/skill-updates/2026-07-18/task-observer/
**Date:** 2026-07-17
**Session context:** Cooper asked "do I need to add [scheduler-registered.txt] anywhere else?" after the Mon/Wed/Fri scheduled review was registered. The review task itself is a single shared job that self-discovers every workspace with a `skill-observations/log.md` under Cooper's project roots — deliberately built that way so new repos are covered automatically without editing the task later. But `weekly-review.md`'s Step 0 checks for `scheduler-registered.txt` on a per-workspace basis (`skill-observations/scheduler-registered.txt` inside that specific workspace) to decide whether to offer setting up a scheduler. Only depth has that marker (and a `log.md` to put it next to) right now. The instant another workspace (e.g. the obsidian vault) accumulates its first observations and later trips the 7-day fallback, `task-observer` there will find no marker and no `log.md`-adjacent evidence of the shared scheduler, and will offer to set one up again — even though the Mon/Wed/Fri job already discovers and covers it.

**Suggested improvement:** `weekly-review.md` Step 0's "check for a registered scheduled task" step should account for a scheduler that's shared across workspaces, not just workspace-local. Two ways to close the gap: (a) when registering a shared/multi-workspace scheduler, write the marker to every currently-known workspace's `skill-observations/` at registration time, AND have the scheduled task itself write the marker into any newly-discovered workspace the first time it processes that workspace (so future workspaces get covered as soon as they're swept, not only at initial setup); or (b) change Step 0's registration check to also recognize a well-known shared-task naming convention (e.g. any scheduled task whose prompt references discovering `skill-observations/log.md` globally) so it doesn't need a local marker file at all. (a) is simpler and matches the "don't create files speculatively" rule already in the skill (the marker only gets created once a workspace actually has a log.md, i.e. during the scheduled run's own discovery step, not ahead of time).

**Principle:** When one piece of shared infrastructure (a scheduler) is registered against a check that's implemented per-consumer (a marker file per workspace), every new consumer needs the same registration step applied to it — either at shared-setup time for known consumers, or automatically the first time the shared infrastructure actually touches a new consumer. A marker file that only gets written once doesn't scale with a system designed to auto-discover new members.

### Observation 5: db-migration skill's "do not enable RLS" rule is stale

**Status:** ACTIONED (2026-07-18) — Applied to db-migration (scheduled review); staged at skill-updates/2026-07-18/db-migration/
**Date:** 2026-07-17
**Session context:** Adding schedules/games tables to the depth repo (schema PR).
**Skill:** db-migration (project skill)
**Type:** internal
**Phase/Area:** Step 1 "Write the migration" + Red flags

**Issue:** The skill says "Do not enable RLS — it is off on purpose until the auth
phase ships read policies" and lists `ENABLE ROW LEVEL SECURITY` as a stop-the-line red
flag. But the auth phase (Phase C) has shipped: CLAUDE.md invariant 10 now requires RLS
ON for every table with a read policy in the same migration, and recent migrations
(20260710140000_base_table_rls, 20260717081108_add_player_stats) enable RLS + a
"public read" policy as the standard pattern. Following the skill literally would ship a
new public table WITHOUT rls, contradicting invariant 10.

**Suggested improvement:** Update the skill's step 1 and red-flags to match invariant 10:
new public tables ship `enable row level security` + a `"public read"` policy in the
same migration (cite the player_stats migration as the precedent); reserve the "don't
enable RLS" warning for the narrower case of enabling it WITHOUT a read policy.

**Principle:** A process skill that hard-codes a phase-specific prohibition rots when
that phase ships; gate such rules on the current invariant, not a point-in-time state,
and cite the live precedent migration.

### Observation 6: Design-system primitive shipped without the density variant its densest caller needs

**Status:** ACTIONED (2026-07-22) — impeccable (the frontend-design plugin skill) is a large third-party/plugin-owned bundle, not hand-edited directly; created a companion `impeccable-extras` skill carrying this principle (verify a shared primitive against its densest/widest caller before reuse; extend with a prop rather than fork), staged at ~/.claude/skill-updates/2026-07-22/impeccable-extras/
**Date:** 2026-07-18
**Session context:** Migrating a bespoke ROSTER/SCHEDULE/STATS tab group onto the shared
`SegmentedControl` primitive and making the AFC/NFC toggle full-width.

**Skill:** impeccable / frontend-design
**Type:** open-source
**Phase/Area:** Component reuse / design-system adoption

**Issue:** The shared `SegmentedControl` was authored sized for one context (the AFC/NFC
toggle: 11px pill, `w-fit`). Migrating the mobile-header page switcher onto it — a denser
context sharing a row with a team pill on a 375px screen — overflowed and clipped the last
tab. The fix wasn't reverting to bespoke markup; it was adding a `size` variant (plus
`fullWidth`, `href`) to the primitive so both contexts compose from one component.

**Suggested improvement:** When adopting/reusing a design-system primitive, verify it
against the *densest and the widest* real usage sites before assuming its defaults fit;
extend it with a size/width prop rather than forking a one-off or shrinking the caller.
Add a line to component-reuse guidance: a primitive's default sizing is for its first
caller, not a contract — a new caller in a tighter context extends the primitive.

**Principle:** Reusing a shared component means fitting it to the constraint envelope of
all its callers, not just the one it was born for; the correct response to "the shared
component doesn't fit here" is a new prop on the component, not a bespoke re-implementation.

### Observation 7: Spec-location default sent the agent to the wrong repo until corrected

**Status:** ACTIONED (2026-07-22) — superpowers:brainstorming is a global plugin skill (superpowers marketplace); added a pre-write check to its Documentation step (look for a project-specific docs/spec home — vault, docs repo, or CLAUDE.md/AGENTS.md pointer — before defaulting to docs/superpowers/specs/) and staged the full skill (SKILL.md + visual-companion.md + scripts, zipped as brainstorming.skill) at ~/.claude/skill-updates/2026-07-22/superpowers-brainstorming/
**Date:** 2026-07-18
**Session context:** Brainstorming a whole-app design-system migration for depth; about to write
the spec.

**Skill:** superpowers:brainstorming
**Type:** open-source
**Phase/Area:** "After the Design → Documentation" (spec write location)

**Issue:** The brainstorming skill defaults specs to `docs/superpowers/specs/` and depth's own
`CLAUDE.md` repeats that, so the agent proposed writing the spec into the code repo. The user
corrected it: specs/tickets/plans live in a separate Obsidian vault (the repo copies are synced,
vault is source of truth). The skill does note "User preferences for spec location override this
default," but nothing prompts the agent to *look for* a canonical docs location before defaulting.

**Suggested improvement:** In the Documentation step, add a pre-write check: before writing to the
default path, look for a project-specific docs/spec home (a linked knowledge vault, a docs repo, a
`CLAUDE.md`/`AGENTS.md` pointer) and confirm the location if one is ambiguous — especially when
a sibling knowledge repo is present. Cheaper than writing to the wrong place and moving it.

**Principle:** A "where does the deliverable live" default should be a *last resort* after checking
for a project's canonical home, not the first move — docs frequently live outside the code repo,
and the repo's own instructions can point at a synced copy rather than the source of truth.

### Observation 8: Locked ticket's literal acceptance bullet ("indicate active the same way it is now") produced a shipped UX Cooper immediately rejected

**Status:** OPEN
**Date:** 2026-07-22
**Session context:** Fixing PR #176 (`agent/swipeable-bottom-sheet-uniform-selector`, ticket
"Swipeable bottom-sheet uniform selector") in the depth repo after Cooper reviewed the merged
carousel and rejected its behavior. This session's model tier: Sonnet 5. Per the ticket's own
frontmatter (`model_tier: smart`, `run_mode: symphony`) — checked against the ticket file at
`obsidian/Projects/depth/Tickets/Swipeable bottom-sheet uniform selector.md` — symphony's "smart"
tier resolves to Kimi K2, confirmed by Cooper. So: Kimi K2 (smart tier, via symphony) implemented
the original PR; Sonnet 5 (interactive session, not symphony) fixed it.
**Skill:** New skill candidate, or fold into an existing pre-completion/verification skill
**Type:** internal
**Phase/Area:** Acceptance-criteria interpretation for interactive/stateful UI tickets

**Issue:** The locked ticket text said: "Swiping to a card calls onSelect(id) the same way
tapping a row does today — the field must keep recoloring live as you swipe" and "Preserve the
active-kit indicator... the same way it is now." The implementing agent followed this literally:
every swipe/dot-click committed `onSelect()` immediately AND the "Active" checkmark badge tracked
the live `activeId` prop, so it lit up on whatever card the user was currently browsing past. That
matches the ticket's words, but once Cooper actually used it he rejected it outright: "I don't
like how the active badge shows for every jersey as soon as you swipe to it... Active should only
be set when you close the carousel and the jersey is actually set." The ticket text couldn't
disambiguate "live-tracking indicator" from "committed-choice indicator" — both readings satisfy
"the same way it is now" if you don't simulate the full open→browse→close interaction. Two
unrelated implementation bugs shipped in the same PR and were also caught only in this follow-up
session, not the original one: (1) `cardWidth` was read directly off a container ref during
render — null on first paint — so every card rendered at a 320px fallback and sat side-by-side
instead of one-per-view; (2) an `isDragging` state was set but never read, an ESLint error that
`npm run lint` catches immediately but apparently wasn't run (or wasn't gating) before the
original PR was opened.

**Suggested improvement:** For any ticket describing a stateful/interactive UI change — especially
a bullet that says "preserve X the same way it works today" — don't verify by matching each
acceptance bullet against a single static render. Manually drive the actual interaction sequence
implied by the feature (open → interact with several items → close → reopen) before calling it
done, and explicitly ask of any "active"/"current"/"selected" indicator: does this track live
browsing, or does it track the last committed choice? The ticket text alone often can't answer
that, and the wrong choice looks correct in a screenshot but reads as wrong within seconds of real
use. Separately: run `npm run lint` (not just typecheck) before opening a PR — this repo's
pre-commit hook caught the unused-state error instantly once someone tried to commit, meaning it
was cheap to find and should have been found before merge, not after.

**Principle:** A locked ticket's literal acceptance bullets are necessary but not sufficient for
interactive/stateful components — verify by operating the full interaction cycle a real user would
go through, not by checking each bullet against a static render; ambiguous phrasing like "the same
way it works today" needs the implementer to name which semantic (live vs. committed) it means,
because that choice is invisible until someone actually uses the shipped feature.
