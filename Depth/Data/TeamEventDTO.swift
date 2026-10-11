import Foundation

/// The `team_events` columns the app reads. Unknown columns are ignored and no value is
/// validated against a fixed list, so the server can add event types without breaking
/// an installed build.
struct TeamEventDTO: Decodable {
    let id: String
    let eventType: String
    let tier: String
    let teamId: String
    let playerId: String?
    let headline: String
    let detail: String?
    let payload: TeamEventPayload
    let source: String
    let occurredAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case eventType = "event_type"
        case tier
        case teamId = "team_id"
        case playerId = "player_id"
        case headline
        case detail
        case payload
        case source
        case occurredAt = "occurred_at"
    }

    init(from decoder: any Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)
        eventType = try container.decode(String.self, forKey: .eventType)
        tier = try container.decode(String.self, forKey: .tier)
        teamId = try container.decode(String.self, forKey: .teamId)
        // Absent from a narrower select and nullable in the table.
        playerId = (try? container.decodeIfPresent(String.self, forKey: .playerId)) ?? nil
        headline = try container.decode(String.self, forKey: .headline)
        detail = try container.decodeIfPresent(String.self, forKey: .detail)
        payload = (try? container.decode(TeamEventPayload.self, forKey: .payload)) ?? .empty
        source = try container.decode(String.self, forKey: .source)
        occurredAt = try container.decode(Date.self, forKey: .occurredAt)
    }

    func toDomain() -> TeamEvent {
        TeamEvent(
            id: id, type: eventType, tier: tier, teamId: teamId, playerId: playerId,
            headline: headline, detail: detail, payload: payload, source: source,
            occurredAt: occurredAt)
    }
}
