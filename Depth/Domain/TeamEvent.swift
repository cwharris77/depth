import Foundation

/// Something that happened to a team and is worth telling its fans: the row behind a
/// notification. `type`, `tier` and `source` stay strings so a kind of event added on
/// the server after this build shipped still decodes and can be shown by its text.
struct TeamEvent: Sendable, Equatable, Identifiable {
    let id: String
    let type: String
    let tier: String
    let teamId: String
    /// The player the event is about. Nil for an event with no single player, and the
    /// id may name someone who is no longer on the team's roster.
    let playerId: String?
    let headline: String
    let detail: String?
    let payload: TeamEventPayload
    let source: String
    let occurredAt: Date

    init(
        id: String, type: String, tier: String, teamId: String, playerId: String? = nil,
        headline: String, detail: String?, payload: TeamEventPayload = .empty,
        source: String, occurredAt: Date
    ) {
        self.id = id
        self.type = type
        self.tier = tier
        self.teamId = teamId
        self.playerId = playerId
        self.headline = headline
        self.detail = detail
        self.payload = payload
        self.source = source
        self.occurredAt = occurredAt
    }
}
