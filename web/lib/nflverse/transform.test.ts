import { describe, it, expect } from 'vitest';
import { toPlayerStatsRows } from './transform';

const CROSSWALK = new Map([
  ['00-0033873', 'espn-mahomes'],
  ['00-0034796', 'espn-brown'],
]);
const KNOWN = new Set(['espn-mahomes', 'espn-brown']);
// Test double for lib/nflverse/team-codes.ts's resolveTeamCode -- KC/LAR only, so a
// row's code either resolves the same way the real map would or falls through to
// null, exercising both paths without pulling in the full 32-team table.
const resolveTeamCode = (code: string): string | null =>
  ({ KC: 'chiefs', LAR: 'rams' })[code] ?? null;

describe('toPlayerStatsRows', () => {
  it('transforms a happy QB row', () => {
    const { rows, skipped } = toPlayerStatsRows(
      [
        {
          player_id: '00-0033873',
          player_display_name: 'Patrick Mahomes',
          position: 'QB',
          season: '2024',
          season_type: 'REG',
          recent_team: 'KC',
          games: '17',
          completions: '392',
          attempts: '597',
          passing_yards: '4183',
          passing_tds: '26',
          passing_interceptions: '11',
        },
      ],
      CROSSWALK,
      KNOWN,
      resolveTeamCode
    );
    expect(skipped).toBe(0);
    expect(rows).toEqual([
      {
        player_id: 'espn-mahomes',
        season: 2024,
        season_type: 'REG',
        team_id: 'chiefs',
        games: 17,
        completions: 392,
        attempts: 597,
        passing_yards: 4183,
        passing_tds: 26,
        passing_interceptions: 11,
        carries: null,
        rushing_yards: null,
        rushing_tds: null,
        receptions: null,
        targets: null,
        receiving_yards: null,
        receiving_tds: null,
        def_tackles_solo: null,
        def_sacks: null,
        def_interceptions: null,
        fg_made: null,
        fg_att: null,
      },
    ]);
  });

  it('skips a row whose gsis_id has no crosswalk match', () => {
    const { rows, skipped } = toPlayerStatsRows(
      [{ player_id: '00-9999999', season: '2024', season_type: 'REG', games: '10' }],
      CROSSWALK,
      KNOWN,
      resolveTeamCode
    );
    expect(rows).toEqual([]);
    expect(skipped).toBe(1);
  });

  it('skips a row whose crosswalked espn_id is not a known player', () => {
    const { rows, skipped } = toPlayerStatsRows(
      [{ player_id: '00-0033873', season: '2024', season_type: 'REG', games: '10' }],
      CROSSWALK,
      new Set(), // no known players
      resolveTeamCode
    );
    expect(rows).toEqual([]);
    expect(skipped).toBe(1);
  });

  it('coerces empty-string numerics to null', () => {
    const { rows } = toPlayerStatsRows(
      [
        {
          player_id: '00-0034796',
          season: '2024',
          season_type: 'REG',
          games: '16',
          receptions: '',
          receiving_yards: '',
        },
      ],
      CROSSWALK,
      KNOWN,
      resolveTeamCode
    );
    expect(rows[0].receptions).toBeNull();
    expect(rows[0].receiving_yards).toBeNull();
    expect(rows[0].games).toBe(16);
  });

  it('writes a crosswalk-only match when requireCurrentRoster is false', () => {
    const { rows, skipped } = toPlayerStatsRows(
      [{ player_id: '00-0033873', season: '2013', season_type: 'REG', games: '16' }],
      CROSSWALK,
      new Set(), // no known (current-roster) players
      resolveTeamCode,
      { requireCurrentRoster: false }
    );
    expect(skipped).toBe(0);
    expect(rows).toHaveLength(1);
    expect(rows[0].player_id).toBe('espn-mahomes');
    expect(rows[0].season).toBe(2013);
  });

  it('still skips a row with no crosswalk match when requireCurrentRoster is false', () => {
    const { rows, skipped } = toPlayerStatsRows(
      [{ player_id: '00-9999999', season: '2013', season_type: 'REG', games: '10' }],
      CROSSWALK,
      new Set(),
      resolveTeamCode,
      { requireCurrentRoster: false }
    );
    expect(rows).toEqual([]);
    expect(skipped).toBe(1);
  });

  it('passes POST rows through with their season_type', () => {
    const { rows } = toPlayerStatsRows(
      [{ player_id: '00-0033873', season: '2024', season_type: 'POST', games: '3' }],
      CROSSWALK,
      KNOWN,
      resolveTeamCode
    );
    expect(rows[0].season_type).toBe('POST');
  });

  it('resolves recent_team to our team_id via the crosswalk fn', () => {
    const { rows } = toPlayerStatsRows(
      [
        {
          player_id: '00-0033873',
          season: '2024',
          season_type: 'REG',
          recent_team: 'LAR',
          games: '17',
        },
      ],
      CROSSWALK,
      KNOWN,
      resolveTeamCode
    );
    expect(rows[0].team_id).toBe('rams');
  });

  it('degrades an unresolvable team code to a null team_id, without dropping the row', () => {
    const { rows, skipped } = toPlayerStatsRows(
      [
        {
          player_id: '00-0033873',
          season: '2024',
          season_type: 'REG',
          recent_team: 'XYZ',
          games: '17',
        },
      ],
      CROSSWALK,
      KNOWN,
      resolveTeamCode
    );
    expect(skipped).toBe(0);
    expect(rows).toHaveLength(1);
    expect(rows[0].team_id).toBeNull();
  });

  it('degrades a missing recent_team column to a null team_id', () => {
    const { rows } = toPlayerStatsRows(
      [{ player_id: '00-0033873', season: '2024', season_type: 'REG', games: '17' }],
      CROSSWALK,
      KNOWN,
      resolveTeamCode
    );
    expect(rows[0].team_id).toBeNull();
  });
});
