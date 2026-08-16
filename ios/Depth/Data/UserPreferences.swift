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
        static let uniformSelections = "preferences.uniformSelections"
        static let depthOverrides = "preferences.depthOverrides"
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

    /// Per-team uniform selection (2026-08-15 visual-pass round 1): the uniform the
    /// field recolors with. Keyed by team id so switching teams keeps each team's own
    /// jersey, mirroring web's per-team localStorage kit selection.
    func uniformSelection(for teamId: String) -> String? {
        (defaults.dictionary(forKey: Key.uniformSelections) as? [String: String])?[teamId]
    }

    func setUniformSelection(_ uniformId: String?, for teamId: String) {
        var selections = defaults.dictionary(forKey: Key.uniformSelections) as? [String: String] ?? [:]
        if let uniformId {
            selections[teamId] = uniformId
        } else {
            selections[teamId] = nil
        }
        defaults.set(selections, forKey: Key.uniformSelections)
    }

    // DEP-219: local-first custom depth-chart order, literal port of web's
    // lib/utils/depth-chart/depth-overrides.ts (localStorage there, UserDefaults here).
    // The always-on cache — works with no account, mirrored to the server only when
    // signed in (DepthOverrideStore.LocalFirstWriter). Stored as plain
    // [teamId: [positionRawValue: [playerId]]] — a plist-native shape, no JSON
    // encode/decode needed, matching this file's existing dictionary(forKey:) pattern.

    private var overrideStore: [String: [String: [String]]] {
        defaults.dictionary(forKey: Key.depthOverrides) as? [String: [String: [String]]] ?? [:]
    }

    func teamOverride(for teamId: String) -> [Position: [String]] {
        decode(overrideStore[teamId] ?? [:])
    }

    /// Every locally-held team's override, teamId -> override. Used by the sign-in
    /// merge to reconcile the whole local cache against the server at once.
    func allOverrides() -> [String: [Position: [String]]] {
        overrideStore.mapValues(decode)
    }

    func setPositionOrder(teamId: String, position: Position, ids: [String]) {
        var store = overrideStore
        var team = store[teamId] ?? [:]
        team[position.rawValue] = ids
        store[teamId] = team
        defaults.set(store, forKey: Key.depthOverrides)
    }

    func clearPositionOrder(teamId: String, position: Position) {
        var store = overrideStore
        guard var team = store[teamId] else { return }
        team[position.rawValue] = nil
        store[teamId] = team.isEmpty ? nil : team
        defaults.set(store, forKey: Key.depthOverrides)
    }

    func clearTeamOverride(teamId: String) {
        var store = overrideStore
        store[teamId] = nil
        defaults.set(store, forKey: Key.depthOverrides)
    }

    /// Replaces a team's whole override at once (sign-in merge pulling the server's
    /// copy, which wins per team — lib/utils/depth-chart/overrides-sync.ts's
    /// `planMerge`). An empty override clears the team's entry entirely.
    func setTeamOverride(_ override: [Position: [String]], for teamId: String) {
        var store = overrideStore
        if override.isEmpty {
            store[teamId] = nil
        } else {
            store[teamId] = Dictionary(uniqueKeysWithValues: override.map { ($0.key.rawValue, $0.value) })
        }
        defaults.set(store, forKey: Key.depthOverrides)
    }

    private func decode(_ raw: [String: [String]]) -> [Position: [String]] {
        Dictionary(uniqueKeysWithValues: raw.compactMap { key, ids in
            Position(rawValue: key).map { ($0, ids) }
        })
    }
}
