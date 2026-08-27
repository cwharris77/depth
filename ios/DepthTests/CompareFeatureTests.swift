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

private func compareMatchupMetrics(season: Int, offensiveEPAPerPlay: Double) -> TeamMatchupMetrics {
    TeamMatchupMetrics(
        source: .nflverse, season: season, updatedAt: "2026-01-05T12:00:00Z",
        games: nil, passingEPA: nil, rushingEPA: nil, passAttempts: nil, rushAttempts: nil,
        sacksSuffered: nil, offensiveEPA: nil, offensivePlays: nil,
        offensiveEPAPerPlay: offensiveEPAPerPlay, sackRate: nil, passingInterceptions: nil,
        fumblesLost: nil, giveaways: nil, turnoverMargin: nil, defensiveSacks: nil, quarterbackHits: nil, quarterbackHitsPerGame: nil,
        defensiveInterceptions: nil, defensiveFumbleRecoveries: nil, defensiveFumblesForced: nil,
        defensiveTakeaways: nil, defensiveTakeawaysPerGame: nil, fieldGoalsMade: nil,
        fieldGoalsAttempted: nil, fieldGoalPercentage: nil, puntAttempts: nil, netPuntYards: nil,
        netPuntYardsPerAttempt: nil, puntReturns: nil, puntReturnYards: nil,
        puntReturnYardsPerAttempt: nil, kickoffReturns: nil, kickoffReturnYards: nil,
        kickoffReturnYardsPerAttempt: nil, specialTeamsTouchdowns: nil
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

/// Aug 26 — Cooper on the Staging build (real prod data): "it doesn't have any data. It
/// says 'No offense metrics'" even though he'd confirmed matchup metrics genuinely exist
/// in prod. Root cause: nflverse writes a `team_stats` row for the new season the moment
/// its schedule exists — an all-zero stub, well before any game is played (see
/// `lib/nflverse/records.ts`) — and that stub sorts ahead of last season's real row but
/// never carries `matchupMetrics` (a separate table with nothing to aggregate yet).
/// `effectiveStatsA`/`B` must skip a metrics-less stub and use the newest season that
/// actually has metrics, not just `seasons.first`.
@Test func effectiveStatsSkipsAMetricsLessCurrentSeasonStub() async {
    let hawks = compareTeam("seahawks", abbrev: "SEA", city: "Seattle")
    let statsWithStub = TeamStatsPage(
        team: hawks,
        seasons: [
            // 2026: schedule published, zero games played — a real stub, per records.ts.
            TeamSeasonStats(
                season: 2026, overallWins: 0, overallLosses: 0, overallTies: 0,
                homeWins: 0, homeLosses: 0, roadWins: 0, roadLosses: 0,
                divisionWins: 0, divisionLosses: 0, conferenceWins: 0, conferenceLosses: 0,
                pointsFor: 0, pointsAgainst: 0, pointDifferential: 0,
                matchupMetrics: nil
            ),
            // 2025: last completed season, real nflverse metrics already ingested.
            TeamSeasonStats(
                season: 2025, overallWins: 12, overallLosses: 5, overallTies: 0,
                homeWins: 7, homeLosses: 1, roadWins: 5, roadLosses: 4,
                divisionWins: 4, divisionLosses: 2, conferenceWins: 8, conferenceLosses: 4,
                pointsFor: 402, pointsAgainst: 291, pointDifferential: 111,
                matchupMetrics: compareMatchupMetrics(season: 2025, offensiveEPAPerPlay: 0.08)
            ),
        ],
        upcomingSeason: 2026,
        currentSeason: 2026
    )
    let repo = CompareRepositoryFake(
        teams: [hawks],
        snapshots: [hawks.id: compareSnapshot(team: hawks, qbCount: 1)],
        stats: [hawks.id: statsWithStub]
    )
    let viewModel = await CompareViewModel(repository: repo)
    await viewModel.load()
    await viewModel.pickTeam("seahawks", into: .a)

    #expect(await viewModel.effectiveStatsA?.season == 2025, "must skip the metrics-less 2026 stub")
    #expect(await viewModel.effectiveStatsA?.matchupMetrics?.offensiveEPAPerPlay == 0.08)
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

// MARK: - Compare redesign: provenance, metric catalog, record table
//
// Covers the pure logic behind the vault canvas "Refining the compare page" (options 1b +
// 2a-2e + 3a/3b) that lives in Domain/CompareMetrics.swift, plus the season-selection and
// fallback state it added to CompareViewModel.

/// A metrics row with every field populated, so a catalog test can assert one row without
/// every other row silently filtering itself out. Individual tests override what they care
/// about; `nil` overrides exercise the absent-field paths.
private func fullMetrics(
    season: Int = 2025,
    updatedAt: String = "2026-01-06T12:00:00Z",
    games: Int? = 17,
    passingEPA: Double? = 62.4,
    rushingEPA: Double? = -8.1,
    passAttempts: Int? = 542,
    rushAttempts: Int? = 431,
    sacksSuffered: Int? = 31,
    offensivePlays: Int? = 973,
    offensiveEPAPerPlay: Double? = 0.08,
    passingInterceptions: Int? = 11,
    fumblesLost: Int? = 8,
    giveaways: Int? = 19,
    defensiveSacks: Double? = 47,
    quarterbackHits: Int? = 109,
    defensiveTakeaways: Int? = 27,
    fieldGoalsMade: Int? = 23,
    fieldGoalsAttempted: Int? = 26,
    // Stored as a 0-1 ratio (web's `ratio(made, attempted)`), not a percent.
    fieldGoalPercentage: Double? = 0.885
) -> TeamMatchupMetrics {
    TeamMatchupMetrics(
        source: .nflverse, season: season, updatedAt: updatedAt,
        games: games, passingEPA: passingEPA, rushingEPA: rushingEPA,
        passAttempts: passAttempts, rushAttempts: rushAttempts,
        sacksSuffered: sacksSuffered, offensiveEPA: nil, offensivePlays: offensivePlays,
        offensiveEPAPerPlay: offensiveEPAPerPlay, sackRate: nil,
        passingInterceptions: passingInterceptions,
        fumblesLost: fumblesLost, giveaways: giveaways, turnoverMargin: nil,
        defensiveSacks: defensiveSacks,
        quarterbackHits: quarterbackHits, quarterbackHitsPerGame: 6.4,
        defensiveInterceptions: 16, defensiveFumbleRecoveries: 11, defensiveFumblesForced: 18,
        defensiveTakeaways: defensiveTakeaways, defensiveTakeawaysPerGame: 1.6,
        fieldGoalsMade: fieldGoalsMade, fieldGoalsAttempted: fieldGoalsAttempted,
        fieldGoalPercentage: fieldGoalPercentage, puntAttempts: 52, netPuntYards: 2241,
        netPuntYardsPerAttempt: 43.1, puntReturns: 24, puntReturnYards: 274,
        puntReturnYardsPerAttempt: 11.4, kickoffReturns: 31, kickoffReturnYards: 769,
        kickoffReturnYardsPerAttempt: 24.8, specialTeamsTouchdowns: 1
    )
}

private func seasonStats(
    season: Int,
    wins: Int = 12,
    losses: Int = 5,
    ties: Int = 0,
    pointsFor: Int = 407,
    pointsAgainst: Int = 316,
    metrics: TeamMatchupMetrics? = nil
) -> TeamSeasonStats {
    TeamSeasonStats(
        season: season, overallWins: wins, overallLosses: losses, overallTies: ties,
        homeWins: 7, homeLosses: 1, roadWins: 5, roadLosses: 4,
        divisionWins: 4, divisionLosses: 2, conferenceWins: 9, conferenceLosses: 3,
        pointsFor: pointsFor, pointsAgainst: pointsAgainst,
        pointDifferential: pointsFor - pointsAgainst,
        matchupMetrics: metrics
    )
}

private func multiSeasonPage(
    team: Team,
    seasons: [TeamSeasonStats],
    currentSeason: Int,
    upcomingSeason: Int? = nil
) -> TeamStatsPage {
    TeamStatsPage(
        team: team, seasons: seasons, upcomingSeason: upcomingSeason, currentSeason: currentSeason
    )
}

// MARK: Season stamp (canvas 3a/3b)

@Test func aCompletedSeasonReadsAsFinal() {
    #expect(compareSeasonStamp(metrics: fullMetrics(games: 17), isCompleted: true) == .final)
}

/// The correction turn 3 of the canvas makes: `effectiveStats(for:)` promotes the live
/// season as soon as ONE game's metrics land, so FINAL would be a lie there.
@Test func aSeasonStillBeingPlayedReadsAsLiveNotFinal() {
    // The distinction the sample guard depends on: `effectiveStats(for:)` promotes the live
    // season the moment one game's metrics land, so "completed" cannot be assumed.
    #expect(compareSeasonStamp(metrics: fullMetrics(season: 2026, games: 1), isCompleted: false) == .live(games: 1))
    #expect(compareSeasonStamp(metrics: fullMetrics(season: 2026, games: 8), isCompleted: false) == .live(games: 8))
}

@Test func aSeasonWithNoGamesPlayedReadsAsUpcoming() {
    #expect(compareSeasonStamp(metrics: fullMetrics(games: 0), isCompleted: false) == .upcoming)
}

@Test func missingMetricsOrGameCountResolveToNoneRatherThanClaimingZeroGames() {
    // A completed season with no metrics is a data gap and claims nothing...
    #expect(compareSeasonStamp(metrics: nil, isCompleted: true) == .none)
    // ...but a season still to be played has no metrics *by definition*, which is exactly
    // what UPCOMING says (canvas 2d — the real preseason shape, where nflverse has written
    // the 0-0 team_stats stub but no metrics row yet).
    #expect(compareSeasonStamp(metrics: nil, isCompleted: false) == .upcoming)
    // No season resolved at all (canvas 2a): nothing to date-stamp.
    #expect(compareSeasonStamp(metrics: nil, isCompleted: false, hasResolvedSeason: false) == .none)
    #expect(compareSeasonStamp(metrics: fullMetrics(games: nil), isCompleted: true) == .none)
}

// MARK: Thin-sample guard (canvas 3a)

@Test func onlyALiveSeasonAtOrBelowTheGameThresholdIsThin() {
    #expect(CompareSampleGuard.isThin(.live(games: CompareSampleGuard.cautionMaxGames)))
    #expect(!CompareSampleGuard.isThin(.live(games: CompareSampleGuard.cautionMaxGames + 1)))
    // A completed season is never cautioned, however few games it holds.
    #expect(!CompareSampleGuard.isThin(.final))
    #expect(!CompareSampleGuard.isThin(.upcoming))
    #expect(!CompareSampleGuard.isThin(.none))
}

@Test func aThinSampleStripsEveryLeaderTintWithoutHidingTheNumbers() {
    let groups = resolveCompareGroups(
        for: .offense, a: fullMetrics(), b: fullMetrics(offensiveEPAPerPlay: 0.04),
        allowLeader: false
    )
    #expect(!groups.isEmpty)
    #expect(groups.flatMap(\.rows).allSatisfy { $0.leader == nil })
    // The values themselves are untouched — 3a still prints both numbers.
    let epa = groups.flatMap(\.rows).first { $0.id == "epa-per-play" }
    #expect(epa?.a == "+0.08")
    #expect(epa?.b == "+0.04")
}

// MARK: Leader resolution

@Test func leaderResolutionHonorsDirectionTiesAndNeutralRows() {
    #expect(compareLeader(0.08, 0.04, direction: .higher) == .a)
    #expect(compareLeader(0.08, 0.04, direction: .lower) == .b)
    // A count row shows both numbers and never crowns one.
    #expect(compareLeader(973, 980, direction: .neutral) == nil)
    #expect(compareLeader(19, 19, direction: .higher) == nil)
    // A value only one side reports is a gap, not a win.
    #expect(compareLeader(19, nil, direction: .higher) == nil)
    #expect(compareLeader(nil, nil, direction: .higher) == nil)
}

@Test func aRowNeitherSideReportsIsDroppedAndAOneSidedRowShowsADash() throws {
    let unwrapped = try #require(
        CompareMetricCatalog.groups(for: .offense)
            .flatMap(\.metrics).first { $0.id == "epa-per-play" }
    )

    #expect(
        resolveCompareRow(
            unwrapped,
            a: fullMetrics(offensiveEPAPerPlay: nil), b: fullMetrics(offensiveEPAPerPlay: nil),
            allowLeader: true
        ) == nil
    )

    let oneSided = resolveCompareRow(
        unwrapped, a: fullMetrics(), b: fullMetrics(offensiveEPAPerPlay: nil), allowLeader: true
    )
    #expect(oneSided?.b == "—")
    #expect(oneSided?.leader == nil)
}

@Test func aGroupWithNoResolvableRowsIsDroppedEntirely() {
    // Special teams with every kicking/punting/return field absent leaves nothing to show.
    let empty = TeamMatchupMetrics(
        source: .nflverse, season: 2025, updatedAt: "2026-01-06T12:00:00Z",
        games: 17, passingEPA: nil, rushingEPA: nil, passAttempts: nil, rushAttempts: nil,
        sacksSuffered: nil, offensiveEPA: nil, offensivePlays: nil, offensiveEPAPerPlay: nil,
        sackRate: nil, passingInterceptions: nil, fumblesLost: nil, giveaways: nil,
        turnoverMargin: nil, defensiveSacks: nil,
        quarterbackHits: nil, quarterbackHitsPerGame: nil, defensiveInterceptions: nil,
        defensiveFumbleRecoveries: nil, defensiveFumblesForced: nil, defensiveTakeaways: nil,
        defensiveTakeawaysPerGame: nil, fieldGoalsMade: nil, fieldGoalsAttempted: nil,
        fieldGoalPercentage: nil, puntAttempts: nil, netPuntYards: nil,
        netPuntYardsPerAttempt: nil, puntReturns: nil, puntReturnYards: nil,
        puntReturnYardsPerAttempt: nil, kickoffReturns: nil, kickoffReturnYards: nil,
        kickoffReturnYardsPerAttempt: nil, specialTeamsTouchdowns: nil
    )
    #expect(resolveCompareGroups(for: .special, a: empty, b: empty, allowLeader: true).isEmpty)
}

// MARK: Derived metric rows

@Test func derivedRowsComputeFromIngestedFieldsAndVanishWhenAnInputIsMissing() {
    func row(_ id: String, a: TeamMatchupMetrics, b: TeamMatchupMetrics) -> CompareMetricRow? {
        resolveCompareGroups(for: .offense, a: a, b: b, allowLeader: true)
            .flatMap(\.rows).first { $0.id == id }
    }

    // Turnover margin = takeaways won − giveaways conceded (27 − 19 = +8).
    #expect(row("turnover-margin", a: fullMetrics(), b: fullMetrics())?.a == "+8")
    #expect(
        row(
            "turnover-margin",
            a: fullMetrics(giveaways: nil), b: fullMetrics(giveaways: nil)
        ) == nil
    )

    // Sack rate = sacks / (attempts + sacks) — the denominator counts dropbacks, so a sack
    // is in it: 31 / (542 + 31) = 5.4%.
    #expect(row("sack-rate", a: fullMetrics(), b: fullMetrics())?.a == "5.4%")
    #expect(row("sack-rate", a: fullMetrics(passAttempts: nil), b: fullMetrics(passAttempts: nil)) == nil)
}

