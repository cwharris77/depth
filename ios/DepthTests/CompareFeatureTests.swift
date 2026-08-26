import Foundation
import Testing
@testable import Depth

// DEP-258: the native two-team compare view model contract — team picking, per-position
// grouping, and the tab/position/lens state machine. The pure helpers (COMPARE_POSITIONS
// order, the room→unit map, evidence freshness) get direct coverage; the view-model
// integration covers team selection across slots.
//
// Aug 2026 feedback pass removed the deepest-room teaser, market Forecast lens, and
// Roster participation lens from the app; their tests (getDeepestPosition/
// buildCompareTeaser, buildMarketForecast, summarizeStarterParticipation) went with them.

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

private func statsPage(
    team: Team,
    wins: Int,
    matchupMetrics: TeamMatchupMetrics? = nil
) -> TeamStatsPage {
    TeamStatsPage(
        team: team,
        seasons: [
            TeamSeasonStats(
                season: 2025, overallWins: wins, overallLosses: 17 - wins, overallTies: 0,
                homeWins: 4, homeLosses: 4, roadWins: wins - 4, roadLosses: 5,
                divisionWins: 2, divisionLosses: 3, conferenceWins: 5, conferenceLosses: 5,
                pointsFor: 402, pointsAgainst: 291, pointDifferential: 111,
                matchupMetrics: matchupMetrics
            )
        ],
        upcomingSeason: nil,
        currentSeason: 2025
    )
}

/// A fake backing the compare view model. Teams list + per-team snapshot/stats, so the
/// view model can resolve both sides. `teamSchedule` has no `DepthRepository` default
/// and Compare no longer reads it, so it just throws; `recentParticipation` falls back
/// to the protocol's own `nil` default for the same reason.
private actor CompareRepositoryFake: DepthRepository {
    let teams: [Team]
    let snapshots: [String: TeamSnapshot]
    let stats: [String: TeamStatsPage]

    init(
        teams: [Team],
        snapshots: [String: TeamSnapshot],
        stats: [String: TeamStatsPage]
    ) {
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

// MARK: - DEP-311: exhaustive position → unit/room mapping

@Test func matchupRoomMapIsExhaustiveAndUnambiguous() {
    // Every COMPARE_POSITIONS value maps to exactly one room, and no position is duplicated
    // across rooms. Fails on a missing or repeated position (DEP-311 done-when).
    let mapped = CompareMatchRooms.rooms.flatMap(\.positions)
    #expect(
        Set(mapped) == Set(COMPARE_POSITIONS),
        "every compare position must appear in exactly one room"
    )
    #expect(
        mapped.count == COMPARE_POSITIONS.count,
        "each compare position must map to exactly one room (got \(mapped.count) mapped entries)"
    )
    // ORDER preserved within each room, so the picker's exact-role grid reads in
    // COMPARE_POSITIONS display order.
    for room in CompareMatchRooms.rooms {
        #expect(
            room.positions == COMPARE_POSITIONS.filter { room.positions.contains($0) },
            "room \(room.id) positions should stay in COMPARE_POSITIONS order"
        )
    }
}

@Test func compareRoomGroupsMatchTheLockedContract() {
    // DEP-311 task 1 locked the exact group membership; pin each room by its raw codes so
    // a mis-grouped position is caught loudly.
    func codes(_ room: CompareRoom) -> String {
        room.positions.map(\.rawValue).joined(separator: ",")
    }
    #expect(codes(CompareMatchRooms.rooms.first { $0.id == "quarterback" }!) == "QB")
    #expect(codes(CompareMatchRooms.rooms.first { $0.id == "backfield" }!) == "RB,FB")
    #expect(codes(CompareMatchRooms.rooms.first { $0.id == "receivers" }!) == "WR,TE")
    #expect(codes(CompareMatchRooms.rooms.first { $0.id == "line" }!) == "LT,LG,C,RG,RT")
    #expect(codes(CompareMatchRooms.rooms.first { $0.id == "front" }!) == "DE,LDE,RDE,DT,NT")
    #expect(codes(CompareMatchRooms.rooms.first { $0.id == "linebackers" }!) == "LB,WLB,LILB,RILB,SLB")
    #expect(codes(CompareMatchRooms.rooms.first { $0.id == "corners" }!) == "CB,LCB,RCB,NB")
    #expect(codes(CompareMatchRooms.rooms.first { $0.id == "safeties" }!) == "S,SS,FS")
    #expect(codes(CompareMatchRooms.rooms.first { $0.id == "specialists" }!) == "K,P")
    // LS/KR/PR are editorial slots, never depth rooms.
    for special in [Position.ls, .kr, .pr] {
        #expect(CompareMatchRooms.room(of: special) == nil)
    }
}

