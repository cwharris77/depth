import Foundation

// DTO → domain mapping for the team-stats page query. Mirrors web's `toTeamStats` and
// the season-state block of `fetchTeamStatsPage` (lib/roster-source.db.ts:622-647): a
// nil column maps to 0 (a present row was always written from a complete parse, so the
// `?? 0` only guards the nullable-by-schema DTO type), and `currentSeason`/`upcomingSeason`
// come from the same date heuristic as lib/utils/team/nfl-season.ts. Unlike the team
// snapshot mapper this never throws — web's stats page degrades to a 0-0 record for a
// stub/empty row rather than failing (AGENTS.md invariant 6).
enum TeamStatsMapper {
    static func map(
        team: Team,
        rows: [TeamStatsRowDTO],
        matchupRows: [TeamMatchupMetricsDTO] = [],
        now: Date = .now
    ) -> TeamStatsPage {
        let state = nflSeasonState(now: now)
        let matchupBySeason = Dictionary(uniqueKeysWithValues: matchupRows.map { ($0.season, $0) })
        return TeamStatsPage(
            team: team,
            seasons: rows
                .map { mapSeason($0, matchup: matchupBySeason[$0.season]) }
                .sorted { $0.season > $1.season },
            upcomingSeason: state.isOffseason ? state.upcomingSeason : nil,
            currentSeason: state.isOffseason ? state.upcomingSeason : state.upcomingSeason - 1
        )
    }

    static func mapSeason(
        _ row: TeamStatsRowDTO,
        matchup: TeamMatchupMetricsDTO? = nil
    ) -> TeamSeasonStats {
        let matchupMetrics = matchup.map { mapMatchupMetrics($0) }
        let overallWins: Int = row.overallWins ?? 0
        let overallLosses: Int = row.overallLosses ?? 0
        let overallTies: Int = row.overallTies ?? 0
        let homeWins: Int = row.homeWins ?? 0
        let homeLosses: Int = row.homeLosses ?? 0
        let roadWins: Int = row.roadWins ?? 0
        let roadLosses: Int = row.roadLosses ?? 0
        let divisionWins: Int = row.divisionWins ?? 0
        let divisionLosses: Int = row.divisionLosses ?? 0
        let conferenceWins: Int = row.conferenceWins ?? 0
        let conferenceLosses: Int = row.conferenceLosses ?? 0
        let pointsFor: Int = row.pointsFor ?? 0
        let pointsAgainst: Int = row.pointsAgainst ?? 0
        let pointDifferential: Int = row.pointDifferential ?? 0
        return TeamSeasonStats(
            season: row.season,
            overallWins: overallWins,
            overallLosses: overallLosses,
            overallTies: overallTies,
            homeWins: homeWins,
            homeLosses: homeLosses,
            roadWins: roadWins,
            roadLosses: roadLosses,
            divisionWins: divisionWins,
            divisionLosses: divisionLosses,
            conferenceWins: conferenceWins,
            conferenceLosses: conferenceLosses,
            pointsFor: pointsFor,
            pointsAgainst: pointsAgainst,
            pointDifferential: pointDifferential,
            matchupMetrics: matchupMetrics
        )
    }

