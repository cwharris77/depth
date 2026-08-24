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
    let location: String?
    let awayMoneyline: Double?
    let homeMoneyline: Double?
    let spreadLine: Double?
    let awaySpreadOdds: Double?
    let homeSpreadOdds: Double?
    let totalLine: Double?
    let underOdds: Double?
    let overOdds: Double?
    let marketUpdatedAt: String?

    enum CodingKeys: String, CodingKey {
        case season, week, gameday, location
        case gameId = "game_id"
        case gameType = "game_type"
        case homeTeamId = "home_team_id"
        case awayTeamId = "away_team_id"
        case homeScore = "home_score"
        case awayScore = "away_score"
        case awayMoneyline = "away_moneyline"
        case homeMoneyline = "home_moneyline"
        case spreadLine = "spread_line"
        case awaySpreadOdds = "away_spread_odds"
        case homeSpreadOdds = "home_spread_odds"
        case totalLine = "total_line"
        case underOdds = "under_odds"
        case overOdds = "over_odds"
        case marketUpdatedAt = "market_updated_at"
    }
}
