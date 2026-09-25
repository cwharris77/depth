import { describe, expect, it } from 'vitest';
import type { TeamColors } from '@/lib/types';
import { resolveUniformModel } from '@/lib/uniforms/model';
import type {
  ColorRef,
  TeamUniformDefinition,
  UniformStyleOverride,
} from '@/lib/uniforms/teams/core/types';
import { getAllTeamUniformDefinitions, getTeamUniformDefinition } from '@/lib/uniforms/teams';

// Definition integrity protects the renderer from malformed team-authored SVG data while keeping
// semantic colors resolved from each selected kit at runtime.

const SEMANTIC_COLORS = new Set<ColorRef>(['primary', 'secondary', 'accent', 'readable-on-body']);
const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;
const PATTERN_REF = /^pattern:[A-Za-z0-9_-]+$/;
// This mirrors the current curated Seahawks home palette. Keeping wolf grey as the third token
// protects the shoulder band from accidentally resolving to action green.
const SEAHAWKS_COLORS: TeamColors = {
  primary: '#002244',
  secondary: '#69BE28',
  accent: '#A5ACAF',
  uiAccent: '#69BE28',
  onAccent: '#0a0e1a',
};

const EAGLES_KELLY_COLORS: TeamColors = {
  primary: '#046A38',
  secondary: '#A5ACAF',
  accent: '#FFFFFF',
  uiAccent: '#046A38',
  onAccent: '#0a0e1a',
};

