// Integrates ONE generated partial jersey module into an existing team parts module.
//
// The converter (convert-uniform-json.mts --partial) emits a self-describing generated module:
// `GENERATED_PARTIAL` carries the target jersey, its patterns, and its palette. This command is
// the validation/placement half the review calls item 3. It does not rewrite team TypeScript and
// is not a general merge engine: the generated jersey/pattern module is imported by the existing
// team parts module, and this command validates that importing it replaces exactly one named
// jersey without repainting any kit that does not reference that jersey, its palette, or its
// patterns.
//
// Usage:
//   tsx scripts/uniform-draw/integrate-uniform-partial.mts \
//     <generated-module.ts> <team-parts-module.ts> \
//     [--dry-run] [--authorize-palette-conflicts] [--authorize-pattern-conflicts] [--out <path>]
//
// A dry run prints the affected kits and a readable diff and writes nothing. A real run writes
// the module to `lib/uniforms/teams/generated/<team>.<target>.partial.ts` (or --out), where the
// team parts module imports it.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  formatPartialUpdatePlan,
  planPartialUpdate,
  renderGeneratedPartialModule,
  type GeneratedPartial,
} from '@/lib/uniforms/teams/partial';
import type { TeamPartsDefinition } from '@/lib/uniforms/teams/parts';

const HERE = dirname(fileURLToPath(import.meta.url));
const GENERATED_DIR = join(HERE, '..', '..', 'lib', 'uniforms', 'teams', 'generated');

const USAGE =
  'usage: integrate-uniform-partial.mts <generated-module.ts> <team-parts-module.ts> ' +
  '[--dry-run] [--authorize-palette-conflicts] [--authorize-pattern-conflicts] [--out <path>]';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isGeneratedPartial(value: unknown): value is GeneratedPartial {
  return (
    isRecord(value) &&
    typeof value.teamId === 'string' &&
    isRecord(value.target) &&
    typeof value.target.id === 'string' &&
    isRecord(value.palette) &&
    isRecord(value.patterns) &&
    isRecord(value.jersey)
  );
}

function isTeamPartsDefinition(value: unknown): value is TeamPartsDefinition {
  return (
    isRecord(value) &&
    typeof value.teamId === 'string' &&
    isRecord(value.palette) &&
    isRecord(value.jerseys) &&
    isRecord(value.kits)
  );
}

// Rejects 0 or >1 matches: an ambiguous module must never silently pick a definition.
function only<T>(values: unknown[], guard: (value: unknown) => value is T, what: string): T {
  const matches = values.filter(guard);
  if (matches.length === 0) throw new Error(`no ${what} export found`);
  if (matches.length > 1) throw new Error(`ambiguous ${what}: ${matches.length} exports match`);
  return matches[0];
}

async function loadModule(path: string): Promise<unknown> {
  return import(pathToFileURL(resolve(path)).href);
}

interface Options {
  generatedPath: string;
  teamPath: string;
  dryRun: boolean;
  authorizePaletteConflicts: boolean;
  authorizePatternConflicts: boolean;
  out?: string;
}

function parseArgs(argv: string[]): Options {
  const positional: string[] = [];
  const options: Omit<Options, 'generatedPath' | 'teamPath'> = {
    dryRun: false,
    authorizePaletteConflicts: false,
    authorizePatternConflicts: false,
  };
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--authorize-palette-conflicts') options.authorizePaletteConflicts = true;
    else if (arg === '--authorize-pattern-conflicts') options.authorizePatternConflicts = true;
    else if (arg === '--out') {
      options.out = argv[++index];
      if (!options.out) throw new Error(`--out requires a path\n${USAGE}`);
    } else if (arg.startsWith('--')) throw new Error(`unknown option "${arg}"\n${USAGE}`);
    else positional.push(arg);
  }
  const [generatedPath, teamPath] = positional;
  if (!generatedPath || !teamPath || positional.length > 2) throw new Error(USAGE);
  return { ...options, generatedPath, teamPath };
}

export async function main(argv: string[]): Promise<number> {
  const options = parseArgs(argv);
  const generated = only(
    Object.values((await loadModule(options.generatedPath)) as Record<string, unknown>),
    isGeneratedPartial,
    'generated partial'
  );
  const team = only(
    Object.values((await loadModule(options.teamPath)) as Record<string, unknown>),
    isTeamPartsDefinition,
    'team parts definition'
  );

  const plan = planPartialUpdate(team, generated, {
    paletteConflicts: options.authorizePaletteConflicts,
    patternConflicts: options.authorizePatternConflicts,
  });
  console.log(formatPartialUpdatePlan(plan));

  if (plan.issues.length > 0 || plan.conflicts.length > 0) return 1;

  if (options.dryRun) {
    console.log('\ndry run: no files written');
    return 0;
  }

  const out =
    options.out ?? join(GENERATED_DIR, `${generated.teamId}.${generated.target.id}.partial.ts`);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(resolve(out), renderGeneratedPartialModule(generated));
  console.log(
    `\nwrote ${resolve(out)} (${plan.affectedKits.length} kit(s) affected, ` +
      `${plan.unchangedKits.length} unchanged)`
  );
  return 0;
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  main(process.argv.slice(2))
    .then((code) => {
      process.exitCode = code;
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    });
}
