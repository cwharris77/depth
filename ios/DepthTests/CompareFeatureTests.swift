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
/// view model can resolve both sides.
private actor CompareRepositoryFake: DepthRepository {
    let teams: [Team]
    let snapshots: [String: TeamSnapshot]
    let stats: [String: TeamStatsPage]
    let schedules: [String: TeamSchedule]
    let participation: [String: RecentParticipation]

    init(
        teams: [Team],
        snapshots: [String: TeamSnapshot],
        stats: [String: TeamStatsPage],
        schedules: [String: TeamSchedule] = [:],
        participation: [String: RecentParticipation] = [:]
    ) {
        self.teams = teams
        self.snapshots = snapshots
        self.stats = stats
        self.schedules = schedules
        self.participation = participation
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
        guard let schedule = schedules[teamId] else { throw DepthError.notFound }
        return schedule
    }
    func recentParticipation(teamId: String) async throws -> RecentParticipation? {
        participation[teamId]
    }
    func playerStats(playerId: String, teamId: String?) async throws -> [PlayerSeasonStats] { [] }
    func appConfig() async throws -> AppConfig {
        AppConfig(minimumSupportedBuild: 1, maintenanceMessage: nil)
    }
}

private func compareMarket(
    favoriteTeamId: String,
    teamSpread: Double = -2.5
) -> ScheduleGameMarket {
    ScheduleGameMarket(
        teamMoneyline: -135,
        opponentMoneyline: 115,
        teamSpread: teamSpread,
        teamSpreadOdds: -110,
        opponentSpreadOdds: -110,
        totalLine: 44.5,
        underOdds: -108,
        overOdds: -112,
        impliedWinProbability: 0.552,
        favoriteTeamId: favoriteTeamId,
        isPickEm: false,
        isNeutralSite: false,
        source: .nflverse,
        updatedAt: "2026-08-25T12:00:00Z"
    )
}

private func compareParticipation(team: Team, playerId: String) -> RecentParticipation {
    RecentParticipation(
        teamId: team.id,
        season: 2025,
        windowStartWeek: 16,
        windowEndWeek: 18,
        gameIds: ["game-16", "game-17", "game-18"],
        source: "nflverse",
        updatedAt: "2026-01-05T12:00:00Z",
        players: [
            PlayerRecentParticipation(
                playerId: playerId,
                offense: ParticipationUnit(snaps: 120, percentage: 0.83),
                defense: ParticipationUnit(snaps: 0, percentage: nil),
                specialTeams: ParticipationUnit(snaps: 4, percentage: 0.06)
            )
        ]
    )
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
    let a = [topA]
    let b = (0..<2).map { comparePlayer(id: "b\($0)", name: "P\($0)", position: .wr, rank: $0 + 1, number: $0 + 1) }

    let teaser = buildCompareTeaser(playersA: [a], playersB: [b], positions: [.wr])
    #expect(teaser?.position == .wr)
    #expect(teaser?.countA == 1)
    #expect(teaser?.countB == 2)
    #expect(teaser?.topA == topA)
    #expect(teaser?.topB == b[0])
}

@Test func compareFreshnessMarksEvidenceOlderThanOneDayAsStale() {
    let now = Date(timeIntervalSince1970: 2_000_000)
    let current = "1970-01-24T03:33:20Z" // 2,000,000 seconds since epoch
    let stale = "1970-01-22T03:33:20Z" // 172,800 seconds before `now`

    #expect(compareFreshness(updatedAt: current, now: now) == .current)
    #expect(compareFreshness(updatedAt: stale, now: now) == .stale)
    #expect(compareFreshness(updatedAt: nil, now: now) == .unavailable)
}

@Test func marketForecastOrientsProbabilityToTheFavorite() {
    let hawks = compareTeam("seahawks", abbrev: "SEA", city: "Seattle")
    let niners = compareTeam("49ers", abbrev: "SF", city: "San Francisco")
    let game = ScheduleGame(
        week: 5,
        isBye: false,
        date: "2026-10-11",
        isHome: false,
        opponent: niners,
        teamScore: nil,
        opponentScore: nil,
        result: nil,
        market: compareMarket(favoriteTeamId: niners.id, teamSpread: 2.5)
    )

    let forecast = buildMarketForecast(game: game, perspectiveTeamId: hawks.id)

    #expect(forecast?.favoriteTeamId == niners.id)
    #expect(abs((forecast?.favoriteProbability ?? 0) - 0.448) < 0.0001)
    #expect(forecast?.spread == -2.5)
    #expect(forecast?.source == "nflverse")
}

