// Strict production validation for authored uniform art.
//
// The authoring path has two untrusted boundaries: the model-authored JSON the converter
// consumes (convert-uniform-json.mts), and the curated catalog the raster generator publishes
// from (gen-uniform-thumbs.mts). Both must fail loudly rather than emit plausible-but-wrong
// art: a package manager default (like an unresolved palette key that silently resolves to
// `primary`) is fine for an app and unsafe for publishing historical football uniforms.
//
// This module is pure so the converter and the catalog guard can share it and so the rules
// are unit-testable without running the outliner or sharp. See the design spec's "Strict
// production validation" section.
import type { UniformSurface } from './types';

export interface ValidationIssue {
  // Dotted path into the offending value (`jerseys.home.layers.2.d`), for a readable diff.
  path: string;
  message: string;
}

// Every surface the renderer understands. A layer naming an unknown surface renders nowhere.
const SURFACES: ReadonlySet<string> = new Set<UniformSurface>([
  'helmet',
  'jersey',
  'sleeve-left',
  'sleeve-right',
  'collar',
  'number',
  'pants',
  'leg-left',
  'leg-right',
]);

// A jersey-only partial update may paint the jersey and its semantic sub-surfaces (sleeves,
// collar, number). Helmet/pants/leg surfaces belong to other parts and must not be smuggled
// in through a jersey replacement — the `UniformPart` type permits every surface, so this is
// enforced here rather than by the type.
const JERSEY_SURFACES: ReadonlySet<string> = new Set<UniformSurface>([
  'jersey',
  'sleeve-left',
  'sleeve-right',
  'collar',
  'number',
]);

// Fields the authoring contract currently defines. An unexpected top-level key is a model
// straying from the schema, not a forward-compatible extension, so it is rejected.
const SUPPORTED_TOP_LEVEL: ReadonlySet<string> = new Set([
  'schemaVersion',
  'teamId',
  'target',
  'palette',
  'jersey',
  'jerseys',
  'patterns',
  'wordmarks',
  'helmets',
  'pants',
  'kits',
  'notes',
  'provenance',
]);

const HEX_COLOR = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
// Path data is validated as a token stream rather than a full SVG parser: every alphabetic
// token must be a known command letter and every numeric token must be finite, and the path
// must open with a moveto. Enough to reject model noise without re-implementing a path grammar.
const PATH_TOKEN = /[a-zA-Z]|-?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g;
const PATH_COMMAND = /^[MmLlHhVvCcSsQqTtAaZz]$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isPositiveNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

export function isValidHexColor(value: unknown): boolean {
  return typeof value === 'string' && HEX_COLOR.test(value);
}

export function isValidPathData(value: unknown): boolean {
  if (typeof value !== 'string' || value.trim().length === 0) return false;
  const tokens = value.match(PATH_TOKEN);
  if (!tokens || tokens.length === 0) return false;
  let sawMove = false;
  for (const token of tokens) {
    if (/^[a-zA-Z]$/.test(token)) {
      if (!PATH_COMMAND.test(token)) return false;
      if (/^[Mm]$/.test(token)) sawMove = true;
    } else if (!Number.isFinite(Number(token))) {
      return false;
    }
  }
  return sawMove;
}

// `fill`/`stroke` may be a palette key, a pattern reference, or the one runtime-resolved
// pseudo-color. Anything else would fall through to a default at render time.
function isResolvablePaint(
  ref: unknown,
  paletteKeys: ReadonlySet<string>,
  patternKeys: ReadonlySet<string>
): boolean {
  if (typeof ref !== 'string' || ref.length === 0) return false;
  if (ref === 'readable-on-body') return true;
  if (ref.startsWith('pattern:')) return patternKeys.has(ref.slice('pattern:'.length));
  return paletteKeys.has(ref);
}

function validatePaint(
  issues: ValidationIssue[],
  path: string,
  ref: unknown,
  paletteKeys: ReadonlySet<string>,
  patternKeys: ReadonlySet<string>
): void {
  if (!isResolvablePaint(ref, paletteKeys, patternKeys)) {
    issues.push({ path, message: `"${String(ref)}" is not a palette key, pattern ref, or hex` });
  }
}

function validatePath(issues: ValidationIssue[], path: string, d: unknown): void {
  if (!isValidPathData(d)) {
    issues.push({ path, message: 'path data is empty, non-finite, or not valid SVG path data' });
  }
}

