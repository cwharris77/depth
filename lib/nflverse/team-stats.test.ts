import { describe, it, expect } from 'vitest';
import { parseDistanceList, toTeamStatsRows } from './team-stats';

describe('parseDistanceList', () => {
  it('parses a semicolon-delimited string into an integer array', () => {
    expect(parseDistanceList('42;50;29;47;34;28;33;57')).toEqual([42, 50, 29, 47, 34, 28, 33, 57]);
  });

  it('returns an empty array for an empty string', () => {
    expect(parseDistanceList('')).toEqual([]);
  });

  it('returns an empty array for undefined', () => {
    expect(parseDistanceList(undefined)).toEqual([]);
  });

  it('returns an empty array for whitespace-only strings', () => {
    expect(parseDistanceList('  ')).toEqual([]);
  });

  it('filters out NaN segments gracefully', () => {
    expect(parseDistanceList('42;abc;29')).toEqual([42, 29]);
  });

  it('handles a single value', () => {
    expect(parseDistanceList('42')).toEqual([42]);
  });
});

describe('toTeamStatsRows', () => {
  const resolveCode = (code: string) => (code === 'KC' ? 'chiefs' : null);

  it('transforms a happy-path row', () => {
    const { rows, skipped } = toTeamStatsRows(
      [
        {
          team: 'KC',
          season: '2024',
          season_type: 'REG',
          games: '17',
          completions: '392',
          attempts: '597',
          passing_yards: '4183',
          passing_tds: '26',
          passing_interceptions: '11',
        },
      ],
      resolveCode
    );
    expect(skipped).toBe(0);
    expect(rows).toHaveLength(1);
    expect(rows[0].team_id).toBe('chiefs');
    expect(rows[0].season).toBe(2024);
    expect(rows[0].season_type).toBe('REG');
    expect(rows[0].games).toBe(17);
    expect(rows[0].completions).toBe(392);
  });

  it('coerces empty-string scalars to null', () => {
    const { rows } = toTeamStatsRows(
      [
        {
          team: 'KC',
          season: '2024',
          season_type: 'REG',
          games: '',
          completions: '0',
        },
      ],
      resolveCode
    );
    expect(rows[0].games).toBeNull();
    expect(rows[0].completions).toBe(0);
  });

  it('coerces NaN scalars to null', () => {
    const { rows } = toTeamStatsRows(
      [
        {
          team: 'KC',
          season: '2024',
          season_type: 'REG',
          passing_epa: 'not-a-number',
        },
      ],
      resolveCode
    );
    expect(rows[0].passing_epa).toBeNull();
  });

  it('stamps rows with the successful ingest time when provided', () => {
    const { rows } = toTeamStatsRows(
      [{ team: 'KC', season: '2024', season_type: 'REG' }],
      resolveCode,
      { updatedAt: '2026-08-23T12:00:00.000Z' }
    );

    expect(rows[0].updated_at).toBe('2026-08-23T12:00:00.000Z');
  });

  it('resolves historic relocation codes (OAK -> raiders)', () => {
    const historicResolve = (code: string) => {
      const codes: Record<string, string> = { OAK: 'raiders', KC: 'chiefs' };
      return codes[code] ?? null;
    };
    const { rows, skipped } = toTeamStatsRows(
      [{ team: 'OAK', season: '2019', season_type: 'REG', games: '16' }],
      historicResolve
    );
    expect(skipped).toBe(0);
    expect(rows[0].team_id).toBe('raiders');
  });

  it('skips and counts a row with an unresolvable team code', () => {
    const { rows, skipped } = toTeamStatsRows(
      [{ team: 'XYZ', season: '2024', season_type: 'REG' }],
      resolveCode
    );
    expect(rows).toEqual([]);
    expect(skipped).toBe(1);
  });

  it('skips and counts a row with a missing team code', () => {
    const { rows, skipped } = toTeamStatsRows(
      [{ team: '', season: '2024', season_type: 'REG' }],
      resolveCode
    );
    expect(rows).toEqual([]);
    expect(skipped).toBe(1);
  });

  it('skips and counts a row with a non-numeric season', () => {
    const { rows, skipped } = toTeamStatsRows(
      [{ team: 'KC', season: 'bad', season_type: 'REG' }],
      resolveCode
    );
    expect(rows).toEqual([]);
    expect(skipped).toBe(1);
  });

  it('skips non-REG season_type rows (POST)', () => {
    const { rows, skipped } = toTeamStatsRows(
      [{ team: 'KC', season: '2024', season_type: 'POST', games: '3' }],
      resolveCode
    );
    expect(rows).toEqual([]);
    expect(skipped).toBe(1);
  });

  it('skips non-REG season_type rows (PRE)', () => {
    const { rows, skipped } = toTeamStatsRows(
      [{ team: 'KC', season: '2024', season_type: 'PRE', games: '2' }],
      resolveCode
    );
    expect(rows).toEqual([]);
    expect(skipped).toBe(1);
  });

  it('parses distance-list columns into int[]', () => {
    const { rows } = toTeamStatsRows(
      [
        {
          team: 'KC',
          season: '2024',
          season_type: 'REG',
          fg_made_list: '42;50;29;47;34;28;33;57',
          fg_missed_list: '44;51',
          fg_blocked_list: '',
          fg_made_distance: '42;50;29;47;34;28;33;57',
          fg_missed_distance: '44;51',
          fg_blocked_distance: '',
          gwfg_distance_list: '57',
        },
      ],
      resolveCode
    );
    expect(rows[0].fg_made_list).toEqual([42, 50, 29, 47, 34, 28, 33, 57]);
    expect(rows[0].fg_missed_list).toEqual([44, 51]);
    expect(rows[0].fg_blocked_list).toEqual([]);
    expect(rows[0].fg_made_distance).toEqual([42, 50, 29, 47, 34, 28, 33, 57]);
    expect(rows[0].fg_missed_distance).toEqual([44, 51]);
    expect(rows[0].fg_blocked_distance).toEqual([]);
    expect(rows[0].gwfg_distance_list).toEqual([57]);
  });

  it('uses the default resolveTeamCode when none is provided', () => {
    // KC is a known code in the real map
    const { rows, skipped } = toTeamStatsRows([
      { team: 'KC', season: '2024', season_type: 'REG', games: '17' },
    ]);
    expect(skipped).toBe(0);
    expect(rows[0].team_id).toBe('chiefs');
  });

  it('accumulates skipped counts across multiple bad rows', () => {
    const { rows, skipped } = toTeamStatsRows(
      [
        { team: 'KC', season: '2024', season_type: 'REG', games: '17' },
        { team: 'BAD', season: '2024', season_type: 'REG' },
        { team: 'KC', season: 'bad', season_type: 'REG' },
      ],
      resolveCode
    );
    expect(rows).toHaveLength(1);
    expect(skipped).toBe(2);
  });
});
