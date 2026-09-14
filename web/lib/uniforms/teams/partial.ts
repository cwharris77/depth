// Narrow partial-update integration for authored uniform art.
//
// The converter (convert-uniform-json.mts --partial) emits ONE self-describing generated module:
// a target jersey, the patterns it references, and the palette entries it relies on. That module
// is the boundary the architecture review recommends -- a generated jersey/pattern module
// imported by the existing team parts module. This file is NOT a general TypeScript merge engine:
// it replaces exactly one named jersey key and unions palette/pattern entries, nothing else.
//
// The reason the impact report compiles both sides instead of diffing the jersey object: a
// changed shared palette key or pattern repaints a helmet or pant the partial never mentions.
// Preserving those objects is not enough. Affected kits are therefore computed from the compiled
// result, and a kit is affected when its compiled override changes OR when it references a
// pattern whose definition changed (pattern fills stay symbolic in the kit override).
import { compileParts, type TeamPartsDefinition, type UniformPart } from './parts';
import { formatValidationIssues, jerseySurfaceIssues, type ValidationIssue } from './validate';
import type { PatternDef, TeamUniformDefinition, UniformStyleOverride } from './types';

export interface GeneratedPartial {
  teamId: string;
  target: { kind: string; id: string };
  palette: Record<string, string>;
  patterns: Record<string, PatternDef>;
  jersey: UniformPart;
}

export interface PartialConflict {
  kind: 'palette' | 'pattern';
  key: string;
  existing: string;
  incoming: string;
}

// Palette and pattern conflicts are authorized separately: a pattern override is a different
// review than a body-color override, and the review asks for explicit authorization per kind.
export interface PartialUpdateAuthorization {
  paletteConflicts?: boolean;
  patternConflicts?: boolean;
}

export interface PartialUpdatePlan {
  generated: GeneratedPartial;
  issues: ValidationIssue[];
  conflicts: PartialConflict[];
  // Kits whose compiled output changed, plus kits referencing a changed pattern.
  affectedKits: string[];
  unchangedKits: string[];
  // Compiled team definitions, present only when the plan is executable.
  before?: TeamUniformDefinition;
  after?: TeamUniformDefinition;
  // Field-level diff of every affected kit, for the dry run.
  diff: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// Every `pattern:<id>` reference a compiled kit override carries. A kit can reference patterns
// from layers, the number, or its body/base color.
function patternRefs(override: UniformStyleOverride): Set<string> {
  const refs = new Set<string>();
  const visit = (value: unknown) => {
    if (typeof value === 'string') {
      if (value.startsWith('pattern:')) refs.add(value.slice('pattern:'.length));
      return;
    }
    if (Array.isArray(value)) {
      for (const item of value) visit(item);
      return;
    }
    if (isRecord(value)) {
      for (const item of Object.values(value)) visit(item);
    }
  };
  visit(override);
  return refs;
}

// A layer array's entries all carry a stable id, so a layer diff names added, removed, and
// changed layer ids instead of dumping every path. Returns undefined when an element has no id.
function idMap(value: unknown[]): Map<string, unknown> | undefined {
  const map = new Map<string, unknown>();
  for (const item of value) {
    if (!isRecord(item) || typeof item.id !== 'string') return undefined;
    map.set(item.id, item);
  }
  return map;
}

// A readable, field-level structural diff: `path: before -> after`, recursing into objects.
// Layer arrays collapse to named id sets; other arrays fall back to a single JSON pair. The plan
// only ever runs on compiled overrides, which are small and flat, so this stays legible without a
// general diff library.
function describeDiff(path: string, before: unknown, after: unknown): string[] {
  if (JSON.stringify(before) === JSON.stringify(after)) return [];
  if (isRecord(before) && isRecord(after)) {
    const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
    return [...keys].flatMap((key) => describeDiff(`${path}.${key}`, before[key], after[key]));
  }
  if (Array.isArray(before) && Array.isArray(after)) {
    const beforeById = idMap(before);
    const afterById = idMap(after);
    if (beforeById && afterById) {
      const added = [...afterById.keys()].filter((id) => !beforeById.has(id));
      const removed = [...beforeById.keys()].filter((id) => !afterById.has(id));
      const changed = [...afterById.keys()].filter(
        (id) =>
          beforeById.has(id) &&
          JSON.stringify(beforeById.get(id)) !== JSON.stringify(afterById.get(id))
      );
      if (added.length === 0 && removed.length === 0 && changed.length === 0) return [];
      const parts: string[] = [];
      if (added.length > 0) parts.push(`added [${added.join(', ')}]`);
      if (removed.length > 0) parts.push(`removed [${removed.join(', ')}]`);
      if (changed.length > 0) parts.push(`changed [${changed.join(', ')}]`);
      return [`${path}: ${parts.join('; ')}`];
    }
  }
  return [`${path}: ${JSON.stringify(before)} -> ${JSON.stringify(after)}`];
}

// Which compiled pattern definitions actually changed (added, removed, or edited).
function changedPatternKeys(
  before: Record<string, PatternDef> | undefined,
  after: Record<string, PatternDef> | undefined
): Set<string> {
  const keys = new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]);
  const changed = new Set<string>();
  for (const key of keys) {
    if (JSON.stringify(before?.[key]) !== JSON.stringify(after?.[key])) changed.add(key);
  }
  return changed;
}

