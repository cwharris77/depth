// A strict team's construction: every part is a complete spec, so the team holds no coordinates
// of its own outside its mark files. expandTeamSpec() produces the part groups the team
// registers; findCoordinateLiterals() is the static check that nothing else draws.
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import {
  jerseySpecOf,
  pantsSpecOf,
  socksSpecOf,
  type CompleteHelmetSpec,
  type CompleteJerseySpec,
  type CompletePantsSpec,
  type CompleteSocksSpec,
} from './complete';
import { expandHelmet } from './helmet-spec';
import { expandJersey } from './jersey-spec';
import { expandPants, expandSocks } from './pants-spec';
import type { PaletteRef, TeamPartsDefinition, UniformPart } from './parts';
import { OUTLINE_PAINT } from './shared';

export interface TeamSpec {
  helmets: Record<string, CompleteHelmetSpec>;
  jerseys: Record<string, CompleteJerseySpec>;
  pants: Record<string, CompletePantsSpec>;
  socks: Record<string, CompleteSocksSpec>;
}

type SpecParts = Pick<TeamPartsDefinition, 'helmets' | 'jerseys' | 'pants' | 'socks'>;

function expandAll<S>(
  teamId: string,
  surface: string,
  specs: Record<string, S>,
  expand: (prefix: string, spec: S) => UniformPart
): Record<string, UniformPart> {
  return Object.fromEntries(
    Object.entries(specs).map(([key, spec]) => [key, expand(`${teamId}-${surface}-${key}`, spec)])
  );
}

export function expandTeamSpec(teamId: string, spec: TeamSpec): SpecParts {
  return {
    helmets: expandAll(teamId, 'helmet', spec.helmets, expandHelmet),
    jerseys: expandAll(teamId, 'jersey', spec.jerseys, (p, s) => expandJersey(p, jerseySpecOf(s))),
    pants: expandAll(teamId, 'pants', spec.pants, (p, s) => expandPants(p, pantsSpecOf(s))),
    socks: expandAll(teamId, 'socks', spec.socks, (p, s) => expandSocks(p, socksSpecOf(s))),
  };
}

// Whether compileParts (parts.ts's hex()) would resolve this ref: a palette key, the two
// team-independent paints, or a pattern reference (patterns aren't validated here -- hex() passes
// them through unchecked too).
function resolves(ref: PaletteRef, palette: Record<string, string>): boolean {
  if (ref === 'readable-on-body' || ref === OUTLINE_PAINT) return true;
  if (ref.startsWith('pattern:')) return true;
  return palette[ref] !== undefined;
}

// Every palette-key colour ref across a team's parts that compileParts would fail to resolve
// against `palette`, as `<group>.<key>: "<ref>"`. Catches a typo'd key at authoring time instead
// of at raster-generation time.
export function findUnresolvedColors(
  parts: Pick<TeamPartsDefinition, 'helmets' | 'jerseys' | 'pants' | 'socks'>,
  palette: Record<string, string>
): string[] {
  const out: string[] = [];
  const groups: ReadonlyArray<[string, Record<string, UniformPart> | undefined]> = [
    ['helmets', parts.helmets],
    ['jerseys', parts.jerseys],
    ['pants', parts.pants],
    ['socks', parts.socks],
  ];
  for (const [group, byKey] of groups) {
    if (!byKey) continue;
    for (const [key, part] of Object.entries(byKey)) {
      const check = (ref: PaletteRef | undefined) => {
        if (ref !== undefined && !resolves(ref, palette)) out.push(`${group}.${key}: "${ref}"`);
      };
      check(part.base);
      check(part.facemask);
      if (part.number) {
        check(part.number.fill);
        check(part.number.outline);
      }
      for (const layer of part.layers) check(layer.kind === 'fill' ? layer.fill : layer.stroke);
    }
  }
  return out;
}

// An SVG path string literal: a quote, a moveto with a number or an interpolated value, then a
// later draw command with its own number or interpolation, or a closing Z. Requiring the second
// command keeps prose such as 'M1 Garand' out while still catching paths built from variables.
const COORD = String.raw`(?:-?\d|\$\{)`;
const PATH_LITERAL = new RegExp(
  String.raw`['"\x60]\s*[Mm]\s*${COORD}[^'"\x60]*?(?:[LlCcQqAaHhVvSsTt]\s*${COORD}|[Zz]\s*['"\x60])`
);

function walk(dir: string, out: string[]): void {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.isFile()) out.push(full);
  }
}

// `file:line` for every path literal in a team directory's non-test sources outside marks/.
export function findCoordinateLiterals(teamDir: string): string[] {
  const files: string[] = [];
  walk(teamDir, files);
  return files
    .map((file) => relative(teamDir, file).split(sep).join('/'))
    .filter((rel) => rel.endsWith('.ts') && !rel.endsWith('.test.ts'))
    .filter((rel) => !rel.startsWith('marks/') && !rel.startsWith('__tests__/'))
    .sort()
    .flatMap((rel) =>
      readFileSync(join(teamDir, ...rel.split('/')), 'utf8')
        .split('\n')
        .flatMap((line, i) => (PATH_LITERAL.test(line) ? [`${rel}:${i + 1}`] : []))
    );
}