function validateLayer(
  issues: ValidationIssue[],
  path: string,
  layer: unknown,
  paletteKeys: ReadonlySet<string>,
  patternKeys: ReadonlySet<string>,
  allowedSurfaces: ReadonlySet<string>
): string | undefined {
  if (!isRecord(layer)) {
    issues.push({ path, message: 'layer must be an object' });
    return undefined;
  }
  const id = layer.id;
  if (isNonEmptyString(id) && id.trim().length > 0) {
    // no-op; the id is used by the caller for the composed-uniqueness check
  } else {
    issues.push({ path: `${path}.id`, message: 'layer id is required' });
  }

  if (!isNonEmptyString(layer.surface) || !SURFACES.has(layer.surface)) {
    issues.push({
      path: `${path}.surface`,
      message: `"${String(layer.surface)}" is not a uniform surface`,
    });
  } else if (!allowedSurfaces.has(layer.surface)) {
    issues.push({
      path: `${path}.surface`,
      message: `surface "${layer.surface}" is not allowed here (expected one of ${[...allowedSurfaces].join(', ')})`,
    });
  }

  if (typeof layer.clip !== 'boolean') {
    issues.push({ path: `${path}.clip`, message: 'clip must be a boolean' });
  }

  if (layer.kind === 'fill') {
    validatePaint(issues, `${path}.fill`, layer.fill, paletteKeys, patternKeys);
    if (
      layer.fillRule !== undefined &&
      layer.fillRule !== 'nonzero' &&
      layer.fillRule !== 'evenodd'
    ) {
      issues.push({
        path: `${path}.fillRule`,
        message: `"${String(layer.fillRule)}" is not a fill rule`,
      });
    }
  } else if (layer.kind === 'stroke') {
    validatePaint(issues, `${path}.stroke`, layer.stroke, paletteKeys, patternKeys);
    if (!isPositiveNumber(layer.strokeWidth)) {
      issues.push({
        path: `${path}.strokeWidth`,
        message: 'strokeWidth must be a positive number',
      });
    }
  } else {
    issues.push({ path: `${path}.kind`, message: `"${String(layer.kind)}" is not a layer kind` });
  }

  validatePath(issues, `${path}.d`, layer.d);
  return isNonEmptyString(id) ? id : undefined;
}

function validateLayers(
  issues: ValidationIssue[],
  path: string,
  layers: unknown,
  paletteKeys: ReadonlySet<string>,
  patternKeys: ReadonlySet<string>,
  allowedSurfaces: ReadonlySet<string>
): void {
  if (!Array.isArray(layers)) {
    issues.push({ path, message: 'layers must be an array' });
    return;
  }
  const seen = new Set<string>();
  layers.forEach((layer, index) => {
    const id = validateLayer(
      issues,
      `${path}.${index}`,
      layer,
      paletteKeys,
      patternKeys,
      allowedSurfaces
    );
    if (id) {
      if (seen.has(id))
        issues.push({ path: `${path}.${index}.id`, message: `duplicate layer id "${id}"` });
      seen.add(id);
    }
  });
}

function validateNumber(
  issues: ValidationIssue[],
  path: string,
  number: unknown,
  paletteKeys: ReadonlySet<string>,
  patternKeys: ReadonlySet<string>
): void {
  if (!isRecord(number)) {
    issues.push({ path, message: 'number must be an object' });
    return;
  }
  validatePaint(issues, `${path}.fill`, number.fill, paletteKeys, patternKeys);
  validatePaint(issues, `${path}.outline`, number.outline, paletteKeys, patternKeys);
  if (!isPositiveNumber(number.outlineWidth)) {
    issues.push({
      path: `${path}.outlineWidth`,
      message: 'outlineWidth must be a positive number',
    });
  }
  if (number.glyphPath !== undefined) validatePath(issues, `${path}.glyphPath`, number.glyphPath);
}

function validateJersey(
  issues: ValidationIssue[],
  path: string,
  jersey: unknown,
  paletteKeys: ReadonlySet<string>,
  patternKeys: ReadonlySet<string>,
  allowedSurfaces: ReadonlySet<string>
): void {
  if (!isRecord(jersey)) {
    issues.push({ path, message: 'jersey must be an object' });
    return;
  }
  if (!isResolvablePaint(jersey.base, paletteKeys, patternKeys)) {
    issues.push({
      path: `${path}.base`,
      message: `"${String(jersey.base)}" is not a palette color`,
    });
  }
  validateLayers(
    issues,
    `${path}.layers`,
    jersey.layers,
    paletteKeys,
    patternKeys,
    allowedSurfaces
  );
  if (jersey.number !== undefined) {
    validateNumber(issues, `${path}.number`, jersey.number, paletteKeys, patternKeys);
  }
}

