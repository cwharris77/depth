import { describe, it, expect } from 'vitest';
import { UNIFORMS } from '@/lib/uniforms/data';
import { LEGACY_ACCENTS } from '@/lib/uniforms/legacy-accents';
import { contrastRatio, DARK_BG } from '@/lib/utils/colors';

// Uniforms are the curated jersey authority, so every kit must carry complete era data
// before the seed can reach Postgres. The legacy ui_accent/on_accent pair is asserted
// separately below: it no longer lives on the rows, but it still has to stay legible for
// iOS builds already on devices, which paint ui_accent as a foreground on the dark ground.

const HEX = /^#[0-9a-fA-F]{6}$/;
const AA = 4.5;
const CURATED_KINDS = ['home', 'away', 'throwback', 'color-rush', 'alternate'];

describe('legacy accents — legibility for shipped iOS builds', () => {
  it('has exactly one pair per uniform row', () => {
    const ids = UNIFORMS.map((u) => `${u.teamId}-${u.slug}-${u.yearStart}`).sort();
    expect(Object.keys(LEGACY_ACCENTS).sort()).toEqual(ids);
  });

  for (const [id, pair] of Object.entries(LEGACY_ACCENTS)) {
    // The #590 regression, pinned: setting these to the real (dark) team color dropped the
    // Jets ring to 2.12:1 and Bills/Texans/Giants text to ~2.4:1 on device. #591 restored
    // them. These values are frozen — a failure here means someone re-derived them.
    it(`${id}: uiAccent reads on the dark app background`, () => {
      expect(contrastRatio(pair.uiAccent, DARK_BG)).toBeGreaterThanOrEqual(AA);
    });

    it(`${id}: onAccent reads on uiAccent`, () => {
      expect(contrastRatio(pair.onAccent, pair.uiAccent)).toBeGreaterThanOrEqual(AA);
    });

    it(`${id}: both are 6-digit hex`, () => {
      expect(pair.uiAccent).toMatch(HEX);
      expect(pair.onAccent).toMatch(HEX);
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

  // Mirrors the `uniforms_one_current_home_away_per_team` partial unique index
  // (20260903213000). Distinct from the aggregate check above: that one pins league size
  // (32 teams, each with a home kit), this one names the offending team and also covers
  // `away`, which had no coverage at all. Both resolvers pick the current kit with a
  // first-match predicate over an unordered result, so a duplicate makes a team's whole
  // palette nondeterministic rather than merely adding a stray archive row.
  for (const teamId of [...new Set(UNIFORMS.map((u) => u.teamId))].sort()) {
    for (const kind of ['home', 'away'] as const) {
      it(`${teamId}: exactly one current ${kind} kit`, () => {
        const current = UNIFORMS.filter(
          (u) => u.teamId === teamId && u.kind === kind && u.isCurrent
        ).map((u) => `${u.teamId}-${u.slug}-${u.yearStart}`);
        expect(current).toHaveLength(1);
      });
    }
  }

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
      const { primary, secondary, accent } = u.colors;
      for (const c of [primary, secondary, accent]) {
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