function expectValidColor(color: ColorRef) {
  expect(SEMANTIC_COLORS.has(color) || HEX_COLOR.test(color) || PATTERN_REF.test(color)).toBe(true);
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
        // 0 is an unoutlined numeral (the jersey spec's `outlineWeight: 'none'`).
        expect(override.number.outlineWidth).toBeGreaterThanOrEqual(0);
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

    // Team layers retain their paint order; the pant stripe stops at the hem.
    expect(layerIds?.filter((id) => id.startsWith('seahawks-'))).toEqual([
      'seahawks-helmet-center-stripe',
      // Grey wing paints under the keyline; it was missing from the pre-2026-09-03 decal.
      'seahawks-helmet-hawk-grey',
      'seahawks-helmet-hawk',
      'seahawks-helmet-hawk-eye',
      'seahawks-jersey-navy-shoulder-number-left',
      'seahawks-jersey-navy-shoulder-number-right',
      'seahawks-jersey-navy-shoulder-band-left',
      'seahawks-jersey-navy-shoulder-band-right',
      'seahawks-jersey-navy-shoulder-cap-left',
      'seahawks-jersey-navy-shoulder-cap-right',
      'seahawks-neck-opening',
      'seahawks-collar-band',
      'seahawks-collar-feathers-left',
      'seahawks-collar-feathers-right',
      'seahawks-neck-tab-border',
      'seahawks-neck-tab',
      'seahawks-neck-twelve',
      'seahawks-jersey-navy-shoulder-wordmark-right',
      'seahawks-pants-navy-stripe-0-left',
      'seahawks-pants-navy-stripe-0-right',
    ]);
    expect(layerIds?.some((id) => id.startsWith('generic-'))).toBe(false);
    // League shields and sponsor marks stay out of every kit.
    expect(layerIds?.some((id) => /shield|sponsor/.test(id))).toBe(false);

    const model = resolveUniformModel(definition, 'home', SEAHAWKS_COLORS);
    expect(model).toMatchObject({
      helmetColor: '#002244',
      jerseyColor: '#002244',
      pantsColor: '#002244',
    });
    // Wolf grey must survive as a literal: resolving it from `accent` would silently paint the
    // band and the number the same action green as the sleeve cap on every home render.
    for (const layerId of [
      'seahawks-jersey-navy-shoulder-number-left',
      'seahawks-jersey-navy-shoulder-band-left',
      'seahawks-jersey-navy-shoulder-band-right',
    ]) {
      expect(model.layers.find((layer) => layer.id === layerId)).toMatchObject({ fill: '#A5ACAF' });
    }
    expect(
      model.layers.find((layer) => layer.id === 'seahawks-jersey-navy-shoulder-cap-left')
    ).toMatchObject({
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

  it('keeps the Steelers helmet mark in source paint order', () => {
    const definition = getTeamUniformDefinition('steelers');
    const layerIds = definition?.kits.home.layers
      ?.filter((layer) => layer.surface === 'helmet')
      .map((layer) => layer.id);

    expect(layerIds).toEqual([
      'steelers-decal-disc',
      'steelers-decal-ring',
      'steelers-decal-gold',
      'steelers-decal-red',
      'steelers-decal-blue',
      'steelers-decal-separator',
      'steelers-decal-wordmark',
    ]);
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
    expect(
      model.layers.find((layer) => layer.id === 'seahawks-jersey-white-shoulder-band-left')
    ).toMatchObject({
      fill: '#002244',
    });
    expect(
      model.layers.find((layer) => layer.id === 'seahawks-jersey-white-shoulder-cap-left')
    ).toMatchObject({
      fill: '#69BE28',
    });
    expect(model.layers.find((layer) => layer.id === 'seahawks-collar-band')).toMatchObject({
      fill: '#FFFFFF',
    });
    expect(model.layers.some((layer) => layer.id === 'generic-collar')).toBe(false);
    // The reference's white away pants carry no stripe at all, so the generic pair is dropped
    // rather than recolored.
    for (const droppedLayerId of ['generic-pants-stripe-left', 'generic-pants-stripe-right']) {
      expect(model.layers.some((layer) => layer.id === droppedLayerId)).toBe(false);
    }
  });

  it.each([
    ['home', 'navy', '#69BE28', '#002244'],
    ['away', 'white', '#002244', '#FFFFFF'],
  ])(
    'gives Seahawks %s twelve feathers per collar side and a contrasting wordmark',
    (kit, jersey, feathers, wordmark) => {
      const model = resolveUniformModel(getTeamUniformDefinition('seahawks'), kit, SEAHAWKS_COLORS);
      for (const side of ['left', 'right']) {
        const layer = model.layers.find((layer) => layer.id === `seahawks-collar-feathers-${side}`);
        expect(layer).toMatchObject({ kind: 'fill', fill: feathers, surface: 'collar' });
        expect(layer?.d.match(/M/g)).toHaveLength(12);
      }
      expect(
        model.layers.find(
          (layer) => layer.id === `seahawks-jersey-${jersey}-shoulder-wordmark-right`
        )
      ).toMatchObject({ kind: 'fill', fill: wordmark });
      expect(model.layers.filter((layer) => layer.id.includes('shoulder-wordmark'))).toHaveLength(
        1
      );
      expect(model.layers.find((layer) => layer.id === 'seahawks-neck-tab-border')).toMatchObject({
        fill: '#69BE28',
      });
      expect(model.layers.find((layer) => layer.id === 'seahawks-neck-tab')).toMatchObject({
        fill: '#002244',
      });
      expect(model.layers.find((layer) => layer.id === 'seahawks-neck-twelve')).toMatchObject({
        fill: '#A5ACAF',
      });
    }
  );

  it('gives the throwback a silver shell, the original hawk, and royal socks', () => {
    const definition = getTeamUniformDefinition('seahawks');
    const model = resolveUniformModel(definition, '1976-throwback', {
      ...SEAHAWKS_COLORS,
      primary: '#0248B3',
      secondary: '#0E8329',
      accent: '#A7B0BA',
    });

    expect(model).toMatchObject({
      helmetColor: '#A7B0BA',
      jerseyColor: '#0248B3',
      pantsColor: '#DBDDDF',
      facemaskColor: '#0248B3',
    });
    // That era used an entirely different mark, so the modern hawk must not leak onto it.
    expect(model.layers.some((layer) => layer.id.startsWith('seahawks-helmet-hawk'))).toBe(false);
    expect(
      model.layers.find((layer) => layer.id === 'seahawks-throwback-hawk-royal')
    ).toMatchObject({ surface: 'helmet', fill: '#0248B3' });
    expect(model.layers.find((layer) => layer.id === 'seahawks-throwback-sock-left')).toMatchObject(
      {
        surface: 'leg-left',
        fill: '#0248B3',
      }
    );
    expect(model.layers.some((layer) => layer.id.startsWith('generic-'))).toBe(false);
  });

  it('dresses the Color Rush in lime with the navy band and a hem-length navy pant stripe', () => {
    const definition = getTeamUniformDefinition('seahawks');
    const model = resolveUniformModel(definition, 'color-rush', {
      ...SEAHAWKS_COLORS,
      primary: '#B6FF3E',
      secondary: '#002244',
      accent: '#FFFFFF',
    });

    expect(model).toMatchObject({
      helmetColor: '#002244',
      jerseyColor: '#B6FF3E',
      pantsColor: '#B6FF3E',
    });
    expect(
      model.layers.find((layer) => layer.id === 'seahawks-jersey-action-green-shoulder-band-left')
    ).toMatchObject({
      fill: '#002244',
    });
    expect(
      model.layers.find(
        (layer) => layer.id === 'seahawks-jersey-action-green-shoulder-wordmark-right'
      )
    ).toMatchObject({
      fill: '#FFFFFF',
    });
    expect(
      model.layers.find((layer) => layer.id === 'seahawks-pants-action-green-stripe-0-left')
    ).toMatchObject({ surface: 'leg-left', fill: '#002244' });
    // The generic stripe runs into the socks, which stay lime on this kit.
    expect(model.layers.some((layer) => layer.id.startsWith('generic-pants-stripe'))).toBe(false);
  });

  it('keeps original and modern Eagles Kelly Green collars distinct', () => {
    const definition = getTeamUniformDefinition('eagles');
    const original = resolveUniformModel(definition, 'kelly-green-original', EAGLES_KELLY_COLORS);
    const modern = resolveUniformModel(definition, 'kelly-green-modern', EAGLES_KELLY_COLORS);

    expect(original.layers.find((layer) => layer.id === 'eagles-collar')?.d).not.toBe(
      modern.layers.find((layer) => layer.id === 'eagles-collar')?.d
    );
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