    private static func mapMatchupMetrics(_ row: TeamMatchupMetricsDTO) -> TeamMatchupMetrics {
        let offensiveEPA = sum(row.passingEPA, row.rushingEPA)
        let offensivePlays = sum(row.attempts, row.carries, row.sacksSuffered)
        let giveaways = sum(row.passingInterceptions, row.fumblesLostTotal)
        let defensiveTakeaways = sum(row.defensiveInterceptions, row.defensiveFumbleRecoveries)
        let offensiveEPAPerPlay = ratio(offensiveEPA, offensivePlays)
        let quarterbackHitsPerGame = ratio(row.quarterbackHits, row.games)
        let defensiveTakeawaysPerGame = ratio(defensiveTakeaways, row.games)
        let fieldGoalPercentage = ratio(row.fieldGoalsMade, row.fieldGoalsAttempted)
        let netPuntYardsPerAttempt = ratio(row.netPuntYards, row.puntAttempts)
        let puntReturnYardsPerAttempt = ratio(row.puntReturnYards, row.puntReturns)
        let kickoffReturnYardsPerAttempt = ratio(row.kickoffReturnYards, row.kickoffReturns)

        return TeamMatchupMetrics(
            source: .nflverse,
            season: row.season,
            updatedAt: row.updatedAt,
            games: row.games,
            passingEPA: row.passingEPA,
            rushingEPA: row.rushingEPA,
            passAttempts: row.attempts,
            rushAttempts: row.carries,
            sacksSuffered: row.sacksSuffered,
            offensiveEPA: offensiveEPA,
            offensivePlays: offensivePlays,
            offensiveEPAPerPlay: offensiveEPAPerPlay,
            passingInterceptions: row.passingInterceptions,
            fumblesLost: row.fumblesLostTotal,
            giveaways: giveaways,
            defensiveSacks: row.defensiveSacks,
            quarterbackHits: row.quarterbackHits,
            quarterbackHitsPerGame: quarterbackHitsPerGame,
            defensiveInterceptions: row.defensiveInterceptions,
            defensiveFumbleRecoveries: row.defensiveFumbleRecoveries,
            defensiveFumblesForced: row.defensiveFumblesForced,
            defensiveTakeaways: defensiveTakeaways,
            defensiveTakeawaysPerGame: defensiveTakeawaysPerGame,
            fieldGoalsMade: row.fieldGoalsMade,
            fieldGoalsAttempted: row.fieldGoalsAttempted,
            fieldGoalPercentage: fieldGoalPercentage,
            puntAttempts: row.puntAttempts,
            netPuntYards: row.netPuntYards,
            netPuntYardsPerAttempt: netPuntYardsPerAttempt,
            puntReturns: row.puntReturns,
            puntReturnYards: row.puntReturnYards,
            puntReturnYardsPerAttempt: puntReturnYardsPerAttempt,
            kickoffReturns: row.kickoffReturns,
            kickoffReturnYards: row.kickoffReturnYards,
            kickoffReturnYardsPerAttempt: kickoffReturnYardsPerAttempt,
            specialTeamsTouchdowns: row.specialTeamsTouchdowns
        )
    }

    private static func sum(_ lhs: Double?, _ rhs: Double?) -> Double? {
        guard let lhs, let rhs else { return nil }
        return lhs + rhs
    }

    private static func sum(_ first: Int?, _ second: Int?) -> Int? {
        guard let first, let second else { return nil }
        return first + second
    }

    private static func sum(_ first: Int?, _ second: Int?, _ third: Int?) -> Int? {
        guard let first, let second, let third else { return nil }
        return first + second + third
    }

    private static func ratio(_ numerator: Double?, _ denominator: Double?) -> Double? {
        guard let numerator, let denominator, denominator > 0 else { return nil }
        return numerator / denominator
    }

    private static func ratio(_ numerator: Double?, _ denominator: Int?) -> Double? {
        guard let denominator else { return nil }
        return ratio(numerator, Double(denominator))
    }

    private static func ratio(_ numerator: Int?, _ denominator: Int?) -> Double? {
        guard let numerator, let denominator else { return nil }
        return ratio(Double(numerator), Double(denominator))
    }

    /// Swift port of lib/utils/team/nfl-season.ts's `nflSeasonState()` — the NFL season
    /// runs Sep–Feb. Jan wraps up the prior year's postseason; Feb–Aug is the off-season
    /// (upcoming season = this calendar year); Sep–Dec is the regular season (upcoming =
    /// next calendar year). Kept as a pure function of `now` so tests can pin the date.
    static func nflSeasonState(now: Date = .now) -> (completedSeason: Int, upcomingSeason: Int, isOffseason: Bool) {
        let components = Calendar(identifier: .gregorian).dateComponents([.year, .month], from: now)
        let year = components.year ?? 0
        let month = components.month ?? 0
        if month >= 9 { // Sep–Dec: regular season of `year`
            return (completedSeason: year - 1, upcomingSeason: year + 1, isOffseason: false)
        } else if month >= 2 { // Feb–Aug: off-season
            return (completedSeason: year - 1, upcomingSeason: year, isOffseason: true)
        } else { // Jan: wrapping up `year - 1`'s postseason
            return (completedSeason: year - 1, upcomingSeason: year, isOffseason: false)
        }
    }
}