@Test func fieldGoalsMadeAttemptedPrintsAsAPairAndNeverRanks() {
    let rows = resolveCompareGroups(
        for: .special,
        a: fullMetrics(),
        b: fullMetrics(fieldGoalsMade: 23, fieldGoalsAttempted: 29, fieldGoalPercentage: 0.793),
        allowLeader: true
    ).flatMap(\.rows)

    let pair = rows.first { $0.id == "field-goals" }
    #expect(pair?.a == "23 / 26")
    #expect(pair?.b == "23 / 29")
    // No single magnitude to compare — the percentage row above is the comparable form.
    #expect(pair?.leader == nil)
    #expect(rows.first { $0.id == "field-goal-pct" }?.leader == .a)
    // The source field is a 0-1 ratio despite its name — printing it raw gave "0.9%".
    #expect(rows.first { $0.id == "field-goal-pct" }?.a == "88.5%")
    #expect(rows.first { $0.id == "field-goal-pct" }?.b == "79.3%")
}

@Test func countRowsStayNeutralEvenWhenTheTwoNumbersDiffer() {
    let rows = resolveCompareGroups(
        for: .offense, a: fullMetrics(offensivePlays: 973), b: fullMetrics(offensivePlays: 980),
        allowLeader: true
    ).flatMap(\.rows)
    #expect(rows.first { $0.id == "offensive-plays" }?.leader == nil)
    #expect(rows.first { $0.id == "pass-attempts" }?.leader == nil)
    #expect(rows.first { $0.id == "rush-attempts" }?.leader == nil)
}

