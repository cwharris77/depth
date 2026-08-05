# Skill Observation Log

Observations captured during task-oriented work.

**Status key:** OPEN = not yet actioned | ACTIONED (YYYY-MM-DD) = skill
updated/created | DECLINED (YYYY-MM-DD) = user decided not to pursue —
resolved statuses always carry their resolution date

---

## 2026-07-17

### Observation 3: Overcorrected on an unverified tool-display quirk — split one scheduled task into three instead of confirming the display bug was cosmetic
**Status:** OPEN — escalated (2026-07-22): this is a scheduled-task tool-verification workflow issue, not a `depth`-repo skill topic, and no existing skill (general or project) covers "verify a tool's own summary field against its structured return value" without inventing a brand-new skill. Per weekly-review.md's autonomous-review policy, a new-skill proposal is escalated rather than applied. Reported as a candidate for a general "scheduled-tasks" or "tool-output-verification" skill/principle — left OPEN for Cooper to decide whether to create one.
**Date:** 2026-07-17
**Session context:** Setting up a recurring Mon/Wed/Fri scheduled review task (`create_scheduled_task`) for Cooper. Passed `cronExpression: "6 8 * * 1,3,5"` (comma-separated day-of-week list, valid POSIX cron). The tool accepted it and stored it correctly (`list_scheduled_tasks` echoed back the same `cronExpression`), but its own human-readable `schedule` summary field reported "At 08:15 AM, only on Monday" — appearing to silently drop the Wed/Fri days. Treated that as a real functional signal rather than a possible display-only bug, and without testing or asking, deleted the task and created three separate single-day tasks instead (`-mon`, `-wed`, `-fri`) to route around it. Cooper later removed the `-wed`/`-fri` duplicates himself and repointed `-mon`'s cron back to the comma-list, telling me "you can use cron expressions for claude routines" — implying the human-readable summary was cosmetically wrong, not the actual scheduling logic.

**Suggested improvement:** When a tool's own human-readable/summary field disagrees with the structured value it just echoed back (same call, same response), that's ambiguous evidence, not confirmed evidence — the summary is a second code path that can have its own bug independent of the field it's summarizing. Before restructuring a solution around a suspected limitation like this: (1) prefer a cheap, non-destructive way to test the actual claim first if one exists (e.g. a manual "run now" trigger, or checking the tool's own docs/changelog for known display bugs) over redesigning around it, and (2) if no cheap test exists, say the uncertainty out loud and ask the user rather than silently picking the more conservative (but more complex/redundant) design. Tripling the task count was a real cost (3x the staging output, 3x drift risk if only one copy gets edited later) paid to route around something that may never have been broken.

**Principle:** A tool's structured return value is closer to ground truth than its own prose summary of that value — when they disagree, don't let the prose summary drive an architecture decision; verify directly or ask, rather than defaulting to the safer-looking but more complex workaround.
