import Foundation

/// The screen an event opens. Resolved from the event and the ids on the loaded roster,
/// so the same rule serves a notification tap and a tap on a feed row.
enum TeamEventDestination: Equatable {
    /// The depth chart on `unit`, with `playerId`'s dot marked when he is still listed.
    case depthChart(unit: Unit, playerId: String?)
    case player(id: String)
    /// Nothing more specific to show than the event's own row.
    case feed

    static func resolve(_ event: TeamEvent, rosterPlayerIds: Set<String>)
        -> TeamEventDestination
    {
        let listedPlayerId = event.playerId.flatMap { rosterPlayerIds.contains($0) ? $0 : nil }
        if event.type == "starter_change" {
            guard let position = event.payload.position.flatMap(Position.init(rawValue:))
            else { return .feed }
            return .depthChart(unit: position.unit, playerId: listedPlayerId)
        }
        if let listedPlayerId { return .player(id: listedPlayerId) }
        return .feed
    }
}
