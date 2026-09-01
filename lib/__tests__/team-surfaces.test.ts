import { describe, it, expect } from 'vitest';
import { UNIFORMS } from '@/lib/uniforms/data';
import { contrastRatio, DARK_BG } from '@/lib/utils/colors';
import { teamFill, teamRing, textOnFill, numeralColors } from '@/lib/utils/team-surfaces';
import type { JerseyColors } from '@/lib/types';

// The resolvers replace a per-kit stored hex, so the property that matters most is not
// "is it legible" but "is it the team's". These loop the whole archive, one `it` per kit,
// so a failure names the offending row (AGENTS.md §3, the uniforms.test.ts pattern).

const WHITE = '#ffffff';
const AA_LARGE = 3;

// Text on a fill falls back to readableTextOn, which picks the better of white/near-black —
// and for a mid-luminance hue neither clears strict AA. Three kits land just under: Chargers
// home and powder-blue (#0080C6, 4.28) and Panthers home (#0085CA, 4.48). Black and white are
// the only candidates, so 4.28 is the best any rule can do there; the resolver is not at
// fault and there is no color to swap in. Same floor and same reasoning as contrast.test.ts's
// MIN_ACCEPTABLE — "not catastrophically bad", not full AA on every possible hex.
const TEXT_FLOOR = 4;

// The only colors any resolver may introduce that aren't the kit's own: white, and the app
// ground (which readableTextOn returns for light fills).
const ALLOWED_NON_TEAM = [WHITE, DARK_BG.toLowerCase()];

// Archive rows carry only the three real jersey colors — the legacy uiAccent/onAccent pair
// lives in legacy-accents.ts and `JerseyColors` makes it unreachable from here, so a resolver
// cannot read it even by accident.
function kitColors(u: (typeof UNIFORMS)[number]): JerseyColors {
  return { ...u.colors };
}

// Look a kit up by its row id, failing loudly rather than with a null-deref if the archive
// ever renames or retires one of the anchor cases these tests pin.
function kitById(id: string): (typeof UNIFORMS)[number] {
  const found = UNIFORMS.find((u) => `${u.teamId}-${u.slug}-${u.yearStart}` === id);
  if (!found) throw new Error(`no uniform row with id ${id}`);
  return found;
}

function isTeamColorOrAllowed(value: string, colors: JerseyColors): boolean {
  const v = value.toLowerCase();
  const real = [colors.primary, colors.secondary, colors.accent].map((c) => c.toLowerCase());
  return real.includes(v) || ALLOWED_NON_TEAM.includes(v);
}

describe('team surfaces — every resolver returns a real team color', () => {
  for (const u of UNIFORMS) {
    const id = `${u.teamId}-${u.slug}-${u.yearStart}`;
    const colors = kitColors(u);

    it(`${id}: no resolver invents a color`, () => {
      const numeral = numeralColors(colors);
      const produced = [
        teamFill(colors),
        teamRing(colors),
        textOnFill(colors),
        numeral.fill,
        numeral.stroke,
      ];
      for (const value of produced) {
        expect(
          isTeamColorOrAllowed(value, colors),
          `${value} is not one of this kit's colors`
        ).toBe(true);
      }
    });
  }
});

describe('team surfaces — fill and ring', () => {
  for (const u of UNIFORMS) {
    const id = `${u.teamId}-${u.slug}-${u.yearStart}`;
    const colors = kitColors(u);

    it(`${id}: fill is the jersey body`, () => {
      expect(teamFill(colors)).toBe(colors.primary);
    });

    it(`${id}: ring separates from its fill or from the ground`, () => {
      const ring = teamRing(colors);
      const readsOnFill = contrastRatio(ring, colors.primary) >= 2;
      const readsOnGround = contrastRatio(ring, DARK_BG) >= 2;
      expect(readsOnFill || readsOnGround).toBe(true);
    });
  }

  // The accent fallback exists for exactly two kits. Asserting them by id means a future
  // data change that silently removes the only cases this branch covers is visible, rather
  // than leaving a branch nothing exercises.
  it('only the two Ravens kits fall back to accent for their ring', () => {
    const fellBack = UNIFORMS.filter((u) => teamRing(kitColors(u)) !== u.colors.secondary).map(
      (u) => `${u.teamId}-${u.slug}-${u.yearStart}`
    );
    expect(fellBack).toEqual(['ravens-home-1996', 'ravens-black-alt-2004']);
  });

  it('the Ravens fallback is their real gold', () => {
    for (const id of ['ravens-home-1996', 'ravens-black-alt-2004']) {
      expect(teamRing(kitColors(kitById(id))).toLowerCase()).toBe('#9e7c0c');
    }
  });
});

