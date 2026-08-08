import { describe, it, expect } from 'vitest';
import { toTeamStatsRows } from './team-stats';

function csvRow(over: Record<string, string> = {}): Record<string, string> {
  return {
    team: 'KC',
    season: '2024',
    season_type: 'REG',
    games: '17',
    completions: '',
    attempts: '',
    passing_yards: '',
    passing_tds: '',
    passing_interceptions: '',
    carries: '',
    rushing_yards: '',
    rushing_tds: '',
    receptions: '',
    targets: '',
    receiving_yards: '',
    receiving_tds: '',
    ...over,
  };
}

describe('toTeamStatsRows', () => {
  it('transforms a happy row with scalar passing stats', () => {
    const { rows, skipped } = toTeamStatsRows([
      csvRow({
        completions: '392',
        attempts: '597',
        passing_yards: '4183',
        passing_tds: '26',
        passing_interceptions: '11',
        games: '17',
      }),
    ]);
    expect(skipped).toBe(0);
    expect(rows).toEqual([
      {
        team_id: 'chiefs',
        season: 2024,
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
      },
    ]);
  });

  it('transforms a happy row with scalar rushing stats', () => {
    const { skipped } = toTeamStatsRows([
      csvRow({
        carries: '480',
        rushing_yards: '2200',
        rushing_tds: '18',
      }),
    ]);
    expect(skipped).toBe(0);
  });

  it('skips a row with an unresolvable team code', () => {
    const { rows, skipped } = toTeamStatsRows([csvRow({ team: 'XYZ' })]);
    expect(rows).toEqual([]);
    expect(skipped).toBe(1);
  });

  it('resolves historic relocation codes', () => {
    const { rows, skipped } = toTeamStatsRows([
      csvRow({ team: 'OAK' }),
      csvRow({ team: 'SD' }),
      csvRow({ team: 'STL' }),
    ]);
    expect(skipped).toBe(0);
    const teamIds = rows.map((r) => r.team_id);
    expect(teamIds).toContain('raiders');
    expect(teamIds).toContain('chargers');
    expect(teamIds).toContain('rams');
  });

  it('coerces empty-string numerics to null', () => {
    const { rows } = toTeamStatsRows([
      csvRow({ passing_yards: '', carries: '' }),
    ]);
    expect(rows[0].passing_yards).toBeNull();
    expect(rows[0].carries).toBeNull();
  });

  it('coerces NaN-equivalent strings to null', () => {
    const { rows } = toTeamStatsRows([
      csvRow({ passing_yards: 'not-a-number' }),
    ]);
    expect(rows[0].passing_yards).toBeNull();
  });

  it('skips non-REG season_type rows', () => {
    const { rows, skipped } = toTeamStatsRows([csvRow({ season_type: 'POST' })]);
    expect(rows).toEqual([]);
    expect(skipped).toBe(1);
  });

  it('skips a row with a bad season value', () => {
    const { rows, skipped } = toTeamStatsRows([csvRow({ season: 'bad' })]);
    expect(rows).toEqual([]);
    expect(skipped).toBe(1);
  });

  it('skips a row with missing team field', () => {
    const { rows, skipped } = toTeamStatsRows([csvRow({ team: '' })]);
    expect(rows).toEqual([]);
    expect(skipped).toBe(1);
  });

  it('fetch and parse are independently testable: parse does not depend on fetch', () => {
    const csvText = 'team,season,season_type,games,passing_yards\nKC,2024,REG,17,4183\n';
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',');
    const rows = lines.slice(1).map((line) => {
      const vals = line.split(',');
      return Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? '']));
    });
    const { rows: parsed, skipped } = toTeamStatsRows(rows);
    expect(skipped).toBe(0);
    expect(parsed).toEqual([
      {
        team_id: 'chiefs',
        season: 2024,
        games: 17,
        passing_yards: 4183,
        completions: null,
        attempts: null,
        passing_tds: null,
        passing_interceptions: null,
        carries: null,
        rushing_yards: null,
        rushing_tds: null,
        receptions: null,
        targets: null,
        receiving_yards: null,
        receiving_tds: null,
      },
    ]);
  });
});