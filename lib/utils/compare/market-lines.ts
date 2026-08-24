// Converts nflverse's home-oriented market snapshot into one selected team's display
// perspective. The raw line remains auditable on Game; this module only derives bounded
// presentation values and never labels a bookmaker probability as Depth's model.

import type { Game, TeamGameMarket } from '@/lib/types';

export function vigFreeImpliedProbability(
  teamMoneyline: number | null,
  opponentMoneyline: number | null
): number | null {
  const team = americanOddsProbability(teamMoneyline);
  const opponent = americanOddsProbability(opponentMoneyline);
  if (team === null || opponent === null) return null;
  return team / (team + opponent);
}

function americanOddsProbability(odds: number | null): number | null {
  if (odds === null || !Number.isFinite(odds) || odds === 0) return null;
  return odds < 0 ? -odds / (-odds + 100) : 100 / (odds + 100);
}

export function orientGameMarket(game: Game, teamId: string): TeamGameMarket | undefined {
  const values = [
    game.homeMoneyline,
    game.awayMoneyline,
    game.spreadLine,
    game.homeSpreadOdds,
    game.awaySpreadOdds,
    game.totalLine,
    game.underOdds,
    game.overOdds,
  ];
  if (values.every((value) => value === null)) return undefined;

  const isHome = game.homeTeamId === teamId;
  const teamMoneyline = isHome ? game.homeMoneyline : game.awayMoneyline;
  const opponentMoneyline = isHome ? game.awayMoneyline : game.homeMoneyline;
  const favoriteTeamId =
    game.spreadLine === null || game.spreadLine === 0
      ? null
      : game.spreadLine > 0
        ? game.homeTeamId
        : game.awayTeamId;

  return {
    teamMoneyline,
    opponentMoneyline,
    // nflverse stores how many points the designated home team is favored by. Display
    // convention represents the favorite with a negative number, so the home view
    // negates the source and the away view retains it.
    teamSpread:
      game.spreadLine === null || game.spreadLine === 0
        ? game.spreadLine
        : isHome
          ? -game.spreadLine
          : game.spreadLine,
    teamSpreadOdds: isHome ? game.homeSpreadOdds : game.awaySpreadOdds,
    opponentSpreadOdds: isHome ? game.awaySpreadOdds : game.homeSpreadOdds,
    totalLine: game.totalLine,
    underOdds: game.underOdds,
    overOdds: game.overOdds,
    impliedWinProbability: vigFreeImpliedProbability(teamMoneyline, opponentMoneyline),
    favoriteTeamId,
    isPickEm: game.spreadLine === 0,
    isNeutralSite: game.location?.toLowerCase() === 'neutral',
    source: 'nflverse',
    updatedAt: game.marketUpdatedAt,
  };
}
