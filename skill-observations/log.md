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

**Status:** OPEN — escalated (2026-08-14): proposes a new skill ("handling-generated-artifacts"), naming/scope needs Cooper's decision per weekly-review.md's autonomous-review policy.
**Date:** 2026-08-06
**Session context:** Adding NFL uniform team definitions to the depth repo. Each team's helmet decal is produced by a contour tracer that writes an SVG path to a scratchpad file, which then has to end up inside a TypeScript module.
**Skill:** New skill candidate: handling-generated-artifacts (or an addition to any skill that pipes tool output into source files)
**Type:** open-source
**Phase/Area:** Moving generated output into source code

**Issue:** After running the tracer and confirming its output visually, I wrote the destination module in one pass — and typed a *fabricated* SVG path into it instead of the traced one. The invented path was a plausible-looking staircase of coordinates; it typechecked, it passed every test, and it would have rendered a wrong shape that only a browser check would catch. I noticed only because I re-read my own file immediately afterward. Six earlier decals in the same session were pasted correctly, so the failure was not a lack of care in general — it was that the correct path was in a file I had not read in the same turn, and the model filled the gap.

**Suggested improvement:** Never transcribe a generated artifact into source by hand or from context. Write it in with a scripted substitution that reads the artifact file at write time (`re.sub` on the destination anchored to the constant's name, asserting the file changed and the artifact is present), or read the artifact into context in the immediately preceding step. Add a verification step: after writing, grep the destination for a distinctive substring of the artifact file and fail if absent. Treat "the generated value lives in a file I have not read this turn" as a hard stop.

**Principle:** Any value produced by a tool is data to be moved mechanically, not content to be reproduced from memory. A model asked to emit a long opaque literal it cannot see will confabulate one that looks right, and type checks and unit tests do not distinguish real from plausible — so the substitution must be scripted and then verified against the source artifact.

### Observation 7: Transcribing a raster reference reproduced the source renderer's own outline as a gap in the output

**Status:** OPEN — escalated (2026-08-14): proposes a new skill ("raster-reference-transcription"), naming/scope needs Cooper's decision — groups with Observations 8 and 9.
**Date:** 2026-08-06
**Session context:** Transcribing printed uniform artwork into vector definitions by measuring a raster reference pixel by pixel. A sleeve marking measured as two stacked bands of the same color with a several-pixel gap between them. Both bands were authored faithfully. In the rendered output the marking read as two thin stripes with a body-colored channel between them, where the reference reads as one solid block — because the "gap" was not part of the artwork at all. It was the reference renderer's own seam outline, drawn over a continuous band, and the target renderer draws no such outline. An older module in the same codebase had already hit this and resolved it in a one-line aside ("only a hairline outline between them — so the bands are authored contiguous"), but the procedure doc did not carry the finding, so it was rediscovered from scratch.
**Skill:** New skill candidate: raster-reference-transcription (or an addition to any procedure that measures a rendered image to reproduce its subject)
**Type:** open-source
**Phase/Area:** Measurement and classification

**Issue:** When measuring a rendering rather than the thing itself, some pixels belong to the artwork and some belong to the renderer's presentation of it — outlines, seams, drop-shadows, highlights, antialiasing. Both look identical to a color predicate. Transcribing presentation as content produces output that is pixel-faithful to the reference and wrong about the subject. The same session hit the mirror-image version: measuring a trimmed shape's full outer boundary folded its drop-shadow into the trim color, rendering a keyline at twice its true weight, and the fix was to measure a cut through the middle of the shape that crosses every layer cleanly instead of measuring its silhouette.

**Suggested improvement:** Add a classification step before authoring: for every measured boundary, ask whether it is a feature of the subject or of the rendering. Two same-colored regions separated by a thin neutral line are almost always one region plus a seam. A dark band along one edge only, on the shadow side, is a shadow and not trim. Prefer a cut through the interior of a shape, which crosses each layer once, over tracing its outer silhouette, which cannot distinguish a layer from its shadow. Where a codebase has already resolved one of these cases inline, promote it into the procedure doc rather than leaving it as a comment in one module.

**Principle:** Measuring a rendering measures two things at once — the subject and the renderer. Any transcription procedure needs an explicit step that separates them, because no color predicate can: presentation artifacts are made of exactly the same pixels as content. The tell is usually structural rather than chromatic (a thin neutral line between same-colored regions; asymmetry that follows a light source), so the check belongs in the procedure as a question to ask, not as a threshold to tune.

### Observation 8: "Take the largest component" silently discarded half of a two-part shape

**Status:** OPEN — escalated (2026-08-14): extends Observation 7's new-skill proposal ("raster-reference-transcription"); groups with 7 and 9.
**Date:** 2026-08-07
**Session context:** Converting a two-color mark from a raster reference into vector paths. The mark is a solid body inside a contrasting outline. The intended method was to select both colors at once, trace the resulting silhouette, and paint the body over it so the outline survives as a continuous edge. To isolate the mark from unrelated same-colored artwork nearby, the selection was reduced with the usual heuristic: keep the largest connected component. The output looked entirely plausible — a clean, correct-looking body — and was only caught by holding it against the source. The outline was gone. The two colors never touch: an antialiased seam runs between them matching neither color test, so the "union" was two adjacent components, and the largest was the body alone. The fix was to keep every candidate component and reject by size threshold instead, which also removed the unrelated artwork the heuristic had been introduced for.

**Skill:** New skill candidate: raster-reference-transcription — extends [[Observation 7]], same domain
**Type:** open-source
**Phase/Area:** Region selection and component reduction

**Issue:** "Largest connected component" is the reflexive way to isolate a subject from noise, and it is unsafe precisely when the subject is not connected. Antialiasing between two adjacent regions of different colors produces intermediate pixels belonging to neither, so any predicate built as `A or B` yields a disconnected set whenever A and B merely abut. The failure is silent and self-consistent: no error, no empty result, and an output that passes every check except comparison with the source. The general shape is a reduction step whose precondition (the thing I am reducing is one object) is never tested.

**Suggested improvement:** Never reduce a candidate set by a rank-based heuristic (largest, first, nearest) when the count itself is diagnostic. Prefer a threshold that admits every plausible member, then verify the count against what the subject should contain. Where a rank-based pick is genuinely wanted, assert the expected count first and fail loudly on a mismatch. More generally: when two selection criteria are combined with OR and the result is treated as one object, check that assumption explicitly, because the boundary between them is exactly where the combination breaks.

**Principle:** A reduction step encodes a precondition about its input, and rank-based reductions encode the strongest one — that the candidates are alternatives rather than parts. When they are parts, the reduction does not fail, it succeeds on a fragment, which is worse. Any heuristic that turns many into one should either verify the count it expected or be replaced by a filter that cannot discard a part. Silent partial success is the failure mode to design against, not absence of output.

### Observation 9: A capability judgement recorded as a durable comment outlives the evidence for it

**Status:** OPEN — escalated (2026-08-14): extends Observation 7's new-skill proposal ("raster-reference-transcription"); groups with 7 and 8.
**Date:** 2026-08-07
**Session context:** depth uniform archive — tracing helmet decals for the twelve teams whose modules shipped with a bare shell.

**Skill:** raster-reference-transcription (new skill candidate, see Observations 7 and 8)
**Type:** open-source
**Phase/Area:** Feasibility assessment, and how negative results get written down

**Issue:** Four modules carried header comments asserting that the team's mark could not be traced — each written in an earlier session, each with specific and plausible reasoning ("a 2px keyline is sub-3px stroke detail", "the spots would hit the evenodd trap", "it embeds a wordmark"). All four were wrong, and all four failed identically: the author had assessed the *hardest feature* of the mark and let that verdict stand for the whole mark. Every one traced cleanly once the hard feature was handled as its own smaller question — derive it, let it fall out for free, or drop it.

The compounding problem is not the original misjudgement, which is cheap and recoverable. It is that the judgement was written into a durable artifact as a settled fact, in the same voice as the measured facts around it, with the evidence ("I tried predicate X and got fragments") discarded. A later reader — including a later session of the same agent — cannot distinguish "this was tested and is impossible" from "this looked hard once". I only revisited these four because a sweep forced me to, not because anything in the comment invited re-examination.

**Suggested improvement:** Distinguish two kinds of negative result and write them differently. A *demonstrated* impossibility records the measurement that proves it and stays settled — Houston's bull is unreachable because its navy samples exactly the shell's navy, `(3,24,37)`, and that is a fact a reader can re-check in one line. A *judgement* that something is not worth attempting should be written as provisional, name the specific approach that failed, and say what would change the answer. Concretely, in any artifact that records a capability verdict: state the predicate or method tried, not just the conclusion; and where the verdict is "too hard" rather than "provably impossible", mark it as such so the next reader knows it is an invitation rather than a wall.

**Principle:** A negative capability judgement is a claim about the method available at the time, not a property of the subject, but comments record it as though it were the latter. When writing one down, separate the measurement from the verdict and preserve the measurement — the verdict decays as methods improve, the measurement does not. And beware the specific failure of letting a subject's hardest feature determine the assessment of the whole: ask what the thing is *mostly* made of, then treat the hard part as a separate and usually cheaper question.

### Observation 10: Parallel explore-agent sweeps beat one-pass manual review for full-codebase audits

**Status:** OPEN — escalated (2026-08-14): proposes a new skill ("codebase-audit-review"), naming/scope needs Cooper's decision.
**Date:** 2026-08-10
**Session context:** User asked for a complete code-quality pass over a ~55-component, 181-file-lib Next.js app (design tokens, components, pages, Next.js practice).
**Skill:** New skill candidate: "codebase-audit-review"
**Type:** open-source
**Phase/Area:** Task decomposition / parallel review

**Issue:** A full-repo audit is too large for one context. Splitting it by layer (design tokens + ui primitives / feature components / app routes + Next.js / lib data layer) and dispatching parallel explore agents produced four deep, cross-checked reports; spot-greps confirmed every headline claim I re-checked (a 5-way duplicated panel gradient with two disagreeing hex values, only 1/16 primitives using cn(), two dead exports). The two agents that were explicitly told to grep-verify dead-code and "verified non-issue" claims did so and marked them — the instruction changed the quality of the report.

**Suggested improvement:** Codify a "codebase audit" workflow: (1) inventory the repo by layer and size, (2) dispatch ≥1 explore agent per layer with an explicit instruction list of anti-patterns to hunt AND "verify any dead-code / missing-file claim with grep before reporting", (3) re-verify the top 3-5 headline claims myself before answering, (4) ask each agent to separate "flagged but OK" (typechecked negative results) from real findings — parallel to Observation topic above.

**Principle:** When a deliverable is too big for one context, parallel subagents with per-layer scope and a verification mandate give better coverage than a sequential manual pass — but the orchestrator must spot-check the highest-claim findings and instruct agents to separate verified negatives from genuine findings, or the report mixes noise and hallucination and the orchestration adds nothing.

### Observation 11: "Which season is current" has two legitimate definitions in one codebase — a picker's top row must match its page's default view

**Status:** OPEN
**Date:** 2026-08-10
**Session context:** depth past-season schedule view — wiring a SeasonSheet season picker onto the SCHEDULE tab. The roster page computes `currentSeason = isOffseason ? upcomingSeason : upcomingSeason - 1` ("the season whose roster is live"), but the schedule page's default view is `getTeamSchedule(id)`'s latest-season-present, which during the off-season is the *upcoming* season (already scheduled) and in January is still the in-progress season. Using the roster page's definition for the schedule picker would have produced a top row ("2025 · Current") that disagreed with the view actually on screen (2026), making the picker's active-row check read as wrong seconds after opening it.

**Suggested improvement:** When adding a season/state picker to a page that already has a default view, derive the picker's "current" row from that page's own default (here `schedule.season`), not from a sibling page's definition — even when both pages are in the same app and the sibling's constant is already server-computed. Note the divergence in a comment at the point of choice, because the two definitions are both "right" and only one agrees with the page.

**Principle:** A "current" or "active" label has to mean the same thing as the view it annotates; reusing a sibling surface's definition because it shares a name is how an indicator ends up tracking a different notion of "today" than the content below it.

### Observation 12: A spec that defers a feature usually leaves the pattern for it in an older sibling — check the app's established precedent before designing the deferred feature

**Status:** ACTIONED (2026-08-14) — Applied to `implement-spec` (step 1: added a rule to search the app for an already-shipped sibling pattern before designing a spec-deferred feature; also folded in Observation 13's "quoted line ranges drift, re-locate by string not line number" rule in the same edit) (scheduled review)
**Date:** 2026-08-10
**Session context:** depth past-season schedule view. The 2026-07-17 team-schedule spec locked "v1 shows the latest season only; a season switcher is a later add" and the depth chart's Phase D1 spec (an *older* feature) had already shipped the season-picker pattern: `SeasonSheet` + `BottomSheet` + `?season=` URL + client hook + API route + `ApplySeasonFromQuery`. Every design question the new ticket raised (URL vs local state, flat list vs decade grouping, "back to today" semantics) was already answered by that precedent, so the whole feature reused existing seams instead of inventing new ones — SeasonSheet, BottomSheet, ApplySeasonFromQuery, the use-team-season hook shape, and the history API route shape were all copied/mirrored verbatim.

**Suggested improvement:** In implement-spec (or any "implement this deferred feature" workflow), add a first step: when a spec's Out-of-scope/future-work list names the feature you're about to build, search the app for an existing implementation of that same interaction on a different surface before making design decisions. Deferred features are usually deferred precisely because a sibling shipped first with the pattern.

**Principle:** "Deferred" and "never built" are different facts — a feature deferred by one spec may already exist in an older sibling's scope, and the cheapest correct design is the one that copies the sibling's proven seams rather than re-deriving the decisions from scratch.

### Observation 13: A ticket's quoted code references are a snapshot that drifts

**Status:** OPEN — escalated (2026-08-14): proposes a new skill ("ticket-execution"), naming/scope needs Cooper's decision. Note: the stale-quote-reference part of this observation's suggested improvement was folded into `implement-spec`'s step 1 as an additive fix during this review (see Observation 12's ACTIONED note above) — this observation stays OPEN because the new-skill proposal itself is still undecided.
**Date:** 2026-08-11
**Session context:** Implementing the depth "Add FTN attribution to formation surfaces" ticket end-to-end. The ticket's Context section quoted two line ranges in components/DepthChartField.tsx (the attribution line at :486-492 and a formation chip row at :369-396) as the current state of the code. Both were gone by the time the branch was checked out — the chip row had been removed and the whole formations surface redesigned (PR #248) after the ticket was written. The attribution the ticket described as showing only "after a tap" actually lived in a different component (FormationsSheet.tsx), and the field rendered FTN-derived layouts from first paint with no attribution at all. The ticket's Done-when survived intact; only its quoted evidence was stale.
**Skill:** New skill candidate: ticket-execution
**Type:** open-source
**Phase/Area:** Reading the ticket before implementing

**Issue:** A ticket that quotes line ranges ("DepthChartField.tsx:486-492") as evidence reads like a live inspection, but it is a snapshot from the day it was written. Between that date and the implementation session, other PRs land that move the quoted code — the reference silently stops matching while the prose claim ("attribution under-fires") can still be true, or has changed shape entirely. An agent that trusts the snapshot either searches for a chip row that no longer exists or, worse, "fixes" the old shape in a file where it no longer lives.

**Suggested improvement:** Before implementing a ticket that quotes code locations, re-locate each quoted reference in the live tree (grep for the quoted string, not the line number). If a quoted block is gone, that is not evidence the ticket is stale — the ticket's Done-when and intent are the contract; the quoted lines are only its map. Re-map the intent onto the current code and note the drift, as CLAUDE.md's "flag in the PR body but proceed" rule says for specs. Treat a line-numbered quote in a ticket the same way you treat one in an observation log: an address, not a fact.

**Principle:** In any artifact that describes code (ticket, spec, observation), quoted line ranges are addresses to the artifact's past, not current truth. The intent they support can outlive them; never invalidate a task because its quoted evidence drifted, and never implement against a quoted shape without confirming it still exists.

## 2026-08-12

### Observation 14: `cacheLife()` throws when a `'use cache'` function runs under vitest

**Status:** ACTIONED (2026-08-14) — Applied to `vitest-testing` (new "depth-specific gotchas" section) (scheduled review)
**Date:** 2026-08-12
**Session context:** Hardening the public player-search endpoint (depth repo). Evaluated adding Next's `'use cache'` to a DB-read function and planned a unit test that would call it with a mocked supabase client.
**Skill:** vitest-testing
**Type:** open-source
**Phase/Area:** Mocking modules that use Next Cache Components

**Issue:** `cacheLife()` from `next/cache` throws `E887` ("only available with cacheComponents config") unless `process.env.__NEXT_USE_CACHE` is set, and then throws `E818` ("can only be called inside a use cache function") because vitest has no cache work-unit store. So any function carrying `'use cache'` + `cacheLife()` cannot be invoked under vitest without `vi.mock('next/cache', () => ({ cacheLife: () => {} }))` — and even neutralized, the caching behavior itself is unobservable in a unit test. Existing live-DB tests in this repo that call such functions would hit the same throw the moment env vars are present (they're skipped today). I chose an in-module TTL cache instead, precisely so the "DB not hit twice" contract could be asserted.

**Suggested improvement:** When a ticket asks for caching a DB read AND for tests proving "repeated calls stop hitting the DB", prefer a hand-rolled in-memory TTL cache (observable, testable) over `'use cache'`, or `vi.mock('next/cache')` in any test that must invoke a cached function. Consider noting in the project's vitest-testing skill that `'use cache'` functions cannot be exercised under vitest.

**Principle:** A framework caching primitive that is invisible outside the framework's runtime is not unit-testable. Pick testability at the cache layer (an in-memory structure you own), or accept the framework behavior as an integration-only guarantee and say so in the test file.

### Observation 15: A module-scoped cache leaks across tests in the same file

**Status:** ACTIONED (2026-08-14) — Applied to `vitest-testing` (new "depth-specific gotchas" section) (scheduled review)
**Date:** 2026-08-12
**Session context:** Writing unit tests for searchAllPlayers' new module-scoped result cache in the depth repo. The TTL-expiry test failed confusingly until I realized an earlier test had already cached the same key.
**Skill:** vitest-testing
**Type:** internal
**Phase/Area:** Isolation of module-level mutable state

**Issue:** Module-level mutable state (a `Map` cache, a singleton client) persists across `it()` blocks within one test file. The first test cached `8:geno`; the TTL test then read that entry as a fresh hit under `vi.setSystemTime(0)` — `Date.now()` at 0 minus the entry's large real-time `at` is always within the window, so the refetch never fired. Working around it with "unique query strings per test" is fragile: a reorder or a shared fixture silently re-breaks it.

**Suggested improvement:** For tests of module-cached behavior, isolate per test with `vi.resetModules()` + a dynamic `await import(...)` in `beforeEach` — a fresh module instance means a fresh cache. Hoisted `vi.hoisted` mock state survives `resetModules`, so recording mocks keep working.

**Principle:** Module-level mutable state is shared state across the tests in a file. Tests of code that owns it must isolate by fresh module instance, not by carefully-crafted inputs that happen to avoid the collision.

### Observation 16: Mocking a module doesn't bypass a real guard that reads env vars before the mocked call

**Status:** ACTIONED (2026-08-14) — Applied to `vitest-testing` (new "depth-specific gotchas" section) (scheduled review)
**Date:** 2026-08-12
**Session context:** In the depth repo, mocking `@supabase/supabase-js` so searchAllPlayers runs against a recording fake client in vitest. Tests failed with the real "Missing SUPABASE_URL" error.
**Skill:** vitest-testing
**Type:** internal
**Phase/Area:** Mocking factory/guard code

**Issue:** `supabase()` in lib/roster-source.db.ts throws when the SUPABASE env vars are absent — before `createClient` is ever called. `vi.mock('@supabase/supabase-js')` only replaces the imported module; it cannot bypass a pre-mock guard in the code under test. The mock looked like it should have worked (the error even mentions the env var), and the actual missing piece was stubbing the two vars so the guard passes into the mocked path.

**Suggested improvement:** When the code under test guards on env vars (or other ambient state) before reaching the mocked call, stub that state too: `vi.stubEnv` in `beforeAll`, `vi.unstubAllEnvs` in `afterAll`. Note that vitest gives each test file its own worker, so the stubs don't disturb sibling files' skip logic.

**Principle:** A mock replaces a dependency, not the code around its call site. If the path to the mocked call passes through a guard over process state, the test must satisfy that guard or the real path — and its real error — still runs.

## 2026-08-12

### Observation 17: A formal ticket with locked acceptance criteria is itself the scope confirmation for a multi-file refactor

**Status:** OPEN
**Date:** 2026-08-12
**Session context:** Implementing "Align primitive variant vocabularies" end-to-end — a 14-file UI-primitives rename (prop + value renames across Button/IconButton/Badge, Card's padding prop removed, a new shared vocabulary module).
**Skill:** General agent-workflow guidance (also relevant to any skill that gates edits on scope confirmation)
**Type:** internal
**Phase/Area:** Scope confirmation vs autonomous-ticket execution

**Issue:** The global CLAUDE.md rule says to restate the goal, list files, and *wait for confirmation* before a refactor touching more than ~3 files or renamable more than one way. The ticket harness instead said "implement end-to-end" and supplied a formal ticket with Tasks / Acceptance / Done-when. I proceeded without a blocking pause, resolving the vocabulary mapping (chrome→primary, plain→ghost, kind→variant) as a judgment call documented in code. This tension recurs on every agent-ops ticket, so how it gets resolved is worth recording.

**Suggested improvement:** Treat a formal ticket whose acceptance criteria and done-when are explicit as the confirmation itself: restate the planned design decisions in the final report and commit rather than pausing pre-edit. Reserve the blocking pause for genuinely underspecified asks (no acceptance criteria, or a mapping choice that changes visible behavior). Where a ticket's wording leaves real latitude, state the chosen interpretation explicitly in the commit body so the reviewer can veto cheaply.

**Principle:** The "wait for confirmation" guardrail exists to catch scope-creep risk in underspecified requests, not to gate every edit. A scoped ticket is the artifact that resolves the ambiguity — the confirmation step degrades to "document the judgment calls taken," which keeps the guardrail's protection without serializing the whole task on a pause.

### Observation 18: Testing a module-scoped singleton store needs vi.resetModules + dynamic import, not a React render

**Status:** ACTIONED (2026-08-14) — Applied to `vitest-testing` (new "depth-specific gotchas" section) (scheduled review)
**Date:** 2026-08-12
**Session context:** Hardening the depth repo's use-user auth singleton (lib/use-user.ts) and adding the ticket-mandated tests for it — the store is module-scoped (useSyncExternalStore), and vitest keeps one module instance per file, so state leaked across `it` blocks.

**Skill:** vitest-testing
**Type:** open-source
**Phase/Area:** Mocking / test isolation for module-scoped state

**Issue:** The unit under test holds state at module scope (started flag, current state, an auth generation counter) and is consumed through a React hook. The repo has no @testing-library/react or react-test-renderer, and rendering through useSyncExternalStore under react-dom/server reads only the *server* snapshot, so the async state transitions could not be observed by rendering at all. Two techniques made the tests clean and are easy to miss: (1) exporting the store's own `subscribe`/`getSnapshot` interface from the hook module so tests drive the store directly instead of through React — which also required a header-comment note that those exports are the store's interface, not React's; (2) `vi.resetModules()` in `beforeEach` followed by a per-test `await import()` of the module, so the singleton's module state (and the `vi.mock`-ed supabase client harness) is fresh for every test. Without the reset, the second test ran against the first test's `started === true` and the mock auth harness silently never engaged.

**Suggested improvement:** In the vitest-testing skill, add a "Module-scoped state (singletons, caches, external stores)" subsection under Mocking: for a module-scoped store, reset it between tests with `vi.resetModules()` + dynamic import (the `vi.mock` factory survives the reset and re-applies), and prefer exposing/using the store's subscribe/getSnapshot contract as the testable surface rather than forcing a React render — SSR render cannot observe store updates because useSyncExternalStore uses getServerSnapshot off the client.

**Principle:** Test isolation is a property of the module registry, not of assertions — module-scoped state is shared state, and resetting it requires re-importing the module, not just clearing mocks. And when a React hook is a thin wrapper over a store, the store's own subscription interface is the right seam to test: it avoids a DOM/testing-library dependency and is the exact contract React binds to.

### Observation 19: Unit-testing Next.js app-dir route handlers by mocking the supabase client module

**Status:** ACTIONED (2026-08-14) — Applied to `vitest-testing` (new "depth-specific gotchas" section) (scheduled review)
**Date:** 2026-08-12
**Session context:** depth — fixing four API routes that threw or swallowed DB errors (ticket "fix route handlers that throw or swallow errors"). First route-handler tests this repo has had; all prior tests live under lib/.
**Skill:** vitest-testing
**Type:** internal
**Phase/Area:** Testing Next.js route handlers under vitest

**Issue:** Writing `route.test.ts` files for `app/api/**` had three friction points that cost time to work out. (1) `npx vitest` resolved a different vitest from the npx cache and failed with "Cannot find module 'vitest/config'" — the repo's own config needs the local install. (2) The supabase client modules were hard to mock because they pull in `next/headers` and `next/cache` at module scope — but `vi.mock` of the whole module sidesteps loading them entirely, so the route under test only needs `next/server` (which works fine in vitest's node env). (3) Uncertainty whether colocated `route.test.ts` files under `app/` would be treated as routes or picked up by vitest — neither happens: the app router only recognizes its special file names, and vitest's default glob catches `**/*.test.ts`. A full `next build` (118 pages) succeeded with the four test files present, confirming no conflict.

**Suggested improvement:** In the vitest-testing skill, document the pattern for testing a Next.js app-dir route handler: colocate `route.test.ts` next to `route.ts`; `vi.mock('@/lib/supabase/server', ...)` (and the data-access module, e.g. `@/lib/roster-source.db`) with a factory returning `vi.fn()`; build a chainable fake for the supabase query builder where the terminal method resolves the result object (an awaited `maybeSingle()` returns the result; an awaited terminal `.eq()` on a builder can just return the plain `{ data, error }` object); and prefer `npm test` / the local `./node_modules/.bin/vitest` over `npx vitest`.

**Principle:** The test seam for a route handler is the module boundary at the DB client, not HTTP — when a handler's only external dependency is the client, mocking that one module makes the handler fully testable with zero network layer. And always prefer the repo's local binaries over `npx`, which can silently resolve a different version.
