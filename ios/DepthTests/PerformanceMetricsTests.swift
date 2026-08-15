import SwiftData
import XCTest
@testable import Depth

// XCTest performance coverage for design spec Performance Review #5/#6: the network
// query+decode and SwiftData cache-transaction budgets. `XCTClockMetric` records each
// duration into the Xcode test report/Instruments (the "XCTest metrics" the spec asks
// for); `measure(metrics:options:)` alone never fails a test without a recorded
// Xcode baseline (a machine-specific artifact this repo doesn't commit), so the
// `XCTAssertLessThan` after each `measure` call is the actual CI-blocking gate.
final class PerformanceMetricsTests: XCTestCase {
    private func oneShotOptions() -> XCTMeasureOptions {
        // A real network round trip (the first test) shouldn't run the default 10x —
        // one measured iteration is enough to catch a regression without hammering
        // staging Supabase or tripling this suite's CI runtime.
        let options = XCTMeasureOptions()
        options.iterationCount = 1
        return options
    }

    /// Real network hit against the same staging Supabase project every other test in
    /// this target and `DepthUITests` already exercises (Debug's `.xcconfig` bakes the
    /// staging URL/key into the hosted app's Info.plist that `DepthEnvironment` reads).
    /// Budget is intentionally looser than the design spec's 3s "constrained
    /// networking" ceiling — shared macOS CI runners add non-deterministic
    /// scheduling/network noise on top of the real request; 6s still catches an
    /// order-of-magnitude regression without making CI red on a slow runner (see
    /// task-9b-performance-report.md for the full rationale).
    func testTeamSnapshotQueryAndDecodeFallsWithinBudget() throws {
        let repository = SupabaseDepthRepository(client: DepthEnvironment.supabaseClient)
        let clock = ContinuousClock()
        // Read only after `semaphore.wait()` returns, which happens-after the `Task`'s
        // `defer { semaphore.signal() }` — safe despite crossing an isolation domain,
        // which is exactly what `nonisolated(unsafe)` is for.
        nonisolated(unsafe) var elapsed: Duration = .zero
        nonisolated(unsafe) var thrown: Error?

        measure(metrics: [XCTClockMetric()], options: oneShotOptions()) {
            let semaphore = DispatchSemaphore(value: 0)
            let start = clock.now
            Task {
                defer { semaphore.signal() }
                do {
                    _ = try await repository.teamSnapshot(teamId: "bills")
                } catch {
                    thrown = error
                }
            }
            semaphore.wait()
            elapsed = clock.now - start
        }

        XCTAssertNil(thrown, "team snapshot fetch should succeed against staging")
        XCTAssertLessThan(
            elapsed, .seconds(6),
            "team snapshot query+decode should stay well under the constrained-network 3s budget, with slack for CI noise"
        )
    }

    /// SwiftData is local and deterministic (no network variance), so this asserts much
    /// closer to the design spec's actual <1s "warm cached content" budget than the
    /// network test above can — the cache transaction is only a fraction of that
    /// end-to-end number, so both thresholds here are well under it.
    func testTeamSnapshotCacheTransactionFallsWithinBudget() throws {
        let schema = Schema(DepthCacheSchema.models)
        let configuration = ModelConfiguration(schema: schema, isStoredInMemoryOnly: true)
        let container = try ModelContainer(for: schema, configurations: [configuration])
        let store = CachedSnapshotStore(modelContainer: container)
        let snapshot = TeamSnapshot(team: sampleTeam(), players: [], specialTeams: [], uniforms: [])
        let clock = ContinuousClock()
        // Same happens-after guarantee via `semaphore.wait()` as the network test above.
        nonisolated(unsafe) var writeElapsed: Duration = .zero
        nonisolated(unsafe) var readElapsed: Duration = .zero
        nonisolated(unsafe) var thrown: Error?
        nonisolated(unsafe) var readSnapshot: TeamSnapshot?

        measure(metrics: [XCTClockMetric()], options: oneShotOptions()) {
            let semaphore = DispatchSemaphore(value: 0)
            Task {
                defer { semaphore.signal() }
                do {
                    let writeStart = clock.now
                    try await store.saveTeamSnapshot(snapshot, teamId: "bills", cachedAt: Date())
                    writeElapsed = clock.now - writeStart

                    let readStart = clock.now
                    readSnapshot = try await store.teamSnapshot(teamId: "bills")
                    readElapsed = clock.now - readStart
                } catch {
                    thrown = error
                }
            }
            semaphore.wait()
        }

        // Greptile P2 (PR #371): the original version swallowed both calls' errors with
        // `try?` and discarded the read result, so a failed save/read/nil-cache-miss
        // would still record a short duration and pass — asserting the round trip
        // actually succeeded, not just that it was fast, closes that gap.
        XCTAssertNil(thrown, "cache write/read round trip should succeed")
        XCTAssertEqual(readSnapshot?.team.id, "bills", "the read should return the snapshot just written, not a cache miss")
        XCTAssertLessThan(writeElapsed, .milliseconds(500), "an in-memory SwiftData cache write should be near-instant")
        XCTAssertLessThan(
            readElapsed, .milliseconds(200),
            "the warm-cache read alone should be a small fraction of the <1s end-to-end warm-launch budget"
        )
    }
}

private func sampleTeam(id: String = "bills") -> Team {
    Team(
        id: id, city: "Buffalo", name: "Bills", abbrev: "BUF", conference: "AFC", division: "East",
        colors: TeamColors(primary: "#00338d", secondary: "#d50a0a", accent: "#d50a0a", uiAccent: "#d50a0a", onAccent: "#fff"),
        logo: nil, logoDark: nil
    )
}
