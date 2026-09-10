import Foundation

// Resolves public game rows into regular-season cards and 3c's fixed postseason ladder
// from one team's perspective. Regular weeks fill gaps as byes; postseason rounds never
// fabricate a matchup, so an absent game remains an unreached round or earned bye.
enum ScheduleMapper {
    static func map(
        schedule: ScheduleDTO,
        games: [GameDTO],
        teamsById: [String: Team],
        playoffSeed: Int? = nil
    ) throws -> TeamSchedule {
        var gamesByWeek: [Int: ScheduleGame] = [:]

        for game in games where game.gameType == "REG" {
            guard let week = game.week else { continue }
            guard week > 0 else {
                throw DepthError.decoding("game \(game.gameId): invalid week \(week)")
            }
            guard let resolved = try resolve(game, for: schedule.teamId, teamsById: teamsById) else { continue }
            gamesByWeek[week] = resolved
        }

        let resolvedGames: [ScheduleGame]
        if let maximumWeek = gamesByWeek.keys.max() {
            resolvedGames = (1...maximumWeek).map { week in
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
        } else {
            resolvedGames = []
        }
        return TeamSchedule(
            season: schedule.season,
            games: resolvedGames,
            preseason: try games.compactMap { game in
                guard game.gameType == "PRE" else { return nil }
                return try resolve(game, for: schedule.teamId, teamsById: teamsById)
            }.sorted { ($0.date ?? "") < ($1.date ?? "") },
            postseason: try mapPostseason(
                games: games,
                teamId: schedule.teamId,
                teamsById: teamsById,
                playoffSeed: playoffSeed
            )
        )
    }

    private static func mapPostseason(
        games: [GameDTO],
        teamId: String,
        teamsById: [String: Team],
        playoffSeed: Int?
    ) throws -> PostseasonRun? {
        guard let playoffSeed, isPlayoffSeed(playoffSeed, season: games.first?.season ?? 0) else { return nil }
        var gamesByRound: [PostseasonRoundKind: ScheduleGame] = [:]
        for game in games {
            guard let kind = PostseasonRoundKind.from(gameType: game.gameType),
                  let resolved = try resolve(game, for: teamId, teamsById: teamsById)
            else { continue }
            gamesByRound[kind] = resolved
        }
        return PostseasonRun(
            seed: playoffSeed,
            rounds: PostseasonRoundKind.allCases.map { PostseasonRound(kind: $0, game: gamesByRound[$0]) }
        )
    }

    private static func resolve(
        _ game: GameDTO,
        for teamId: String,
        teamsById: [String: Team]
    ) throws -> ScheduleGame? {
        guard game.homeTeamId == teamId || game.awayTeamId == teamId else { return nil }
        let isHome = game.homeTeamId == teamId
        let teamScore = isHome ? game.homeScore : game.awayScore
        let opponentScore = isHome ? game.awayScore : game.homeScore
        let opponentId = isHome ? game.awayTeamId : game.homeTeamId
        guard let opponent = teamsById[opponentId] else {
            throw DepthError.decoding("game \(game.gameId): missing opponent \(opponentId)")
        }
        return ScheduleGame(
            week: game.week ?? 0,
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
