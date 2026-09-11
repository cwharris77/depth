import { describe, expect, it } from 'vitest';
import { mapHistoricalDepthChartPositions } from './depth-charts';

const resolveTeamCode = (code: string) => (code === 'SEA' ? 'seahawks' : null);

describe('mapHistoricalDepthChartPositions', () => {
  it('uses the final regular-season legacy depth-chart slot for a player', () => {
    const positions = mapHistoricalDepthChartPositions(
      2024,
      [
        { club_code: 'SEA', game_type: 'REG', week: '1', gsis_id: 'cross', depth_position: 'LT' },
        { club_code: 'SEA', game_type: 'REG', week: '18', gsis_id: 'cross', depth_position: 'LT' },
        { club_code: 'SEA', game_type: 'POST', week: '19', gsis_id: 'cross', depth_position: 'RT' },
      ],
      resolveTeamCode
    );

    expect(positions.get('seahawks|cross')).toBe('LT');
  });

  it('uses the newest timestamped 2025+ depth-chart slot', () => {
    const positions = mapHistoricalDepthChartPositions(
      2025,
      [
        { team: 'SEA', gsis_id: 'cross', pos_abb: 'RT', dt: '2025-08-01T00:00:00Z' },
        { team: 'SEA', gsis_id: 'cross', pos_abb: 'LT', dt: '2025-08-02T00:00:00Z' },
      ],
      resolveTeamCode
    );

    expect(positions.get('seahawks|cross')).toBe('LT');
  });

  it('drops unmapped slots and teams instead of guessing', () => {
    const positions = mapHistoricalDepthChartPositions(
      2024,
      [
        {
          club_code: 'SEA',
          game_type: 'REG',
          week: '18',
          gsis_id: 'unknown',
          depth_position: 'XX',
        },
        { club_code: 'XXX', game_type: 'REG', week: '18', gsis_id: 'other', depth_position: 'LT' },
      ],
      resolveTeamCode
    );

    expect(positions.size).toBe(0);
  });
});