@Test func marketForecastRequiresACompleteFavoriteAndProbability() {
    let game = ScheduleGame(
        week: 5,
        isBye: false,
        date: nil,
        isHome: true,
        opponent: nil,
        teamScore: nil,
        opponentScore: nil,
        result: nil,
        market: nil
    )

    #expect(buildMarketForecast(game: game, perspectiveTeamId: "seahawks") == nil)
}

@Test func starterParticipationSummaryUsesOnlyObservedPrimaryUnitShares() {
    let team = compareTeam("seahawks", abbrev: "SEA", city: "Seattle")
    let starter = Player(
        id: "starter",
        name: "Starter",
        position: .qb,
        depthRank: 1,
        number: 1,
        status: .starter
    )
    let backup = Player(
        id: "backup",
        name: "Backup",
        position: .qb,
        depthRank: 2,
        number: 2,
        status: .backup
    )
    let untrackedStarter = Player(
        id: "untracked",
        name: "Untracked",
        position: .wr,
        depthRank: 1,
        number: 3,
        status: .starter
    )
    let snapshot = TeamSnapshot(
        team: team,
        players: [starter, backup, untrackedStarter],
        specialTeams: [],
        uniforms: []
    )
    let recent = RecentParticipation(
        teamId: team.id,
        season: 2025,
        windowStartWeek: 16,
        windowEndWeek: 18,
        gameIds: ["a", "b", "c"],
        source: "nflverse",
        updatedAt: "2026-01-05T12:00:00Z",
        players: [
            PlayerRecentParticipation(
                playerId: starter.id,
                offense: ParticipationUnit(snaps: 120, percentage: 0.8),
                defense: ParticipationUnit(snaps: 0, percentage: nil),
                specialTeams: ParticipationUnit(snaps: 0, percentage: nil)
            ),
            PlayerRecentParticipation(
                playerId: backup.id,
                offense: ParticipationUnit(snaps: 30, percentage: 0.2),
                defense: ParticipationUnit(snaps: 0, percentage: nil),
                specialTeams: ParticipationUnit(snaps: 0, percentage: nil)
            ),
        ]
    )

    let summary = summarizeStarterParticipation(snapshot: snapshot, recent: recent)

    #expect(summary.totalStarters == 2)
    #expect(summary.trackedStarters == 1)
    #expect(summary.averageSnapShare == 0.8)
}

// MARK: - View model

@Test func compareLensesPageInTheApprovedOrderAndKeepSelection() async {
    let viewModel = await CompareViewModel(repository: CompareRepositoryFake(teams: [], snapshots: [:], stats: [:]))

    #expect(
        CompareViewModel.Lens.allCases.map(\.accessibilityLabel)
            == ["Forecast", "Roster", "Offense", "Defense", "Special Teams"]
    )
    #expect(await viewModel.lens == .forecast)

    await viewModel.selectLens(.defense)
    #expect(await viewModel.lens == .defense)
}

