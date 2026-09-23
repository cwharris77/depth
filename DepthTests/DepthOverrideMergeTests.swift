import Testing
@testable import Depth

// verifies the native port of web/lib/utils/depth-chart/overrides-sync.ts's
// `planMerge` matches web's exact reconciliation policy — server wins per team,
// local-only teams get pushed up, empty/absent teams produce no work.
struct DepthOverrideMergeTests {
    @Test func localOnlyTeamIsPushed() {
        let plan = DepthOverrideMerge.plan(
            local: ["giants": [.qb: ["p1"]]],
            server: [:]
        )
        #expect(plan.pushes == ["giants"])
        #expect(plan.pulls.isEmpty)
    }

    @Test func serverTeamWinsAndIsPulled() {
        let plan = DepthOverrideMerge.plan(
            local: ["giants": [.qb: ["p1"]]],
            server: ["giants": [.qb: ["p2"]]]
        )
        #expect(plan.pushes.isEmpty)
        #expect(plan.pulls == ["giants": [.qb: ["p2"]]])
    }

    @Test func emptyLocalAndServerProduceNoWork() {
        let plan = DepthOverrideMerge.plan(local: [:], server: [:])
        #expect(plan.pushes.isEmpty)
        #expect(plan.pulls.isEmpty)
    }

    @Test func emptyOverrideDictionaryIsNotTreatedAsHavingKeys() {
        // A team present in the store with an empty override (e.g. after a reset)
        // shouldn't be pushed or pulled — hasKeys() must check for actual entries.
        let plan = DepthOverrideMerge.plan(
            local: ["giants": [:]],
            server: ["jets": [:]]
        )
        #expect(plan.pushes.isEmpty)
        #expect(plan.pulls.isEmpty)
    }

    @Test func mixedTeamsAreReconciledIndependently() {
        let plan = DepthOverrideMerge.plan(
            local: [
                "giants": [.qb: ["local-only"]],
                "jets": [.wr: ["both-local"]],
            ],
            server: [
                "jets": [.wr: ["both-server"]],
                "eagles": [.rb: ["server-only"]],
            ]
        )
        #expect(plan.pushes == ["giants"])
        #expect(
            plan.pulls == [
                "jets": [.wr: ["both-server"]],
                "eagles": [.rb: ["server-only"]],
            ])
    }
}

// a user's custom order must not destroy the seat map. One athlete can hold
// two seats (the Chiefs list Kahlil Benson at LT2 and RT1), so overrides have to reorder
// that position's *seats* rather than filter players by their single canonical position.
struct DepthOverrideSeatTests {
    private func player(_ id: String, _ position: Position, _ rank: Int, _ number: Int) -> Player {
        Player(id: id, name: id, position: position, depthRank: rank, number: number)
    }

    /// The Chiefs' real tackle shape: Benson is canonically an LT but holds RT1.
    private func snapshot() -> TeamSnapshot {
        TeamSnapshot(
            team: Team(
                id: "chiefs", city: "Kansas City", name: "Chiefs", abbrev: "KC",
                conference: "AFC", division: "West",
                colors: TeamColors(primary: "#000", secondary: "#fff", accent: "#888"),
                logo: nil, logoDark: nil
            ),
            players: [
                player("simmons", .lt, 1, 71),
                player("benson", .lt, 2, 70),
                player("moore", .lt, 3, 77),
                player("pounds", .rt, 3, 61),
            ],
            specialTeams: [],
            uniforms: [],
            depthChart: [
                DepthSeat(position: .lt, depthRank: 1, playerId: "simmons"),
                DepthSeat(position: .lt, depthRank: 2, playerId: "benson"),
                DepthSeat(position: .lt, depthRank: 3, playerId: "moore"),
                DepthSeat(position: .rt, depthRank: 1, playerId: "benson"),
                DepthSeat(position: .rt, depthRank: 2, playerId: "moore"),
                DepthSeat(position: .rt, depthRank: 3, playerId: "pounds"),
            ]
        )
    }

    @Test func anOverrideDoesNotDestroyTheSeatMap() {
        let result = applyingDepthOverrides(to: snapshot(), orders: [.qb: ["nobody"]])
        #expect(result.depthChart?.count == 6)
    }

    @Test func theRightTacklePoolIsSeatedNotFilteredByCanonicalPosition() {
        // Before seats, filtering players by `position == .rt` found only Diego Pounds,
        // so the profile's depth ladder read "No backups available" behind an RT1 who
        // was canonically an LT.
        let snap = snapshot()
        let roster = Roster(
            players: snap.players, specialTeams: snap.specialTeams, depthChart: snap.depthChart)
        #expect(getPlayers(in: roster, at: .rt).map(\.id) == ["benson", "moore", "pounds"])
    }

    @Test func reorderingACrossListedPositionMovesThatPositionsSeats() {
        let result = applyingDepthOverrides(
            to: snapshot(), orders: [.rt: ["pounds", "moore", "benson"]])
        let roster = Roster(
            players: result.players, specialTeams: result.specialTeams,
            depthChart: result.depthChart)
        #expect(getPlayers(in: roster, at: .rt).map(\.id) == ["pounds", "moore", "benson"])
    }

    @Test func reorderingOnePositionLeavesTheOtherSeatsAlone() {
        let result = applyingDepthOverrides(
            to: snapshot(), orders: [.rt: ["pounds", "moore", "benson"]])
        let roster = Roster(
            players: result.players, specialTeams: result.specialTeams,
            depthChart: result.depthChart)
        #expect(getPlayers(in: roster, at: .lt).map(\.id) == ["simmons", "benson", "moore"])
    }
}
