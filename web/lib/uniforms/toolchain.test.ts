import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  TOOLCHAIN_LOCK,
  formatToolchainMismatches,
  verifyToolchain,
  type ToolchainProbe,
} from '@/lib/uniforms/toolchain';
import {
  OUTLINE_TOOLCHAIN_SCOPE,
  RASTER_TOOLCHAIN_SCOPE,
  WORDMARK_PY,
  assertOutlineToolchain,
  assertRasterToolchain,
  probeFonts,
  probeOutlineTools,
} from '../../scripts/uniform-draw/toolchain-preflight.mts';

// DEP-560 review item 5: pin or hash-verify the font files and the outlining/rasterization
// toolchain. These tests lock the pure comparison the converter and generator gate on, then
// (only where the real toolchain exists) verify the committed lock against this machine.

// A probe that matches the committed lock exactly -- the "everything is pinned" baseline.
function matchingProbe(): ToolchainProbe {
  return {
    fonts: Object.fromEntries(
      Object.entries(TOOLCHAIN_LOCK.fonts).map(([role, pin]) => [role, pin.sha256])
    ),
    tools: { ...TOOLCHAIN_LOCK.tools },
  };
}

describe('verifyToolchain', () => {
  it('accepts a probe that matches every pin', () => {
    expect(verifyToolchain(TOOLCHAIN_LOCK, matchingProbe())).toEqual([]);
  });

  it('fails when a font hash changes', () => {
    const probe = matchingProbe();
    probe.fonts['chest-wordmark'] = '0'.repeat(64);

    const mismatches = verifyToolchain(TOOLCHAIN_LOCK, probe);

    expect(mismatches).toEqual([
      {
        component: 'font:chest-wordmark',
        expected: TOOLCHAIN_LOCK.fonts['chest-wordmark'].sha256,
        actual: '0'.repeat(64),
      },
    ]);
  });

  it('fails when a font file is missing', () => {
    const probe = matchingProbe();
    probe.fonts['collar-label'] = null;

    const mismatches = verifyToolchain(TOOLCHAIN_LOCK, probe);

    expect(mismatches).toEqual([
      {
        component: 'font:collar-label',
        expected: TOOLCHAIN_LOCK.fonts['collar-label'].sha256,
        actual: null,
      },
    ]);
  });

  it('fails when a tool version changes', () => {
    const probe = matchingProbe();
    probe.tools['sharp'] = '0.0.0';

    expect(verifyToolchain(TOOLCHAIN_LOCK, probe)).toEqual([
      { component: 'tool:sharp', expected: TOOLCHAIN_LOCK.tools['sharp'], actual: '0.0.0' },
    ]);
  });

  it('fails when a tool is unavailable', () => {
    const probe = matchingProbe();
    probe.tools['fontTools'] = null;

    expect(verifyToolchain(TOOLCHAIN_LOCK, probe)).toEqual([
      {
        component: 'tool:fontTools',
        expected: TOOLCHAIN_LOCK.tools['fontTools'],
        actual: null,
      },
    ]);
  });

  it('reports every divergence, not just the first', () => {
    const probe = matchingProbe();
    probe.fonts['athletic-numeral'] = 'bad';
    probe.tools['node'] = null;

    const components = verifyToolchain(TOOLCHAIN_LOCK, probe).map((m) => m.component);

    expect(components).toEqual(['font:athletic-numeral', 'tool:node']);
  });

  it('checks only the requested scope', () => {
    const probe = matchingProbe();
    probe.fonts['chest-wordmark'] = 'bad';

    expect(verifyToolchain(TOOLCHAIN_LOCK, probe, { fonts: [], tools: ['node'] })).toEqual([]);
  });
});

describe('formatToolchainMismatches', () => {
  it('reads as a fixable report and calls out a missing input', () => {
    const report = formatToolchainMismatches([
      { component: 'font:chest-wordmark', expected: 'abc', actual: null },
      { component: 'tool:sharp', expected: '0.34.5', actual: '0.33.0' },
    ]);

    expect(report).toContain('font:chest-wordmark: expected abc, not found');
    expect(report).toContain('tool:sharp: expected 0.34.5, got 0.33.0');
  });
});

describe('production toolchain scopes', () => {
  // The exact scope the converter gates on: a changed font hash must be caught even if the
  // file itself is absent (as on CI), because the observed value is compared, not file access.
  it('fails the outline scope when a font hash changes', () => {
    const probe = { fonts: probeFonts(), tools: probeOutlineTools() };
    probe.fonts['chest-wordmark'] = 'changed';

    expect(
      verifyToolchain(TOOLCHAIN_LOCK, probe, OUTLINE_TOOLCHAIN_SCOPE).map((m) => m.component)
    ).toContain('font:chest-wordmark');
  });

  it('fails the raster scope when sharp changes', () => {
    const probe = { fonts: {}, tools: { node: TOOLCHAIN_LOCK.tools['node'], sharp: '0.0.0' } };

    expect(
      verifyToolchain(TOOLCHAIN_LOCK, probe, RASTER_TOOLCHAIN_SCOPE).map((m) => m.component)
    ).toEqual(['tool:sharp']);
  });
});

// The lock can only be exercised against the generation machine's real fonts and venv; CI
// (Linux, no system fonts) skips this block. A developer who swapped a font, upgraded
// fontTools, or changed Node sees the same failure the converter would hit.
const hasLocalToolchain =
  Object.values(TOOLCHAIN_LOCK.fonts).every((pin) => existsSync(pin.path)) &&
  existsSync(WORDMARK_PY);

describe.skipIf(!hasLocalToolchain)('current environment', () => {
  it('matches the committed lock for outlining (fonts, Python, fontTools, Node)', () => {
    expect(() => assertOutlineToolchain()).not.toThrow();
  });

  it('matches the committed lock for rasterization (sharp, Node)', async () => {
    await expect(assertRasterToolchain()).resolves.toBeUndefined();
  });

  it('hashes the real fonts the same way the lock records them', () => {
    const probe = { fonts: probeFonts(), tools: probeOutlineTools() };
    expect(probe.fonts).toEqual(
      Object.fromEntries(
        Object.entries(TOOLCHAIN_LOCK.fonts).map(([role, pin]) => [role, pin.sha256])
      )
    );
  });
});
