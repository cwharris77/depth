# Uniform Jersey Detail Ticket Template

Use this as the starting point for any team-level uniform archive fidelity ticket. Replace
bracketed placeholders before filing the ticket.

## Title

`design(uniforms): refine [Team] jersey details and number styling`

## Context

The [Team] uniform archive should be updated to match the current flat reference more closely,
using the Cardinals detail pass as the model. The work should preserve the existing broad jersey
profile unless the team's own reference proves a different shape is needed.

Reference inputs:

- Primary uniform sheet: `[path or URL]`
- Optional 3D jersey/product reference: `[path or URL]`
- Existing generated archive preview: `[path or URL]`

## Goals

- Replace the generic base jersey number with a vector `3` across [Team] jerseys.
- Keep the jersey silhouette proportionally broad enough to sit naturally above the pants.
- Add the team's visible jersey-specific details from the reference:
  - Chest wordmark or name mark: `[describe]`
  - Collar or neck text/details: `[describe]`
  - Sleeve patches, wordmarks, stripes, or shoulder numbers: `[describe]`
  - Alternate/throwback texture or special fabric treatment: `[describe]`
- Preserve the team's existing helmet and pants work unless the jersey update exposes an obvious
  mismatch that must be fixed for visual consistency.
- Regenerate the committed uniform thumbnails so iOS/web archive assets update at the existing
  paths.

## Non-Goals

- Do not add runtime font dependencies for jersey wordmarks or numbers.
- Do not prioritize tiny manufacturer or league badges unless the ticket explicitly asks for them.
- Do not change uniform row ids, slugs, or archive history.
- Do not write to hosted Supabase or change schema.

## Implementation Notes

- Start by reading `docs/uniform-model-brief.md`, `components/UniformFigure.tsx`, and the team's
  `lib/uniforms/teams/[team].parts.ts` or flat definition.
- Treat reference-sheet shoulder numbers as annotations unless the real jersey carries that detail.
  If the target jersey number is `3`, replace visible shoulder numerals with `3` and orient them as
  they appear on the worn jersey, including clipping when they sit high on the shoulder.
- Reconstruct major marks as SVG paths or simple vector primitives. Avoid tracing a generated PNG
  as the source of truth; use it only as design guidance when no better vector reference exists.
- For textures like eggshell speckles, use deterministic generated marks so thumbnails are stable
  across runs.
- Add source comments for any literal colors introduced by the pass.

## Tasks

- [ ] Inspect the [Team] reference sheet and crop the relevant jerseys at high zoom.
- [ ] Identify which details are construction, which are sheet annotations, and which are badges
      intentionally out of scope.
- [ ] Update the team's jersey parts/definition with vector number `3`, wordmarks, collar details,
      sleeve details, and any special texture.
- [ ] Keep or restore the broad jersey profile if the preview looks narrow against the pants.
- [ ] Add or update focused tests for the new vector number/detail behavior.
- [ ] Regenerate all uniform thumbnails.
- [ ] Compare before/after previews for every [Team] kit at archive thumbnail scale.
- [ ] Open a PR with screenshots in the repo PR template.

## Acceptance

- Every [Team] jersey uses the vector `3`, including shoulder numerals when present.
- The jersey shape reads like the reference and does not look narrow relative to the pants.
- Team-specific chest, collar, sleeve, patch, and texture details are visible at archive size.
- Generated assets are deterministic: rerunning thumbnail generation after commit produces no diff.
- `npm run format:check`, `npx tsc --noEmit`, and `npm test` pass.
- PR screenshots show before/after evidence for all affected [Team] kits.

## Done When

- The PR is squash-merged.
- The preview/deployment checks are green.
- Local `main` is up to date with the merged change.
