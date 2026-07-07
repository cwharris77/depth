import { describe, it, expect } from 'vitest';
import { UNIFORMS } from '../uniforms/data';
import { contrastRatio, DARK_BG } from '../colors';

// The uniform archive is hand-curated (no structured source exists), so unlike the
// ESPN-derived team colors, we CAN and DO enforce strict dark-UI legibility on every
// kit's curated accent here — this kills the "every 5th throwback looks broken" bug at
// author time.

const HEX = /^#[0-9a-fA-F]{6}$/;
const AA = 4.5;

describe('uniform seed — dark-UI contrast', () => {
  for (const u of UNIFORMS) {
    const id = `${u.teamId}-${u.slug}`;

    it(`${id}: uiAccent reads on the dark app background`, () => {
      expect(contrastRatio(u.colors.uiAccent, DARK_BG)).toBeGreaterThanOrEqual(AA);
    });

    it(`${id}: onAccent reads on uiAccent`, () => {
      expect(contrastRatio(u.colors.onAccent, u.colors.uiAccent)).toBeGreaterThanOrEqual(AA);
    });
  }
});

describe('uniform seed — integrity', () => {
  it('ids (`${teamId}-${slug}`) are unique', () => {
    const ids = UNIFORMS.map((u) => `${u.teamId}-${u.slug}`);
    expect(new Set(ids).size).toBe(ids.length);
  });

  for (const u of UNIFORMS) {
    const id = `${u.teamId}-${u.slug}`;

    it(`${id}: teamId and slug are non-empty`, () => {
      expect(u.teamId).toBeTruthy();
      expect(u.slug).toBeTruthy();
    });

    it(`${id}: every color is a 6-digit hex`, () => {
      const { primary, secondary, accent, uiAccent, onAccent } = u.colors;
      for (const c of [primary, secondary, accent, uiAccent, onAccent]) {
        expect(c).toMatch(HEX);
      }
    });

    it(`${id}: year_end is not before year_start when both are set`, () => {
      if (u.yearStart !== null && u.yearEnd !== null) {
        expect(u.yearEnd).toBeGreaterThanOrEqual(u.yearStart);
      }
    });
  }
});
