import Foundation
import Testing

@testable import Depth

private let now = Date(timeIntervalSince1970: 1_791_568_800)
private func hoursAgo(_ hours: Double) -> Date { now.addingTimeInterval(-hours * 3600) }

@Test func nothingIsUnreadWithoutAnEvent() {
    #expect(!TeamFeedUnread.hasUnread(newest: nil, lastSeen: nil, now: now))
    #expect(!TeamFeedUnread.hasUnread(newest: nil, lastSeen: hoursAgo(1), now: now))
}

@Test func aRecentEventIsUnreadOnATeamNeverOpened() {
    #expect(TeamFeedUnread.hasUnread(newest: hoursAgo(2), lastSeen: nil, now: now))
}

@Test func anEventOlderThanAWeekIsNeverUnread() {
    #expect(!TeamFeedUnread.hasUnread(newest: hoursAgo(24 * 7 + 1), lastSeen: nil, now: now))
    #expect(
        !TeamFeedUnread.hasUnread(
            newest: hoursAgo(24 * 7 + 1), lastSeen: hoursAgo(24 * 30), now: now))
}

@Test func anEventNewerThanTheLastSeenIsUnread() {
    #expect(TeamFeedUnread.hasUnread(newest: hoursAgo(1), lastSeen: hoursAgo(5), now: now))
}

@Test func anEventAtOrBeforeTheLastSeenIsRead() {
    #expect(!TeamFeedUnread.hasUnread(newest: hoursAgo(5), lastSeen: hoursAgo(5), now: now))
    #expect(!TeamFeedUnread.hasUnread(newest: hoursAgo(5), lastSeen: hoursAgo(1), now: now))
}

@Test func anEventDatedInTheFutureIsStillUnreadOnce() {
    let future = now.addingTimeInterval(3600)
    #expect(TeamFeedUnread.hasUnread(newest: future, lastSeen: nil, now: now))
    #expect(!TeamFeedUnread.hasUnread(newest: future, lastSeen: future, now: now))
}

@MainActor
@Test func theSeenDateIsKeptPerTeamAndNeverMovesBack() throws {
    let defaults = try #require(UserDefaults(suiteName: "TeamFeedUnreadTests.\(UUID().uuidString)"))
    let preferences = UserPreferences(defaults: defaults)
    #expect(preferences.teamFeedSeenAt(for: "bills") == nil)
    preferences.setTeamFeedSeenAt(hoursAgo(2), for: "bills")
    preferences.setTeamFeedSeenAt(hoursAgo(9), for: "bills")
    #expect(preferences.teamFeedSeenAt(for: "bills") == hoursAgo(2))
    #expect(preferences.teamFeedSeenAt(for: "chiefs") == nil)
}
