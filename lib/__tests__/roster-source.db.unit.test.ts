import { describe, expect, it } from 'vitest';
import { toGame } from '@/lib/roster-source.db';

describe('roster-source game projection', () => {
  it('maps every persisted market field into the web game contract', () => {
    expect(
      toGame({
        game_id: '2025_01_BAL_BUF',
        season: 2025,
        game_type: 'REG',
        week: 1,
        gameday: '2025-09-07',
        gametime: '20:20',
        home_team_id: 'bills',
        away_team_id: 'ravens',
        home_score: 41,
        away_score: 40,
        location: 'Home',
        away_moneyline: -130,
        home_moneyline: 110,
        spread_line: -1.5,
        away_spread_odds: -118,
        home_spread_odds: -102,
        total_line: 50.5,
        under_odds: -105,
        over_odds: -115,
        market_updated_at: '2026-08-24T20:00:00.000Z',
      })
    ).toMatchObject({
      location: 'Home',
      awayMoneyline: -130,
      homeMoneyline: 110,
      spreadLine: -1.5,
      awaySpreadOdds: -118,
      homeSpreadOdds: -102,
      totalLine: 50.5,
      underOdds: -105,
      overOdds: -115,
      marketUpdatedAt: '2026-08-24T20:00:00.000Z',
    });
  });
});
