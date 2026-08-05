# Team-owned uniform renderer definitions

**Date:** 2026-08-05
**Status:** Approved design

## Goal

Replace the growing team-specific conditionals in `UniformFigure` and the shared
`lib/uniforms/trim.ts` bucket with one declarative definition module per team. The renderer keeps
the shared helmet, jersey, pants, facemask, clipping, and paint-order machinery; team modules own
uniform-construction geometry and team-specific visual rules.

The first migration preserves the existing Bengals and Bills output, then adds the Seahawks navy
home uniform from the owner-supplied reference. No other team receives speculative detail.

## Source-of-truth boundaries

- The database remains authoritative for each kit's `TeamColors`. Current home colors continue to
  come from ESPN; curated non-home kit palettes continue to come from `lib/uniforms/data.ts`.
- Team modules reference semantic color tokens resolved from the selected kit at render time. They
  do not duplicate complete kit palettes.
- Literal hex values remain available only for fixed construction colors that cannot be expressed
  by the kit palette.
- Team modules contain uniform-construction facts: stripes, bands, piping, number treatment, and
  abstract decal regions.
- Team modules do not reproduce trademarked helmet logos, chest marks, wordmarks, league shields,
  or sponsor marks. The existing abstract/no-trademark-logo convention remains in force.

## Architecture

### Shared contract

`lib/uniforms/teams/types.ts` defines the declarative contract:

- semantic color references;
- filled and stroked SVG geometry layers;
- known uniform surfaces;
- number styling and optional authored number glyph geometry;
- team defaults and kit-slug overrides;
- explicit layer removal.

Supported semantic colors are `primary`, `secondary`, `accent`, and `readable-on-body`. A literal
six-digit hex is accepted for fixed construction colors.

Supported surfaces are helmet, jersey, left sleeve, right sleeve, collar, number, pants, left leg,
and right leg. Each layer declares its surface, path or stroke geometry, color reference, and clip
behavior. The renderer owns z-order and applies the appropriate clip path; definition files cannot
reorder the facemask or paint outside their declared surface.

Number treatment supports fill, outline, outline width, and an optional team-authored glyph path.
The shared text `1` remains the fallback when no glyph is provided.

### Team modules

Each implemented team has one focused module under `lib/uniforms/teams/`, for example:

```text
lib/uniforms/teams/
  types.ts
  bengals.ts
  bills.ts
  seahawks.ts
  index.ts
```

A module exports one `TeamUniformDefinition`. Named constants such as `HELMET_STRIPE`,
`SLEEVE_MARK_L`, `SLEEVE_MARK_R`, `PANTS_STRIPE_L`, and `NUMBER_GLYPH` keep geometry discoverable
inside that team's file. A team definition contains reusable team defaults plus overrides keyed by
the kit slug portion of `kitId` (`home`, `away`, `rivalries-2025`, and so on).

Helmet geometry is authored in the raw helmet coordinate space (`x:139-802, y:65-674`). Jersey and
pants geometry is authored in the outer viewBox coordinate space. Mirrored paths are stored
explicitly in team modules; the renderer performs no implicit coordinate conversion.

### Registry and resolution

`lib/uniforms/teams/index.ts` maps a `teamId` to its definition. The registry is used at the server
boundary; the generic renderer does not import all team definitions directly.

`lib/uniforms/model.ts` resolves a render model in this order:

1. generic uniform defaults;
2. team defaults;
3. the active kit-slug override.

Layers merge by stable `id`: an override layer with an existing ID replaces it, while a new ID is
appended. `removeLayerIds` selectively removes inherited layers, and omission inherits unchanged.
This supports alternates such as Bills Rivalries, whose shoulder and collar marks are intentionally
absent while its helmet treatment remains independently configurable. `number: null` restores the
generic number treatment.

The resolver receives `teamId` and kit slug separately where possible. If it must interpret a full
`kitId`, it removes the known `teamId` prefix rather than splitting on the first hyphen, preserving
IDs such as `49ers-*` and multiword slugs.

Unknown teams, unknown kit slugs, incomplete definitions, and absent optional layers degrade to the
generic uniform. Definition lookup and model resolution do not throw during rendering.

### Renderer

`components/UniformFigure.tsx` retains:

- shared mannequin geometry;
- SVG definitions and clip paths;
- variant/viewBox behavior;
- paint order;
- accessibility attributes;
- generic fallback rendering.

It consumes a resolved declarative model and renders supported layers generically. It contains no
team-name checks, no team-specific path constants, and no Bengals/Bills/Seahawks branches.

Server-side team-page callers pass only the selected team's definition. Client-side kit switching
uses the kit overrides in that one definition, preserving the one-team bundle boundary. The uniform
archive may receive all definitions because it already receives and renders all teams and kits.

## Migration

The work lands in three independently verifiable stages:

1. Introduce the typed definition contract, resolver, generic layer renderer, and tests while
   preserving the current generic fallback.
2. Move Bengals and Bills constants/configuration from `lib/uniforms/trim.ts` into their team
   modules without changing their rendered output.
3. Add `seahawks.ts`, implement the navy home construction geometry, and remove
   `lib/uniforms/trim.ts` after it has no consumers.

The Seahawks definition overrides only reference-supported differences from the generic uniform.
The navy body and correctly mapped runtime palette remain inherited. The helmet logo is not traced.
The supplied `/tmp` reference files are inputs for this work but remain ephemeral and are not added
to the repository unless separately requested.

## Testing and verification

Pure resolver tests cover:

- semantic token resolution against runtime `TeamColors`;
- generic → team → kit merge order;
- stable-ID layer replacement, `removeLayerIds`, and omission/inheritance;
- unknown-team and unknown-kit fallback;
- team IDs and kit slugs containing hyphens;
- number glyph fallback and authored number geometry.

Definition-integrity tests iterate every registered team and override and verify:

- valid semantic or six-digit literal colors;
- supported surfaces and layer kinds;
- unique layer IDs;
- required left/right pairs for paired geometry;
- valid kit override keys.

Renderer tests verify that generic and custom layers appear in the correct clipped surface groups
and that the renderer contains no team-specific dispatch behavior.

Visual verification captures Bengals and Bills before/after migration to prevent regressions. The
Seahawks navy home render is compared with `/tmp/SEA_F_home_ref.png`, checking the helmet stripe,
silver/lime shoulder construction, collar treatment, number treatment, and pants stripe while
confirming that trademarked logos remain absent.

Completion requires fresh successful runs of:

```text
npm test -- lib/__tests__/uniform-figure.test.ts
npm test
npm run typecheck
npm run format:check
```

It also requires a browser screenshot of the rendered `seahawks-home` full uniform.

## Non-goals

- Moving kit color ownership out of the database or `lib/uniforms/data.ts`.
- Implementing all 32 team definitions in this migration.
- Reproducing trademarked logos or wordmarks.
- Inventing construction geometry not supported by a supplied reference.
- Changing the shared mannequin silhouette or archive data model.