function validatePattern(
  issues: ValidationIssue[],
  path: string,
  pattern: unknown,
  paletteKeys: ReadonlySet<string>
): void {
  if (!isRecord(pattern)) {
    issues.push({ path, message: 'pattern must be an object' });
    return;
  }
  if (!isPositiveNumber(pattern.width)) {
    issues.push({ path: `${path}.width`, message: 'pattern width must be a positive number' });
  }
  if (!isPositiveNumber(pattern.height)) {
    issues.push({ path: `${path}.height`, message: 'pattern height must be a positive number' });
  }
  if (isRecord(pattern.gradient)) {
    const stops = pattern.gradient.stops;
    if (!Array.isArray(stops) || stops.length < 2) {
      issues.push({
        path: `${path}.gradient.stops`,
        message: 'a gradient needs at least two stops',
      });
    } else {
      stops.forEach((stop, index) => {
        const offset = isRecord(stop) ? stop.offset : undefined;
        if (typeof offset !== 'number' || !Number.isFinite(offset) || offset < 0 || offset > 1) {
          issues.push({
            path: `${path}.gradient.stops.${index}.offset`,
            message: 'offset must be within [0, 1]',
          });
        }
        if (
          isRecord(stop) &&
          !isValidHexColor(stop.color) &&
          !paletteKeys.has(String(stop.color))
        ) {
          issues.push({
            path: `${path}.gradient.stops.${index}.color`,
            message: `"${String(stop.color)}" is not a palette key or hex`,
          });
        }
      });
    }
  }
  if (!Array.isArray(pattern.shapes) || pattern.shapes.length === 0) {
    issues.push({ path: `${path}.shapes`, message: 'a pattern needs at least one shape' });
  } else {
    pattern.shapes.forEach((shape, index) => {
      if (!isRecord(shape)) {
        issues.push({ path: `${path}.shapes.${index}`, message: 'shape must be an object' });
        return;
      }
      validatePath(issues, `${path}.shapes.${index}.d`, shape.d);
      if (
        shape.fill !== undefined &&
        !isValidHexColor(shape.fill) &&
        !paletteKeys.has(String(shape.fill))
      ) {
        issues.push({
          path: `${path}.shapes.${index}.fill`,
          message: `"${String(shape.fill)}" is not a palette key or hex`,
        });
      }
    });
  }
}

// Normalizes the two accepted jersey spellings (a single `jersey`, or a `jerseys` map) into
// one map. The converter and the validator both need this, so it lives here once.
export function authoredJerseys(input: Record<string, unknown>): Record<string, unknown> {
  if (isRecord(input.jerseys)) return input.jerseys;
  if (isRecord(input.jersey)) {
    const target =
      isRecord(input.target) && isNonEmptyString(input.target.id) ? input.target.id : 'authored';
    return { [target]: input.jersey };
  }
  return {};
}

// Resolves the one jersey a partial update names. A partial must carry an explicit `target.id`
// that matches exactly one authored jersey (from either the `jersey` or `jerseys` spelling);
// selecting the first jersey in the input silently updated the wrong part, so that is rejected
// here rather than in the converter. Returns the resolved id plus any problem, never throws.
export function resolveAuthoredJersey(input: Record<string, unknown>): {
  id?: string;
  jersey?: unknown;
  issues: ValidationIssue[];
} {
  const issues: ValidationIssue[] = [];
  if (isRecord(input.jersey) && isRecord(input.jerseys)) {
    issues.push({
      path: 'jerseys',
      message: 'provide either "jersey" or "jerseys", not both (ambiguous partial input)',
    });
  }

  const jerseys = authoredJerseys(input);
  const target = isRecord(input.target) ? input.target : undefined;
  const targetId = target && isNonEmptyString(target.id) ? target.id.trim() : undefined;
  if (target && isNonEmptyString(target.kind) && target.kind !== 'jersey') {
    issues.push({
      path: 'target.kind',
      message: `"${String(target.kind)}" is not a supported partial target (expected "jersey")`,
    });
  }
  if (!targetId) {
    issues.push({ path: 'target.id', message: 'a partial update requires an explicit target.id' });
  } else if (!Object.prototype.hasOwnProperty.call(jerseys, targetId)) {
    issues.push({
      path: 'target.id',
      message: `target.id "${targetId}" does not resolve to an authored jersey`,
    });
  }

  if (issues.length > 0) return { issues };
  return { id: targetId, jersey: jerseys[targetId as string], issues };
}

