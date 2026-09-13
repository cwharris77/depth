import { describe, it, expect } from 'vitest';
import {
  toPlayerRawRows,
  toPlayRawRows,
  playerRawConflictTarget,
  playRawConflictTarget,
  type PlayerRawSpec,
  type PlayRawSpec,
  type RawCrosswalks,
} from './raw-stats';

const CROSSWALKS: RawCrosswalks = {
  gsis: new Map([['00-1', 'espn-1']]),
  pfr: new Map([['MahPa00', 'espn-1']]),
};

const seasonSpec: PlayerRawSpec = {
  table: 'nflverse_player_season',
  source: 'nflverse-player-season',
  grain: 'season',
  idColumn: 'player_id',
  idKind: 'gsis',
  seasonType: 'REG+POST',
  columns: [
    { name: 'player_display_name', type: 'text' },
    { name: 'games', type: 'numeric' },
    { name: 'fg_made_list', type: 'text' },
  ],
};

const weekSpec: PlayerRawSpec = {
  table: 'pfr_player_week',
  source: 'pfr-player-week',
  grain: 'week',
  idColumn: 'pfr_player_id',
  idKind: 'pfr',
  partition: 'stat_category',
  columns: [{ name: 'times_pressured', type: 'numeric' }],
};

const qbrSpec: PlayerRawSpec = {
  table: 'espn_qbr_week',
  source: 'espn-qbr-week',
  grain: 'week',
  idColumn: 'player_id',
  idKind: 'espn',
  weekColumn: 'game_week',
  columns: [{ name: 'qbr_total', type: 'numeric' }],
};

const ftnSpec: PlayRawSpec = {
  table: 'ftn_play',
  source: 'ftn-play',
  grain: 'play',
  keyColumns: ['ftn_game_id', 'ftn_play_id'],
  columns: [
    { name: 'ftn_game_id', type: 'text' },
    { name: 'ftn_play_id', type: 'numeric' },
    { name: 'is_play_action', type: 'boolean' },
    { name: 'n_pass_rushers', type: 'numeric' },
  ],
};

describe('toPlayerRawRows', () => {
  it('keeps every source column, coercing empties and malformed numerics to null', () => {
    const { rows, skipped, unresolved } = toPlayerRawRows(
      seasonSpec,
      [
        {
          player_id: '00-1',
          season: '2024',
          player_display_name: 'Patrick Mahomes',
          games: '17',
          fg_made_list: '42;50',
        },
      ],
      CROSSWALKS
    );
    expect({ skipped, unresolved }).toEqual({ skipped: 0, unresolved: 0 });
    expect(rows[0]).toMatchObject({ player_id: 'espn-1', games: 17, fg_made_list: '42;50' });
  });

  it('lands a crosswalk miss with a null player_id instead of dropping it', () => {
    const { rows, unresolved } = toPlayerRawRows(
      seasonSpec,
      [{ player_id: '00-999', season: '2024' }],
      CROSSWALKS
    );
    expect(unresolved).toBe(1);
    expect(rows[0].player_id).toBeNull();
  });

  it('skips rows with no source id or an unusable season', () => {
    const { rows, skipped } = toPlayerRawRows(
      seasonSpec,
      [{ season: '2024' }, { player_id: '00-1', season: '' }],
      CROSSWALKS
    );
    expect(rows).toHaveLength(0);
    expect(skipped).toBe(2);
  });

  it('resolves pfr ids and stamps the partition for a split source', () => {
    const { rows } = toPlayerRawRows(
      weekSpec,
      [{ pfr_player_id: 'MahPa00', season: '2024', week: '3', times_pressured: '11' }],
      CROSSWALKS,
      'pass'
    );
    expect(rows[0]).toMatchObject({
      player_id: 'espn-1',
      week: 3,
      stat_category: 'pass',
      times_pressured: 11,
    });
  });

  it('takes an ESPN id directly and reads the week from weekColumn', () => {
    const { rows } = toPlayerRawRows(
      qbrSpec,
      [{ player_id: '3139477', season: '2024', game_week: '5', qbr_total: '72.1' }],
      CROSSWALKS
    );
    expect(rows[0]).toMatchObject({ player_id: '3139477', week: 5, qbr_total: 72.1 });
  });

  // DEP-558: the regpost file's season_type is a coverage flag (REG = no postseason berth,
  // REG+POST = berth, POST = postseason-only), not a grain. Landing it verbatim left the
  // season table mixed, so a canonical read filtering REG dropped every playoff player.
  it('pins a coverage-flag season_type to the table grain', () => {
    const { rows } = toPlayerRawRows(
      seasonSpec,
      [
        { player_id: '00-1', season: '2024', season_type: 'REG' },
        { player_id: '00-2', season: '2024', season_type: 'POST' },
        { player_id: '00-1', season: '2024' },
      ],
      CROSSWALKS
    );
    expect(rows.map((row) => row.season_type)).toEqual(['REG+POST', 'REG+POST', 'REG+POST']);
  });

  it('keeps the source season_type when a spec does not pin one', () => {
    const { rows } = toPlayerRawRows(
      weekSpec,
      [
        {
          pfr_player_id: 'MahPa00',
          season: '2024',
          week: '3',
          season_type: 'POST',
        },
      ],
      CROSSWALKS,
      'pass'
    );
    expect(rows[0].season_type).toBe('POST');
  });
});

describe('toPlayRawRows', () => {
  it('coerces booleans/numerics and requires the key columns', () => {
    const { rows, skipped } = toPlayRawRows(ftnSpec, [
      { ftn_game_id: 'g1', ftn_play_id: '10', is_play_action: 'TRUE', n_pass_rushers: '4' },
      { ftn_game_id: 'g1', ftn_play_id: '', is_play_action: 'FALSE' },
    ]);
    expect(skipped).toBe(1);
    expect(rows[0]).toMatchObject({
      ftn_game_id: 'g1',
      ftn_play_id: 10,
      is_play_action: true,
      n_pass_rushers: 4,
    });
  });
});

describe('conflict targets', () => {
  it('matches each table primary key', () => {
    expect(playerRawConflictTarget(seasonSpec)).toBe('source_player_id,season,season_type');
    expect(playerRawConflictTarget(weekSpec)).toBe(
      'source_player_id,season,season_type,week,stat_category'
    );
    expect(playRawConflictTarget(ftnSpec)).toBe('ftn_game_id,ftn_play_id');
  });
});
