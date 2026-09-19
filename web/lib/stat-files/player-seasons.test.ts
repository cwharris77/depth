import { describe, expect, it } from 'vitest';
import {
  buildPlayerSeasonsFile,
  consolidateSeason,
  normalizeSeasonType,
  toPlayerWeekRows,
  type PlayerWeekRow,
  type WeeklyCsvRow,
} from './player-seasons';

const GSIS = new Map([
  ['00-0001', 'espn-1'],
  ['00-0002', 'espn-2'],
]);
const PFR = new Map([['PlayA00', 'espn-1']]);

function box(overrides: WeeklyCsvRow): WeeklyCsvRow {
  return {
    player_id: '00-0001',
    season: '2025',
    week: '1',
    season_type: 'REG',
    game_id: `2025_${overrides.week ?? '1'}_BUF_MIA`,
    team: 'BUF',
    ...overrides,
  };
}

function toBox(csv: WeeklyCsvRow[]): PlayerWeekRow[] {
  return toPlayerWeekRows(csv, {
    idColumn: 'player_id',
    crosswalk: GSIS,
    teamColumn: 'team',
    seasonTypeColumn: 'season_type',
    weekColumn: 'week',
    resolveTeam: (code) => code,
  }).rows;
}

describe('normalizeSeasonType', () => {
  it('maps every source label to REG or POST', () => {
    expect(normalizeSeasonType('REG')).toBe('REG');
    expect(normalizeSeasonType('Regular')).toBe('REG');
    expect(normalizeSeasonType('')).toBe('REG');
    expect(normalizeSeasonType('POST')).toBe('POST');
    expect(normalizeSeasonType('Postseason')).toBe('POST');
    expect(normalizeSeasonType('WC')).toBe('POST');
    expect(normalizeSeasonType('DIV')).toBe('POST');
    expect(normalizeSeasonType('SB')).toBe('POST');
  });
});

describe('toPlayerWeekRows', () => {
  it('counts a crosswalk miss instead of guessing identity', () => {
    const result = toPlayerWeekRows([box({ player_id: '00-unknown' })], {
      idColumn: 'player_id',
      crosswalk: GSIS,
      teamColumn: 'team',
      seasonTypeColumn: 'season_type',
      weekColumn: 'week',
    });
    expect(result.rows).toHaveLength(0);
    expect(result.unresolved).toBe(1);
  });

  it('drops a row with no usable season or week', () => {
    const result = toPlayerWeekRows([box({ week: '' })], {
      idColumn: 'player_id',
      crosswalk: GSIS,
      teamColumn: 'team',
      seasonTypeColumn: 'season_type',
      weekColumn: 'week',
    });
    expect(result.rows).toHaveLength(0);
    expect(result.skipped).toBe(1);
  });
});

