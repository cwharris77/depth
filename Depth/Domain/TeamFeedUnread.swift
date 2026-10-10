import Foundation

/// Whether a team's feed holds something this device has not shown yet.
enum TeamFeedUnread {
    /// An event older than this is never counted as unread, so a team opened for the
    /// first time is not flagged for news that is no longer new.
    static let window: TimeInterval = 7 * 24 * 60 * 60

    static func hasUnread(newest: Date?, lastSeen: Date?, now: Date) -> Bool {
        guard let newest, now.timeIntervalSince(newest) <= window else { return false }
        guard let lastSeen else { return true }
        return newest > lastSeen
    }
}
