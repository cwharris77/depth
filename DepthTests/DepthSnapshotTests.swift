#if UITEST_FIXTURES
import SnapshotTesting
import SwiftUI
import Testing
@testable import Depth

// SwiftUI visual-regression snapshots for the surfaces the app is mostly made of (spec:
// 2026-09-10-ios-test-data-and-snapshot-testing-design, Phase 4). These replace the retired
// PR-screenshot pipeline: they render a view synchronously from the checked-in fixture
// bundle, so a visual change is a fast, deterministic unit-test failure rather than a
// booted-simulator screenshot uploaded to Cloudinary.
//
// Scope note: only views that render from plain data or an injected view model are covered.
// Views that load in `.task` are deliberately excluded — a synchronous snapshot would
// capture their loading skeleton, which is not the regression we care about.
//
// References live in DepthTests/__Snapshots__/DepthSnapshotTests/ and are recorded on
// the simulator/OS CI uses (swift-snapshot-testing requires the same renderer to compare).
// A missing or changed reference fails the test; nothing is silently updated. Re-record
// intentionally by deleting the reference (or running with the record trait).
@MainActor
@Suite struct DepthSnapshotTests {
    /// The fixture bundle the hermetic UI suite also runs on.
    private var repository: FixtureDepthRepository { FixtureDepthRepository.load() }

    /// A current-flagship logical size; `SwiftUISnapshotLayout.fixed` keeps the output
    /// independent of whatever simulator the test happens to run on.
    private static let phone = SwiftUISnapshotLayout.fixed(width: 393, height: 852)

    /// The blocking update gate — pure copy, no data. Renders the brand mark + dialog.
    @Test func blockingUpdate() {
        assertSnapshot(
            of: BlockingUpdateView(
                maintenanceMessage: "Depth is getting an update. Update to keep watching."
            ),
            as: .image(perceptualPrecision: 0.98, layout: Self.phone)
        )
    }

    /// The signature surface: the depth-chart field with a real fixture roster on it.
    @Test func depthChartFieldOffense() async throws {
        let snapshot = try await repository.teamSnapshot(teamId: "bills")
        assertSnapshot(
            of: DepthChartFieldView(snapshot: snapshot, unit: .offense, onSelectPlayer: { _ in }),
            as: .image(perceptualPrecision: 0.98, layout: .fixed(width: 393, height: 760))
        )
    }

    @Test func depthChartFieldDefense() async throws {
        let snapshot = try await repository.teamSnapshot(teamId: "bills")
        assertSnapshot(
            of: DepthChartFieldView(snapshot: snapshot, unit: .defense, onSelectPlayer: { _ in }),
            as: .image(perceptualPrecision: 0.98, layout: .fixed(width: 393, height: 760))
        )
    }

    @Test func depthChartFieldSpecialTeams() async throws {
        let snapshot = try await repository.teamSnapshot(teamId: "bills")
        assertSnapshot(
            of: DepthChartFieldView(snapshot: snapshot, unit: .special, onSelectPlayer: { _ in }),
            as: .image(perceptualPrecision: 0.98, layout: .fixed(width: 393, height: 760))
        )
    }

    /// The off-screen share card (600×315, half the web OG raster).
    @Test func shareCard() async throws {
        let snapshot = try await repository.teamSnapshot(teamId: "bills")
        assertSnapshot(
            of: ShareCardView(team: snapshot.team, starters: featuredStarters(from: snapshot)),
            as: .image(perceptualPrecision: 0.98, layout: .fixed(width: 600, height: 315))
        )
    }

    /// The merged player profile as the depth chart pushes it: jersey band, vitals, and the
    /// read-only DEPTH CHART section. Stats resolve in `.task`, so the ledger renders its
    /// skeleton here — the section order and depth rows are what this guards.
    @Test func playerProfileWithDepth() async throws {
        let snapshot = try await repository.teamSnapshot(teamId: "bills")
        let quarterbacks = snapshot.players.filter { $0.position == .qb }
        let starter = try #require(quarterbacks.first, "the Bills fixture should include a QB")
        #expect(quarterbacks.count >= 2)
        assertSnapshot(
            of: NavigationStack {
                PlayerProfileView(
                    player: starter,
                    team: snapshot.team,
                    repository: repository,
                    depthContext: PlayerDepthContext(players: quarterbacks, isCustom: false)
                )
            },
            as: .image(perceptualPrecision: 0.98, layout: Self.phone)
        )
    }

    /// Edit mode's reorder surface for one position: drag rows, no CUSTOM state yet.
    @Test func positionReorderSheet() async throws {
        let snapshot = try await repository.teamSnapshot(teamId: "bills")
        let quarterbacks = snapshot.players.filter { $0.position == .qb }
        let starter = try #require(quarterbacks.first, "the Bills fixture should include a QB")
        assertSnapshot(
            of: PositionReorderSheet(
                position: .qb, players: quarterbacks, defaultOrder: quarterbacks, isCustom: false,
                highlightedPlayerID: starter.id, accent: DesignTokens.Colors.accent,
                onReorder: { _ in }, onReset: {}
            ),
            as: .image(perceptualPrecision: 0.98, layout: Self.phone)
        )
    }

    /// A reordered position: CUSTOM tag and Reset above the drag rows.
    @Test func positionReorderSheetCustom() async throws {
        let snapshot = try await repository.teamSnapshot(teamId: "bills")
        let quarterbacks = snapshot.players.filter { $0.position == .qb }
        let starter = try #require(quarterbacks.first, "the Bills fixture should include a QB")
        assertSnapshot(
            of: PositionReorderSheet(
                position: .qb, players: Array(quarterbacks.reversed()), defaultOrder: quarterbacks,
                isCustom: true, highlightedPlayerID: starter.id, accent: DesignTokens.Colors.accent,
                onReorder: { _ in }, onReset: {}
            ),
            as: .image(perceptualPrecision: 0.98, layout: Self.phone)
        )
    }
}
#endif