describe('consolidateSeason', () => {
  it('splits REG and POST totals from the weekly rows', () => {
    const rows = toBox([
      box({ week: '1', passing_yards: '300', attempts: '30', completions: '20' }),
      box({ week: '2', passing_yards: '200' }),
      box({ week: '3', passing_yards: '368' }),
      box({ week: '1', season_type: 'POST', game_id: 'post1', passing_yards: '250' }),
      box({ week: '2', season_type: 'POST', game_id: 'post2', passing_yards: '100' }),
    ]);
    const result = consolidateSeason(2025, { box: rows });
    const regular = result.find((row) => row.season_type === 'REG');
    const post = result.find((row) => row.season_type === 'POST');
    expect(regular?.box?.passing_yards).toBe(868);
    expect(regular?.box?.games).toBe(3);
    expect(post?.box?.passing_yards).toBe(350);
    expect(post?.box?.games).toBe(2);
  });

  it('keeps a punter’s box line', () => {
    const rows = toBox([
      box({ week: '1', pt_att: '5', pt_yards: '220', pt_long: '60' }),
      box({ week: '2', pt_att: '5', pt_yards: '180', pt_long: '48' }),
    ]);
    const [row] = consolidateSeason(2025, { box: rows });
    expect(row.box?.pt_att).toBe(10);
    expect(row.box?.pt_yards).toBe(400);
    expect(row.box?.pt_long).toBe(60);
  });

  it('recomputes a rate from summed components, never the mean of weekly rates', () => {
    const rows = toBox([
      box({ week: '1', fg_made: '2', fg_att: '3', fg_pct: '0.667' }),
      box({ week: '2', fg_made: '1', fg_att: '1', fg_pct: '1' }),
    ]);
    const [row] = consolidateSeason(2025, { box: rows });
    expect(row.box?.fg_pct).toBeCloseTo(0.75, 10);
    // The naive mean of the weekly percentages would be 0.833, so this pins the rule.
    expect(row.box?.fg_pct).not.toBeCloseTo(0.833, 3);
  });

  it('weights a per-attempt mean by attempts', () => {
    const rows = toPlayerWeekRows(
      [
        {
          player_gsis_id: '00-0001',
          season: '2025',
          week: '1',
          season_type: 'REG',
          team_abbr: 'BUF',
          avg_time_to_throw: '2.0',
          attempts: '10',
        },
        {
          player_gsis_id: '00-0001',
          season: '2025',
          week: '2',
          season_type: 'REG',
          team_abbr: 'BUF',
          avg_time_to_throw: '3.0',
          attempts: '30',
        },
      ],
      {
        idColumn: 'player_gsis_id',
        crosswalk: GSIS,
        teamColumn: 'team_abbr',
        seasonTypeColumn: 'season_type',
        weekColumn: 'week',
      }
    ).rows;
    const [row] = consolidateSeason(2025, { ngs: rows });
    expect(row.ngs?.avg_time_to_throw).toBeCloseTo(2.75, 10);
  });

  it('recomputes a season snap share from per-game snaps and pct', () => {
    const rows = toPlayerWeekRows(
      [
        {
          pfr_player_id: 'PlayA00',
          season: '2025',
          week: '1',
          game_type: 'REG',
          team: 'BUF',
          offense_snaps: '60',
          offense_pct: '0.75',
        },
        {
          pfr_player_id: 'PlayA00',
          season: '2025',
          week: '2',
          game_type: 'REG',
          team: 'BUF',
          offense_snaps: '40',
          offense_pct: '0.5',
        },
      ],
      {
        idColumn: 'pfr_player_id',
        crosswalk: PFR,
        teamColumn: 'team',
        seasonTypeColumn: 'game_type',
        weekColumn: 'week',
      }
    ).rows;
    const [row] = consolidateSeason(2025, { snaps: rows });
    expect(row.snaps?.offense_snaps).toBe(100);
    expect(row.snaps?.offense_pct).toBeCloseTo(0.625, 10);
    expect(row.snaps?.defense_snaps).toBeUndefined();
  });

  it('omits a section whose source has no rows', () => {
    const rows = toBox([box({ passing_yards: '10' })]);
    const [row] = consolidateSeason(2025, { box: rows });
    expect(row.box).toBeDefined();
    expect(row.snaps).toBeUndefined();
    expect(row.pfr).toBeUndefined();
    expect(row.ngs).toBeUndefined();
    expect(row.qbr).toBeUndefined();
  });

  it('keeps one row per team for a traded player, never a combined total', () => {
    const rows = toBox([
      box({ team: 'BUF', week: '1', passing_yards: '100' }),
      box({ team: 'MIA', week: '10', game_id: 'm10', passing_yards: '200' }),
    ]);
    const result = consolidateSeason(2025, { box: rows });
    expect(result).toHaveLength(2);
    expect(result.map((row) => row.team).sort()).toEqual(['BUF', 'MIA']);
    expect(result.find((row) => row.team === 'BUF')?.box?.passing_yards).toBe(100);
    expect(result.find((row) => row.team === 'MIA')?.box?.passing_yards).toBe(200);
  });

  it('is deterministic regardless of input order', () => {
    const rows = toBox([
      box({ week: '1', passing_yards: '300', fg_made: '1', fg_att: '2' }),
      box({ week: '2', passing_yards: '200', fg_made: '2', fg_att: '3' }),
      box({ week: '3', passing_yards: '100', fg_made: '0', fg_att: '1' }),
    ]);
    const forward = JSON.stringify(consolidateSeason(2025, { box: rows }));
    const reverse = JSON.stringify(consolidateSeason(2025, { box: [...rows].reverse() }));
    expect(reverse).toBe(forward);
  });

  it('filters rows from other seasons', () => {
    const rows = toBox([box({ season: '2024', week: '1', passing_yards: '111' })]);
    expect(consolidateSeason(2025, { box: rows })).toHaveLength(0);
  });
});

describe('buildPlayerSeasonsFile', () => {
  it('strips the player id from each row and orders seasons newest first', () => {
    const rows = consolidateSeason(2025, {
      box: toBox([box({ passing_yards: '10' })]),
    }).concat(
      consolidateSeason(2024, {
        box: toBox([box({ season: '2024', passing_yards: '20' })]),
      })
    );
    const file = buildPlayerSeasonsFile('espn-1', rows, 1);
    expect(file.player_id).toBe('espn-1');
    expect(file.seasons.map((season) => season.season)).toEqual([2025, 2024]);
    expect('player_id' in file.seasons[0]).toBe(false);
  });
});
