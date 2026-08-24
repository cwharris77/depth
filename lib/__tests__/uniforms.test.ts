import { describe, it, expect } from 'vitest';
import { UNIFORMS } from '@/lib/uniforms/data';
import { contrastRatio, DARK_BG } from '@/lib/utils/colors';

// Uniforms are the curated jersey authority, so every kit must carry complete era data
// and a dark-UI-legible accent before the seed can reach Postgres.

const HEX = /^#[0-9a-fA-F]{6}$/;
const AA = 4.5;
const CURATED_KINDS = ['home', 'away', 'throwback', 'color-rush', 'alternate'];

describe('uniform seed — dark-UI contrast', () => {
  for (const u of UNIFORMS) {
    const id = `${u.teamId}-${u.slug}-${u.yearStart}`;

    it(`${id}: uiAccent reads on the dark app background`, () => {
      expect(contrastRatio(u.colors.uiAccent, DARK_BG)).toBeGreaterThanOrEqual(AA);
    });

    it(`${id}: onAccent reads on uiAccent`, () => {
      expect(contrastRatio(u.colors.onAccent, u.colors.uiAccent)).toBeGreaterThanOrEqual(AA);
    });
  }
});

describe('uniform seed — integrity', () => {
  it('ids (`${teamId}-${slug}-${yearStart}`) are unique', () => {
    const ids = UNIFORMS.map((u) => `${u.teamId}-${u.slug}-${u.yearStart}`);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('contains one current home kit for every team', () => {
    const homes = UNIFORMS.filter((u) => u.kind === 'home' && u.isCurrent);
    expect(homes).toHaveLength(32);
    expect(new Set(homes.map((u) => u.teamId)).size).toBe(32);
  });

  it('keeps the Broncos current home palette orange-first', () => {
    const broncosHome = UNIFORMS.find(
      (u) => u.teamId === 'broncos' && u.kind === 'home' && u.isCurrent
    );
    expect(broncosHome?.colors).toMatchObject({ primary: '#FB4F14', secondary: '#002244' });
  });

  for (const u of UNIFORMS) {
    const id = `${u.teamId}-${u.slug}-${u.yearStart}`;

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
      expect(u.yearStart).not.toBeNull();
      if (u.yearEnd !== null) {
        expect(u.yearEnd).toBeGreaterThanOrEqual(u.yearStart);
      }
    });

    it(`${id}: is_current agrees with an open-ended era`, () => {
      expect(u.isCurrent).toBe(u.yearEnd === null);
    });

    it(`${id}: kind is a curated uniform kind`, () => {
      expect(CURATED_KINDS).toContain(u.kind);
    });
  }
});