// Validates the model-authored JSON before the converter outlines or emits anything. Returns
// every problem rather than the first, so a model can be corrected in one round.
export function validateAuthoredDefinition(input: unknown): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!isRecord(input)) return [{ path: '$', message: 'authored definition must be an object' }];

  for (const key of Object.keys(input)) {
    if (!SUPPORTED_TOP_LEVEL.has(key)) {
      issues.push({ path: key, message: `unsupported top-level field "${key}"` });
    }
  }

  if (input.schemaVersion !== undefined && input.schemaVersion !== 1) {
    issues.push({ path: 'schemaVersion', message: 'unsupported schemaVersion (expected 1)' });
  }
  if (!isNonEmptyString(input.teamId)) {
    issues.push({ path: 'teamId', message: 'teamId is required' });
  }

  const paletteKeys = new Set<string>();
  if (!isRecord(input.palette)) {
    issues.push({ path: 'palette', message: 'palette is required' });
  } else {
    for (const [key, value] of Object.entries(input.palette)) {
      if (!isValidHexColor(value)) {
        issues.push({ path: `palette.${key}`, message: `"${String(value)}" is not a hex color` });
      } else {
        paletteKeys.add(key);
      }
    }
  }

  const patternKeys = new Set<string>();
  if (input.patterns !== undefined) {
    if (!isRecord(input.patterns)) {
      issues.push({ path: 'patterns', message: 'patterns must be an object' });
    } else {
      for (const [id, pattern] of Object.entries(input.patterns)) {
        patternKeys.add(id);
        validatePattern(issues, `patterns.${id}`, pattern, paletteKeys);
      }
    }
  }

  if (input.target !== undefined) {
    if (!isRecord(input.target)) {
      issues.push({ path: 'target', message: 'target must be an object' });
    } else {
      if (!isNonEmptyString(input.target.kind))
        issues.push({ path: 'target.kind', message: 'target.kind is required' });
      if (!isNonEmptyString(input.target.id))
        issues.push({ path: 'target.id', message: 'target.id is required' });
    }
  }

  // A full team definition may carry helmet/pants parts; every layer still has to name a real
  // surface and resolve its paint, so the same layer rules apply.
  if (input.helmets !== undefined && isRecord(input.helmets)) {
    for (const [id, part] of Object.entries(input.helmets)) {
      if (isRecord(part)) {
        validateLayers(
          issues,
          `helmets.${id}.layers`,
          part.layers ?? [],
          paletteKeys,
          patternKeys,
          new Set(['helmet'])
        );
      }
    }
  }
  if (input.pants !== undefined && isRecord(input.pants)) {
    for (const [id, part] of Object.entries(input.pants)) {
      if (isRecord(part)) {
        validateLayers(
          issues,
          `pants.${id}.layers`,
          part.layers ?? [],
          paletteKeys,
          patternKeys,
          new Set(['pants', 'leg-left', 'leg-right'])
        );
      }
    }
  }

  const jerseys = authoredJerseys(input);
  if (Object.keys(jerseys).length === 0) {
    issues.push({ path: 'jerseys', message: 'at least one jersey is required' });
  }
  for (const [id, jersey] of Object.entries(jerseys)) {
    validateJersey(issues, `jerseys.${id}`, jersey, paletteKeys, patternKeys, JERSEY_SURFACES);
  }

  return issues;
}

// The surface restriction for a jersey-only partial update, called with the resolved target.
export function jerseySurfaceIssues(path: string, jersey: unknown): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!isRecord(jersey) || !Array.isArray(jersey.layers)) return issues;
  jersey.layers.forEach((layer, index) => {
    if (
      isRecord(layer) &&
      isNonEmptyString(layer.surface) &&
      SURFACES.has(layer.surface) &&
      !JERSEY_SURFACES.has(layer.surface)
    ) {
      issues.push({
        path: `${path}.layers.${index}.surface`,
        message: `partial jersey update may not paint surface "${layer.surface}"`,
      });
    }
  });
  return issues;
}

// A curated row whose construction key is not a registered kit renders as the generic fallback,
// which is acceptable at runtime and never acceptable for a published raster. The generator
// calls this before writing anything.
export function findUnresolvedConstructions(
  rows: ReadonlyArray<{ id: string; teamId: string; constructionKey: string }>,
  kitsForTeam: (teamId: string) => Record<string, unknown> | undefined
): Array<{ id: string; teamId: string; constructionKey: string }> {
  return rows.filter((row) => {
    const kits = kitsForTeam(row.teamId);
    return !kits || !Object.prototype.hasOwnProperty.call(kits, row.constructionKey);
  });
}

export function formatValidationIssues(issues: ReadonlyArray<ValidationIssue>): string {
  return issues.map((issue) => `  - ${issue.path}: ${issue.message}`).join('\n');
}
