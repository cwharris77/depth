---
name: nextjs-flags-static-generation-caveat
description: Use when about to add or modify a Vercel Flags SDK `flag()` call in a Next.js route/page — especially one that currently prerenders statically. Interrupts before the edit to warn about a silent static-generation regression and get explicit confirmation to proceed.
---

# Next.js Flags SDK: static-generation caveat

**Created by Cooper Harris.** Narrow-scope interrupt skill — only fires on
`flag()`/feature-flag work, nowhere else.

**Licence:** CC BY 4.0 — share and adapt for any purpose with credit.

**Feedback & Support:** if the caveat below stops being accurate for a newer version of
`flags/next`, update this file rather than routing around it.

## The caveat

The `flags/next` package's `flag()` wrapper reads `headers()`/`cookies()` internally on
**every** evaluation — to support Vercel Toolbar per-session overrides — independent of
whether the flag's own `decide()` body touches the request. A single `flag()` call
anywhere in a route is enough to opt that whole route out of static generation, silently,
with no build warning. A comment in the codebase asserting "`decide()` is request-free so
this route stays static" is not evidence this is safe — that property does not hold for
`flag()` itself, regardless of what `decide()` does.

## The rule

Before adding a new `flag()` call to a route, or before modifying an existing flag setup
on a route that's meant to stay statically generated:

1. Check the route's current rendering mode: run `next build` (or check the last known
   build output) and note whether it's `●` (SSG/ISR) or `ƒ` (fully dynamic).
2. If the route is currently static (`●`) and the change would add a `flag()` call to
   it, **stop before making the edit** and message the user with this exact caveat:
   adding `flag()` here will opt the route out of static generation entirely,
   regardless of what `decide()` does, with no build-time warning. Ask whether they
   still want to proceed, or whether they'd rather keep the route static and handle the
   flag differently (e.g. evaluate it client-side, or accept the route going dynamic
   deliberately).
3. Only proceed once the user confirms.
4. After the change, verify with `next build` that the resulting rendering mode matches
   what was agreed — if it flipped to `ƒ` and that wasn't the point of the change, that's
   a bug, not an acceptable side effect.

## Pre-flight check

Before finishing this task: did I actually message the user with the caveat and get a
yes, or did I just add the `flag()` call? If the latter, stop — this skill's entire
purpose is the interrupt, not the workaround.

## Anti-pattern (worked example)

Cooper asked to remove an isolated-search-icon flag because "this page's performance is
suffering because of it." `npm run build` confirmed `/team/[id]` was building `ƒ` despite
`generateStaticParams` and despite the repo's own `lib/flags.ts` header comment
documenting that `decide()` was kept request-free specifically to stay statically
prerenderable. Removing the one `flag()` call flipped the route back to `●`. This had
already been independently rediscovered once before the same day, purely by someone
noticing `ƒ` in build output — nothing about the `flags/next` API surface hints at the
tradeoff, and the doc comment's stated intent was aspirational, not verified.

## Principle

A comment describing a dependency's behavior is a claim, not a fact. When a route's
rendering mode doesn't match what a comment promises, verify against the dependency's
actual build output, not the comment. For this specific dependency, the fix is cheaper
than the debugging: ask before adding the call, rather than diagnosing the regression
after it ships.
