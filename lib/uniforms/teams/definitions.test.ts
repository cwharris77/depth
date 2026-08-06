import { describe, expect, it } from 'vitest';
import type { TeamColors } from '@/lib/types';
import { resolveUniformModel } from '@/lib/uniforms/model';
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
const SEAHAWKS_COLORS: TeamColors = {
  primary: '#002244',
  secondary: '#69BE28',
  accent: '#A5ACAF',
  uiAccent: '#69BE28',
  onAccent: '#0a0e1a',
};

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
    expect(getTeamUniformDefinition('seahawks')?.teamId).toBe('seahawks');
    expect(getTeamUniformDefinition('unknown')).toBeUndefined();
  });

  it.each(['constructor', '__proto__', 'toString'])(
    'does not resolve the inherited %s property as a team definition',
    (teamId) => {
      expect(getTeamUniformDefinition(teamId)).toBeUndefined();
    }
  );

  it('resolves the Seahawks navy home construction without protected marks', () => {
    const definition = getTeamUniformDefinition('seahawks');
    const home = definition?.kits.home;
    const layerIds = home?.layers?.map((layer) => layer.id);

    expect(layerIds).toEqual([
      'seahawks-helmet-center-stripe',
      'seahawks-shoulder-silver-left',
      'seahawks-shoulder-silver-right',
      'seahawks-shoulder-lime-left',
      'seahawks-shoulder-lime-right',
    ]);
    expect(layerIds?.some((id) => /helmet-logo|wordmark|shield/.test(id))).toBe(false);

    const model = resolveUniformModel(definition, 'home', SEAHAWKS_COLORS);
    expect(model).toMatchObject({
      helmetColor: '#002244',
      jerseyColor: '#002244',
      pantsColor: '#002244',
    });
    expect(
      model.layers.find((layer) => layer.id === 'seahawks-shoulder-silver-left')
    ).toMatchObject({ fill: '#A5ACAF' });
    expect(model.layers.find((layer) => layer.id === 'seahawks-shoulder-lime-left')).toMatchObject({
      fill: '#69BE28',
    });
    for (const displacedLayerId of [
      'generic-helmet-stripe',
      'generic-sleeve-yoke-left',
      'generic-sleeve-yoke-right',
      'generic-sleeve-stripe-left',
      'generic-sleeve-stripe-right',
    ]) {
      expect(model.layers.some((layer) => layer.id === displacedLayerId)).toBe(false);
    }
  });

  it('keeps the Seahawks away helmet navy and construction trim action green', () => {
    const definition = getTeamUniformDefinition('seahawks');
    const model = resolveUniformModel(definition, 'away', {
      ...SEAHAWKS_COLORS,
      primary: '#FFFFFF',
      secondary: '#002244',
      accent: '#69BE28',
    });

    expect(model.helmetColor).toBe('#002244');
    expect(model.number.outline).toBe('#69BE28');
    for (const layerId of [
      'generic-sleeve-stripe-left',
      'generic-sleeve-stripe-right',
      'generic-collar',
      'generic-pants-stripe-left',
      'generic-pants-stripe-right',
    ]) {
      const layer = model.layers.find((candidate) => candidate.id === layerId);
      expect(layer?.kind === 'fill' ? layer.fill : layer?.stroke).toBe('#69BE28');
    }
  });

  const definitions = Object.values(getAllTeamUniformDefinitions()).filter(
    (definition): definition is TeamUniformDefinition => definition !== undefined
  );

  it('uses unique team IDs', () => {
    const teamIds = definitions.map((definition) => definition.teamId);
    expect(new Set(teamIds).size).toBe(teamIds.length);
  });

  for (const definition of definitions) {
    it(`${definition.teamId} uses non-empty kit keys`, () => {
      for (const kitKey of Object.keys(definition.kits)) expect(kitKey.trim()).not.toBe('');
    });

    if (definition.defaults) validateOverride(`${definition.teamId} defaults`, definition.defaults);
    for (const [kitKey, override] of Object.entries(definition.kits)) {
      validateOverride(`${definition.teamId} ${kitKey}`, override);
    }
  }
});
