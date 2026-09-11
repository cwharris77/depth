import { describe, expect, it } from 'vitest';

import { buildRecentParticipation, type PlayerRecentSnapsRow } from './recent-participation';

const winningRow: PlayerRecentSnapsRow = {
  team_id: 'chiefs',
  season: 2025,
  player_id: '3139477',
  window_start_week: 15,
  window_end_week: 17,
  window_game_ids: ['g15', 'g16', 'g17'],
  games: 3,
  offense_snaps: 180,
  offense_pct: 1,
  defense_snaps: 0,
  defense_pct: 0,
  special_teams_snaps: 0,
  special_teams_pct: null,
  source: 'nflverse-pfr',
  updated_at: '2026-01-05T12:00:00.000Z',
};

describe('buildRecentParticipation', () => {
  it('selects the greatest season before the greatest timestamp and excludes stale players', () => {
    const rows: PlayerRecentSnapsRow[] = [
      {
        ...winningRow,
        season: 2024,
        player_id: 'previous-season',
        updated_at: '2026-08-24T12:00:00.000Z',
      },
      {
        ...winningRow,
        player_id: 'stale-player',
        updated_at: '2026-01-04T12:00:00.000Z',
      },
      winningRow,
    ];

    expect(buildRecentParticipation(rows)).toEqual({
      teamId: 'chiefs',
      season: 2025,
      windowStartWeek: 15,
      windowEndWeek: 17,
      gameIds: ['g15', 'g16', 'g17'],
      source: 'nflverse / Pro Football Reference',
      updatedAt: '2026-01-05T12:00:00.000Z',
      players: [
        {
          playerId: '3139477',
          offense: { snaps: 180, percentage: 1 },
          defense: { snaps: 0, percentage: 0 },
          specialTeams: { snaps: 0 },
        },
      ],
    });
  });

  it('sorts players by playerId', () => {
    const rows = [
      { ...winningRow, player_id: 'z-player' },
      { ...winningRow, player_id: 'a-player' },
    ];

    expect(buildRecentParticipation(rows)?.players.map((player) => player.playerId)).toEqual([
      'a-player',
      'z-player',
    ]);
  });

  it('returns undefined for empty rows', () => {
    expect(buildRecentParticipation([])).toBeUndefined();
  });

  it.each([
    ['team id', { team_id: 'eagles' }],
    ['window start', { window_start_week: 14 }],
    ['window end', { window_end_week: 18 }],
    ['window game ids', { window_game_ids: ['g15', 'g16'] }],
    ['game count', { games: 2 }],
    ['source', { source: 'other-source' }],
  ])('throws when winning rows disagree on %s', (_label, change) => {
    const rows = [winningRow, { ...winningRow, player_id: 'other-player', ...change }];

    expect(() => buildRecentParticipation(rows)).toThrow('inconsistent recent participation');
  });
});
