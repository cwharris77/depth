import Foundation

// Mirrors lib/roster-source.ts's TeamStatsPage / lib/types.ts's TeamStats, scoped to the
// phase-1 Stats page's fields only (round-4 spec locked decision #2: no coach, league
// rank, or nflverse season-leader fields yet — those are phase-2 fast-follows). `seasons`
// is newest-first, matching web's fetchTeamStatsPage ordering (`.order('season',
// { ascending: false })`). `upcomingSeason` is set for ALL teams during the NFL
// off-season (web: `isOffseason ? upcomingSeason : undefined`), letting the season
// switcher show an upcoming chip for every team. Codable so the snapshot cache layer can
// persist it as one JSON payload per team, exactly like `TeamSnapshot`.
struct TeamStatsPage: Equatable, Codable, Sendable {
    let team: Team
    let seasons: [TeamSeasonStats]
    let upcomingSeason: Int?
    /// The current NFL season year. A season is "completed" (all games played, playoff
    /// outcomes known) when its year is less than this. Used to scope the next-game card
    /// to the current/upcoming season tab (web: TeamStatsView's isViewingCurrentSeason /
    /// isViewingUpcomingSeason).
    let currentSeason: Int
}

// One team_stats row per ingested season (current + up to two prior, web's
// docs/superpowers/specs/2026-07-14-multi-season-team-stats-design.md). Every field is
// non-optional here because a present row was always written from a complete parse
// (web's writeTeamStats skips the upsert on a partial entry); the mapper's `?? 0`
// fallbacks guard only the nullable-by-schema DTO type.
struct TeamSeasonStats: Equatable, Codable, Sendable {
    let season: Int
    let overallWins: Int
    let overallLosses: Int
    let overallTies: Int
    let homeWins: Int
    let homeLosses: Int
    let roadWins: Int
    let roadLosses: Int
    let divisionWins: Int
    let divisionLosses: Int
    let conferenceWins: Int
    let conferenceLosses: Int
    let pointsFor: Int
    let pointsAgainst: Int
    let pointDifferential: Int
}