@Test func lowerIsBetterRowsCrownTheSmallerNumber() {
    let rows = resolveCompareGroups(
        for: .offense,
        a: fullMetrics(sacksSuffered: 31, giveaways: 19),
        b: fullMetrics(sacksSuffered: 42, giveaways: 24),
        allowLeader: true
    ).flatMap(\.rows)
    #expect(rows.first { $0.id == "sacks-allowed" }?.leader == .a)
    #expect(rows.first { $0.id == "giveaways" }?.leader == .a)
}

@Test func everyCatalogGroupHasAStableUniqueRowIdentity() {
    let ids: [String] = [Unit.offense, .defense, .special]
        .flatMap { CompareMetricCatalog.groups(for: $0) }
        .flatMap { group in group.metrics.map { "\(group.id)/\($0.id)" } }
    #expect(Set(ids).count == ids.count, "duplicate metric id would collide in a ForEach")
}

// MARK: Season record table

@Test func theRecordTableRanksBySplitAndPointDirection() {
    let rows = CompareRecordCatalog.rows(
        a: seasonStats(season: 2025, wins: 12, losses: 5, pointsFor: 407, pointsAgainst: 316),
        b: seasonStats(season: 2025, wins: 10, losses: 7, pointsFor: 385, pointsAgainst: 352)
    )
    func row(_ id: String) -> CompareMetricRow? { rows.first { $0.id == id } }

    #expect(row("record")?.a == "12-5")
    #expect(row("record")?.leader == .a)
    #expect(row("points-for")?.leader == .a)
    // Fewer points conceded wins this one — the only lower-is-better row in the table.
    #expect(row("points-against")?.leader == .a)
    #expect(row("differential")?.a == "+91")
    #expect(row("differential")?.b == "+33")
    #expect(row("differential")?.leader == .a)
}

