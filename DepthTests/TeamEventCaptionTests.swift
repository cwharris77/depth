import Foundation
import Testing

@testable import Depth

private let utc: Calendar = {
    var calendar = Calendar(identifier: .gregorian)
    calendar.timeZone = TimeZone(identifier: "UTC") ?? .gmt
    return calendar
}()
private let english = Locale(identifier: "en_US")

private func event(source: String, occurredAt: Date, payload: TeamEventPayload = .empty)
    -> TeamEvent
{
    TeamEvent(
        id: "e", type: "record_chase", tier: "big_moments", teamId: "bills", headline: "h",
        detail: nil, payload: payload, source: source, occurredAt: occurredAt)
}

// 2026-10-09T18:00:00Z
private let october9 = Date(timeIntervalSince1970: 1_791_568_800)

@Test func knownSourcesHaveLabels() {
    #expect(TeamEventCaption.sourceLabel("espn_depth_chart") == "ESPN depth chart")
    #expect(TeamEventCaption.sourceLabel("espn_transactions") == "ESPN transactions")
    #expect(TeamEventCaption.sourceLabel("nflverse_stats") == "nflverse")
    #expect(TeamEventCaption.sourceLabel("a_new_source") == nil)
}

@Test func captionLineJoinsSourceAndDate() {
    let line = TeamEventCaption.line(
        for: event(source: "espn_depth_chart", occurredAt: october9), calendar: utc,
        locale: english)
    #expect(line == "ESPN depth chart · Oct 9")
}

@Test func captionLineForAnUnknownSourceIsTheDateAlone() {
    let line = TeamEventCaption.line(
        for: event(source: "a_new_source", occurredAt: october9), calendar: utc, locale: english)
    #expect(line == "Oct 9")
}

@Test func progressIsTheShareOfTheRecordReached() {
    var payload = TeamEventPayload()
    payload.value = 4900
    payload.record = 5000
    #expect(
        TeamEventCaption.progress(for: event(source: "s", occurredAt: october9, payload: payload))
            == 0.98)
}

@Test func progressIsCappedAtOneOnceTheRecordIsPassed() {
    var payload = TeamEventPayload()
    payload.value = 5100
    payload.record = 5000
    #expect(
        TeamEventCaption.progress(for: event(source: "s", occurredAt: october9, payload: payload))
            == 1)
}

@Test func progressIsAbsentWithoutBothNumbersOrWithAnUnusableRecord() {
    var missing = TeamEventPayload()
    missing.value = 10
    #expect(
        TeamEventCaption.progress(for: event(source: "s", occurredAt: october9, payload: missing))
            == nil)
    var zero = TeamEventPayload()
    zero.value = 10
    zero.record = 0
    #expect(
        TeamEventCaption.progress(for: event(source: "s", occurredAt: october9, payload: zero))
            == nil)
    var negative = TeamEventPayload()
    negative.value = -5
    negative.record = 100
    #expect(
        TeamEventCaption.progress(for: event(source: "s", occurredAt: october9, payload: negative))
            == 0)
}

@Test func progressIsOnlyOfferedForARecordChase() {
    var payload = TeamEventPayload()
    payload.value = 251
    payload.record = 300
    let historic = TeamEvent(
        id: "e", type: "historic_week", tier: "big_moments", teamId: "bills", headline: "h",
        detail: nil, payload: payload, source: "nflverse_stats", occurredAt: october9)
    #expect(TeamEventCaption.progress(for: historic) == nil)
}
