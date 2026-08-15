import Foundation

// Explicit DTOs for the public schedules/games projections. These deliberately do not
// reuse snapshot DTOs: schedule reads have a different shape and are not part of the
// versioned snapshot cache.
struct ScheduleDTO: Decodable {
    let teamId: String
    let season: Int

    enum CodingKeys: String, CodingKey {
        case season
        case teamId = "team_id"
    }
}

struct GameDTO: Decodable {
    let gameId: String
    let season: Int
    let gameType: String
    let week: Int?
    let gameday: String?
    let homeTeamId: String
    let awayTeamId: String
    let homeScore: Int?
    let awayScore: Int?

    enum CodingKeys: String, CodingKey {
        case season, week, gameday
        case gameId = "game_id"
        case gameType = "game_type"
        case homeTeamId = "home_team_id"
        case awayTeamId = "away_team_id"
        case homeScore = "home_score"
        case awayScore = "away_score"
    }
}