@Test func winPercentageCountsATieAsHalfAWinSoRecordsWithTiesStillRank() {
    // 12-4-1 (.735) edges 12-5 (.706) despite identical win counts.
    #expect(CompareRecordCatalog.recordText(wins: 12, losses: 4, ties: 1) == "12-4-1")
    #expect(CompareRecordCatalog.recordText(wins: 12, losses: 5) == "12-5")

    let rows = CompareRecordCatalog.rows(
        a: seasonStats(season: 2025, wins: 12, losses: 4, ties: 1),
        b: seasonStats(season: 2025, wins: 12, losses: 5, ties: 0)
    )
    #expect(rows.first { $0.id == "record" }?.leader == .a)
    #expect(CompareRecordCatalog.winPercentage(wins: 0, losses: 0, ties: 0) == nil)
}

// MARK: View model — season selection (canvas 1b) and the 2d fallback

@MainActor
private func twoSeasonViewModel() async -> CompareViewModel {
    let sea = compareTeam("sea", abbrev: "SEA", city: "Seattle")
    let sf = compareTeam("sf", abbrev: "SF", city: "San Francisco")
    // 2026 has kicked off for neither team (a metrics-less stub row); 2025 is complete.
    let seasons = [
        seasonStats(season: 2026, wins: 0, losses: 0, metrics: nil),
        seasonStats(season: 2025, wins: 12, losses: 5, metrics: fullMetrics(season: 2025)),
        seasonStats(season: 2024, wins: 9, losses: 8, metrics: fullMetrics(season: 2024)),
    ]
    let repo = CompareRepositoryFake(
        teams: [sea, sf],
        snapshots: ["sea": compareSnapshot(team: sea, qbCount: 2), "sf": compareSnapshot(team: sf, qbCount: 2)],
        stats: [
            "sea": multiSeasonPage(team: sea, seasons: seasons, currentSeason: 2026),
            "sf": multiSeasonPage(team: sf, seasons: seasons, currentSeason: 2026),
        ]
    )
    let viewModel = CompareViewModel(repository: repo)
    await viewModel.load()
    await viewModel.pickTeam("sea", into: .a)
    await viewModel.pickTeam("sf", into: .b)
    return viewModel
}

