// Runtime probing and the production gate for the uniform art toolchain.
//
// `lib/uniforms/toolchain.ts` owns the pure comparison; this module reaches into the real
// environment (font files, the WORDMARK_PY venv, Node, sharp) and throws before the
// converter or generator can emit anything from an unpinned toolchain. The converter uses
// the font/outline half (`assertOutlineToolchain`); the generator uses the raster half
// (`assertRasterToolchain`), since it never touches a font.
//
// Override: `UNIFORM_TOOLCHAIN_OVERRIDE=1` skips the check and prints a warning. It exists
// for local experimentation (`WORDMARK_PY` pointed at a scratch venv, a font substituted to
// preview a look) and is never valid for artifacts that will be committed -- an overridden
// run cannot be reproduced from the lock, so the resulting WebPs or emitted parts are
// unreviewable. Do not set it in CI or in any script that writes into the repo.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import {
  TOOLCHAIN_LOCK,
  formatToolchainMismatches,
  verifyToolchain,
  type ToolchainProbe,
  type ToolchainScope,
} from '@/lib/uniforms/toolchain';

// The outliner venv, overridable for experimentation (the converter's original contract).
export const WORDMARK_PY = process.env.WORDMARK_PY ?? '/tmp/fontvenv/bin/python';

const ALL_FONT_ROLES = Object.keys(TOOLCHAIN_LOCK.fonts);
// The converter needs Node to run and Python+fontTools to outline.
export const OUTLINE_TOOLCHAIN_SCOPE: ToolchainScope = {
  fonts: ALL_FONT_ROLES,
  tools: ['node', 'python', 'fontTools'],
};
// The generator needs Node to run and sharp to rasterize; fonts are already baked into
// the committed parts by the time it runs.
export const RASTER_TOOLCHAIN_SCOPE: ToolchainScope = { fonts: [], tools: ['node', 'sharp'] };

const OVERRIDE_ENV = 'UNIFORM_TOOLCHAIN_OVERRIDE';

export function sha256File(path: string): string | null {
  try {
    return createHash('sha256').update(readFileSync(path)).digest('hex');
  } catch {
    return null;
  }
}

function pythonValue(source: string): string | null {
  try {
    return execFileSync(WORDMARK_PY, ['-c', source], { encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
}

export function probeFonts(
  roles: readonly string[] = ALL_FONT_ROLES
): Record<string, string | null> {
  return Object.fromEntries(
    roles.map((role) => {
      const pin = TOOLCHAIN_LOCK.fonts[role];
      return [role, pin ? sha256File(pin.path) : null];
    })
  );
}

export function probeOutlineTools(): Record<string, string | null> {
  return {
    node: process.versions.node,
    python: pythonValue("import sys; print('.'.join(map(str, sys.version_info[:3])))"),
    fontTools: pythonValue('import fontTools; print(fontTools.version)'),
  };
}

export async function probeRasterTools(): Promise<Record<string, string | null>> {
  const { default: sharp } = await import('sharp');
  return { node: process.versions.node, sharp: sharp.versions.sharp };
}

function overrideRequested(): boolean {
  return process.env[OVERRIDE_ENV] === '1';
}

function warnOverride(label: string): void {
  console.warn(
    `[uniform-toolchain] WARNING: ${OVERRIDE_ENV}=1 -- skipping ${label} verification. ` +
      'Artifacts emitted from this run are not reproducible from the committed lock and ' +
      'must not be committed.'
  );
}

function assertScope(label: string, probe: ToolchainProbe, scope: ToolchainScope): void {
  const mismatches = verifyToolchain(TOOLCHAIN_LOCK, probe, scope);
  if (mismatches.length === 0) return;
  throw new Error(
    `uniform ${label} toolchain does not match lib/uniforms/toolchain.lock.json:\n` +
      `${formatToolchainMismatches(mismatches)}\n` +
      'Update the lock only alongside regenerated, reviewed artifacts (see ' +
      'scripts/uniform-draw/toolchain-preflight.mts).'
  );
}

// Called by the converter before it validates or outlines anything.
export function assertOutlineToolchain(): void {
  if (overrideRequested()) {
    warnOverride('outline');
    return;
  }
  assertScope(
    'outline',
    { fonts: probeFonts(), tools: probeOutlineTools() },
    OUTLINE_TOOLCHAIN_SCOPE
  );
}

// Called by the generator before it rasterizes anything.
export async function assertRasterToolchain(): Promise<void> {
  if (overrideRequested()) {
    warnOverride('raster');
    return;
  }
  assertScope('raster', { fonts: {}, tools: await probeRasterTools() }, RASTER_TOOLCHAIN_SCOPE);
}
