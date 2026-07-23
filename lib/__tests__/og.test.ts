import { describe, it, expect } from 'vitest';
import { featuredStarters, rosterForOgImage } from '../og';
import { readableTextOn, contrastRatio } from '../colors';
import { encodeDepthOrder } from '../share';
import { TEAMS } from '../teams';
import type { TeamRoster } from '../types';

function rosterWith(players: TeamRoster['players']): TeamRoster {
  return {
    team: {
      id: 't',
      city: 'Test',
      name: 'Team',
      abbrev: 'TST',
      conference: 'NFC',
      division: 'West',
      colors: {
        primary: '#000',
        secondary: '#fff',
        accent: '#888',
        uiAccent: '#fff',
        onAccent: '#000',
      },
    },
    players,
    specialTeams: [],
    uniforms: [],
  };
}

function p(
  id: string,
  position: TeamRoster['players'][number]['position'],
  number: number
): TeamRoster['players'][number] {
  return {
    id,
    name: id,
    number,
    position,
    depthRank: 1,
    status: 'starter',
    age: 25,
    college: '',
    experience: 1,
    height: '6\'0"',
    weight: 200,
    bio: '',
  };
}

describe('featuredStarters', () => {
  it('picks the top QB, RB, and WR by depth order', () => {
    const r = rosterWith([
      p('qb1', 'QB', 7),
      p('qb2', 'QB', 19),
      p('rb1', 'RB', 9),
      p('wr-a', 'WR', 14),
      p('wr-b', 'WR', 11), // lower number wins the depthRank tie
    ]);
    expect(featuredStarters(r)).toEqual([
      { label: 'QB', name: 'qb1' },
      { label: 'RB', name: 'rb1' },
      { label: 'WR', name: 'wr-b' },
    ]);
  });

  it('skips positions the roster lacks instead of emitting blanks', () => {
    const r = rosterWith([p('qb1', 'QB', 7)]);
    expect(featuredStarters(r)).toEqual([{ label: 'QB', name: 'qb1' }]);
  });

  it('produces 1–3 valid starters for every shipped team', () => {
    for (const roster of Object.values(TEAMS)) {
      const picks = featuredStarters(roster);
      expect(picks.length).toBeGreaterThan(0);
      expect(picks.length).toBeLessThanOrEqual(3);
      expect(picks.every((s) => s.name.length > 0)).toBe(true);
    }
  });
});

describe('rosterForOgImage', () => {
  const r = rosterWith([
    p('rb1', 'RB', 9), // lower number wins the default depthRank tie
    p('rb2', 'RB', 21),
  ]);

  it('with no order param, returns the roster unchanged (default order)', () => {
    expect(rosterForOgImage(r, null)).toBe(r);
    expect(featuredStarters(rosterForOgImage(r, null))).toEqual([{ label: 'RB', name: 'rb1' }]);
  });

  it('with a valid order param, applies the shared override so the featured starter changes', () => {
    const order = encodeDepthOrder({ RB: ['rb2', 'rb1'] });
    const applied = rosterForOgImage(r, order);
    expect(featuredStarters(applied)).toEqual([{ label: 'RB', name: 'rb2' }]);
  });

  it('with a malformed order param, degrades to the default order instead of throwing', () => {
    expect(() => rosterForOgImage(r, 'not-valid-base64url-json')).not.toThrow();
    expect(featuredStarters(rosterForOgImage(r, 'not-valid-base64url-json'))).toEqual([
      { label: 'RB', name: 'rb1' },
    ]);
  });
});

describe('readableTextOn', () => {
  it('returns dark text on a light background and white on a dark one', () => {
    expect(readableTextOn('#ffffff')).toBe('#0a0e1a');
    expect(readableTextOn('#002244')).toBe('#ffffff');
  });

  it("the chosen text clears large-text AA on every team's brand primary", () => {
    // OG card text is large (132px name / 44px city), so WCAG AA is 3:1, not 4.5.
    // A few brand primaries are mid-tone (teal/blue) where neither pure white nor
    // near-black hits 4.5 — they comfortably clear the large-text bar.
    const LARGE_AA = 3;
    for (const roster of Object.values(TEAMS)) {
      const bg = roster.team.colors.primary;
      expect(
        contrastRatio(readableTextOn(bg), bg),
        `${roster.team.id} primary ${bg}`
      ).toBeGreaterThanOrEqual(LARGE_AA);
    }
  });
});
