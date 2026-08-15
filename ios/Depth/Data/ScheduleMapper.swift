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
            gamesByWeek[week] = ScheduleGame(
                week: week,
                isBye: false,
                date: game.gameday,
                isHome: isHome,
                opponent: teamsById[opponentId],
                teamScore: teamScore,
                opponentScore: opponentScore,
                result: outcome(teamScore: teamScore, opponentScore: opponentScore)
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
}
