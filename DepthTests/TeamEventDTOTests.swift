import Foundation
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
