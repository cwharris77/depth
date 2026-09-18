import { describe, it, expect } from 'vitest';
import { getPlayersByPosition, playersInSeats, seatsOf } from './roster';
import type { DepthSeat, Player, TeamRosterSeed } from '@/lib/types';

function player(p: Pick<Player, 'id' | 'position' | 'depthRank' | 'number'>): Player {
  return {
    name: p.id,
    status: 'starter',
    age: 25,
    college: '',
    experience: 1,
    height: '6\'0"',
    weight: 200,
    bio: '',
    ...p,
  } as Player;
}

function roster(players: Player[], depthChart?: DepthSeat[]): TeamRosterSeed {
  return {
    team: { id: 't' } as TeamRosterSeed['team'],
    players,
    specialTeams: [],
    depthChart,
  };
}

describe('seats: identity and position are separate (DEP-585)', () => {
  const LT1 = player({ id: 'lt1', position: 'LT', depthRank: 1, number: 77 });
  const SWING = player({ id: 'swing', position: 'LT', depthRank: 2, number: 70 });
  const seats: DepthSeat[] = [
    { position: 'LT', depthRank: 1, playerId: 'lt1' },
    { position: 'LT', depthRank: 2, playerId: 'swing' },
    { position: 'RT', depthRank: 1, playerId: 'swing' },
  ];

  it('seats a cross-listed athlete at both of his positions', () => {
    const r = roster([LT1, SWING], seats);
    expect(getPlayersByPosition(r, 'LT').map((p) => p.id)).toEqual(['lt1', 'swing']);
    expect(getPlayersByPosition(r, 'RT').map((p) => p.id)).toEqual(['swing']);
  });

  it("projects the seat's position and rank onto the athlete, not the player row's", () => {
    const [rt1] = getPlayersByPosition(roster([LT1, SWING], seats), 'RT');
    expect(rt1.position).toBe('RT');
    expect(rt1.depthRank).toBe(1);
    // The underlying identity row is untouched.
    expect(SWING.position).toBe('LT');
  });

  it('skips a seat naming an athlete the roster does not carry', () => {
    const r = roster([LT1], [{ position: 'RT', depthRank: 1, playerId: 'ghost' }]);
    expect(getPlayersByPosition(r, 'RT')).toEqual([]);
  });

  it('derives one seat per player when there is no depth chart (historical seasons)', () => {
    const r = roster([LT1, SWING]);
    expect(seatsOf(r)).toEqual([
      { position: 'LT', depthRank: 1, playerId: 'lt1' },
      { position: 'LT', depthRank: 2, playerId: 'swing' },
    ]);
    expect(getPlayersByPosition(r, 'LT').map((p) => p.id)).toEqual(['lt1', 'swing']);
  });

  it('keeps byDepthOrder within a seated pool', () => {
    const r = roster(
      [
        player({ id: 'b', position: 'WR', depthRank: 1, number: 16 }),
        player({ id: 'a', position: 'WR', depthRank: 1, number: 11 }),
      ],
      [
        { position: 'WR', depthRank: 1, playerId: 'b' },
        { position: 'WR', depthRank: 1, playerId: 'a' },
      ]
    );
    expect(playersInSeats(r, (p) => p === 'WR').map((p) => p.id)).toEqual(['a', 'b']);
  });
});
