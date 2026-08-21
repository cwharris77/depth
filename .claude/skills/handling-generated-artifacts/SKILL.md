---
name: handling-generated-artifacts
description: Use whenever a tool-generated artifact (a traced SVG path, a script's computed output, an API response body, any long opaque literal produced by a tool rather than typed by hand) needs to land inside a source file in this repo. Reach for this before writing an uniform decal path, a generated color/measurement table, or any other long literal into a .ts/.tsx module by hand or "from memory" of having just seen it.
---

# Handling generated artifacts

## Why this exists

A model asked to transcribe a long opaque literal it cannot currently see (an SVG path,
a generated coordinate list, a computed constant) will confabulate a plausible-looking
replacement instead of failing loudly. It typechecks. It passes every test. It renders —
just the wrong shape. This has already happened in this repo: a contour tracer produced a
correct SVG path for a helmet decal, and when the destination module was authored in a
later step without re-reading the traced file in the same turn, the model wrote a fabricated
but structurally plausible path instead. Six earlier decals in the same session were pasted
correctly — the failure mode isn't carelessness, it's specifically that the correct value
lived in a file not read this turn, and the model filled the gap.

## The rule

**Any value produced by a tool is data to be moved mechanically, not content to be reproduced
from memory or context.** Treat "the generated value lives in a file I have not read this
turn" as a hard stop before writing the destination module.

Two safe ways to move it:

1. **Read the artifact file into context in the step immediately before writing the
   destination**, so the value being written is the one actually visible in the current turn
   — not a recollection of having seen it earlier.
2. **Script the substitution** — a find/replace anchored to the constant's name that reads the
   artifact file at write time, asserts the destination file changed, and asserts the artifact
   content is present in the result.

## Verification step (do this even after either method above)

After writing, grep the destination file for a distinctive substring of the artifact (a
sequence of coordinates unlikely to appear by chance) and fail loudly if it's absent. This
catches the case where the write happened but pulled from the wrong source or a stale read.

## Principle

Type checks and unit tests do not distinguish a real generated value from a plausible
fabricated one — only a direct comparison against the source artifact does. Any pipeline that
moves tool output into source code needs an explicit verification step, not just a confident
write.
