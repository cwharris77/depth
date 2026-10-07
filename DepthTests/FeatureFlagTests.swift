import Foundation
import Testing

@testable import Depth

// The registry checks (lifetime, unique keys) run against the real FeatureFlag cases, so a
// flag left in place past FeatureFlag.maximumLifetime fails the suite until it is deleted.
// The store and resolution checks use synthetic definitions so they cover behavior even
// while no flags are registered.

private func definition(
    key: String = "sample",
    added: String = "2026-10-06",
    launched: Bool = false
) -> FeatureFlagDefinition {
    FeatureFlagDefinition(
        key: key, summary: "Sample", kind: .release, added: added, launched: launched)
}

private func isolatedDefaults() -> UserDefaults {
    let suite = "FeatureFlagTests.\(UUID().uuidString)"
    let defaults = UserDefaults(suiteName: suite) ?? .standard
    defaults.removePersistentDomain(forName: suite)
    return defaults
}

@Test func everyFeatureFlagIsWithinItsLifetime() throws {
    let now = Date()
    for flag in FeatureFlag.allCases {
        let definition = flag.definition
        let removeBy = try #require(
            definition.removeBy, "\(definition.key): `added` must be yyyy-MM-dd")
        #expect(
            now < removeBy,
            "\(definition.key) passed its remove-by date; launch it and delete the flag")
    }
}

@Test func featureFlagKeysAreUnique() {
    let keys = FeatureFlag.allCases.map(\.definition.key)
    #expect(Set(keys).count == keys.count)
}

@Test func removeByIsEightWeeksAfterAdded() throws {
    let added = try #require(definition(added: "2026-10-06").addedDate)
    let removeBy = try #require(definition(added: "2026-10-06").removeBy)
    #expect(removeBy.timeIntervalSince(added) == 56 * 24 * 60 * 60)
}

@Test func malformedAddedDateHasNoRemoveBy() {
    #expect(definition(added: "Oct 6").removeBy == nil)
}

@Test func releaseBuildsReadOnlyLaunched() {
    #expect(!definition(launched: false).isEnabled(internalBuild: false, override: true))
    #expect(definition(launched: true).isEnabled(internalBuild: false, override: false))
}

@Test func internalBuildsDefaultOnAndHonorOverrides() {
    let flag = definition(launched: false)
    #expect(flag.isEnabled(internalBuild: true, override: nil))
    #expect(!flag.isEnabled(internalBuild: true, override: false))
}

@Test @MainActor func storePersistsAndClearsOverrides() {
    let defaults = isolatedDefaults()
    let flag = definition()
    let store = FeatureFlagStore(definitions: [flag], defaults: defaults, isInternalBuild: true)
    #expect(store.isEnabled(flag))

    store.setOverride(false, for: flag)
    #expect(!store.isEnabled(flag))
    let reloaded = FeatureFlagStore(
        definitions: [flag], defaults: defaults, isInternalBuild: true)
    #expect(!reloaded.isEnabled(flag))

    reloaded.setOverride(nil, for: flag)
    #expect(reloaded.isEnabled(flag))
    #expect(defaults.object(forKey: FeatureFlagStore.overrideKey(flag.key)) == nil)
}

@Test @MainActor func releaseStoreIgnoresStoredOverrides() {
    let defaults = isolatedDefaults()
    let flag = definition(launched: false)
    defaults.set(true, forKey: FeatureFlagStore.overrideKey(flag.key))
    let store = FeatureFlagStore(definitions: [flag], defaults: defaults, isInternalBuild: false)
    #expect(!store.isEnabled(flag))
    store.setOverride(true, for: flag)
    #expect(!store.isEnabled(flag))
    #expect(store.overrides.isEmpty)
}
