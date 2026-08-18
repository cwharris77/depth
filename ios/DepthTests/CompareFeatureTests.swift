import Foundation
import Testing
@testable import Depth

// DEP-258: the native two-team compare view model contract — team picking, the
// deepest-room computation, per-position grouping, and the tab/position state machine.
// The pure helpers (COMPARE_POSITIONS order, getDeepestPosition, buildCompareTeaser) get
// direct coverage; the view-model integration covers team selection across slots.

private func compareTeam(_ id: String, abbrev: String, city: String) -> Team {
    Team(
        id: id, city: city, name: abbrev, abbrev: abbrev,
        conference: "NFC", division: "West",
        colors: TeamColors(
            primary: "#002244", secondary: "#69be28", accent: "#69be28",
            uiAccent: "#69be28", onAccent: "#001b2e"
        ),
        logo: nil, logoDark: nil
    )
}

private func comparePlayer(
    id: String, name: String, position: Position, rank: Int, number: Int
) -> Player {
    Player(id: id, name: name, position: position, depthRank: rank, number: number)
}

private func compareSnapshot(team: Team, qbCount: Int) -> TeamSnapshot {
    let qbs = (0..<qbCount).map { i in
        comparePlayer(id: "\(team.id)-qb-\(i)", name: "Qb \(team.abbrev) \(i + 1)", position: .qb, rank: i + 1, number: i + 1)
    }
    let wrs = (0..<2).map { i in
        comparePlayer(id: "\(team.id)-wr-\(i)", name: "Wr \(team.abbrev) \(i + 1)", position: .wr, rank: i + 1, number: 10 + i)
    }
    return TeamSnapshot(team: team, players: qbs + wrs, specialTeams: [], uniforms: [])
}

private func statsPage(team: Team, wins: Int) -> TeamStatsPage {
    TeamStatsPage(
        team: team,
        seasons: [
            TeamSeasonStats(
                season: 2025, overallWins: wins, overallLosses: 17 - wins, overallTies: 0,
                homeWins: 4, homeLosses: 4, roadWins: wins - 4, roadLosses: 5,
                divisionWins: 2, divisionLosses: 3, conferenceWins: 5, conferenceLosses: 5,
                pointsFor: 402, pointsAgainst: 291, pointDifferential: 111
            )
        ],
        upcomingSeason: nil,
        currentSeason: 2025
    )
}

/// A fake backing the compare view model. Teams list + per-team snapshot/stats, so the
/// view model can resolve both sides.
private actor CompareRepositoryFake: DepthRepository {
    let teams: [Team]
    let snapshots: [String: TeamSnapshot]
    let stats: [String: TeamStatsPage]

    init(teams: [Team], snapshots: [String: TeamSnapshot], stats: [String: TeamStatsPage]) {
        self.teams = teams
        self.snapshots = snapshots
        self.stats = stats
    }

    func teams() async throws -> [Team] { teams }
    func teamSnapshot(teamId: String) async throws -> TeamSnapshot {
        guard let snap = snapshots[teamId] else { throw DepthError.notFound }
        return snap
    }
    func teamStats(teamId: String) async throws -> TeamStatsPage {
        guard let page = stats[teamId] else { throw DepthError.notFound }
        return page
    }
    func teamSeason(teamId: String, season: Int) async throws -> TeamSnapshot {
        throw DepthError.notFound
    }
    func teamSchedule(teamId: String, season: Int?) async throws -> TeamSchedule {
        throw DepthError.notFound
    }
    func playerStats(playerId: String, teamId: String?) async throws -> [PlayerSeasonStats] { [] }
    func appConfig() async throws -> AppConfig {
        AppConfig(minimumSupportedBuild: 1, maintenanceMessage: nil)
    }
}

// MARK: - Pure helpers

@Test func comparePositionsExcludeSpecialTeamsKeys() {
    // KR/PR/LS are editorial special-teams slots, not depth groups (web's
    // COMPARE_POSITIONS). Every other Position case is present, in web's display order.
    let expected = "QB,RB,FB,WR,TE,LT,LG,C,RG,RT,DE,LDE,RDE,DT,NT,LB,WLB,LILB,RILB,SLB,CB,LCB,RCB,NB,S,SS,FS,K,P"
    #expect(COMPARE_POSITIONS.map(\.rawValue).joined(separator: ",") == expected)
}

@Test func deepestRoomPicksTheMostCombinedDepth() {
    let a = (0..<3).map { comparePlayer(id: "a\($0)", name: "P\($0)", position: .wr, rank: $0 + 1, number: $0 + 1) }
    let b = (0..<1).map { comparePlayer(id: "b\($0)", name: "P\($0)", position: .wr, rank: $0 + 1, number: $0 + 1) }
    let empty: [Player] = []

    // WR has 3+1=4 combined; QB and RB have none on one side.
    let positions: [Position] = [.qb, .wr, .rb]
    #expect(getDeepestPosition(playersA: [empty, a, empty], playersB: [empty, b, empty], positions: positions) == .wr)
}

@Test func deepestRoomTiesResolveToEarliestPosition() {
    let a = (0..<2).map { comparePlayer(id: "a\($0)", name: "P\($0)", position: .qb, rank: $0 + 1, number: $0 + 1) }
    let b = (0..<2).map { comparePlayer(id: "b\($0)", name: "P\($0)", position: .wr, rank: $0 + 1, number: $0 + 1) }
    let empty: [Player] = []

    // QB and WR both have 2 combined — tie resolves to the earlier position (QB).
    let positions: [Position] = [.qb, .wr]
    #expect(getDeepestPosition(playersA: [a, empty], playersB: [empty, b], positions: positions) == .qb)
}

