import Foundation

/// The `team_events` columns the app reads. Unknown columns are ignored and no value is
/// validated against a fixed list, so the server can add event types without breaking
/// an installed build.
struct TeamEventDTO: Decodable {
    let id: String
    let eventType: String
    let tier: String
    let teamId: String
    let headline: String
    let detail: String?
    let source: String
    let occurredAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case eventType = "event_type"
        case tier
        case teamId = "team_id"
        case headline
        case detail
        case source
        case occurredAt = "occurred_at"
    }

    func toDomain() -> TeamEvent {
        TeamEvent(
            id: id, type: eventType, tier: tier, teamId: teamId, headline: headline,
            detail: detail, source: source, occurredAt: occurredAt)
    }
}
