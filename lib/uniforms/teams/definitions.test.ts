import { describe, expect, it } from 'vitest';
import type {
  ColorRef,
  TeamUniformDefinition,
  UniformStyleOverride,
} from '@/lib/uniforms/teams/types';
import { getAllTeamUniformDefinitions, getTeamUniformDefinition } from '@/lib/uniforms/teams';

// Definition integrity protects the renderer from malformed team-authored SVG data while keeping
// semantic colors resolved from each selected kit at runtime.

const SEMANTIC_COLORS = new Set<ColorRef>(['primary', 'secondary', 'accent', 'readable-on-body']);
const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

function expectValidColor(color: ColorRef) {
  expect(SEMANTIC_COLORS.has(color) || HEX_COLOR.test(color)).toBe(true);
}

function validateOverride(name: string, override: UniformStyleOverride) {
  it(`${name} uses valid colors, strokes, and paired layers`, () => {
    for (const color of [override.helmetColor, override.jerseyColor, override.pantsColor]) {
      if (color) expectValidColor(color);
    }

    if (override.number) {
      if (override.number.fill) expectValidColor(override.number.fill);
      if (override.number.outline) expectValidColor(override.number.outline);
      if (override.number.outlineWidth !== undefined) {
        expect(override.number.outlineWidth).toBeGreaterThan(0);
      }
    }

    const layers = override.layers ?? [];
    expect(new Set(layers.map((layer) => layer.id)).size).toBe(layers.length);

    for (const layer of layers) {
      if (layer.kind === 'fill') expectValidColor(layer.fill);
      else {
        expectValidColor(layer.stroke);
        expect(layer.strokeWidth).toBeGreaterThan(0);
      }
    }

    const rightSleeves = new Set(
      layers
        .filter((layer) => layer.surface === 'sleeve-right')
        .map((layer) => layer.id.replace(/-right$/, ''))
    );
    for (const layer of layers.filter((layer) => layer.surface === 'sleeve-left')) {
      expect(rightSleeves.has(layer.id.replace(/-left$/, ''))).toBe(true);
    }
  });
}

describe('team uniform definitions', () => {
  it('looks up registered definitions and degrades unknown teams', () => {
    expect(getTeamUniformDefinition('bengals')?.teamId).toBe('bengals');
    expect(getTeamUniformDefinition('bills')?.teamId).toBe('bills');
    expect(getTeamUniformDefinition('unknown')).toBeUndefined();
  });

  const definitions = getAllTeamUniformDefinitions();

  it('uses unique team IDs', () => {
    const teamIds = Object.values(definitions).map((definition) => definition.teamId);
    expect(new Set(teamIds).size).toBe(teamIds.length);
  });

  for (const definition of Object.values(definitions) as TeamUniformDefinition[]) {
    it(`${definition.teamId} uses non-empty kit keys`, () => {
      for (const kitKey of Object.keys(definition.kits)) expect(kitKey.trim()).not.toBe('');
    });

    if (definition.defaults) validateOverride(`${definition.teamId} defaults`, definition.defaults);
    for (const [kitKey, override] of Object.entries(definition.kits)) {
      validateOverride(`${definition.teamId} ${kitKey}`, override);
    }
  }
});