/// The picker surfaces the season the page was already reading — it must not move it.
@Test @MainActor func theDefaultSeasonStillFollowsEffectiveStatsUntilOneIsPicked() async {
    let viewModel = await twoSeasonViewModel()
    #expect(viewModel.selectedSeason == nil)
    #expect(viewModel.resolvedSeason == 2025, "2026 is a metrics-less stub, so 2025 stays the default")
    #expect(viewModel.seasonStamp == .final)
}

@Test @MainActor func pickingASeasonReadsBothSidesAtThatExactYear() async {
    let viewModel = await twoSeasonViewModel()
    viewModel.selectSeason(2024)
    #expect(viewModel.resolvedSeason == 2024)
    #expect(viewModel.effectiveStatsA?.season == 2024)
    #expect(viewModel.effectiveStatsB?.season == 2024)
    #expect(viewModel.metricsA?.season == 2024)
    #expect(!viewModel.metricsUnavailable)
}

/// Canvas 2d: a season with no metrics names itself and offers the newest one that has data
/// for BOTH teams, rather than dead-ending on "no metrics available".
@Test @MainActor func aSeasonWithNoMetricsOffersTheNewestSeasonBothTeamsHaveData() async {
    let viewModel = await twoSeasonViewModel()
    viewModel.selectSeason(2026)
    #expect(viewModel.metricsUnavailable)
    #expect(viewModel.seasonStamp == .upcoming, "2026 hasn't kicked off — that is the claim")
    #expect(viewModel.fallbackSeasonWithMetrics == 2025)

    viewModel.selectSeason(2025)
    #expect(!viewModel.metricsUnavailable)
    // The fallback only ever points backwards, so it moves once 2025 is the selection.
    #expect(viewModel.fallbackSeasonWithMetrics == 2024)
}

