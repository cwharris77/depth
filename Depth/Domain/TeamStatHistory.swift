import Foundation

// One team's stat history from the R2 team files: per-game lines, defense-allowed rates, and
// league ranks. Every value is optional because a source gap is absent, never zero.

/// Per-game and per-play yards and EPA a defense allowed.
struct TeamAllowedRates: Equatable {
    var passingYards: Double?
    var rushingYards: Double?
    var totalYards: Double?
    var passingEpa: Double?
    var rushingEpa: Double?
    var passingEpaPerDropback: Double?
    var rushingEpaPerCarry: Double?
}

/// League rank for each allowed metric. 1 is the fewest allowed, so a high rank is a weak
/// defense. A rank is absent below the two-game sample the file requires.
struct TeamAllowedRanks: Equatable {
    var passingYards: Int?
    var rushingYards: Int?
    var totalYards: Int?
    var passingEpa: Int?
    var rushingEpa: Int?
    var passingEpaPerDropback: Int?
    var rushingEpaPerCarry: Int?
}

/// A span of regular-season games: the whole season, or the most recent few.
struct TeamAllowedWindow: Equatable {
    let games: Int
    /// The last week in the window. Nil for the full season.
    let throughWeek: Int?
    let rates: TeamAllowedRates
    /// Nil when the team had too few games to rank.
    let ranks: TeamAllowedRanks?
    /// How many teams were ranked, the denominator for `ranks`.
    let rankedTeams: Int?
}

/// One side of one game.
struct TeamGameSide: Equatable {
    let passingYards: Double?
    let rushingYards: Double?
    let passingEpa: Double?
    let rushingEpa: Double?
}

struct TeamGameLine: Equatable, Identifiable {
    let id: String
    let week: Int
    let isPostseason: Bool
    let opponentId: String
    let offense: TeamGameSide?
    let allowed: TeamGameSide?
}

struct TeamSeasonHistory: Equatable, Identifiable {
    var id: Int { season }
    let season: Int
    /// Regular season, ranked against the league. Nil when no regular-season game has an
    /// allowed line.
    let allowed: TeamAllowedWindow?
    let recent: TeamAllowedWindow?
    /// Regular season then postseason, in week order.
    let games: [TeamGameLine]
}

struct TeamStatHistory: Equatable {
    /// Newest season first.
    let seasons: [TeamSeasonHistory]

    func season(_ season: Int) -> TeamSeasonHistory? {
        seasons.first { $0.season == season }
    }
}
