// Pinned-input verification for the uniform art pipeline.
//
// Generation consumes committed inputs only: the same
// accepted authoring data, catalog snapshot, renderer, font inputs, and raster toolchain
// produce byte-identical artifacts. Authoring data, catalog, and renderer are code in this
// repo; the fonts and the outlining/rasterizing toolchain are not. Font binaries are not
// committed, so `toolchain.lock.json` records the SHA-256 of each source font
// and the exact versions of the tools that outline (Python, fontTools, Node) and rasterize
// (sharp, Node) the committed WebPs. `verifyToolchain` is the pure comparison; the actual
// probing lives in `scripts/uniform-draw/toolchain-preflight.mts`, which the converter and
// generator call before they emit anything.
//
// An override exists (`UNIFORM_TOOLCHAIN_OVERRIDE=1`, handled in the preflight) but is for
// local experimentation only: committing artifacts produced under it means nobody can tell
// which toolchain drew them. The check is never skipped implicitly.
import lockJson from './toolchain.lock.json';

export interface FontPin {
  // Absolute source path. macOS system fonts are the provenance, not committed assets.
  path: string;
  // Face index within a `.ttc` collection (0 for the pinned faces here).
  index: number;
  // Lowercase hex SHA-256 of the source font file's bytes.
  sha256: string;
}

export interface ToolchainLock {
  note?: string;
  // Role -> the exact font file the outliner reads for it.
  fonts: Record<string, FontPin>;
  // Tool name -> the exact version string the environment must report.
  tools: Record<string, string>;
}

export interface ToolchainProbe {
  // Role -> observed file hash, or null when the file is missing/unreadable.
  fonts: Record<string, string | null>;
  // Tool name -> observed version, or null when the tool is unavailable.
  tools: Record<string, string | null>;
}

export interface ToolchainMismatch {
  // "font:<role>" or "tool:<name>", so a failure names the diverged input directly.
  component: string;
  expected: string;
  actual: string | null;
}

export interface ToolchainScope {
  // Font roles to check. Defaults to every role in the lock.
  fonts?: readonly string[];
  // Tool names to check. Defaults to every tool in the lock.
  tools?: readonly string[];
}

export const TOOLCHAIN_LOCK = lockJson as ToolchainLock;

// Compares an observed toolchain against the committed pins and returns every divergence
// (not just the first) so a failure reads as one complete, fixable report.
export function verifyToolchain(
  lock: ToolchainLock,
  probe: ToolchainProbe,
  scope?: ToolchainScope
): ToolchainMismatch[] {
  const mismatches: ToolchainMismatch[] = [];

  for (const role of scope?.fonts ?? Object.keys(lock.fonts)) {
    const pin = lock.fonts[role];
    if (!pin) throw new Error(`no font pin named "${role}" in the toolchain lock`);
    const actual = probe.fonts[role] ?? null;
    if (actual !== pin.sha256) {
      mismatches.push({ component: `font:${role}`, expected: pin.sha256, actual });
    }
  }

  for (const name of scope?.tools ?? Object.keys(lock.tools)) {
    const expected = lock.tools[name];
    if (expected === undefined)
      throw new Error(`no tool pin named "${name}" in the toolchain lock`);
    const actual = probe.tools[name] ?? null;
    if (actual !== expected) {
      mismatches.push({ component: `tool:${name}`, expected, actual });
    }
  }

  return mismatches;
}

export function formatToolchainMismatches(mismatches: readonly ToolchainMismatch[]): string {
  return mismatches
    .map(
      (mismatch) =>
        `  - ${mismatch.component}: expected ${mismatch.expected}, ` +
        (mismatch.actual === null ? 'not found' : `got ${mismatch.actual}`)
    )
    .join('\n');
}
