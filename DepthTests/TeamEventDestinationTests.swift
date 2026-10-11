import Foundation
import Testing

@testable import Depth

private func event(
    type: String, playerId: String? = "p1", position: String? = nil
) -> TeamEvent {
    var payload = TeamEventPayload()
    payload.position = position
    return TeamEvent(
        id: "e", type: type, tier: "big_moments", teamId: "bills", playerId: playerId,
        headline: "h", detail: nil, payload: payload, source: "espn_depth_chart",
        occurredAt: Date(timeIntervalSince1970: 0))
}

@Test func starterChangeLeadsToItsUnitWithThePlayerMarked() {
    let offense = TeamEventDestination.resolve(
        event(type: "starter_change", position: "QB"), rosterPlayerIds: ["p1"])
    #expect(offense == .depthChart(unit: .offense, playerId: "p1"))
    let defense = TeamEventDestination.resolve(
        event(type: "starter_change", position: "CB"), rosterPlayerIds: ["p1"])
    #expect(defense == .depthChart(unit: .defense, playerId: "p1"))
    let special = TeamEventDestination.resolve(
        event(type: "starter_change", position: "K"), rosterPlayerIds: ["p1"])
    #expect(special == .depthChart(unit: .special, playerId: "p1"))
}

@Test func starterChangeStillOpensTheUnitWhenThePlayerHasLeft() {
    let destination = TeamEventDestination.resolve(
        event(type: "starter_change", position: "QB"), rosterPlayerIds: [])
    #expect(destination == .depthChart(unit: .offense, playerId: nil))
}

@Test func starterChangeWithAnUnreadablePositionLeadsToTheFeed() {
    #expect(
        TeamEventDestination.resolve(
            event(type: "starter_change", position: "XX"), rosterPlayerIds: ["p1"]) == .feed)
    #expect(
        TeamEventDestination.resolve(
            event(type: "starter_change", position: nil), rosterPlayerIds: ["p1"]) == .feed)
}

@Test(arguments: ["trade", "record_chase", "historic_week", "a_type_added_later"])
func playerEventsLeadToThePlayerWhenHeIsOnTheRoster(type: String) {
    #expect(
        TeamEventDestination.resolve(event(type: type), rosterPlayerIds: ["p1", "p2"])
            == .player(id: "p1"))
}

@Test(arguments: ["trade", "record_chase", "historic_week", "a_type_added_later"])
func playerEventsLeadToTheFeedWhenHeIsNotOnTheRoster(type: String) {
    #expect(TeamEventDestination.resolve(event(type: type), rosterPlayerIds: ["p2"]) == .feed)
    #expect(
        TeamEventDestination.resolve(event(type: type, playerId: nil), rosterPlayerIds: ["p2"])
            == .feed)
}
