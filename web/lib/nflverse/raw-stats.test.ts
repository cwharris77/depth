import { describe, it, expect } from 'vitest';
import { toRawSourceRows, rawConflictTarget, type RawTableSpec } from './raw-stats';

const seasonSpec: RawTableSpec = {
  table: 'nflverse_player_season',
  source: 'nflverse-player-season',
  grain: 'season',
  columns: [
    { name: 'player_display_name', type: 'text' },
    { name: 'games', type: 'numeric' },
    { name: 'fg_made_list', type: 'text' },
  ],
};

const weekSpec: RawTableSpec = {
  table: 'nflverse_player_week',
  source: 'nflverse-player-week',
  grain: 'week',
  columns: [{ name: 'passing_yards', type: 'numeric' }],
};

const CROSSWALK = new Map([['00-1', 'espn-1']]);

describe('toRawSourceRows', () => {
  it('keeps every source column, coercing empties and malformed numerics to null', () => {
    const { rows, skipped, unresolved } = toRawSourceRows(
      seasonSpec,
      [
        {
          player_id: '00-1',
          season: '2024',
          season_type: 'REG',
          player_display_name: 'Patrick Mahomes',
          games: '17',
          fg_made_list: '42;50;29',
        },
      ],
      CROSSWALK
    );
    expect(skipped).toBe(0);
    expect(unresolved).toBe(0);
    expect(rows).toEqual([
      {
        source_player_id: '00-1',
        player_id: 'espn-1',
        season: 2024,
        season_type: 'REG',
        player_display_name: 'Patrick Mahomes',
        games: 17,
        fg_made_list: '42;50;29',
      },
    ]);
  });

  it('zeroes no data: empty and malformed cells become null, never 0', () => {
    const { rows } = toRawSourceRows(
      seasonSpec,
      [{ player_id: '00-1', season: '2024', games: '', fg_made_list: 'x' }],
      CROSSWALK
    );
    // fg_made_list is text, so 'x' is preserved; only the numeric empty degrades.
    expect(rows[0].games).toBeNull();
    expect(rows[0].fg_made_list).toBe('x');
  });

  it('lands a crosswalk miss with a null player_id instead of dropping it', () => {
    const { rows, unresolved } = toRawSourceRows(
      seasonSpec,
      [{ player_id: '00-999', season: '2024' }],
      CROSSWALK
    );
    expect(unresolved).toBe(1);
    expect(rows).toHaveLength(1);
    expect(rows[0].player_id).toBeNull();
  });

  it('skips rows with no source id or an unusable season', () => {
    const { rows, skipped } = toRawSourceRows(
      seasonSpec,
      [{ season: '2024' }, { player_id: '00-1', season: 'not-a-year' }],
      CROSSWALK
    );
    expect(rows).toHaveLength(0);
    expect(skipped).toBe(2);
  });

  it('requires a valid week for a week-grain source', () => {
    const { rows, skipped } = toRawSourceRows(
      weekSpec,
      [
        { player_id: '00-1', season: '2024', week: '3', passing_yards: '280' },
        { player_id: '00-1', season: '2024', week: '', passing_yards: '10' },
      ],
      CROSSWALK
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].week).toBe(3);
    expect(rows[0].passing_yards).toBe(280);
    expect(skipped).toBe(1);
  });
});

describe('rawConflictTarget', () => {
  it('matches the table primary key per grain', () => {
    expect(rawConflictTarget(seasonSpec)).toBe('source_player_id,season,season_type');
    expect(rawConflictTarget(weekSpec)).toBe('source_player_id,season,season_type,week');
  });
});
