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
        coachRows: [TeamCoachSeasonDTO] = [],
        incomingCoach: TeamIncomingCoach? = nil,
        recordRankRows: [TeamStatsRankDTO] = [],
        metricRankRows: [TeamSeasonStatsRankDTO] = [],
        teamId: String? = nil,
        now: Date = .now
    ) -> TeamStatsPage {
        let state = nflSeasonState(now: now)
        let matchupBySeason = Dictionary(uniqueKeysWithValues: matchupRows.map { ($0.season, $0) })
        let coachBySeason = Dictionary(uniqueKeysWithValues: coachRows.map { ($0.season, $0) })
        return TeamStatsPage(
            team: team,
            seasons: rows
                .map {
                    mapSeason($0, matchup: matchupBySeason[$0.season], coach: coachBySeason[$0.season])
                }
                .sorted { $0.season > $1.season },
            upcomingSeason: state.isOffseason ? state.upcomingSeason : nil,
            incomingCoach: incomingCoach,
            leagueRanksBySeason: mapRanks(
                teamId: teamId ?? team.id,
                recordRows: recordRankRows,
                metricRows: metricRankRows
            ),
            currentSeason: state.isOffseason ? state.upcomingSeason : state.upcomingSeason - 1
        )
    }

    /// Reduces both rank reads to their domain value types and hands them to the pure
    /// builder. The derivation runs once per team-season here, not once per metric.
    static func mapRanks(
        teamId: String,
        recordRows: [TeamStatsRankDTO],
        metricRows: [TeamSeasonStatsRankDTO]
    ) -> [Int: TeamStatsRanks] {
        guard !recordRows.isEmpty else { return [:] }
        return TeamLeagueRanks.build(
            teamId: teamId,
            record: recordRows.map {
                TeamSeasonRecordRankValues(
                    teamId: $0.teamId,
                    season: $0.season,
                    winPercent: $0.winPercent,
                    pointsFor: $0.pointsFor,
                    pointsAgainst: $0.pointsAgainst,
                    pointDifferential: $0.pointDifferential
                )
            },
            nflverse: metricRows.map {
                TeamSeasonRankValues(
                    teamId: $0.teamId,
                    season: $0.season,
                    passingYards: $0.passingYards,
                    rushingYards: $0.rushingYards,
                    passingEPA: $0.passingEPA,
                    rushingEPA: $0.rushingEPA,
                    passingInterceptions: $0.passingInterceptions,
                    fumblesLost: $0.fumblesLostTotal,
                    defensiveSacks: $0.defensiveSacks,
                    defensiveInterceptions: $0.defensiveInterceptions,
                    derived: TeamMetrics.derive($0)
                )
            }
        )
    }

    static func mapSeason(
        _ row: TeamStatsRowDTO,
        matchup: TeamMatchupMetricsDTO? = nil,
        coach: TeamCoachSeasonDTO? = nil
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
            matchupMetrics: matchupMetrics,
            winPercent: row.winPercent,
            // Unlike the record columns these stay nil rather than defaulting: an absent
            // streak is "not reported", and playoff seed 0 means "missed the playoffs",
            // so a `?? 0` here would turn missing data into a claim.
            streak: row.streak,
            playoffSeed: row.playoffSeed,
            coach: coach.map { TeamSeasonCoach(name: $0.coachName, experience: $0.coachExperience) },
            passingYards: matchup?.passingYards,
            rushingYards: matchup?.rushingYards
        )
    }

    private static func mapMatchupMetrics(_ row: TeamMatchupMetricsDTO) -> TeamMatchupMetrics {
        // Derived values come from the shared derivation, never recomputed here — the
        // league-rank builder ranks these same quantities, and two copies of the math
        // could disagree while each stayed internally consistent (a page would print one
        // number and rank it as another). See Domain/TeamMetricsDerivation.swift.
        let d = TeamMetrics.derive(row)

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
            offensiveEPA: d.offensiveEPA,
            offensivePlays: d.offensivePlays,
            offensiveEPAPerPlay: d.offensiveEPAPerPlay,
            sackRate: d.sackRate,
            passingInterceptions: row.passingInterceptions,
            fumblesLost: row.fumblesLostTotal,
            giveaways: d.giveaways,
            turnoverMargin: d.turnoverMargin,
            defensiveSacks: row.defensiveSacks,
            quarterbackHits: row.quarterbackHits,
            quarterbackHitsPerGame: d.quarterbackHitsPerGame,
            defensiveInterceptions: row.defensiveInterceptions,
            defensiveFumbleRecoveries: row.defensiveFumbleRecoveries,
            defensiveFumblesForced: row.defensiveFumblesForced,
            defensiveTakeaways: d.defensiveTakeaways,
            defensiveTakeawaysPerGame: d.defensiveTakeawaysPerGame,
            fieldGoalsMade: row.fieldGoalsMade,
            fieldGoalsAttempted: row.fieldGoalsAttempted,
            fieldGoalPercentage: d.fieldGoalPercentage,
            puntAttempts: row.puntAttempts,
            netPuntYards: row.netPuntYards,
            netPuntYardsPerAttempt: d.netPuntYardsPerAttempt,
            puntReturns: row.puntReturns,
            puntReturnYards: row.puntReturnYards,
            puntReturnYardsPerAttempt: d.puntReturnYardsPerAttempt,
            kickoffReturns: row.kickoffReturns,
            kickoffReturnYards: row.kickoffReturnYards,
            kickoffReturnYardsPerAttempt: d.kickoffReturnYardsPerAttempt,
            specialTeamsTouchdowns: row.specialTeamsTouchdowns
        )
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
