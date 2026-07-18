---
name: spec-implementation-audit
description: Use before starting or closing out any task whose description claims a design/spec is "already specced," "already decided," or "settled" — verifies the spec's locked decisions were actually built, not just documented, before trusting that framing.
---

# Spec Implementation Audit

**Created by Cooper Harris.** Captures a recurring failure mode: trusting a ticket's
summary of a spec's status instead of checking the code.

**Licence:** CC BY 4.0 — share and adapt for any purpose with credit.

**Feedback & Support:** if this methodology doesn't hold up on a new case, note why and
fold the exception back into this file.

## The rule

A ticket or task description that says a design is "already specced" or "settled" is a
claim about the *decision*, not the *code*. Verify the two independently before treating
implementation work as done or skippable:

1. Locate the spec's decisions section (e.g. a "Decisions (locked)" table) — the part
   that names concrete choices, not just goals or rationale.
2. Extract every named artifact from those decisions: function names, param names, file
   paths, table/column names, flag names, route paths — anything concrete enough to
   grep for.
3. Grep the codebase for each one. A hit confirms that decision was implemented; a miss
   means it was decided but never built.
4. Only once every named artifact is confirmed present, treat the spec as fully
   implemented. A partial hit (some artifacts present, others missing) is partial
   implementation — scope the remaining gap explicitly rather than rounding up to
   "close enough" or assuming the missing piece is out of scope.

## Pre-flight check

Before starting implementation on a ticket that cites a spec as settled, or before
closing it as done: did I actually grep for the spec's named artifacts, or am I trusting
the ticket's own summary? If it's the latter, stop and run the grep first — this is the
enforcement step, not an optional sanity check.

## Anti-pattern (worked example)

A ticket read: "Selector state design (URL `?kit=...` or localStorage) is already
specced," implying no design work remained. The locked spec named a specific artifact —
`rosterShareUrlPath` gaining an optional `kitId` param, composed after `?order=`. A grep
for `kitId` in the relevant read-side file and its test turned up nothing; only the
read-on-arrival half of the flow (`ApplyKitFromQuery`) had shipped. The ticket's framing
was accurate about the *decision* and silently wrong about the *code* — the grep is what
surfaced the gap, not re-reading the ticket more carefully.

## Principle

A locked design decision is a commitment to build, not evidence that building happened.
Verify implementation against the spec's own file/symbol names rather than trusting a
ticket's summary of status.