@Test @MainActor func theFallbackSeasonSkipsAYearOnlyOneTeamHasMetricsFor() async {
    let sea = compareTeam("sea", abbrev: "SEA", city: "Seattle")
    let sf = compareTeam("sf", abbrev: "SF", city: "San Francisco")
    let repo = CompareRepositoryFake(
        teams: [sea, sf],
        snapshots: ["sea": compareSnapshot(team: sea, qbCount: 1), "sf": compareSnapshot(team: sf, qbCount: 1)],
        stats: [
            "sea": multiSeasonPage(team: sea, seasons: [
                seasonStats(season: 2026, metrics: nil),
                seasonStats(season: 2025, metrics: fullMetrics(season: 2025)),
                seasonStats(season: 2024, metrics: fullMetrics(season: 2024)),
            ], currentSeason: 2026),
            // SF never played 2025 as far as metrics are concerned.
            "sf": multiSeasonPage(team: sf, seasons: [
                seasonStats(season: 2026, metrics: nil),
                seasonStats(season: 2025, metrics: nil),
                seasonStats(season: 2024, metrics: fullMetrics(season: 2024)),
            ], currentSeason: 2026),
        ]
    )
    let viewModel = CompareViewModel(repository: repo)
    await viewModel.load()
    await viewModel.pickTeam("sea", into: .a)
    await viewModel.pickTeam("sf", into: .b)
    viewModel.selectSeason(2026)

    #expect(viewModel.fallbackSeasonWithMetrics == 2024, "2025 has metrics for only one side")
}

@Test @MainActor func seasonOptionsUnionBothTeamsYearsNewestFirstAndFlagTheUpcomingOne() async {
    let sea = compareTeam("sea", abbrev: "SEA", city: "Seattle")
    let repo = CompareRepositoryFake(
        teams: [sea],
        snapshots: ["sea": compareSnapshot(team: sea, qbCount: 1)],
        stats: [
            "sea": multiSeasonPage(
                team: sea,
                seasons: [seasonStats(season: 2025, metrics: fullMetrics(season: 2025))],
                currentSeason: 2025,
                upcomingSeason: 2026
            )
        ]
    )
    let viewModel = CompareViewModel(repository: repo)
    await viewModel.load()
    #expect(viewModel.seasonOptions.isEmpty, "no team picked yet, so there is no season list")

    await viewModel.pickTeam("sea", into: .a)
    #expect(viewModel.seasonOptions.map(\.season) == [2026, 2025])
    #expect(viewModel.seasonOptions.first?.isUpcoming == true)
    #expect(viewModel.currentSeason == 2026)
}

