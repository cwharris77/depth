import Foundation
import Observation

/// Every feature flag in the app. A flag exists only as a case here, with its metadata in
/// `definition`; code reads it through `FeatureFlagStore.isEnabled(_:)`.
///
/// To add one: add a case, give it a definition dated today, and gate the unfinished UI
/// on it. To launch: set `launched: true` so Release builds turn it on. Then delete the
/// case and its dead code path in the next release.
/// `everyFeatureFlagIsWithinItsLifetime()` fails once a flag outlives `maximumLifetime`.
enum FeatureFlag: CaseIterable, Sendable {
    /// Team notifications and the team feed.
    case proactiveNotifications

    var definition: FeatureFlagDefinition {
        switch self {
        case .proactiveNotifications:
            FeatureFlagDefinition(
                key: "proactiveNotifications",
                summary: "Team notifications and the team feed",
                kind: .release,
                added: "2026-10-09",
                launched: false)
        }
    }

    /// How long a flag may exist, counted from `FeatureFlagDefinition.added`.
    static let maximumLifetime: TimeInterval = 56 * 24 * 60 * 60
}

struct FeatureFlagDefinition: Sendable, Equatable {
    enum Kind: String, Sendable {
        /// Hides merged-but-unfinished work. Compiled in, never fetched.
        case release
    }

    /// Stable identifier, also the suffix of the internal-build override key
    /// (`featureFlag.<key>`), so it can be set from a launch argument:
    /// `-featureFlag.<key> YES`.
    let key: String
    /// One line shown on the internal flag screen.
    let summary: String
    let kind: Kind
    /// The day the flag was added, `yyyy-MM-dd`. Starts the lifetime clock.
    let added: String
    /// True once the feature has shipped. Release builds read only this value.
    let launched: Bool

    var addedDate: Date? {
        try? Date(added, strategy: .iso8601.year().month().day())
    }

    var removeBy: Date? {
        addedDate?.addingTimeInterval(FeatureFlag.maximumLifetime)
    }

    /// Internal builds default every flag on so unfinished work can be exercised, and
    /// honor a local override. Release builds ignore overrides entirely.
    func isEnabled(internalBuild: Bool, override: Bool?) -> Bool {
        guard internalBuild else { return launched }
        return override ?? true
    }
}

@MainActor
@Observable
final class FeatureFlagStore {
    nonisolated static let isInternalBuild: Bool = {
        #if INTERNAL_BUILD
            return true
        #else
            return false
        #endif
    }()

    let isInternalBuild: Bool
    let definitions: [FeatureFlagDefinition]
    private(set) var overrides: [String: Bool]
    @ObservationIgnored private let defaults: UserDefaults

    init(
        definitions: [FeatureFlagDefinition] = FeatureFlag.allCases.map(\.definition),
        defaults: UserDefaults = .standard,
        isInternalBuild: Bool = FeatureFlagStore.isInternalBuild
    ) {
        self.definitions = definitions
        self.defaults = defaults
        self.isInternalBuild = isInternalBuild
        var overrides: [String: Bool] = [:]
        if isInternalBuild {
            for definition in definitions {
                let key = Self.overrideKey(definition.key)
                if defaults.object(forKey: key) != nil {
                    overrides[definition.key] = defaults.bool(forKey: key)
                }
            }
        }
        self.overrides = overrides
    }

    func isEnabled(_ flag: FeatureFlag) -> Bool {
        isEnabled(flag.definition)
    }

    func isEnabled(_ definition: FeatureFlagDefinition) -> Bool {
        definition.isEnabled(
            internalBuild: isInternalBuild, override: overrides[definition.key])
    }

    /// Sets or clears (`nil`) a local override. A no-op outside internal builds.
    func setOverride(_ value: Bool?, for definition: FeatureFlagDefinition) {
        guard isInternalBuild else { return }
        let key = Self.overrideKey(definition.key)
        if let value {
            defaults.set(value, forKey: key)
        } else {
            defaults.removeObject(forKey: key)
        }
        overrides[definition.key] = value
    }

    static func overrideKey(_ flagKey: String) -> String {
        "featureFlag.\(flagKey)"
    }
}
