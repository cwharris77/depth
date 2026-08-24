import { describe, expect, it } from 'vitest';
import type { Game } from '@/lib/types';
import { orientGameMarket, vigFreeImpliedProbability } from './market-lines';

function game(over: Partial<Game> = {}): Game {
  return {
    gameId: '2026_01_LA_SEA',
    season: 2026,
    gameType: 'REG',
    week: 1,
    gameday: '2026-09-13',
    gametime: '13:00',
    homeTeamId: 'seahawks',
    awayTeamId: 'rams',
    homeScore: null,
    awayScore: null,
    location: 'Home',
    homeMoneyline: -185,
    awayMoneyline: 154,
    spreadLine: 3.5,
    homeSpreadOdds: -110,
    awaySpreadOdds: -110,
    totalLine: 45.5,
    underOdds: -105,
    overOdds: -115,
    marketUpdatedAt: '2026-08-24T20:00:00.000Z',
    ...over,
  };
}

describe('vigFreeImpliedProbability', () => {
  it('removes balanced bookmaker vig from two -110 prices', () => {
    expect(vigFreeImpliedProbability(-110, -110)).toBeCloseTo(0.5, 8);
  });

  it('normalizes asymmetric American prices into complementary probabilities', () => {
    const home = vigFreeImpliedProbability(-185, 154);
    const away = vigFreeImpliedProbability(154, -185);
    if (home === null || away === null) throw new Error('expected complete market probabilities');

    expect(home).toBeCloseTo(0.622467, 6);
    expect(away).toBeCloseTo(0.377533, 6);
    expect(home + away).toBeCloseTo(1, 8);
  });

  it('returns unavailable when either side is missing or malformed', () => {
    expect(vigFreeImpliedProbability(-110, null)).toBeNull();
    expect(vigFreeImpliedProbability(0, -110)).toBeNull();
    expect(vigFreeImpliedProbability(Number.NaN, -110)).toBeNull();
  });
});

describe('orientGameMarket', () => {
  it('orients the home favorite to conventional negative spread display', () => {
    expect(orientGameMarket(game(), 'seahawks')).toEqual({
      teamMoneyline: -185,
      opponentMoneyline: 154,
      teamSpread: -3.5,
      teamSpreadOdds: -110,
      opponentSpreadOdds: -110,
      totalLine: 45.5,
      underOdds: -105,
      overOdds: -115,
      impliedWinProbability: expect.closeTo(0.622467, 6),
      favoriteTeamId: 'seahawks',
      isPickEm: false,
      isNeutralSite: false,
      source: 'nflverse',
      updatedAt: '2026-08-24T20:00:00.000Z',
    });
  });

  it('flips moneylines, spread, and probability for the away team', () => {
    const market = orientGameMarket(game(), 'rams');

    expect(market).toMatchObject({
      teamMoneyline: 154,
      opponentMoneyline: -185,
      teamSpread: 3.5,
      impliedWinProbability: expect.closeTo(0.377533, 6),
      favoriteTeamId: 'seahawks',
    });
  });

  it('orients a negative source spread when the away team is favored', () => {
    const source = game({ spreadLine: -2.5 });

    expect(orientGameMarket(source, 'rams')).toMatchObject({
      teamSpread: -2.5,
      favoriteTeamId: 'rams',
    });
    expect(orientGameMarket(source, 'seahawks')).toMatchObject({
      teamSpread: 2.5,
      favoriteTeamId: 'rams',
    });
  });

  it('labels a zero spread as pick’em without inventing a favorite', () => {
    const market = orientGameMarket(game({ spreadLine: 0 }), 'seahawks');

    expect(market).toMatchObject({ teamSpread: 0, favoriteTeamId: null, isPickEm: true });
  });

  it('keeps designated-side orientation while flagging a neutral site', () => {
    const market = orientGameMarket(game({ location: 'Neutral' }), 'seahawks');

    expect(market).toMatchObject({
      teamSpread: -3.5,
      favoriteTeamId: 'seahawks',
      isNeutralSite: true,
    });
  });

  it('keeps posted spread and total when one moneyline side is missing', () => {
    const market = orientGameMarket(game({ awayMoneyline: null }), 'seahawks');

    expect(market).toMatchObject({ teamSpread: -3.5, totalLine: 45.5 });
    expect(market?.impliedWinProbability).toBeNull();
  });

  it('returns unavailable when no market field was posted', () => {
    expect(
      orientGameMarket(
        game({
          homeMoneyline: null,
          awayMoneyline: null,
          spreadLine: null,
          homeSpreadOdds: null,
          awaySpreadOdds: null,
          totalLine: null,
          underOdds: null,
          overOdds: null,
          marketUpdatedAt: null,
        }),
        'seahawks'
      )
    ).toBeUndefined();
  });
});