// Replaces exactly one explicitly named jersey in `existing`, unions the generated palette and
// pattern entries, and reports the impact. Conflicting palette/pattern definitions are rejected
// unless the matching authorization flag is set; unresolved targets and illegal surfaces are
// always rejected. Reuses validate.ts rather than restating its rules.
export function planPartialUpdate(
  existing: TeamPartsDefinition,
  generated: GeneratedPartial,
  authorization: PartialUpdateAuthorization = {}
): PartialUpdatePlan {
  const issues: ValidationIssue[] = [];
  const conflicts: PartialConflict[] = [];
  const noPlan = (): PartialUpdatePlan => ({
    generated,
    issues,
    conflicts,
    affectedKits: [],
    unchangedKits: Object.keys(existing.kits),
    diff: '',
  });

  if (generated.teamId !== existing.teamId) {
    issues.push({
      path: 'teamId',
      message: `generated teamId "${generated.teamId}" does not match team "${existing.teamId}"`,
    });
  }

  const targetId = generated.target?.id;
  if (typeof targetId !== 'string' || targetId.length === 0) {
    issues.push({ path: 'target.id', message: 'target.id is required' });
  } else if (!Object.prototype.hasOwnProperty.call(existing.jerseys, targetId)) {
    issues.push({
      path: 'target.id',
      message: `target.id "${targetId}" does not resolve to a jersey in team "${existing.teamId}"`,
    });
  } else {
    // A jersey replacement must not paint helmet, pant, or leg surfaces, even though UniformPart
    // permits every surface -- enforced by validation, not by naming convention.
    issues.push(...jerseySurfaceIssues(`jerseys.${targetId}`, generated.jersey));
  }

  for (const [key, value] of Object.entries(generated.palette ?? {})) {
    const current = existing.palette[key];
    if (current !== undefined && current !== value && !authorization.paletteConflicts) {
      conflicts.push({ kind: 'palette', key, existing: current, incoming: value });
    }
  }
  for (const [key, value] of Object.entries(generated.patterns ?? {})) {
    const current = existing.patterns?.[key];
    if (
      current !== undefined &&
      JSON.stringify(current) !== JSON.stringify(value) &&
      !authorization.patternConflicts
    ) {
      conflicts.push({
        kind: 'pattern',
        key,
        existing: JSON.stringify(current),
        incoming: JSON.stringify(value),
      });
    }
  }

  if (issues.length > 0 || conflicts.length > 0) return noPlan();

  const after: TeamPartsDefinition = {
    ...existing,
    palette: { ...existing.palette, ...(generated.palette ?? {}) },
    patterns: { ...(existing.patterns ?? {}), ...(generated.patterns ?? {}) },
    jerseys: { ...existing.jerseys, [targetId as string]: generated.jersey },
  };

  let beforeCompiled: TeamUniformDefinition;
  let afterCompiled: TeamUniformDefinition;
  try {
    beforeCompiled = compileParts(existing);
    afterCompiled = compileParts(after);
  } catch (error) {
    issues.push({ path: '$', message: error instanceof Error ? error.message : String(error) });
    return noPlan();
  }

  const changedPatterns = changedPatternKeys(beforeCompiled.patterns, afterCompiled.patterns);

  const affectedKits: string[] = [];
  const unchangedKits: string[] = [];
  const sections: string[] = [];
  for (const kit of Object.keys(afterCompiled.kits)) {
    const overrideChanged =
      JSON.stringify(beforeCompiled.kits[kit]) !== JSON.stringify(afterCompiled.kits[kit]);
    const refs = patternRefs(afterCompiled.kits[kit]);
    // A pattern definition change is real even when the kit override is byte-identical, because
    // the renderer resolves `pattern:<id>` against the team-level pattern at draw time.
    const touchedPatterns = [...refs].filter((key) => changedPatterns.has(key));
    if (!overrideChanged && touchedPatterns.length === 0) {
      unchangedKits.push(kit);
      continue;
    }

    affectedKits.push(kit);
    const lines = describeDiff(`kits.${kit}`, beforeCompiled.kits[kit], afterCompiled.kits[kit]);
    if (touchedPatterns.length > 0) {
      lines.push(`patterns.changed: ${touchedPatterns.join(', ')}`);
    }
    sections.push(`${kit}\n${lines.map((line) => `    ${line}`).join('\n')}`);
  }

  return {
    generated,
    issues,
    conflicts,
    affectedKits,
    unchangedKits,
    before: beforeCompiled,
    after: afterCompiled,
    diff: sections.join('\n'),
  };
}

