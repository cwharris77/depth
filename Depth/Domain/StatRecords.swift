import Foundation

// League records and a player's career highs from the R2 record files. Both are regular-season
// only and carry the seasons they cover, so a caption can state its comparator ("since 1999")
// without widening it. Every value is optional because a gap is absent, never zero.

enum RecordStat: String, CaseIterable, Equatable {
    case passingTds = "passing_tds"
    case passingYards = "passing_yards"
    case receivingTds = "receiving_tds"
    case receivingYards = "receiving_yards"
    case rushingTds = "rushing_tds"
    case rushingYards = "rushing_yards"
}

enum RecordKind: String, CaseIterable, Equatable {
    case singleGame = "single_game"
    case singleSeason = "single_season"
}

/// The seasons a record file ranks over. A rank means "among these seasons", never all time.
struct RecordCoverage: Equatable {
    let fromSeason: Int
    let toSeason: Int
}

/// One career high and where it sits among every player's best.
struct PlayerHighlight: Equatable {
    let value: Double
    let season: Int
    /// The game's week. Nil for a single-season total.
    let week: Int?
    let teamId: String?
    let gameId: String?
    let opponentId: String?
    /// 1 is the best mark; ties share a rank.
    let allTimeRank: Int
    /// Distinct players whose best reaches this value, including this one.
    let playersAtOrAbove: Int
    let teamRank: Int?
    let teamPlayersAtOrAbove: Int?
}

struct PlayerHighlights: Equatable {
    let coverage: RecordCoverage?
    private let entries: [RecordStat: [RecordKind: PlayerHighlight]]

    init(
        coverage: RecordCoverage?, entries: [RecordStat: [RecordKind: PlayerHighlight]]
    ) {
        self.coverage = coverage
        self.entries = entries
    }

    var isEmpty: Bool { entries.isEmpty }

    func highlight(_ stat: RecordStat, _ kind: RecordKind) -> PlayerHighlight? {
        entries[stat]?[kind]
    }
}

struct LeagueRecordEntry: Equatable {
    let playerId: String
    let rank: Int
    let value: Double
    let season: Int
    let week: Int?
    let teamId: String?
    let gameId: String?
    let opponentId: String?
}

/// How many performances, and distinct players, reached a milestone value.
struct LeagueRecordMilestone: Equatable {
    let value: Double
    let performances: Int
    let players: Int
}

struct LeagueRecordSection: Equatable {
    /// Best first, ties included through the file's cutoff rank.
    let top: [LeagueRecordEntry]
    let milestones: [LeagueRecordMilestone]
}

struct LeagueRecords: Equatable {
    let stat: RecordStat
    let coverage: RecordCoverage?
    let singleGame: LeagueRecordSection
    let singleSeason: LeagueRecordSection

    func section(_ kind: RecordKind) -> LeagueRecordSection {
        kind == .singleGame ? singleGame : singleSeason
    }
}
