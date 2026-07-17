# Skill Observation Log

Observations captured during task-oriented work.

**Status key:** OPEN = not yet actioned | ACTIONED (YYYY-MM-DD) = skill
updated/created | DECLINED (YYYY-MM-DD) = user decided not to pursue —
resolved statuses always carry their resolution date

---

## 2026-07-17

### Observation 1: Ticket claimed "already specced" without verifying spec was fully implemented
**Status:** OPEN
**Date:** 2026-07-17
**Session context:** Implementing "Launch in-page uniform kit picker" ticket in the depth repo.
**Skill:** New skill candidate: spec-implementation-audit
**Type:** open-source
**Phase/Area:** Pre-implementation verification

**Issue:** The ticket text asserted "Selector state design (URL ?kit=... or localStorage) is already specced," implying the work was done. Reading the actual locked spec (2026-07-07-phase-7-uniform-launch-design.md) revealed a specific locked decision — `rosterShareUrlPath` gaining an optional `kitId` param, composed after `?order=` — that was never implemented; only the read-on-arrival half (`ApplyKitFromQuery`) had shipped. A grep for `kitId`/`kit=` in `lib/share.ts` and its test file immediately surfaced the gap.

**Suggested improvement:** When a ticket references a design doc as settled/already-built, don't take that framing at face value — locate the doc's "Decisions (locked)" table and grep the codebase for each named artifact (function param names, file paths) before concluding no code is needed. Treat "spec says X is decided" and "X is implemented" as separate claims to verify independently.

**Principle:** A locked design decision is a commitment to build, not evidence that building happened — verify implementation against the spec's own file/symbol names rather than trusting a ticket's summary of status.