function js(value: unknown): string {
  return JSON.stringify(value, null, 2).replace(/"([^"\\]+)":/g, '$1:');
}

// Emits the generated module the existing team parts module imports. Relative imports assume the
// file lives under `teams/generated/`; callers writing elsewhere pass their own prefix.
export function renderGeneratedPartialModule(
  generated: GeneratedPartial,
  typeImportPrefix = '..'
): string {
  return `// Generated by convert-uniform-json.mts --partial. Do not hand-edit outlined paths.
// Imported by the team's parts module; regenerate with the partial-update command.
import type { GeneratedPartial } from '${typeImportPrefix}/partial';

export const GENERATED_PARTIAL: GeneratedPartial = ${js(generated)};
`;
}

export function formatPartialUpdatePlan(plan: PartialUpdatePlan): string {
  const lines: string[] = [];
  lines.push(
    `Partial update: ${plan.generated.teamId} / ${plan.generated.target?.id ?? '(no target)'}`
  );

  if (plan.issues.length > 0) {
    lines.push('Rejected issues:');
    lines.push(formatValidationIssues(plan.issues));
  }
  if (plan.conflicts.length > 0) {
    lines.push(`Conflicting definitions (${plan.conflicts.length}):`);
    for (const conflict of plan.conflicts) {
      lines.push(
        `  - ${conflict.kind} "${conflict.key}": ${conflict.existing} -> ${conflict.incoming}`
      );
    }
    lines.push(
      'Re-run with --authorize-palette-conflicts and/or --authorize-pattern-conflicts to override.'
    );
  }
  if (plan.issues.length > 0 || plan.conflicts.length > 0) return lines.join('\n');

  lines.push(
    `Affected kits (${plan.affectedKits.length}): ${plan.affectedKits.join(', ') || 'none'}`
  );
  lines.push(`Unchanged kits (${plan.unchangedKits.length}): ${plan.unchangedKits.join(', ')}`);
  if (plan.diff) {
    lines.push('Diff:');
    lines.push(plan.diff);
  }
  return lines.join('\n');
}
