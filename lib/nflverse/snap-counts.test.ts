import { describe, expect, it } from 'vitest';
import { toRecentSnapSummaries } from './snap-counts';

const pfrToEspn = new Map([
  ['MahoPa00', '3139477'],
  ['RiceRa00', '4426338'],
]);

const resolveTeam = (code: string): string | null =>
  ({
    KC: 'chiefs',
    OAK: 'raiders',
    SD: 'chargers',
    STL: 'rams',
    LA: 'rams',
    LAR: 'rams',
  })[code] ?? null;

function snapRow(overrides: Record<string, string> = {}): Record<string, string> {
  return {
    game_id: '2025_01_KC_LAC',
    season: '2025',
    game_type: 'REG',
    week: '1',
    player: 'Patrick Mahomes',
    pfr_player_id: 'MahoPa00',
    team: 'KC',
    offense_snaps: '60',
    offense_pct: '1',
    defense_snaps: '0',
    defense_pct: '0',
    st_snaps: '0',
    st_pct: '0',
    ...overrides,
  };
}

describe('toRecentSnapSummaries', () => {
  it('selects the latest three team games across a bye', () => {
    const result = toRecentSnapSummaries(
      [
        snapRow({ game_id: '2025_01_KC_LAC', week: '1' }),
        snapRow({ game_id: '2025_02_KC_PHI', week: '2' }),
        snapRow({ game_id: '2025_04_BAL_KC', week: '4' }),
        snapRow({ game_id: '2025_05_KC_JAX', week: '5', pfr_player_id: 'RiceRa00' }),
      ],
      pfrToEspn,
      resolveTeam
    );

    expect(result.rows[0]).toMatchObject({
      team_id: 'chiefs',
      season: 2025,
      player_id: '3139477',
      window_start_week: 2,
      window_end_week: 5,
      window_game_ids: ['2025_02_KC_PHI', '2025_04_BAL_KC', '2025_05_KC_JAX'],
      games: 3,
      offense_snaps: 120,
      offense_pct: 2 / 3,
      source: 'nflverse-pfr',
    });
    expect(result.diagnostics).toEqual({
      fetchedRows: 4,
      validRows: 4,
      malformedRows: 0,
      unresolvedRows: 0,
      selectedTeams: 1,
      selectedGames: 3,
      summaries: 2,
    });
  });

  it('keeps one- and two-game early-season windows', () => {
    const result = toRecentSnapSummaries(
      [
        snapRow({ season: '2024', game_id: '2024_01_KC_BAL' }),
        snapRow({ season: '2025', game_id: '2025_01_KC_LAC' }),
        snapRow({ season: '2025', game_id: '2025_02_KC_PHI', week: '2' }),
      ],
      pfrToEspn,
      resolveTeam
    );

    expect(result.rows).toEqual([
      expect.objectContaining({
        season: 2025,
        games: 2,
        window_game_ids: ['2025_01_KC_LAC', '2025_02_KC_PHI'],
      }),
      expect.objectContaining({ season: 2024, games: 1, window_game_ids: ['2024_01_KC_BAL'] }),
    ]);
  });

  it.each([
    ['OAK', 'raiders'],
    ['SD', 'chargers'],
    ['STL', 'rams'],
    ['LA', 'rams'],
    ['LAR', 'rams'],
  ])('normalizes %s through the injected resolver', (team, teamId) => {
    const result = toRecentSnapSummaries([snapRow({ team })], pfrToEspn, resolveTeam);
    expect(result.rows[0]?.team_id).toBe(teamId);
  });

  it('counts unresolved PFR identities without emitting a summary', () => {
    const result = toRecentSnapSummaries(
      [snapRow({ pfr_player_id: 'Unknown00' })],
      pfrToEspn,
      resolveTeam
    );

    expect(result.rows).toEqual([]);
    expect(result.diagnostics).toEqual({
      fetchedRows: 1,
      validRows: 1,
      malformedRows: 0,
      unresolvedRows: 1,
      selectedTeams: 1,
      selectedGames: 1,
      summaries: 0,
    });
  });

  it('zero-fills a player absent from a selected game when averaging percentages', () => {
    const result = toRecentSnapSummaries(
      [
        snapRow({ game_id: '2025_01_KC_LAC', offense_pct: '0.5' }),
        snapRow({ game_id: '2025_02_KC_PHI', week: '2', offense_pct: '0.5' }),
        snapRow({ game_id: '2025_03_KC_NYG', week: '3', pfr_player_id: 'RiceRa00' }),
      ],
      pfrToEspn,
      resolveTeam
    );

    expect(result.rows.find((row) => row.player_id === '3139477')).toMatchObject({
      games: 3,
      offense_snaps: 120,
      offense_pct: 1 / 3,
    });
  });

  it('treats blank count and percentage pairs as inactive zero-valued units', () => {
    const result = toRecentSnapSummaries(
      [snapRow({ defense_snaps: '', defense_pct: '', st_snaps: '', st_pct: '' })],
      pfrToEspn,
      resolveTeam
    );

    expect(result.rows[0]).toMatchObject({
      defense_snaps: 0,
      defense_pct: 0,
      special_teams_snaps: 0,
      special_teams_pct: 0,
    });
  });

  it.each([
    ['blank', ''],
    ['non-finite', 'Infinity'],
    ['negative', '-0.1'],
    ['greater than one', '1.1'],
  ])(
    'nulls only the unit aggregate for a positive count and %s percentage',
    (_name, offensePct) => {
      const result = toRecentSnapSummaries(
        [snapRow({ offense_pct: offensePct })],
        pfrToEspn,
        resolveTeam
      );

      expect(result.rows[0]).toMatchObject({
        offense_snaps: 60,
        offense_pct: null,
        defense_snaps: 0,
        defense_pct: 0,
        special_teams_snaps: 0,
        special_teams_pct: 0,
      });
    }
  );

  it('rejects every duplicate source row before aggregation', () => {
    const result = toRecentSnapSummaries(
      [snapRow({ offense_snaps: '60' }), snapRow({ offense_snaps: '40' })],
      pfrToEspn,
      resolveTeam
    );

    expect(result.rows).toEqual([]);
    expect(result.diagnostics).toMatchObject({ validRows: 0, malformedRows: 2, selectedGames: 0 });
  });

  it('filters POST rows and rejects missing identities, games, teams, weeks, and invalid counts', () => {
    const result = toRecentSnapSummaries(
      [
        snapRow({ game_type: 'POST' }),
        snapRow({ game_id: '' }),
        snapRow({ pfr_player_id: '' }),
        snapRow({ team: '' }),
        snapRow({ week: '' }),
        snapRow({ season: '2025.5' }),
        snapRow({ offense_snaps: '-1' }),
        snapRow({ defense_snaps: '1.5' }),
      ],
      pfrToEspn,
      resolveTeam
    );

    expect(result.rows).toEqual([]);
    expect(result.diagnostics).toEqual({
      fetchedRows: 8,
      validRows: 0,
      malformedRows: 7,
      unresolvedRows: 0,
      selectedTeams: 0,
      selectedGames: 0,
      summaries: 0,
    });
  });

  it('returns identical sorted rows and diagnostics when source rows are reversed', () => {
    const rows = [
      snapRow({ season: '2024', game_id: '2024_01_KC_BAL' }),
      snapRow({ season: '2025', game_id: '2025_02_KC_PHI', week: '2' }),
      snapRow({ season: '2025', game_id: '2025_01_KC_LAC', pfr_player_id: 'RiceRa00' }),
      snapRow({ season: '2025', game_id: '2025_03_KC_NYG', week: '3', pfr_player_id: 'RiceRa00' }),
    ];

    expect(toRecentSnapSummaries([...rows].reverse(), pfrToEspn, resolveTeam)).toEqual(
      toRecentSnapSummaries(rows, pfrToEspn, resolveTeam)
    );
  });
});
