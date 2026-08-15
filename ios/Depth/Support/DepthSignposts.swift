import Foundation
import OSLog

// Central `os_signpost` instrumentation point (design spec Performance Review #5: "Add
// XCTest metrics and os_signpost around launch, query, decode, cache transaction, and
// first useful render"). One `OSSignposter` scoped to a single subsystem/category keeps
// every interval visible together on Instruments' os_signpost track, and lets
// `XCTOSSignpostMetric` target these names directly from the performance test suites
// (`ios/DepthUITests/PerformanceUITests.swift`, `ios/DepthTests/PerformanceMetricsTests.swift`)
// without each call site rolling its own `OSLog`. Every interval name below corresponds
// 1:1 to a budget in the design spec's Performance Review #6.
enum DepthSignposts {
    static let subsystem = Bundle.main.bundleIdentifier ?? "com.cwharris.depth"
    static let category = "performance"

    static let signposter = OSSignposter(subsystem: subsystem, category: category)

    /// App init → first useful render. There is no dedicated "chart visible" event in
    /// the current UI structure, so this closes on the team list's first successful
    /// load (`TeamListViewModel.load()`) — the earliest screen with real, user-visible
    /// content, and the gate every other screen (including the depth chart) renders
    /// behind on cold start.
    ///
    /// This closes when the data is ready, not when SwiftUI has finished committing the
    /// resulting render pass — the same "data-ready" proxy `AppEventsRecorder`'s
    /// `depthChartReached` event already uses for its own "reached" telemetry
    /// (`TeamDetailViewModel.load()`). A render-accurate close would need a paint-
    /// completion hook (e.g. `.onAppear`/`CADisplayLink` on the rendered `List`) with a
    /// SwiftUI-lifecycle dependency this signpost's other two call sites (which are
    /// pure `Data/` layer, no view access) don't have — out of scope for this task. The
    /// data-to-paint gap this leaves is small on the actual "first team list" case; the
    /// XCUITest suite's regression guard (`PerformanceUITests.swift`) verifies against
    /// an actual rendered team row appearing, not just this signpost closing, so a
    /// budget regression is still caught even where this interval alone would look fine.
    static let appLaunch: StaticString = "AppLaunchToFirstUsefulRender"

    /// Network query + JSON decode for one team's full snapshot
    /// (`SupabaseDepthRepository.teamSnapshot(teamId:)`) — Performance Review budget:
    /// p95 <1.5s on good Wi-Fi, <3s on constrained networking.
    static let teamSnapshotQuery: StaticString = "TeamSnapshotQueryAndDecode"

    /// SwiftData cache transaction for a team snapshot read or write
    /// (`CachedSnapshotStore.teamSnapshot`/`saveTeamSnapshot`) — the "cache transaction"
    /// leg between a network fetch and the value reaching the view model.
    static let teamSnapshotCacheTransaction: StaticString = "TeamSnapshotCacheTransaction"

    /// App-launch signpost start/end happen in two different files (`DepthApp.init()`
    /// and `TeamListViewModel.load()`) that don't otherwise share state, so the
    /// in-flight `OSSignpostIntervalState` has to live somewhere both can reach. Actor
    /// isolation is `@MainActor` because both call sites already run there (SwiftUI
    /// `App.init()` and `TeamListViewModel`'s `@MainActor` isolation), which is also
    /// what Swift 6 strict concurrency requires for this shared mutable static.
    @MainActor private static var launchState: OSSignpostIntervalState?

    /// No-op if already started — `TeamListViewModel.load()` can run more than once
    /// (pull-to-refresh) but the launch interval only ever opens once per process.
    @MainActor static func beginAppLaunch() {
        guard launchState == nil else { return }
        launchState = signposter.beginInterval(appLaunch)
    }

    /// No-op if the interval was never opened or was already closed — guards against a
    /// second "first load" (e.g. a retry after a failed initial load) double-ending it.
    @MainActor static func endAppLaunchIfNeeded() {
        guard let state = launchState else { return }
        signposter.endInterval(appLaunch, state)
        launchState = nil
    }
}
