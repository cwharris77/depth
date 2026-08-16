import Foundation

// DTO → domain mapping for the team-stats page query. Mirrors web's `toTeamStats` and
// the season-state block of `fetchTeamStatsPage` (lib/roster-source.db.ts:622-647): a
// nil column maps to 0 (a present row was always written from a complete parse, so the
// `?? 0` only guards the nullable-by-schema DTO type), and `currentSeason`/`upcomingSeason`
// come from the same date heuristic as lib/utils/team/nfl-season.ts. Unlike the team
// snapshot mapper this never throws — web's stats page degrades to a 0-0 record for a
// stub/empty row rather than failing (AGENTS.md invariant 6).
enum TeamStatsMapper {
    static func map(team: Team, rows: [TeamStatsRowDTO], now: Date = .now) -> TeamStatsPage {
        let state = nflSeasonState(now: now)
        return TeamStatsPage(
            team: team,
            seasons: rows
                .map(mapSeason)
                .sorted { $0.season > $1.season },
            upcomingSeason: state.isOffseason ? state.upcomingSeason : nil,
            currentSeason: state.isOffseason ? state.upcomingSeason : state.upcomingSeason - 1
        )
    }

    static func mapSeason(_ row: TeamStatsRowDTO) -> TeamSeasonStats {
        TeamSeasonStats(
            season: row.season,
            overallWins: row.overallWins ?? 0,
            overallLosses: row.overallLosses ?? 0,
            overallTies: row.overallTies ?? 0,
            homeWins: row.homeWins ?? 0,
            homeLosses: row.homeLosses ?? 0,
            roadWins: row.roadWins ?? 0,
            roadLosses: row.roadLosses ?? 0,
            divisionWins: row.divisionWins ?? 0,
            divisionLosses: row.divisionLosses ?? 0,
            conferenceWins: row.conferenceWins ?? 0,
            conferenceLosses: row.conferenceLosses ?? 0,
            pointsFor: row.pointsFor ?? 0,
            pointsAgainst: row.pointsAgainst ?? 0,
            pointDifferential: row.pointDifferential ?? 0
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