import Foundation

/// How much a device wants to hear about its team. The raw values are the strings the
/// server stores, so they must not change.
enum NotificationTier: String, CaseIterable, Sendable {
    case bigMoments = "big_moments"
    case everything
    case off

    var title: String {
        switch self {
        case .bigMoments: "Big moments"
        case .everything: "Everything"
        case .off: "Off"
        }
    }

    var summary: String {
        switch self {
        case .bigMoments: "New starters, trades, record chases and historic games."
        case .everything: "Every depth chart, roster and injury change, plus standout games."
        case .off: "No notifications."
        }
    }
}
