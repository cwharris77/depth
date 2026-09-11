import { describe, expect, it } from 'vitest';
import { readableTextOn } from '@/lib/utils/colors';
import type { TeamColors } from '@/lib/types';
import { GENERIC_UNIFORM_STYLE, resolveColor, resolveUniformModel } from './model';
import type { ColorRef, TeamUniformDefinition } from './teams/types';

// The resolver protects the renderer's generic baseline while allowing team and kit data to
// selectively replace construction layers without relying on their array positions.

const colors: TeamColors = {
  primary: '#002244',
  secondary: '#69BE28',
  accent: '#A5ACAF',
  uiAccent: '#69BE28',
  onAccent: '#000000',
};

const definition: TeamUniformDefinition = {
  teamId: 'seahawks',
  defaults: {
    helmetColor: 'secondary',
    layers: [
      {
        id: 'helmet-mark',
        surface: 'helmet',
        d: 'M1,1',
        clip: true,
        kind: 'fill',
        fill: 'accent',
      },
      {
        id: 'sleeve-band',
        surface: 'sleeve-left',
        d: 'M2,2',
        clip: true,
        kind: 'fill',
        fill: 'secondary',
      },
    ],
  },
  kits: {
    home: {
      helmetColor: '#FFFFFF',
      removeLayerIds: ['sleeve-band'],
      layers: [
        {
          id: 'helmet-mark',
          surface: 'helmet',
          d: 'M3,3',
          clip: true,
          kind: 'fill',
          fill: 'primary',
        },
        {
          id: 'collar-trim',
          surface: 'collar',
          d: 'M4,4',
          clip: true,
          kind: 'stroke',
          stroke: 'accent',
          strokeWidth: 5,
        },
      ],
    },
    away: {
      number: null,
    },
  },
};

describe('uniform model resolver', () => {
  it('resolves primary color references', () => {
    expect(resolveColor('primary', colors, colors.primary)).toBe('#002244');
  });

  it('resolves readable-on-body color references', () => {
    expect(resolveColor('readable-on-body', colors, colors.primary)).toBe(
      readableTextOn(colors.primary)
    );
  });

  it('preserves literal color references', () => {
    expect(resolveColor('#FFFFFF', colors, colors.primary)).toBe('#FFFFFF');
  });

  it('falls back to the generic color for an unrecognized reference', () => {
    expect(resolveColor('unknown' as ColorRef, colors, colors.primary)).toBe(colors.primary);
  });

  it('applies generic, team, and kit overrides by stable layer id', () => {
    const model = resolveUniformModel(definition, 'home', colors);

    expect(model.helmetColor).toBe('#FFFFFF');
    expect(model.jerseyColor).toBe(colors.primary);
    expect(model.pantsColor).toBe(colors.primary);
    expect(model.layers.find((layer) => layer.id === 'helmet-mark')).toMatchObject({
      d: 'M3,3',
      fill: colors.primary,
    });
    expect(model.layers.some((layer) => layer.id === 'sleeve-band')).toBe(false);
    expect(model.layers.at(-1)).toMatchObject({ id: 'collar-trim', d: 'M4,4' });
    expect(model.layers.some((layer) => layer.id === 'generic-pants-stripe-left')).toBe(true);
    expect(model.number).toEqual({
      fill: readableTextOn(colors.primary),
      outline: colors.secondary,
      outlineWidth: GENERIC_UNIFORM_STYLE.number.outlineWidth,
    });
  });

  it('uses team defaults when a kit override is unknown', () => {
    const model = resolveUniformModel(definition, 'unknown', colors);

    expect(model.helmetColor).toBe(colors.secondary);
    expect(model.layers.find((layer) => layer.id === 'helmet-mark')).toMatchObject({ d: 'M1,1' });
    expect(model.layers.some((layer) => layer.id === 'sleeve-band')).toBe(true);
  });

  it('restores the generic number when a kit opts out of a team number style', () => {
    const numberDefinition: TeamUniformDefinition = {
      ...definition,
      defaults: {
        ...definition.defaults,
        number: { fill: 'accent', outline: 'secondary', outlineWidth: 5 },
      },
    };

    expect(resolveUniformModel(numberDefinition, 'away', colors).number).toEqual({
      fill: readableTextOn(colors.primary),
      outline: colors.secondary,
      outlineWidth: GENERIC_UNIFORM_STYLE.number.outlineWidth,
    });
  });

  it('returns the generic model without a definition', () => {
    const model = resolveUniformModel(undefined, 'home', colors);

    expect(model.helmetColor).toBe(colors.primary);
    expect(model.jerseyColor).toBe(colors.primary);
    expect(model.pantsColor).toBe(colors.primary);
    expect(model.layers.find((layer) => layer.id === 'generic-helmet-stripe')).toMatchObject({
      fill: colors.accent,
    });
    expect(model.number).toEqual({
      fill: readableTextOn(colors.primary),
      outline: colors.secondary,
      outlineWidth: GENERIC_UNIFORM_STYLE.number.outlineWidth,
    });
  });

  it('falls back to the generic model for an incomplete definition without kits', () => {
    const incompleteDefinition = { teamId: 'incomplete' } as TeamUniformDefinition;

    expect(resolveUniformModel(incompleteDefinition, 'home', colors)).toEqual(
      resolveUniformModel(undefined, 'home', colors)
    );
  });

  it('falls back to generic colors for incomplete layer paint references', () => {
    const incompleteDefinition = {
      teamId: 'incomplete',
      kits: {
        home: {
          layers: [
            {
              id: 'incomplete-fill',
              surface: 'helmet',
              d: 'M1,1',
              clip: true,
              kind: 'fill',
            },
            {
              id: 'incomplete-stroke',
              surface: 'collar',
              d: 'M2,2',
              clip: true,
              kind: 'stroke',
              strokeWidth: 3,
            },
          ],
        },
      },
    } as unknown as TeamUniformDefinition;

    const model = resolveUniformModel(incompleteDefinition, 'home', colors);

    expect(model.layers.find((layer) => layer.id === 'incomplete-fill')).toMatchObject({
      fill: colors.primary,
    });
    expect(model.layers.find((layer) => layer.id === 'incomplete-stroke')).toMatchObject({
      stroke: colors.primary,
    });
  });
});