@Test func compareRoomUnitsAreExclusive() {
    // Each room's unit is the single unit that maps to those positions.
    #expect(CompareMatchRooms.rooms(in: .offense).count == 4)
    #expect(CompareMatchRooms.rooms(in: .defense).count == 4)
    #expect(CompareMatchRooms.rooms(in: .special).count == 1)
    // Every position in an offense room belongs to offense, etc.
    for unit in [Unit.offense, .defense, .special] {
        for room in CompareMatchRooms.rooms(in: unit) {
            #expect(
                CompareMatchRooms.room(of: room.positions[0])?.unit == unit,
                "\(room.id) positions should sit under unit \(unit.rawValue)"
            )
        }
    }
}

@Test func compareFreshnessMarksEvidenceOlderThanOneDayAsStale() {
    let now = Date(timeIntervalSince1970: 2_000_000)
    let current = "1970-01-24T03:33:20Z" // 2,000,000 seconds since epoch
    let stale = "1970-01-22T03:33:20Z" // 172,800 seconds before `now`

    #expect(compareFreshness(updatedAt: current, now: now) == .current)
    #expect(compareFreshness(updatedAt: stale, now: now) == .stale)
    #expect(compareFreshness(updatedAt: nil, now: now) == .unavailable)
}

// MARK: - View model

@Test func compareLensesPageInTheApprovedOrderAndKeepSelection() async {
    let viewModel = await CompareViewModel(repository: CompareRepositoryFake(teams: [], snapshots: [:], stats: [:]))

    #expect(
        CompareViewModel.Lens.allCases.map(\.accessibilityLabel)
            == ["Offense", "Defense", "Special Teams"]
    )
    #expect(await viewModel.lens == .offense)

    await viewModel.selectLens(.defense)
    #expect(await viewModel.lens == .defense)
}

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

@Test func tappingSameTeamFlagsSameTeam() async {
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
}

