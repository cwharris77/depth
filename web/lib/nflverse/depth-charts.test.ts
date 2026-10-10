import { describe, expect, it } from 'vitest';
import { mapHistoricalDepthChartPositions } from './depth-charts';

const resolveTeamCode = (code: string) => (code === 'SEA' ? 'seahawks' : null);

// A legacy (through 2024) regular-season row on the offensive chart.
const legacy = { club_code: 'SEA', game_type: 'REG', formation: 'Offense' };

describe('mapHistoricalDepthChartPositions', () => {
  it('uses the final regular-season legacy depth-chart slot for a player', () => {
    const { positions } = mapHistoricalDepthChartPositions(
      2024,
      [
        { ...legacy, week: '1', gsis_id: 'cross', depth_position: 'LT' },
        { ...legacy, week: '18', gsis_id: 'cross', depth_position: 'LT' },
        { ...legacy, game_type: 'POST', week: '19', gsis_id: 'cross', depth_position: 'RT' },
      ],
      resolveTeamCode
    );

    expect(positions.get('seahawks|cross')).toBe('LT');
  });

  it('uses the newest timestamped 2025+ depth-chart slot', () => {
    const { positions } = mapHistoricalDepthChartPositions(
      2025,
      [
        {
          team: 'SEA',
          pos_grp: '3WR 1TE',
          gsis_id: 'cross',
          pos_abb: 'RT',
          dt: '2025-08-01T00:00:00Z',
        },
        {
          team: 'SEA',
          pos_grp: '3WR 1TE',
          gsis_id: 'cross',
          pos_abb: 'LT',
          dt: '2025-08-02T00:00:00Z',
        },
      ],
      resolveTeamCode
    );

    expect(positions.get('seahawks|cross')).toBe('LT');
  });

  it('drops unmapped slots and teams instead of guessing', () => {
    const { positions, unmappedCodes } = mapHistoricalDepthChartPositions(
      2024,
      [
        { ...legacy, week: '18', gsis_id: 'unknown', depth_position: 'XX' },
        { ...legacy, club_code: 'XXX', week: '18', gsis_id: 'other', depth_position: 'LT' },
      ],
      resolveTeamCode
    );

    expect(positions.size).toBe(0);
    expect(unmappedCodes).toEqual({ 'offense:XX': 1 });
  });

  it('reads the club-authored spellings of a sided slot', () => {
    const { positions, unmappedCodes } = mapHistoricalDepthChartPositions(
      2010,
      [
        { ...legacy, week: '17', gsis_id: 'tackle', depth_position: 'LOT' },
        { ...legacy, formation: 'Defense', week: '17', gsis_id: 'end', depth_position: 'RE' },
        { ...legacy, formation: 'Defense', week: '17', gsis_id: 'backer', depth_position: 'WILL' },
      ],
      resolveTeamCode
    );

    expect(Object.fromEntries(positions)).toEqual({
      'seahawks|tackle': 'LT',
      'seahawks|end': 'RDE',
      'seahawks|backer': 'WLB',
    });
    expect(unmappedCodes).toEqual({});
  });

  it('keeps a field position when the same player is also charted as a returner', () => {
    const { positions, unmappedCodes } = mapHistoricalDepthChartPositions(
      2010,
      [
        { ...legacy, week: '17', gsis_id: 'wr', depth_position: 'WR' },
        { ...legacy, formation: 'Special Teams', week: '17', gsis_id: 'wr', depth_position: 'KR' },
        { ...legacy, formation: 'Special Teams', week: '17', gsis_id: 'wr', depth_position: 'PR' },
      ],
      resolveTeamCode
    );

    expect(positions.get('seahawks|wr')).toBe('WR');
    expect(unmappedCodes).toEqual({});
  });

  it('leaves a reviewed code with no canonical position out without reporting it', () => {
    const { positions, unmappedCodes } = mapHistoricalDepthChartPositions(
      2010,
      [{ ...legacy, formation: 'Defense', week: '17', gsis_id: 'dl', depth_position: 'DL' }],
      resolveTeamCode
    );

    expect(positions.size).toBe(0);
    expect(unmappedCodes).toEqual({});
  });

  it('reads a tackle on the defensive chart as a defensive tackle', () => {
    const { positions } = mapHistoricalDepthChartPositions(
      2005,
      [
        { ...legacy, formation: 'Defense', week: '17', gsis_id: 'dt', depth_position: 'LT' },
        { ...legacy, week: '17', gsis_id: 'ot', depth_position: 'LT' },
      ],
      resolveTeamCode
    );

    expect(Object.fromEntries(positions)).toEqual({ 'seahawks|dt': 'DT', 'seahawks|ot': 'LT' });
  });

  it('does not move a player to the position he is listed under on a return unit', () => {
    const { positions, unmappedCodes } = mapHistoricalDepthChartPositions(
      2005,
      [
        { ...legacy, formation: 'Defense', week: '17', gsis_id: 'cb', depth_position: 'RCB' },
        { ...legacy, formation: 'Special Teams', week: '17', gsis_id: 'cb', depth_position: 'WR' },
      ],
      resolveTeamCode
    );

    expect(positions.get('seahawks|cb')).toBe('RCB');
    expect(unmappedCodes).toEqual({});
  });

  it('reports a row whose formation it cannot read instead of guessing a unit', () => {
    const { positions, unmappedCodes } = mapHistoricalDepthChartPositions(
      2005,
      [{ ...legacy, formation: 'Nickel', week: '17', gsis_id: 'x', depth_position: 'LT' }],
      resolveTeamCode
    );

    expect(positions.size).toBe(0);
    expect(unmappedCodes).toEqual({ 'Nickel:LT': 1 });
  });

  it('keeps a corner at corner when he is also charted as the nickel back', () => {
    const { positions, unmappedCodes } = mapHistoricalDepthChartPositions(
      2022,
      [
        { ...legacy, formation: 'Defense', week: '18', gsis_id: 'cb', depth_position: 'RCB' },
        { ...legacy, formation: 'Defense', week: '18', gsis_id: 'cb', depth_position: 'NB' },
        { ...legacy, formation: 'Defense', week: '18', gsis_id: 'slot', depth_position: 'NCB' },
      ],
      resolveTeamCode
    );

    expect(Object.fromEntries(positions)).toEqual({ 'seahawks|cb': 'RCB' });
    expect(unmappedCodes).toEqual({});
  });
});
