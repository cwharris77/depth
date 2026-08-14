import { describe, it, expect } from 'vitest';
import {
  parseCompareParams,
  COMPARE_POSITIONS,
  getDeepestPosition,
  buildCompareTeaser,
  buildComparePath,
} from '@/lib/utils/compare';
import type { Player, Position } from '@/lib/types';

const TEAM_IDS = ['seahawks', 'niners'];

describe('parseCompareParams', () => {
  it('resolves a valid pair of team ids and position', () => {
    expect(parseCompareParams({ a: 'seahawks', b: 'niners', pos: 'WR' }, TEAM_IDS)).toEqual({
      a: 'seahawks',
      b: 'niners',
      pos: 'WR',
    });
  });

  it('treats an unknown team id as unpicked rather than an error', () => {
    expect(parseCompareParams({ a: 'not-a-team', b: 'niners' }, TEAM_IDS)).toEqual({
      a: undefined,
      b: 'niners',
      pos: 'QB',
    });
  });

  it('defaults an invalid position to QB', () => {
    expect(parseCompareParams({ a: 'seahawks', b: 'niners', pos: 'XX' }, TEAM_IDS).pos).toBe('QB');
  });

  it('rejects a returner/long-snapper position not in the compare chip row', () => {
    expect(parseCompareParams({ pos: 'KR' }, TEAM_IDS).pos).toBe('QB');
  });

  it('defaults everything when params are missing', () => {
    expect(parseCompareParams({}, TEAM_IDS)).toEqual({ a: undefined, b: undefined, pos: 'QB' });
  });
});

describe('buildComparePath', () => {
  it('omits params that are missing', () => {
    expect(buildComparePath(undefined, undefined, undefined, undefined)).toBe('/compare?');
  });

  it('includes only the params that are set', () => {
    expect(buildComparePath('seahawks', 'niners', 'WR', undefined)).toBe(
      '/compare?a=seahawks&b=niners&pos=WR'
    );
  });

  it('adds from=schedule alongside scheduleTeam when a schedule origin is set', () => {
    expect(buildComparePath('seahawks', undefined, undefined, 'niners')).toBe(
      '/compare?a=seahawks&from=schedule&scheduleTeam=niners'
    );
  });
});

describe('COMPARE_POSITIONS', () => {
  it('excludes returner and long-snapper slots', () => {
    expect(COMPARE_POSITIONS).not.toContain('KR');
    expect(COMPARE_POSITIONS).not.toContain('PR');
    expect(COMPARE_POSITIONS).not.toContain('LS');
  });

  it('includes every granular position ESPN offers, not just the collapsed groups', () => {
    for (const pos of [
      'SS',
      'FS',
      'LDE',
      'RDE',
      'NT',
      'WLB',
      'LILB',
      'RILB',
      'SLB',
      'LCB',
      'RCB',
      'NB',
      'FB',
    ] as Position[]) {
      expect(COMPARE_POSITIONS).toContain(pos);
    }
  });
});

function makePlayer(id: string, overrides: Partial<Player> = {}): Player {
  return {
    id,
    name: id,
    number: 1,
    position: 'WR',
    depthRank: 1,
    status: 'starter',
    age: 25,
    college: 'Test State',
    experience: 2,
    height: '6-1',
    weight: 205,
    bio: '',
    ...overrides,
  };
}

describe('getDeepestPosition', () => {
  const positions: Position[] = ['QB', 'WR', 'RB'];

  it('returns undefined when every position is empty on both sides', () => {
    expect(getDeepestPosition([[], [], []], [[], [], []], positions)).toBeUndefined();
  });

  it('picks the position with the most combined depth', () => {
    const playersA = [
      [makePlayer('qbA')],
      [makePlayer('wrA1'), makePlayer('wrA2')],
      [makePlayer('rbA')],
    ];
    const playersB = [
      [makePlayer('qbB')],
      [makePlayer('wrB1')],
      [makePlayer('rbB1'), makePlayer('rbB2'), makePlayer('rbB3')],
    ];
    expect(getDeepestPosition(playersA, playersB, positions)).toBe('RB');
  });

  it('breaks ties by earliest position in the list', () => {
    const playersA = [
      [makePlayer('qbA1'), makePlayer('qbA2')],
      [makePlayer('wrA1'), makePlayer('wrA2')],
      [],
    ];
    const playersB = [[], [], []];
    expect(getDeepestPosition(playersA, playersB, positions)).toBe('QB');
  });

  it('counts depth from either side independently', () => {
    const playersA = [[], [makePlayer('wrA')], []];
    const playersB = [[makePlayer('qbB')], [], []];
    expect(getDeepestPosition(playersA, playersB, positions)).toBe('QB');
  });
});

describe('buildCompareTeaser', () => {
  const positions: Position[] = ['QB', 'WR'];

  it('returns undefined when there is nothing to tease', () => {
    expect(buildCompareTeaser([[], []], [[], []], positions)).toBeUndefined();
  });

  it('builds a preview from the deepest position, rank-1 player first', () => {
    const wrA1 = makePlayer('wrA1', { name: 'Metcalf' });
    const wrA2 = makePlayer('wrA2', { name: 'Lockett', depthRank: 2 });
    const wrB1 = makePlayer('wrB1', { name: 'Aiyuk' });
    const playersA = [[makePlayer('qbA')], [wrA1, wrA2]];
    const playersB = [[makePlayer('qbB')], [wrB1]];
    expect(buildCompareTeaser(playersA, playersB, positions)).toEqual({
      position: 'WR',
      countA: 2,
      countB: 1,
      topA: wrA1,
      topB: wrB1,
    });
  });

  it('leaves topA/topB undefined when only one side has players at the deepest position', () => {
    const wrA1 = makePlayer('wrA1');
    const playersA = [[], [wrA1, makePlayer('wrA2')]];
    const playersB = [[], []];
    const teaser = buildCompareTeaser(playersA, playersB, positions);
    expect(teaser?.position).toBe('WR');
    expect(teaser?.countA).toBe(2);
    expect(teaser?.countB).toBe(0);
    expect(teaser?.topA).toEqual(wrA1);
    expect(teaser?.topB).toBeUndefined();
  });

  it('guards against a positions array longer than the players arrays rather than throwing', () => {
    const qbA1 = makePlayer('qbA1');
    // positions has 2 entries (QB, WR) but playersA/playersB only have 1 entry each,
    // so index 1 (WR) is out of bounds on both sides — buildCompareTeaser must not
    // throw a TypeError indexing playersA[1]/playersB[1] (getDeepestPosition already
    // guards this with `?? 0`; buildCompareTeaser needs the same optional chaining).
    const playersA = [[qbA1]];
    const playersB = [[]];
    expect(() => buildCompareTeaser(playersA, playersB, positions)).not.toThrow();
    const teaser = buildCompareTeaser(playersA, playersB, positions);
    expect(teaser).toEqual({
      position: 'QB',
      countA: 1,
      countB: 0,
      topA: qbA1,
      topB: undefined,
    });
  });
});
