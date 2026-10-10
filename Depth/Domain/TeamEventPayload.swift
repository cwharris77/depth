import Foundation

/// The structured facts behind an event's text. Every field is optional and decoded on
/// its own, so a missing key, a value of an unexpected type, or a payload written by a
/// newer server leaves the other fields intact instead of failing the whole event.
struct TeamEventPayload: Sendable, Equatable, Decodable {
    var position: String?
    var direction: String?
    var stat: String?
    var value: Double?
    var record: Double?
    var broken: Bool?
    var rank: Int?
    var season: Int?
    var week: Int?
    var fromSeason: Int?
    var playerName: String?

    static let empty = TeamEventPayload()

    enum CodingKeys: String, CodingKey {
        case position, direction, stat, value, record, broken, rank, season, week
        case fromSeason = "from_season"
        case playerName = "player_name"
    }

    init() {}

    init(from decoder: any Decoder) throws {
        guard let container = try? decoder.container(keyedBy: CodingKeys.self) else { return }
        position = try? container.decode(String.self, forKey: .position)
        direction = try? container.decode(String.self, forKey: .direction)
        stat = try? container.decode(String.self, forKey: .stat)
        value = try? container.decode(Double.self, forKey: .value)
        record = try? container.decode(Double.self, forKey: .record)
        broken = try? container.decode(Bool.self, forKey: .broken)
        rank = try? container.decode(Int.self, forKey: .rank)
        season = try? container.decode(Int.self, forKey: .season)
        week = try? container.decode(Int.self, forKey: .week)
        fromSeason = try? container.decode(Int.self, forKey: .fromSeason)
        playerName = try? container.decode(String.self, forKey: .playerName)
    }
}
