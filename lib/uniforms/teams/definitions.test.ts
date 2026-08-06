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
// The home kit's palette comes from ESPN via toTeamColors, which sets accent = secondary — so a
// home render has no third token and `accent` can never be wolf grey. Mirroring that here keeps
// this suite honest: a curated palette with a distinct accent would pass while the live page
// painted the shoulder band green. Curated archive rows (away, below) do carry a real accent.
const SEAHAWKS_COLORS: TeamColors = {
  primary: '#002a5c',
  secondary: '#69BE28',
  accent: '#69BE28',
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
      'seahawks-helmet-hawk',
      'seahawks-helmet-hawk-eye',
      'seahawks-shoulder-bar-left',
      'seahawks-shoulder-bar-right',
      'seahawks-shoulder-band-left',
      'seahawks-shoulder-band-right',
      'seahawks-shoulder-cap-left',
      'seahawks-shoulder-cap-right',
    ]);
    // The helmet decal is the one traced mark; chest wordmarks, league shields and sponsor marks
    // stay out of every kit.
    expect(layerIds?.some((id) => /wordmark|shield|sponsor/.test(id))).toBe(false);

    const model = resolveUniformModel(definition, 'home', SEAHAWKS_COLORS);
    expect(model).toMatchObject({
      helmetColor: '#002a5c',
      jerseyColor: '#002a5c',
      pantsColor: '#002a5c',
    });
    // Wolf grey must survive as a literal: resolving it from `accent` would silently paint the
    // band and the number the same action green as the sleeve cap on every home render.
    for (const layerId of [
      'seahawks-shoulder-bar-left',
      'seahawks-shoulder-band-left',
      'seahawks-shoulder-band-right',
    ]) {
      expect(model.layers.find((layer) => layer.id === layerId)).toMatchObject({ fill: '#A5ACAF' });
    }
    expect(model.layers.find((layer) => layer.id === 'seahawks-shoulder-cap-left')).toMatchObject({
      fill: '#69BE28',
    });
    expect(model.number).toMatchObject({ fill: '#A5ACAF', outline: '#69BE28' });
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

  it('mirrors the home construction on the Seahawks away kit in navy', () => {
    const definition = getTeamUniformDefinition('seahawks');
    const model = resolveUniformModel(definition, 'away', {
      ...SEAHAWKS_COLORS,
      primary: '#FFFFFF',
      secondary: '#002244',
      accent: '#69BE28',
    });

    // Away wears the same shoulder construction as home with navy in wolf grey's place, so its
    // band resolves from secondary while the sleeve cap takes accent — the inverse of home's
    // token usage for the same painted result.
    expect(model.helmetColor).toBe('#002244');
    expect(model.number).toMatchObject({ fill: '#002244', outline: '#69BE28' });
    expect(model.layers.find((layer) => layer.id === 'seahawks-shoulder-band-left')).toMatchObject({
      fill: '#002244',
    });
    expect(model.layers.find((layer) => layer.id === 'seahawks-shoulder-cap-left')).toMatchObject({
      fill: '#69BE28',
    });
    // The away collar is navy in the reference, not green — it inherits the generic chevron,
    // which already resolves to this kit's secondary.
    const collar = model.layers.find((layer) => layer.id === 'generic-collar');
    expect(collar?.kind === 'stroke' ? collar.stroke : undefined).toBe('#002244');
    // The reference's white away pants carry no stripe at all, so the generic pair is dropped
    // rather than recolored.
    for (const droppedLayerId of ['generic-pants-stripe-left', 'generic-pants-stripe-right']) {
      expect(model.layers.some((layer) => layer.id === droppedLayerId)).toBe(false);
    }
  });

  it('gives the 1976 throwback a silver shell and era bands instead of the modern decal', () => {
    const definition = getTeamUniformDefinition('seahawks');
    const model = resolveUniformModel(definition, '1976-throwback', {
      ...SEAHAWKS_COLORS,
      primary: '#003087',
      secondary: '#046A38',
      accent: '#8A8D8F',
    });

    expect(model).toMatchObject({ helmetColor: '#8A8D8F', pantsColor: '#8A8D8F' });
    // That era used an entirely different mark, so the traced modern hawk must not leak onto it.
    expect(model.layers.some((layer) => layer.id.startsWith('seahawks-helmet-hawk'))).toBe(false);
    expect(model.layers.some((layer) => layer.id === 'seahawks-1976-helmet-royal')).toBe(true);
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
