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

### Observation 4: Machine-generated artifacts must be substituted programmatically, never retyped

**Status:** OPEN
**Date:** 2026-08-06
**Session context:** Adding NFL uniform team definitions to the depth repo. Each team's helmet decal is produced by a contour tracer that writes an SVG path to a scratchpad file, which then has to end up inside a TypeScript module.
**Skill:** New skill candidate: handling-generated-artifacts (or an addition to any skill that pipes tool output into source files)
**Type:** open-source
**Phase/Area:** Moving generated output into source code

**Issue:** After running the tracer and confirming its output visually, I wrote the destination module in one pass — and typed a *fabricated* SVG path into it instead of the traced one. The invented path was a plausible-looking staircase of coordinates; it typechecked, it passed every test, and it would have rendered a wrong shape that only a browser check would catch. I noticed only because I re-read my own file immediately afterward. Six earlier decals in the same session were pasted correctly, so the failure was not a lack of care in general — it was that the correct path was in a file I had not read in the same turn, and the model filled the gap.

**Suggested improvement:** Never transcribe a generated artifact into source by hand or from context. Write it in with a scripted substitution that reads the artifact file at write time (`re.sub` on the destination anchored to the constant's name, asserting the file changed and the artifact is present), or read the artifact into context in the immediately preceding step. Add a verification step: after writing, grep the destination for a distinctive substring of the artifact file and fail if absent. Treat "the generated value lives in a file I have not read this turn" as a hard stop.

**Principle:** Any value produced by a tool is data to be moved mechanically, not content to be reproduced from memory. A model asked to emit a long opaque literal it cannot see will confabulate one that looks right, and type checks and unit tests do not distinguish real from plausible — so the substitution must be scripted and then verified against the source artifact.

### Observation 5: `git stash` around a branch switch needs the push confirmed before the pop

**Status:** ACTIONED (2026-08-07) — Applied to ship-pr (weekly review): step 6 now requires checking `git status --porcelain` first and popping by identity rather than pairing unconditional stash/pop.
**Date:** 2026-08-06
**Session context:** Merging a PR and syncing the default branch while an unrelated edit sat in the working tree.
**Skill:** ship-pr (and any skill that syncs a branch mid-session)
**Type:** open-source
**Phase/Area:** Post-merge cleanup / branch sync

**Issue:** I ran `git stash -q; git checkout <default>; git pull; git stash pop` to get an uncommitted local edit past a sync. The edit had meanwhile landed upstream, so the tree was already clean and `git stash -q` created nothing — and the blind `git stash pop` then popped a *pre-existing, unrelated* stash from an earlier session, producing a merge conflict in a file I had never touched. Recovering was easy (the failed pop keeps its entry), but the sequence silently reached into someone else's saved work.

**Suggested improvement:** Never pair an unconditional `git stash` with an unconditional `git stash pop`. Either capture the stash's identity (`git stash create` / compare `git stash list` before and after) and pop only that ref, or check `git status --porcelain` first and skip the stash/pop pair entirely when the tree is clean. When a pop does conflict, stop and inspect rather than resolving — a conflict in a file unrelated to the current task is the signal that the wrong stash was popped.

**Principle:** A stash is a shared, session-spanning stack, not a scratch variable. Operations that assume "the thing I pushed is on top" are unsafe whenever the push may have been a no-op; always pop by identity or guard the pair behind a dirty-tree check.

### Observation 6: A skill's verification step prescribed a command that reports failures from stale sibling worktrees

**Status:** ACTIONED (2026-08-07) — Applied to ship-pr (weekly review): step 2 now notes to confirm failing paths are inside the working tree before trusting a `npm test` failure, and flags the `.worktrees/` gap in `vitest.config.*`'s exclude list for Cooper to fix separately (a code change, not a skill edit).
**Date:** 2026-08-06
**Session context:** Shipping a docs-only change through the project's ship-PR skill. Its verification step says to run the project's plain test command and treat any failure as a stop-and-fix. The plain command's default include globs reach into checked-out sibling worktrees inside the repo, each holding an older copy of the suite and its own installed dependencies. It reported 31 failures across 5 files, every one of them from those stale copies; the same run scoped to the working tree was fully green. A separate, unrelated document in the same repo already recorded the workaround, so the knowledge existed but not where the verification step could use it.
**Skill:** ship-pr (project-level) — "Verify — before writing the commit message" step and its Quick reference table
**Type:** open-source
**Phase/Area:** Pre-commit verification

**Issue:** The skill hard-codes a verification command whose failure output is not trustworthy in this repo's normal working state, while simultaneously carrying a red-flag rule that a failing verification must halt the workflow. An agent following the skill literally either halts on phantom failures or, worse, learns to wave off red test output — which defeats the point of the gate. The correct invocation was documented elsewhere, so this is a knowledge-placement failure, not a missing discovery.

**Suggested improvement:** Where a verification step names a command, the skill should name the *scoped* invocation that is actually trustworthy, with a one-line note on why the scoping exists. Better still, push the scope into the tool's own config so the plain command is correct by default and the skill can stay short — a skill instructing people to remember flags is a workaround for a misconfigured tool. Add a check to the skill: if a verification command reports failures, confirm the failing paths lie inside the working tree before treating them as real.

**Principle:** A verification gate is only as good as the trustworthiness of the command behind it. When a prescribed command reliably produces false failures, the fix belongs in the tool's configuration first and the skill's wording second — never in the agent's memory. Any skill that both names a command and declares its failures blocking must ensure that command's failures are real, or it trains the exact habit of ignoring red output that the gate exists to prevent.

### Observation 7: Transcribing a raster reference reproduced the source renderer's own outline as a gap in the output

**Status:** OPEN
**Date:** 2026-08-06
**Session context:** Transcribing printed uniform artwork into vector definitions by measuring a raster reference pixel by pixel. A sleeve marking measured as two stacked bands of the same color with a several-pixel gap between them. Both bands were authored faithfully. In the rendered output the marking read as two thin stripes with a body-colored channel between them, where the reference reads as one solid block — because the "gap" was not part of the artwork at all. It was the reference renderer's own seam outline, drawn over a continuous band, and the target renderer draws no such outline. An older module in the same codebase had already hit this and resolved it in a one-line aside ("only a hairline outline between them — so the bands are authored contiguous"), but the procedure doc did not carry the finding, so it was rediscovered from scratch.
**Skill:** New skill candidate: raster-reference-transcription (or an addition to any procedure that measures a rendered image to reproduce its subject)
**Type:** open-source
**Phase/Area:** Measurement and classification

**Issue:** When measuring a rendering rather than the thing itself, some pixels belong to the artwork and some belong to the renderer's presentation of it — outlines, seams, drop-shadows, highlights, antialiasing. Both look identical to a color predicate. Transcribing presentation as content produces output that is pixel-faithful to the reference and wrong about the subject. The same session hit the mirror-image version: measuring a trimmed shape's full outer boundary folded its drop-shadow into the trim color, rendering a keyline at twice its true weight, and the fix was to measure a cut through the middle of the shape that crosses every layer cleanly instead of measuring its silhouette.

**Suggested improvement:** Add a classification step before authoring: for every measured boundary, ask whether it is a feature of the subject or of the rendering. Two same-colored regions separated by a thin neutral line are almost always one region plus a seam. A dark band along one edge only, on the shadow side, is a shadow and not trim. Prefer a cut through the interior of a shape, which crosses each layer once, over tracing its outer silhouette, which cannot distinguish a layer from its shadow. Where a codebase has already resolved one of these cases inline, promote it into the procedure doc rather than leaving it as a comment in one module.

**Principle:** Measuring a rendering measures two things at once — the subject and the renderer. Any transcription procedure needs an explicit step that separates them, because no color predicate can: presentation artifacts are made of exactly the same pixels as content. The tell is usually structural rather than chromatic (a thin neutral line between same-colored regions; asymmetry that follows a light source), so the check belongs in the procedure as a question to ask, not as a threshold to tune.

### Observation 8: "Take the largest component" silently discarded half of a two-part shape

**Status:** OPEN
**Date:** 2026-08-07
**Session context:** Converting a two-color mark from a raster reference into vector paths. The mark is a solid body inside a contrasting outline. The intended method was to select both colors at once, trace the resulting silhouette, and paint the body over it so the outline survives as a continuous edge. To isolate the mark from unrelated same-colored artwork nearby, the selection was reduced with the usual heuristic: keep the largest connected component. The output looked entirely plausible — a clean, correct-looking body — and was only caught by holding it against the source. The outline was gone. The two colors never touch: an antialiased seam runs between them matching neither color test, so the "union" was two adjacent components, and the largest was the body alone. The fix was to keep every candidate component and reject by size threshold instead, which also removed the unrelated artwork the heuristic had been introduced for.

**Skill:** New skill candidate: raster-reference-transcription — extends [[Observation 7]], same domain
**Type:** open-source
**Phase/Area:** Region selection and component reduction

**Issue:** "Largest connected component" is the reflexive way to isolate a subject from noise, and it is unsafe precisely when the subject is not connected. Antialiasing between two adjacent regions of different colors produces intermediate pixels belonging to neither, so any predicate built as `A or B` yields a disconnected set whenever A and B merely abut. The failure is silent and self-consistent: no error, no empty result, and an output that passes every check except comparison with the source. The general shape is a reduction step whose precondition (the thing I am reducing is one object) is never tested.

**Suggested improvement:** Never reduce a candidate set by a rank-based heuristic (largest, first, nearest) when the count itself is diagnostic. Prefer a threshold that admits every plausible member, then verify the count against what the subject should contain. Where a rank-based pick is genuinely wanted, assert the expected count first and fail loudly on a mismatch. More generally: when two selection criteria are combined with OR and the result is treated as one object, check that assumption explicitly, because the boundary between them is exactly where the combination breaks.

**Principle:** A reduction step encodes a precondition about its input, and rank-based reductions encode the strongest one — that the candidates are alternatives rather than parts. When they are parts, the reduction does not fail, it succeeds on a fragment, which is worse. Any heuristic that turns many into one should either verify the count it expected or be replaced by a filter that cannot discard a part. Silent partial success is the failure mode to design against, not absence of output.