@Test func clearingASlotUnpicksJustThatTeam() async {
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
    await viewModel.pickTeam("seahawks", into: .a)
    await viewModel.pickTeam("49ers", into: .b)
    #expect(await viewModel.bothPicked)

    await viewModel.clearTeam(.a)

    #expect(await viewModel.teamA == nil)
    #expect(await viewModel.teamB?.id == "49ers")
    #expect(await viewModel.pickedCount == 1)
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

// MARK: - DEP-311: room picker state machine

/// Aug 26 feedback superseded DEP-311 task 3's "preserve position across units" decision:
/// Cooper found it left the depth table showing a stale position with nothing highlighted
/// to explain it. `roomSelectionChoosesFirstPositionAndPreservesSelection` /
/// `switchingLensPreservesValidSelection` (the old task-3 tests) are replaced by the tests
/// below, which cover the new default-to-first-room behavior, the single-position-room
/// no-panel case, and the collapse-on-second-tap toggle.

@Test func pickingARoomExpandsItAndSelectsItsFirstPosition() async {
    let hawks = compareTeam("seahawks", abbrev: "SEA", city: "Seattle")
    let niners = compareTeam("49ers", abbrev: "SF", city: "San Francisco")
    let repo = CompareRepositoryFake(
        teams: [hawks, niners],
        snapshots: [hawks.id: compareSnapshot(team: hawks, qbCount: 1), niners.id: compareSnapshot(team: niners, qbCount: 3)],
        stats: [hawks.id: statsPage(team: hawks, wins: 12), niners.id: statsPage(team: niners, wins: 9)]
    )
    let viewModel = await CompareViewModel(repository: repo)
    await viewModel.load()
    await viewModel.pickTeam("seahawks", into: .a)
    await viewModel.pickTeam("49ers", into: .b)

    // Defaults to Offense's first room (Quarterback), already active — a room is always
    // implicitly associated with the default position, unlike the old nil-until-tapped state.
    #expect(await viewModel.selectedUnit == .offense)
    #expect(await viewModel.activeRoom?.id == "quarterback")
    // Quarterback has one position, so nothing is expanded (see the single-position test below).
    #expect(await viewModel.expandedRoom == nil)

    let receivers = CompareMatchRooms.rooms.first { $0.id == "receivers" }!
    await viewModel.selectRoom(receivers)
    #expect(await viewModel.expandedRoom == receivers)
    #expect(await viewModel.activeRoom == receivers)
    #expect(await viewModel.position == .wr)

    // Move the exact role to TE within the still-expanded room.
    await viewModel.selectPosition(.te)
    #expect(await viewModel.position == .te)
    #expect(await viewModel.expandedRoomID == "receivers", "picking a role tile doesn't collapse its own panel")

    // Picking a different room expands that one instead (only one room open at a time) and
    // resets to its first position.
    let backfield = CompareMatchRooms.rooms.first { $0.id == "backfield" }!
    await viewModel.selectRoom(backfield)
    #expect(await viewModel.expandedRoom == backfield)
    #expect(await viewModel.position == .rb, "selecting a new room should pick its first position")
}

@Test func singlePositionRoomSelectsDirectlyWithNoPanel() async {
    let hawks = compareTeam("seahawks", abbrev: "SEA", city: "Seattle")
    let niners = compareTeam("49ers", abbrev: "SF", city: "San Francisco")
    let repo = CompareRepositoryFake(
        teams: [hawks, niners],
        snapshots: [hawks.id: compareSnapshot(team: hawks, qbCount: 1), niners.id: compareSnapshot(team: niners, qbCount: 3)],
        stats: [hawks.id: statsPage(team: hawks, wins: 12), niners.id: statsPage(team: niners, wins: 9)]
    )
    let viewModel = await CompareViewModel(repository: repo)
    await viewModel.load()
    await viewModel.pickTeam("seahawks", into: .a)
    await viewModel.pickTeam("49ers", into: .b)

    // Expand a multi-position room first, then tap the single-position Quarterback room —
    // it should select QB directly and collapse whatever else was open, per Cooper: "since
    // there's only one position in the QB group, don't add the secondary positions container."
    let receivers = CompareMatchRooms.rooms.first { $0.id == "receivers" }!
    await viewModel.selectRoom(receivers)
    #expect(await viewModel.expandedRoom != nil)

    let quarterback = CompareMatchRooms.rooms.first { $0.id == "quarterback" }!
    await viewModel.selectRoom(quarterback)
    #expect(await viewModel.position == .qb)
    #expect(await viewModel.expandedRoom == nil)
}

@Test func tappingAnExpandedRoomAgainCollapsesItWithoutChangingPosition() async {
    let hawks = compareTeam("seahawks", abbrev: "SEA", city: "Seattle")
    let niners = compareTeam("49ers", abbrev: "SF", city: "San Francisco")
    let repo = CompareRepositoryFake(
        teams: [hawks, niners],
        snapshots: [hawks.id: compareSnapshot(team: hawks, qbCount: 1), niners.id: compareSnapshot(team: niners, qbCount: 3)],
        stats: [hawks.id: statsPage(team: hawks, wins: 12), niners.id: statsPage(team: niners, wins: 9)]
    )
    let viewModel = await CompareViewModel(repository: repo)
    await viewModel.load()
    await viewModel.pickTeam("seahawks", into: .a)
    await viewModel.pickTeam("49ers", into: .b)

    let receivers = CompareMatchRooms.rooms.first { $0.id == "receivers" }!
    await viewModel.selectRoom(receivers)
    await viewModel.selectPosition(.te)
    #expect(await viewModel.expandedRoom == receivers)

    // Tapping Receivers a second time collapses it — Cooper: "right now it stays expanded
    // forever." The depth table keeps showing TE, the last role picked.
    await viewModel.selectRoom(receivers)
    #expect(await viewModel.expandedRoom == nil)
    #expect(await viewModel.position == .te, "collapsing a room must not reset its last-picked role")

    // A third tap re-expands it, resetting to the room's first position (fresh-open behavior).
    await viewModel.selectRoom(receivers)
    #expect(await viewModel.expandedRoom == receivers)
    #expect(await viewModel.position == .wr)
}

@Test func switchingUnitDefaultsToItsFirstRoomAndPosition() async {
    let hawks = compareTeam("seahawks", abbrev: "SEA", city: "Seattle")
    let niners = compareTeam("49ers", abbrev: "SF", city: "San Francisco")
    let repo = CompareRepositoryFake(
        teams: [hawks, niners],
        snapshots: [hawks.id: compareSnapshot(team: hawks, qbCount: 1), niners.id: compareSnapshot(team: niners, qbCount: 3)],
        stats: [hawks.id: statsPage(team: hawks, wins: 12), niners.id: statsPage(team: niners, wins: 9)]
    )
    let viewModel = await CompareViewModel(repository: repo)
    await viewModel.load()
    await viewModel.pickTeam("seahawks", into: .a)
    await viewModel.pickTeam("49ers", into: .b)

    let receivers = CompareMatchRooms.rooms.first { $0.id == "receivers" }!
    await viewModel.selectRoom(receivers)
    await viewModel.selectPosition(.te)
    #expect(await viewModel.position == .te)

    // Cooper (Aug 26): "when you switch offense, defense or special teams tabs... the table
    // doesn't update, it stays on the last selected team unit. It should default to the
    // first [room] on the new page." Defense's first room is Defensive Line — its first
    // position (DE) should be selected and expanded immediately, not TE left over from Offense.
    await viewModel.selectUnit(.defense)
    #expect(await viewModel.selectedUnit == .defense)
    #expect(await viewModel.position == .de)
    #expect(await viewModel.expandedRoom?.id == "front")

    // Special Teams' first (and only) room, Specialists, has 2 positions — still expands.
    await viewModel.selectUnit(.special)
    #expect(await viewModel.position == .k)
    #expect(await viewModel.expandedRoom?.id == "specialists")
}