@Test @MainActor func aLiveSeasonWithOneGamePlayedIsStampedLiveAndSuppressesLeaders() async {
    let sea = compareTeam("sea", abbrev: "SEA", city: "Seattle")
    let sf = compareTeam("sf", abbrev: "SF", city: "San Francisco")
    func page(_ team: Team, epa: Double) -> TeamStatsPage {
        multiSeasonPage(
            team: team,
            seasons: [
                seasonStats(
                    season: 2026, wins: 1, losses: 0,
                    metrics: fullMetrics(season: 2026, games: 1, offensiveEPAPerPlay: epa)
                )
            ],
            currentSeason: 2026
        )
    }
    let repo = CompareRepositoryFake(
        teams: [sea, sf],
        snapshots: ["sea": compareSnapshot(team: sea, qbCount: 1), "sf": compareSnapshot(team: sf, qbCount: 1)],
        stats: ["sea": page(sea, epa: 0.21), "sf": page(sf, epa: -0.06)]
    )
    let viewModel = CompareViewModel(repository: repo)
    await viewModel.load()
    await viewModel.pickTeam("sea", into: .a)
    await viewModel.pickTeam("sf", into: .b)

    #expect(viewModel.seasonStamp == .live(games: 1))
    #expect(viewModel.isThinSample)

    // Week 9 of the same season: real sample, leader tint returns, no layout change.
    let week9 = CompareViewModel(
        repository: CompareRepositoryFake(
            teams: [sea, sf],
            snapshots: ["sea": compareSnapshot(team: sea, qbCount: 1), "sf": compareSnapshot(team: sf, qbCount: 1)],
            stats: [
                "sea": multiSeasonPage(
                    team: sea,
                    seasons: [seasonStats(season: 2026, metrics: fullMetrics(season: 2026, games: 8))],
                    currentSeason: 2026
                ),
                "sf": multiSeasonPage(
                    team: sf,
                    seasons: [seasonStats(season: 2026, metrics: fullMetrics(season: 2026, games: 8))],
                    currentSeason: 2026
                ),
            ]
        )
    )
    await week9.load()
    await week9.pickTeam("sea", into: .a)
    await week9.pickTeam("sf", into: .b)
    #expect(week9.seasonStamp == .live(games: 8))
    #expect(!week9.isThinSample)
}

/// The lens picker is a `DepthUnitTabBar`, which speaks `Unit`, so the two mappings have to
/// round-trip or selecting a tab would land on the wrong lens.
@Test func lensAndUnitRoundTripInBothDirections() {
    for lens in CompareViewModel.Lens.allCases {
        #expect(CompareViewModel.Lens(unit: lens.unit) == lens)
    }
    #expect(CompareViewModel.Lens.offense.unit == .offense)
    #expect(CompareViewModel.Lens.defense.unit == .defense)
    #expect(CompareViewModel.Lens.specialTeams.unit == .special)
    #expect(CompareViewModel.Lens.specialTeams.accessibilityLabel == "Special Teams")
}

// MARK: - Timestamp parsing
//
// Supabase serializes `timestamptz` with fractional seconds; a default ISO8601DateFormatter
// rejects those, which silently blanked Compare's stamp date and made `compareFreshness`
// report a fresh row as unavailable.

@Test func iso8601ParsingAcceptsTimestampsWithAndWithoutFractionalSeconds() {
    #expect(Timestamp.parseISO8601("2026-01-06T12:00:00Z") != nil)
    #expect(Timestamp.parseISO8601("2026-01-06T12:00:00.123456+00:00") != nil)
    #expect(Timestamp.parseISO8601("2026-01-06T12:00:00.123Z") != nil)
    #expect(Timestamp.parseISO8601("not a timestamp") == nil)
    #expect(Timestamp.parseISO8601("") == nil)
    // Both spellings of the same instant must land on the same date.
    #expect(
        Timestamp.parseISO8601("2026-01-06T12:00:00Z")
            == Timestamp.parseISO8601("2026-01-06T12:00:00.000Z")
    )
}

@Test func freshnessReadsAFractionalSecondsTimestamp() {
    let updatedAt = "2026-01-06T12:00:00.123456+00:00"
    let now = Timestamp.parseISO8601(updatedAt)!
    // Previously `.unavailable` — the formatter rejected the string, not the data.
    #expect(compareFreshness(updatedAt: updatedAt, now: now) == .current)
}
