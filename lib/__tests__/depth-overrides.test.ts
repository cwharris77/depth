import { describe, it, expect } from 'vitest';
import type { Player, TeamRoster } from '../types';
import { applyTeamOverride, moveInOrder } from '../depth-overrides';
import { getPlayersByPosition } from '../roster';

function player(
  p: Partial<Player> & Pick<Player, 'id' | 'position' | 'depthRank' | 'number'>
): Player {
  return {
    name: p.id,
    status: 'backup',
    age: 25,
    college: '—',
    experience: 3,
    height: '6-0',
    weight: 200,
    bio: '',
    ...p,
  };
}

function roster(players: Player[]): TeamRoster {
  return {
    team: {
      id: 't',
      city: 'C',
      name: 'N',
      abbrev: 'T',
      conference: 'AFC',
      division: 'West',
      colors: {
        primary: '#111',
        secondary: '#222',
        accent: '#333',
        uiAccent: '#4CC3FF',
        onAccent: '#000',
      },
    },
    players,
    specialTeams: [],
    uniforms: [],
  };
}

describe('moveInOrder', () => {
  it('swaps a player up', () => {
    expect(moveInOrder(['a', 'b', 'c'], 'b', 'up')).toEqual(['b', 'a', 'c']);
  });
  it('swaps a player down', () => {
    expect(moveInOrder(['a', 'b', 'c'], 'b', 'down')).toEqual(['a', 'c', 'b']);
    expect(moveInOrder(['a', 'b', 'c'], 'a', 'down')).toEqual(['b', 'a', 'c']);
  });
  it('no-ops at the ends and returns the same reference', () => {
    const ids = ['a', 'b'];
    expect(moveInOrder(ids, 'a', 'up')).toBe(ids);
    expect(moveInOrder(ids, 'b', 'down')).toBe(ids);
  });
  it('ignores an unknown id', () => {
    const ids = ['a', 'b'];
    expect(moveInOrder(ids, 'z', 'up')).toBe(ids);
  });
});

describe('applyTeamOverride', () => {
  const base = roster([
    player({ id: 'qb1', position: 'QB', depthRank: 1, number: 7, status: 'starter' }),
    player({ id: 'qb2', position: 'QB', depthRank: 2, number: 19, status: 'backup' }),
    player({ id: 'rb1', position: 'RB', depthRank: 1, number: 22, status: 'starter' }),
  ]);

  it('returns the roster unchanged when there is no override', () => {
    expect(applyTeamOverride(base, undefined)).toBe(base);
    expect(applyTeamOverride(base, {})).toBe(base);
  });

  it("reorders a position so getPlayersByPosition reflects the user's order", () => {
    const out = applyTeamOverride(base, { QB: ['qb2', 'qb1'] });
    const qbs = getPlayersByPosition(out, 'QB').map((p) => p.id);
    expect(qbs).toEqual(['qb2', 'qb1']);
  });

  it('promotes the new first player to starter and demotes the old one', () => {
    const out = applyTeamOverride(base, { QB: ['qb2', 'qb1'] });
    const [first, second] = getPlayersByPosition(out, 'QB');
    expect(first.id).toBe('qb2');
    expect(first.depthRank).toBe(1);
    expect(first.status).toBe('starter');
    expect(second.depthRank).toBe(2);
    expect(second.status).toBe('backup');
  });

  it('does not touch positions without an override', () => {
    const out = applyTeamOverride(base, { QB: ['qb2', 'qb1'] });
    expect(getPlayersByPosition(out, 'RB').map((p) => p.id)).toEqual(['rb1']);
  });

  it('keeps a full custom order past the top 3 (order beats jersey number)', () => {
    const wrs = roster([
      player({ id: 'w1', position: 'WR', depthRank: 1, number: 10 }),
      player({ id: 'w2', position: 'WR', depthRank: 1, number: 11 }),
      player({ id: 'w3', position: 'WR', depthRank: 1, number: 12 }),
      player({ id: 'w4', position: 'WR', depthRank: 1, number: 13 }),
    ]);
    // User pulls the 4th WR up to 3rd.
    const out = applyTeamOverride(wrs, { WR: ['w1', 'w2', 'w4', 'w3'] });
    expect(getPlayersByPosition(out, 'WR').map((p) => p.id)).toEqual(['w1', 'w2', 'w4', 'w3']);
  });

  it('appends players the override omits, in default order, after the listed ones', () => {
    const wrs = roster([
      player({ id: 'w1', position: 'WR', depthRank: 1, number: 10 }),
      player({ id: 'w2', position: 'WR', depthRank: 2, number: 11 }),
      player({ id: 'w3', position: 'WR', depthRank: 3, number: 12 }),
    ]);
    const out = applyTeamOverride(wrs, { WR: ['w3'] });
    expect(getPlayersByPosition(out, 'WR').map((p) => p.id)).toEqual(['w3', 'w1', 'w2']);
  });

  it('ignores ids that are no longer on the roster', () => {
    const out = applyTeamOverride(base, { QB: ['gone', 'qb2', 'qb1'] });
    expect(getPlayersByPosition(out, 'QB').map((p) => p.id)).toEqual(['qb2', 'qb1']);
  });

  it('preserves a rookie/injured status instead of forcing starter/backup', () => {
    const r = roster([
      player({ id: 'a', position: 'TE', depthRank: 2, number: 80, status: 'rookie' }),
      player({ id: 'b', position: 'TE', depthRank: 1, number: 88, status: 'starter' }),
    ]);
    const out = applyTeamOverride(r, { TE: ['a', 'b'] });
    const [first, second] = getPlayersByPosition(out, 'TE');
    expect(first.id).toBe('a');
    expect(first.status).toBe('rookie'); // stays rookie even though now rank 1
    expect(second.status).toBe('backup');
  });

  it('does not mutate the input roster', () => {
    const snapshot = JSON.parse(JSON.stringify(base));
    applyTeamOverride(base, { QB: ['qb2', 'qb1'] });
    expect(base).toEqual(snapshot);
  });
});
