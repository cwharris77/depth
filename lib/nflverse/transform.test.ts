import { describe, it, expect } from 'vitest';
import { toPlayerStatsRows } from './transform';

const CROSSWALK = new Map([
  ['00-0033873', 'espn-mahomes'],
  ['00-0034796', 'espn-brown'],
]);
const KNOWN = new Set(['espn-mahomes', 'espn-brown']);

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
      KNOWN
    );
    expect(skipped).toBe(0);
    expect(rows).toEqual([
      {
        player_id: 'espn-mahomes',
        season: 2024,
        season_type: 'REG',
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
      KNOWN
    );
    expect(rows).toEqual([]);
    expect(skipped).toBe(1);
  });

  it('skips a row whose crosswalked espn_id is not a known player', () => {
    const { rows, skipped } = toPlayerStatsRows(
      [{ player_id: '00-0033873', season: '2024', season_type: 'REG', games: '10' }],
      CROSSWALK,
      new Set() // no known players
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
      KNOWN
    );
    expect(rows[0].receptions).toBeNull();
    expect(rows[0].receiving_yards).toBeNull();
    expect(rows[0].games).toBe(16);
  });

  it('passes POST rows through with their season_type', () => {
    const { rows } = toPlayerStatsRows(
      [{ player_id: '00-0033873', season: '2024', season_type: 'POST', games: '3' }],
      CROSSWALK,
      KNOWN
    );
    expect(rows[0].season_type).toBe('POST');
  });
});
