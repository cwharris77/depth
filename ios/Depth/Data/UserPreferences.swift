import Foundation

// Last-selected team/section restoration state (design spec Milestone 1 item 16:
// "Restore the last team and section on relaunch"). This is small key-value state, not
// a versioned server snapshot, so it lives in UserDefaults rather than SwiftData —
// keeps CachedSnapshotStore scoped to what it's actually versioning.
struct UserPreferences: Sendable {
    // UserDefaults is thread-safe (Apple docs) but not yet marked Sendable in this SDK —
    // `nonisolated(unsafe)` documents that the unchecked-Sendable risk is accepted, not
    // ignored.
    private nonisolated(unsafe) let defaults: UserDefaults

    private enum Key {
        static let lastTeamId = "preferences.lastTeamId"
        static let lastUnit = "preferences.lastUnit"
    }

    init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
    }

    var lastTeamId: String? {
        get { defaults.string(forKey: Key.lastTeamId) }
        nonmutating set { defaults.set(newValue, forKey: Key.lastTeamId) }
    }

    var lastUnit: Unit? {
        get { (defaults.string(forKey: Key.lastUnit)).flatMap(Unit.init(rawValue:)) }
        nonmutating set { defaults.set(newValue?.rawValue, forKey: Key.lastUnit) }
    }
}
