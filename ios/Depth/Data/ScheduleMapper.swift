import Foundation

// Resolves public game rows into weekly schedule cards from one team's perspective.
// This is the native equivalent of lib/utils/schedule/schedule.ts: REG only, fill gaps
// through the highest represented week as byes, and derive W/L/T solely from both scores.
enum ScheduleMapper {
    static func map(
        schedule: ScheduleDTO,
        games: [GameDTO],
        teamsById: [String: Team]
    ) throws -> TeamSchedule {
        var gamesByWeek: [Int: ScheduleGame] = [:]

        for game in games where game.gameType == "REG" {
            guard game.homeTeamId == schedule.teamId || game.awayTeamId == schedule.teamId else { continue }
            guard let week = game.week else { continue }
            guard week > 0 else {
                throw DepthError.decoding("game \(game.gameId): invalid week \(week)")
            }

            let isHome = game.homeTeamId == schedule.teamId
            let teamScore = isHome ? game.homeScore : game.awayScore
            let opponentScore = isHome ? game.awayScore : game.homeScore
            let opponentId = isHome ? game.awayTeamId : game.homeTeamId
            guard let opponent = teamsById[opponentId] else {
                throw DepthError.decoding("game \(game.gameId): missing opponent \(opponentId)")
            }
            gamesByWeek[week] = ScheduleGame(
                week: week,
                isBye: false,
                date: game.gameday,
                isHome: isHome,
                opponent: opponent,
                teamScore: teamScore,
                opponentScore: opponentScore,
                result: outcome(teamScore: teamScore, opponentScore: opponentScore),
                market: mapMarket(game, isHome: isHome)
            )
        }

        guard let maximumWeek = gamesByWeek.keys.max() else {
            return TeamSchedule(season: schedule.season, games: [])
        }

        let resolvedGames = (1...maximumWeek).map { week in
            gamesByWeek[week] ?? ScheduleGame(
                week: week,
                isBye: true,
                date: nil,
                isHome: false,
                opponent: nil,
                teamScore: nil,
                opponentScore: nil,
                result: nil
            )
        }
        return TeamSchedule(season: schedule.season, games: resolvedGames)
    }

    private static func outcome(teamScore: Int?, opponentScore: Int?) -> ScheduleResult? {
        guard let teamScore, let opponentScore else { return nil }
        if teamScore > opponentScore { return .win }
        if teamScore < opponentScore { return .loss }
        return .tie
    }

    private static func mapMarket(_ game: GameDTO, isHome: Bool) -> ScheduleGameMarket? {
        let values = [
            game.awayMoneyline, game.homeMoneyline, game.spreadLine,
            game.awaySpreadOdds, game.homeSpreadOdds, game.totalLine,
            game.underOdds, game.overOdds,
        ]
        guard values.contains(where: { $0 != nil }) else { return nil }

        let teamMoneyline = isHome ? game.homeMoneyline : game.awayMoneyline
        let opponentMoneyline = isHome ? game.awayMoneyline : game.homeMoneyline
        let favoriteTeamId: String? = if let spread = game.spreadLine, spread != 0 {
            spread > 0 ? game.homeTeamId : game.awayTeamId
        } else {
            nil
        }
        let teamSpread: Double? = if let spread = game.spreadLine {
            spread == 0 ? 0 : (isHome ? -spread : spread)
        } else {
            nil
        }

        return ScheduleGameMarket(
            teamMoneyline: teamMoneyline,
            opponentMoneyline: opponentMoneyline,
            teamSpread: teamSpread,
            teamSpreadOdds: isHome ? game.homeSpreadOdds : game.awaySpreadOdds,
            opponentSpreadOdds: isHome ? game.awaySpreadOdds : game.homeSpreadOdds,
            totalLine: game.totalLine,
            underOdds: game.underOdds,
            overOdds: game.overOdds,
            impliedWinProbability: vigFreeProbability(teamMoneyline, opponentMoneyline),
            favoriteTeamId: favoriteTeamId,
            isPickEm: game.spreadLine == 0,
            isNeutralSite: game.location?.lowercased() == "neutral",
            source: .nflverse,
            updatedAt: game.marketUpdatedAt
        )
    }

    private static func vigFreeProbability(_ teamOdds: Double?, _ opponentOdds: Double?) -> Double? {
        guard let team = americanOddsProbability(teamOdds),
              let opponent = americanOddsProbability(opponentOdds)
        else { return nil }
        return team / (team + opponent)
    }

    private static func americanOddsProbability(_ odds: Double?) -> Double? {
        guard let odds, odds.isFinite, odds != 0 else { return nil }
        return odds < 0 ? -odds / (-odds + 100) : 100 / (odds + 100)
    }
}
