import Foundation

/// Something that happened to a team and is worth telling its fans: the row behind a
/// notification. `type`, `tier` and `source` stay strings so a kind of event added on
/// the server after this build shipped still decodes and can be shown by its text.
struct TeamEvent: Sendable, Equatable, Identifiable {
    let id: String
    let type: String
    let tier: String
    let teamId: String
    let headline: String
    let detail: String?
    let source: String
    let occurredAt: Date
}