@Test func deepestRoomReturnsNilWhenEverythingIsEmpty() {
    let empty: [Player] = []
    #expect(getDeepestPosition(playersA: [empty, empty], playersB: [empty, empty], positions: [.qb, .wr]) == nil)
    // buildCompareTeaser mirrors that.
    #expect(buildCompareTeaser(playersA: [empty], playersB: [empty], positions: [.qb]) == nil)
}

@Test func buildCompareTeaserCarriesTheRankOnePlayersAndCounts() {
    let topA = comparePlayer(id: "a1", name: "Alpha One", position: .wr, rank: 1, number: 11)
    let topB = comparePlayer(id: "b1", name: "Beta One", position: .wr, rank: 1, number: 12)
    let a = [topA]
    let b = (0..<2).map { comparePlayer(id: "b\($0)", name: "P\($0)", position: .wr, rank: $0 + 1, number: $0 + 1) }

    let teaser = buildCompareTeaser(playersA: [a], playersB: [b], positions: [.wr])
    #expect(teaser?.position == .wr)
    #expect(teaser?.countA == 1)
    #expect(teaser?.countB == 2)
    #expect(teaser?.topA == topA)
    #expect(teaser?.topB == b[0])
}

// MARK: - View model

@Test func pickingBothTeamsResolvesStatsAndRoster() async {
    let hawks = compareTeam("seahawks", abbrev: "SEA", city: "Seattle")
    let niners = compareTeam("49ers", abbrev: "SF", city: "San Francisco")
    let repo = CompareRepositoryFake(
        teams: [hawks, niners],
        snapshots: [
            hawks.id: compareSnapshot(team: hawks, qbCount: 1),
            niners.id: compareSnapshot(team: niners, qbCount: 3),
        ],
        stats: [
            hawks.id: statsPage(team: hawks, wins: 12),
            niners.id: statsPage(team: niners, wins: 9),
        ]
    )
    let viewModel = await CompareViewModel(repository: repo)
    await viewModel.load()

    #expect(await viewModel.loadState == .loaded)
    #expect(await viewModel.pickedCount == 0)

    await viewModel.pickTeam("seahawks", into: .a)
    await viewModel.pickTeam("49ers", into: .b)

    #expect(await viewModel.pickedCount == 2)
    #expect(await viewModel.bothPicked)
    #expect(await viewModel.sameTeam == false)
    #expect(await viewModel.teamA?.id == "seahawks")
    #expect(await viewModel.teamB?.id == "49ers")

    // Stats resolved per side.
    #expect(await viewModel.effectiveStatsA?.overallWins == 12)
    #expect(await viewModel.effectiveStatsB?.overallWins == 9)

    // Default position is QB; SEA has 1, SF has 3.
    #expect(await viewModel.position == .qb)
    #expect(await viewModel.positionGroupA.count == 1)
    #expect(await viewModel.positionGroupB.count == 3)
}

@Test func tappingSameTeamFlagsAndTeaserHides() async {
    let hawks = compareTeam("seahawks", abbrev: "SEA", city: "Seattle")
    let repo = CompareRepositoryFake(
        teams: [hawks],
        snapshots: [hawks.id: compareSnapshot(team: hawks, qbCount: 2)],
        stats: [hawks.id: statsPage(team: hawks, wins: 12)]
    )
    let viewModel = await CompareViewModel(repository: repo)
    await viewModel.load()

    await viewModel.pickTeam("seahawks", into: .a)
    await viewModel.pickTeam("seahawks", into: .b)

    #expect(await viewModel.sameTeam)
    #expect(await viewModel.bothPicked)
    // Teaser hides when both sides are the same team.
    #expect(await viewModel.teaser == nil)
}

@Test func teaserShowsOnlyOnceBothDistinctTeamsArePicked() async {
    let hawks = compareTeam("seahawks", abbrev: "SEA", city: "Seattle")
    let niners = compareTeam("49ers", abbrev: "SF", city: "San Francisco")
    let repo = CompareRepositoryFake(
        teams: [hawks, niners],
        snapshots: [
            hawks.id: compareSnapshot(team: hawks, qbCount: 1),
            niners.id: compareSnapshot(team: niners, qbCount: 3),
        ],
        stats: [
            hawks.id: statsPage(team: hawks, wins: 12),
            niners.id: statsPage(team: niners, wins: 9),
        ]
    )
    let viewModel = await CompareViewModel(repository: repo)
    await viewModel.load()

    // One side picked — no teaser yet.
    await viewModel.pickTeam("seahawks", into: .a)
    #expect(await viewModel.teaser == nil)

    await viewModel.pickTeam("49ers", into: .b)
    #expect(await viewModel.teaser?.position == .qb)
}

@Test func tabAndPositionSelectionAreLocalState() async {
    let hawks = compareTeam("seahawks", abbrev: "SEA", city: "Seattle")
    let niners = compareTeam("49ers", abbrev: "SF", city: "San Francisco")
    let repo = CompareRepositoryFake(
        teams: [hawks, niners],
        snapshots: [hawks.id: compareSnapshot(team: hawks, qbCount: 1), niners.id: compareSnapshot(team: niners, qbCount: 3)],
        stats: [hawks.id: statsPage(team: hawks, wins: 12), niners.id: statsPage(team: niners, wins: 9)]
    )
    let viewModel = await CompareViewModel(repository: repo)
    await viewModel.load()

    // Defaults to the matchup tab (web's no-`pos` default).
    #expect(await viewModel.tab == .matchup)

    await viewModel.selectTab(.position)
    #expect(await viewModel.tab == .position)
    await viewModel.selectPosition(.wr)
    #expect(await viewModel.position == .wr)
}