describe('team surfaces — text on a fill', () => {
  for (const u of UNIFORMS) {
    const id = `${u.teamId}-${u.slug}-${u.yearStart}`;
    const colors = kitColors(u);

    it(`${id}: text clears the floor against the fill it sits on`, () => {
      const fill = teamFill(colors);
      expect(contrastRatio(textOnFill(colors, fill), fill)).toBeGreaterThanOrEqual(TEXT_FLOOR);
    });
  }

  it('prefers the team secondary where it clears AA, falls back where it does not', () => {
    const usedSecondary = UNIFORMS.filter(
      (u) => textOnFill(kitColors(u)).toLowerCase() === u.colors.secondary.toLowerCase()
    );
    // Both branches must be exercised by the real archive — if either hits zero the rule
    // has silently collapsed into a constant.
    expect(usedSecondary.length).toBeGreaterThan(0);
    expect(usedSecondary.length).toBeLessThan(UNIFORMS.length);
  });
});

describe('team surfaces — player-card numeral', () => {
  for (const u of UNIFORMS) {
    const id = `${u.teamId}-${u.slug}-${u.yearStart}`;
    const colors = kitColors(u);

    it(`${id}: the stroke reads on the app ground`, () => {
      expect(contrastRatio(numeralColors(colors).stroke, DARK_BG)).toBeGreaterThanOrEqual(AA_LARGE);
    });

    // The collapse bug, caught structurally: white-on-white on every away kit was the
    // reason the simpler "always stroke white" rule was rejected.
    it(`${id}: fill and stroke are different colors`, () => {
      const { fill, stroke } = numeralColors(colors);
      expect(fill.toLowerCase()).not.toBe(stroke.toLowerCase());
    });
  }

  it('resolves through the three branches in the expected proportions', () => {
    // Classify by the condition the resolver branches on, not by the color it returns:
    // several kits have a white `secondary` (every Jets kit, for one), so a white stroke
    // is ambiguous between branch 1 and branch 3 when read off the output alone.
    let strokeSecondary = 0;
    let swapped = 0;
    let whiteFallback = 0;
    for (const u of UNIFORMS) {
      const { primary, secondary } = u.colors;
      if (contrastRatio(secondary, DARK_BG) >= AA_LARGE) strokeSecondary++;
      else if (contrastRatio(primary, DARK_BG) >= AA_LARGE) swapped++;
      else whiteFallback++;
    }
    // A data change that shifts kits between branches should surface here rather than be
    // absorbed silently.
    expect({ strokeSecondary, swapped, whiteFallback }).toEqual({
      strokeSecondary: 52,
      swapped: 39,
      whiteFallback: 14,
    });
  });

  // The four cases the design decision turned on: a kit where the secondary carries the
  // stroke, the away inversion that forced the swap branch, the only kit whose two jersey
  // colors both read (Chiefs red-on-gold), and a kit where neither does.
  it.each([
    ['seahawks-home-2012', '#002244', '#69be28'],
    ['seahawks-away-2012', '#002244', '#ffffff'],
    ['chiefs-home-1963', '#e31837', '#ffb81c'],
    ['ravens-home-1996', '#241773', '#ffffff'],
  ])('%s resolves to fill %s / stroke %s', (id, fill, stroke) => {
    const resolved = numeralColors(kitColors(kitById(id)));
    expect(resolved.fill.toLowerCase()).toBe(fill);
    expect(resolved.stroke.toLowerCase()).toBe(stroke);
  });
});
