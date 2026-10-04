import Foundation

// The wire shape of `v1/teams/{team_id}/seasons.json`. Every field is optional and the numeric
// maps reuse `StatLineDTO`, so a file from a newer pipeline (an added metric, a section this
// build doesn't know) still decodes and a missing value stays nil.

struct TeamGameDTO: Decodable, Equatable {
    let week: Int
    let seasonType: String?
    let gameId: String?
    let opponent: String?
    let offense: StatLineDTO?
    let allowed: StatLineDTO?

    enum CodingKeys: String, CodingKey {
        case week, opponent, offense, allowed
        case seasonType = "season_type"
        case gameId = "game_id"
    }
}

struct TeamWindowDTO: Decodable, Equatable {
    let games: Int?
    let throughWeek: Int?
    let allowedPerGame: StatLineDTO?
    let rankedTeams: Int?
    let ranks: StatLineDTO?

    enum CodingKeys: String, CodingKey {
        case games, ranks
        case throughWeek = "through_week"
        case allowedPerGame = "allowed_per_game"
        case rankedTeams = "ranked_teams"
    }
}

struct TeamDerivedDTO: Decodable, Equatable {
    let games: Int?
    let allowedPerGame: StatLineDTO?
    let rankedTeams: Int?
    let ranks: StatLineDTO?
    let recent: TeamWindowDTO?

    enum CodingKeys: String, CodingKey {
        case games, ranks, recent
        case allowedPerGame = "allowed_per_game"
        case rankedTeams = "ranked_teams"
    }
}

struct TeamSeasonEntryDTO: Decodable, Equatable {
    let season: Int
    let games: [TeamGameDTO]?
    let derived: TeamDerivedDTO?
}

struct TeamSeasonsFileDTO: Decodable, Equatable {
    let seasons: [TeamSeasonEntryDTO]
}
