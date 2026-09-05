import { describe, expect, it } from 'vitest';
import { toRosterHistoryRows } from './roster-history';

const RESOLVE = (code: string) => (code === 'SEA' ? 'seahawks' : null);

function rosterRow(overrides: Partial<Record<string, string>> = {}) {
  const position = overrides.position ?? 'QB';
  return {
    season: '2013',
    team: 'SEA',
    position,
    depth_chart_position: position,
    jersey_number: '3',
    status: 'ACT',
    full_name: 'Russell Wilson',
    birth_date: '1988-11-29',
    height: '71',
    weight: '206',
    college: 'Wisconsin',
    gsis_id: '00-0029263',
    espn_id: '14881',
    headshot_url: 'https://example.com/wilson.png',
    years_exp: '2',
    ...overrides,
  };
}

describe('toRosterHistoryRows', () => {
  it('joins a roster row to its usage stats and ranks QB1', () => {
    const { rows, skipped } = toRosterHistoryRows(
      2013,
      [rosterRow()],
      [{ player_id: '00-0029263', attempts: '407' }],
      RESOLVE
    );
    expect(skipped).toBe(0);
    expect(rows).toEqual([
      {
        season: 2013,
        team_id: 'seahawks',
        gsis_id: '00-0029263',
        espn_id: '14881',
        name: 'Russell Wilson',
        number: 3,
        position: 'QB',
        college: 'Wisconsin',
        height: '71',
        weight: 206,
        headshot_url: 'https://example.com/wilson.png',
        depth_rank: 1,
        player_order: 1,
      },
    ]);
  });

  it('ranks a position group by usage and caps depth_rank at 3', () => {
    const rosterRows = [
      rosterRow({ gsis_id: 'wr1', full_name: 'Starter', jersey_number: '10', position: 'WR' }),
      rosterRow({ gsis_id: 'wr2', full_name: 'Backup', jersey_number: '11', position: 'WR' }),
      rosterRow({ gsis_id: 'wr3', full_name: 'Third', jersey_number: '12', position: 'WR' }),
      rosterRow({ gsis_id: 'wr4', full_name: 'Fourth', jersey_number: '13', position: 'WR' }),
    ];
    const statsRows = [
      { player_id: 'wr1', targets: '150' },
      { player_id: 'wr2', targets: '90' },
      { player_id: 'wr3', targets: '40' },
      { player_id: 'wr4', targets: '5' },
    ];
    const { rows } = toRosterHistoryRows(2013, rosterRows, statsRows, RESOLVE);
    const byId = new Map(rows.map((r) => [r.gsis_id, r]));
    expect(byId.get('wr1')).toMatchObject({ depth_rank: 1, player_order: 1 });
    expect(byId.get('wr2')).toMatchObject({ depth_rank: 2, player_order: 2 });
    expect(byId.get('wr3')).toMatchObject({ depth_rank: 3, player_order: 3 });
    expect(byId.get('wr4')).toMatchObject({ depth_rank: 3, player_order: 4 });
  });

  it('skips a row with no gsis_id, no team match, or an unmapped position, and counts it', () => {
    const rosterRows = [
      rosterRow({ gsis_id: '' }),
      rosterRow({ gsis_id: 'x', team: 'ZZZ' }),
      rosterRow({ gsis_id: 'y', position: '', depth_chart_position: '' }),
      rosterRow({ gsis_id: 'z', full_name: '' }),
    ];
    const { rows, skipped } = toRosterHistoryRows(2013, rosterRows, [], RESOLVE);
    expect(rows).toEqual([]);
    expect(skipped).toBe(4);
  });

  it('collapses a mid-season trade to one row for the PK team, keeping the last occurrence', () => {
    const rosterRows = [
      rosterRow({ gsis_id: 'p1', full_name: 'Traded Player', number: '99' }),
      rosterRow({ gsis_id: 'p1', full_name: 'Traded Player', jersey_number: '12' }),
    ];
    const { rows } = toRosterHistoryRows(2013, rosterRows, [], RESOLVE);
    expect(rows).toHaveLength(1);
    expect(rows[0].number).toBe(12);
  });

  it('uses a depth-chart side over a generic roster position', () => {
    const { rows } = toRosterHistoryRows(
      2025,
      [
        rosterRow({
          gsis_id: '00-0037821',
          full_name: 'Charles Cross',
          position: 'T',
          jersey_number: '67',
        }),
      ],
      [],
      RESOLVE,
      new Map(),
      new Map([['seahawks|00-0037821', 'LT']])
    );
    expect(rows[0].position).toBe('LT');
  });

  it('skips a generic tackle when no depth-chart row exists', () => {
    const { rows, skipped } = toRosterHistoryRows(
      2000,
      [rosterRow({ gsis_id: 't1', full_name: 'Unknown Tackle', position: 'T' })],
      [],
      RESOLVE
    );
    expect(rows).toEqual([]);
    expect(skipped).toBe(1);
  });

  it('degrades a missing usage row to zero score without throwing', () => {
    const { rows } = toRosterHistoryRows(2013, [rosterRow({ gsis_id: 'no-stats' })], [], RESOLVE);
    expect(rows).toHaveLength(1);
    expect(rows[0].depth_rank).toBe(1);
  });

  it('fills a null roster espn_id from the crosswalk', () => {
    const { rows } = toRosterHistoryRows(
      2013,
      [rosterRow({ espn_id: '' })],
      [],
      RESOLVE,
      new Map([['00-0029263', '14881']])
    );
    expect(rows[0].espn_id).toBe('14881');
  });

  it('keeps the roster CSV espn_id over a crosswalk value', () => {
    const { rows } = toRosterHistoryRows(
      2013,
      [rosterRow({ espn_id: '14881' })],
      [],
      RESOLVE,
      new Map([['00-0029263', '99999']])
    );
    expect(rows[0].espn_id).toBe('14881');
  });

  it('leaves espn_id null when neither the roster CSV nor the crosswalk has one', () => {
    const { rows } = toRosterHistoryRows(
      2013,
      [rosterRow({ espn_id: '' })],
      [],
      RESOLVE,
      new Map()
    );
    expect(rows[0].espn_id).toBeNull();
  });
});
