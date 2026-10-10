import Foundation
private func decodeEvent(_ json: String) throws -> TeamEvent {
    return try decode(json).toDomain()
}

@Test func teamEventDecodesPlayerAndPayload() throws {
    let event = try decodeEvent(
        """
        {"id":"e1","event_type":"record_chase","tier":"big_moments","team_id":"bills",
         "player_id":"4040715","headline":"h","detail":"d","source":"nflverse_stats",
         "occurred_at":"2026-10-09T18:00:00Z",
         "payload":{"stat":"passing_yards","value":4900,"record":5477,"broken":false,
                    "season":2026,"from_season":1999,"player_name":"Josh Allen"}}
        """)
    #expect(event.playerId == "4040715")
    #expect(event.payload.stat == "passing_yards")
    #expect(event.payload.value == 4900)
    #expect(event.payload.record == 5477)
    #expect(event.payload.broken == false)
    #expect(event.payload.season == 2026)
    #expect(event.payload.fromSeason == 1999)
    #expect(event.payload.playerName == "Josh Allen")
}

@Test func teamEventDecodesWithoutPlayerOrPayload() throws {
    let event = try decodeEvent(
        """
        {"id":"e2","event_type":"trade","tier":"big_moments","team_id":"bills",
         "headline":"h","detail":null,"source":"espn_transactions",
         "occurred_at":"2026-10-09T18:00:00Z"}
        """)
    #expect(event.playerId == nil)
    #expect(event.payload == .empty)
}

@Test func teamEventPayloadIgnoresWrongTypesAndUnknownKeys() throws {
    let event = try decodeEvent(
        """
        {"id":"e3","event_type":"something_new","tier":"everything","team_id":"bills",
         "player_id":null,"headline":"h","detail":null,"source":"a_new_source",
         "occurred_at":"2026-10-09T18:00:00Z",
         "payload":{"position":7,"value":"lots","week":"four","rank":3,"extra":{"a":1}}}
        """)
    #expect(event.payload.position == nil)
    #expect(event.payload.value == nil)
    #expect(event.payload.week == nil)
    #expect(event.payload.rank == 3)
}

@Test func teamEventPayloadThatIsNotAnObjectDecodesAsEmpty() throws {
    let event = try decodeEvent(
        """
        {"id":"e4","event_type":"trade","tier":"big_moments","team_id":"bills",
         "headline":"h","detail":null,"source":"espn_transactions",
         "occurred_at":"2026-10-09T18:00:00Z","payload":"oops"}
        """)
    #expect(event.payload == .empty)
}
import Supabase
import Testing

@testable import Depth

/// Decodes with the decoder the Supabase client applies to query results, so the test
/// reads timestamps the way the repository does.
private func decode(_ json: String) throws -> TeamEventDTO {
    try PostgrestClient.Configuration.jsonDecoder.decode(TeamEventDTO.self, from: Data(json.utf8))
}

@Test func teamEventDecodesTheColumnsTheAppReads() throws {
    let dto = try decode(
        """
        {"id":"0b9f","event_type":"trade","tier":"big_moments","team_id":"seahawks",
         "headline":"Seahawks acquired WR Example","detail":null,"source":"espn_transactions",
         "occurred_at":"2026-10-09T18:00:00+00:00"}
        """)
    let event = dto.toDomain()
    #expect(event.id == "0b9f")
    #expect(event.type == "trade")
    #expect(event.tier == "big_moments")
    #expect(event.headline == "Seahawks acquired WR Example")
    #expect(event.detail == nil)
    #expect(event.teamId == "seahawks")
    #expect(event.source == "espn_transactions")
    #expect(event.occurredAt == Date(timeIntervalSince1970: 1_791_568_800))
}

@Test func teamEventDecodesATimestampWithFractionalSeconds() throws {
    let dto = try decode(
        """
        {"id":"0b9f","event_type":"trade","tier":"big_moments","team_id":"seahawks",
         "headline":"H","detail":null,"source":"espn_transactions",
         "occurred_at":"2026-10-09T18:00:00.123456+00:00"}
        """)
    let seconds = dto.toDomain().occurredAt.timeIntervalSince1970
    #expect(abs(seconds - 1_791_568_800.123) < 0.001)
}

@Test func teamEventToleratesAnEventTypeAndColumnsAddedLater() throws {
    let dto = try decode(
        """
        {"id":"0b9f","event_type":"injury_designation","tier":"everything","team_id":"seahawks",
         "headline":"H","detail":"D","source":"espn_injuries","occurred_at":"2026-10-09T18:00:00Z",
         "payload":{"x":1},"some_future_column":true}
        """)
    #expect(dto.toDomain().type == "injury_designation")
    #expect(dto.toDomain().detail == "D")
}
