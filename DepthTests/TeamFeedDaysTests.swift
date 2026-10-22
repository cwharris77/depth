import Foundation
import Testing

@testable import Depth

private let utc: Calendar = {
    var calendar = Calendar(identifier: .gregorian)
    calendar.timeZone = TimeZone(identifier: "UTC") ?? .gmt
    return calendar
}()
private let locale = Locale(identifier: "en_US")
// 2026-10-20 15:00 UTC, a Tuesday.
private let now = Date(timeIntervalSince1970: 1_792_508_400)

private func event(_ id: String, hoursAgo: Double) -> TeamEvent {
    TeamEvent(
        id: id, type: "trade", tier: "big_moments", teamId: "bills", headline: id,
        detail: nil, source: "espn_transactions",
        occurredAt: now.addingTimeInterval(-hoursAgo * 3600))
}

private func days(_ events: [TeamEvent]) -> [TeamFeedDay] {
    TeamFeedDay.group(events, now: now, calendar: utc, locale: locale)
}

@Test func feedDaysGroupEventsByCalendarDayNewestFirst() {
    let grouped = days([
        event("a", hoursAgo: 1), event("b", hoursAgo: 14), event("c", hoursAgo: 20),
        event("d", hoursAgo: 40),
    ])
    #expect(grouped.map(\.title) == ["Today", "Yesterday", "Sunday, Oct 18"])
    #expect(grouped.map { $0.events.map(\.id) } == [["a", "b"], ["c"], ["d"]])
}

@Test func feedDaysKeepTheOrderGivenWithinADay() {
    let grouped = days([event("late", hoursAgo: 2), event("early", hoursAgo: 1)])
    #expect(grouped.map { $0.events.map(\.id) } == [["late", "early"]])
}

@Test func feedDaysNameTheYearOnlyWhenItDiffers() {
    let grouped = days([event("old", hoursAgo: 24 * 300)])
    #expect(grouped.map(\.title) == ["Wednesday, Dec 24, 2025"])
}

@Test func feedDaysOfNothingIsEmpty() {
    #expect(days([]).isEmpty)
}

@Test func feedDayIdsAreStableAcrossTimeOfDay() {
    let yesterday = days([event("a", hoursAgo: 20)])
    let morning = days([event("b", hoursAgo: 14)])
    let afternoon = days([event("c", hoursAgo: 1)])
    #expect(yesterday.first?.id != morning.first?.id)
    #expect(morning.first?.id == afternoon.first?.id)
}
