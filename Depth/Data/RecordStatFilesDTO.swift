import Foundation

// The wire shapes of `v1/records/{stat}.json` and `v1/players/{espn_id}/highlights.json`. Every
// field is optional, so a file from a newer pipeline (an added stat, kind or field) still
// decodes and a missing value stays nil.

struct RecordCoverageDTO: Decodable, Equatable {
    let fromSeason: Int?
    let toSeason: Int?

    enum CodingKeys: String, CodingKey {
        case fromSeason = "from_season"
        case toSeason = "to_season"
    }
}

struct HighlightDTO: Decodable, Equatable {
    let value: Double?
    let season: Int?
    let week: Int?
    let team: String?
    let gameId: String?
    let opponent: String?
    let allTimeRank: Int?
    let playersAtOrAbove: Int?
    let teamRank: Int?
    let teamPlayersAtOrAbove: Int?

    enum CodingKeys: String, CodingKey {
        case value, season, week, team, opponent
        case gameId = "game_id"
        case allTimeRank = "all_time_rank"
        case playersAtOrAbove = "players_at_or_above"
        case teamRank = "team_rank"
        case teamPlayersAtOrAbove = "team_players_at_or_above"
    }
}

struct PlayerHighlightsFileDTO: Decodable, Equatable {
    let scope: String?
    let coverage: RecordCoverageDTO?
    /// Stat name, then kind name, both as raw strings so an unknown one is skipped by the
    /// mapper instead of failing the decode.
    let highlights: [String: [String: HighlightDTO]]?
}

struct RecordEntryDTO: Decodable, Equatable {
    let playerId: String?
    let rank: Int?
    let value: Double?
    let season: Int?
    let week: Int?
    let team: String?
    let gameId: String?
    let opponent: String?

    enum CodingKeys: String, CodingKey {
        case rank, value, season, week, team, opponent
        case playerId = "player_id"
        case gameId = "game_id"
    }
}

struct RecordThresholdDTO: Decodable, Equatable {
    let value: Double?
    let performances: Int?
    let players: Int?
}

struct RecordSectionDTO: Decodable, Equatable {
    let top: [RecordEntryDTO]?
    let thresholds: [RecordThresholdDTO]?
}

struct LeagueRecordsFileDTO: Decodable, Equatable {
    let scope: String?
    let stat: String?
    let coverage: RecordCoverageDTO?
    let singleGame: RecordSectionDTO?
    let singleSeason: RecordSectionDTO?

    enum CodingKeys: String, CodingKey {
        case scope, stat, coverage
        case singleGame = "single_game"
        case singleSeason = "single_season"
    }
}
