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
**Status:** OPEN
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
