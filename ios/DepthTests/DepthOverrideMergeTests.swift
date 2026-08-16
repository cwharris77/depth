import Testing
@testable import Depth

// DEP-219: verifies the native port of lib/utils/depth-chart/overrides-sync.ts's
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
        #expect(plan.pulls == [
            "jets": [.wr: ["both-server"]],
            "eagles": [.rb: ["server-only"]],
        ])
    }
}