@Test func pickingTeamsLoadsPartialEvidenceAndFindsTheirNextMatchup() async {
    let hawks = compareTeam("seahawks", abbrev: "SEA", city: "Seattle")
    let niners = compareTeam("49ers", abbrev: "SF", city: "San Francisco")
    let rams = compareTeam("rams", abbrev: "LAR", city: "Los Angeles")
    let hawksSnapshot = compareSnapshot(team: hawks, qbCount: 1)
    let hawksParticipation = compareParticipation(team: hawks, playerId: hawksSnapshot.players[0].id)
    let completedNinersGame = ScheduleGame(
        week: 2,
        isBye: false,
        date: "2026-09-20",
        isHome: true,
        opponent: niners,
        teamScore: 24,
        opponentScore: 21,
        result: .win,
        market: compareMarket(favoriteTeamId: hawks.id)
    )
    let upcomingRamsGame = ScheduleGame(
        week: 3,
        isBye: false,
        date: "2026-09-27",
        isHome: false,
        opponent: rams,
        teamScore: nil,
        opponentScore: nil,
        result: nil,
        market: compareMarket(favoriteTeamId: rams.id)
    )
    let upcomingNinersGame = ScheduleGame(
        week: 5,
        isBye: false,
        date: "2026-10-11",
        isHome: false,
        opponent: niners,
        teamScore: nil,
        opponentScore: nil,
        result: nil,
        market: compareMarket(favoriteTeamId: niners.id)
    )
    let repo = CompareRepositoryFake(
        teams: [hawks, niners, rams],
        snapshots: [hawks.id: hawksSnapshot, niners.id: compareSnapshot(team: niners, qbCount: 2)],
        stats: [
            hawks.id: statsPage(team: hawks, wins: 12),
            niners.id: statsPage(team: niners, wins: 11),
        ],
        schedules: [
            hawks.id: TeamSchedule(
                season: 2026,
                games: [completedNinersGame, upcomingRamsGame, upcomingNinersGame]
            )
        ],
        participation: [hawks.id: hawksParticipation]
    )
    let viewModel = await CompareViewModel(repository: repo)
    await viewModel.load()

    await viewModel.pickTeam(hawks.id, into: .a)
    await viewModel.pickTeam(niners.id, into: .b)

    #expect(await viewModel.participationA == hawksParticipation)
    #expect(await viewModel.participationB == nil)
    #expect(await viewModel.matchup?.week == 5)
    #expect(await viewModel.matchup?.market?.favoriteTeamId == niners.id)
    #expect(await viewModel.evidenceLoadState == .loaded)
    // Missing schedule and participation on one side must not discard its successful
    // roster/stats reads — each dependency degrades independently.
    #expect(await viewModel.effectiveStatsB?.overallWins == 11)
    #expect(await viewModel.positionGroupB.count == 2)
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

// MARK: - DEP-311: room picker state machine

@Test func roomSelectionChoosesFirstPositionAndPreservesSelection() async {
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

    // No room selected until the user acts.
    #expect(await viewModel.hasSelectedRoom == false)
    #expect(await viewModel.selectedUnit == .offense)

    // Pick the Receivers room → its FIRST position (WR) becomes the selection, and the
    // selected room is set.
    let receivers = CompareMatchRooms.rooms.first { $0.id == "receivers" }!
    await viewModel.selectRoom(receivers)
    #expect(await viewModel.hasSelectedRoom == true)
    #expect(await viewModel.selectedRoom == receivers)
    #expect(await viewModel.position == .wr)

    // Move the exact role to TE, then switch lenses; TE is still valid within the same room
    // (still offense), so the selection is preserved.
    await viewModel.selectPosition(.te)
    #expect(await viewModel.position == .te)
    let backfield = CompareMatchRooms.rooms.first { $0.id == "backfield" }!
    await viewModel.selectRoom(backfield)
    #expect(await viewModel.selectedRoom == backfield)
    #expect(await viewModel.position == .rb, "selecting a new room should pick its first position")

    // A brand-new unit with no valid role for the current position leaves position alone and
    // clears the room — the user must explicitly pick a room in the new unit (DEP-311 task 3).
    await viewModel.selectUnit(.special)
    #expect(await viewModel.selectedUnit == .special)
    #expect(await viewModel.hasSelectedRoom == false)
    #expect(await viewModel.position == .rb, "an invalid role across units is preserved, not reset")
}

@Test func switchingLensPreservesValidSelection() async {
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

    // Pick offense WR, then jump to defense; the WR position doesn't belong to any defense
    // room, so no room is auto-selected but the position is preserved until a room is picked.
    await viewModel.selectPosition(.wr)
    await viewModel.selectUnit(.defense)
    #expect(await viewModel.selectedUnit == .defense)
    #expect(await viewModel.hasSelectedRoom == false)

    // Now pick the Linebackers room — resolves to its FIRST position (LB).
    let lbs = CompareMatchRooms.rooms.first { $0.id == "linebackers" }!
    await viewModel.selectRoom(lbs)
    #expect(await viewModel.position == .lb)
}
