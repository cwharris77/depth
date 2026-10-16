import Foundation
import Observation
import SwiftData
import Testing

@testable import Depth

// Cache-hit revalidation reaching an open screen: a changed revalidate swaps in once, an
// unchanged one writes nothing, a failed one keeps the cached copy, a held one waits, and a
// pull-to-refresh supersedes a revalidate still waiting.

private func team(city: String = "Buffalo") -> Team {
    Team(
        id: "bills", city: city, name: "Bills", abbrev: "BUF", conference: "AFC",
        division: "East",
        colors: TeamColors(primary: "#00338d", secondary: "#d50a0a", accent: "#d50a0a"),
        logo: nil, logoDark: nil)
}

private func snapshot(city: String = "Buffalo") -> TeamSnapshot {
    TeamSnapshot(team: team(city: city), players: [], specialTeams: [], uniforms: [])
}

private func statsPage(season: Int = 2026) -> TeamStatsPage {
    TeamStatsPage(team: team(), seasons: [], upcomingSeason: nil, currentSeason: season)
}

private func schedule(games: Int) -> TeamSchedule {
    TeamSchedule(
        season: 2026,
        games: (1...games).map { week in
            ScheduleGame(
                week: week, isBye: false, date: "2026-09-\(10 + week)", isHome: true,
                opponent: team(), teamScore: 24, opponentScore: 17, result: .win)
        })
}

private func listing(id: String) -> UniformListing {
    UniformListing(
        id: id, teamId: "bills", teamName: "Buffalo Bills", teamAbbrev: "BUF",
        teamShortName: "Bills", conference: "AFC", division: "East", kind: .home,
        name: id, yearStart: 2025, yearEnd: nil, isCurrent: true,
        colors: TeamColors(primary: "#00338d", secondary: "#c60c30", accent: "#c60c30"),
        imagePath: nil)
}

/// A source whose next answers the test sets; a failure leaves the cache untouched.
private actor MutableSource: DepthRepository {
    var teamsResult: Result<[Team], DepthError> = .success([team()])
    var snapshotResult: Result<TeamSnapshot, DepthError> = .success(snapshot())
    var statsResult: Result<TeamStatsPage, DepthError> = .success(statsPage())
    var scheduleResult: Result<TeamSchedule, DepthError> = .success(schedule(games: 1))
    var uniformsResult: Result<[UniformListing], DepthError> = .success([listing(id: "a")])

    func teams() async throws -> [Team] { try teamsResult.get() }
    func teamSnapshot(teamId: String) async throws -> TeamSnapshot { try snapshotResult.get() }
    func teamSeason(teamId: String, season: Int) async throws -> TeamSnapshot {
        throw DepthError.notFound
    }
    func teamSchedule(teamId: String, season: Int?) async throws -> TeamSchedule {
        try scheduleResult.get()
    }
    func teamStats(teamId: String) async throws -> TeamStatsPage { try statsResult.get() }
    func playerStats(playerId: String, teamId: String?) async throws -> [PlayerSeasonStats] { [] }
    func listUniforms() async throws -> [UniformListing] { try uniformsResult.get() }
    func appConfig() async throws -> AppConfig {
        AppConfig(minimumSupportedBuild: 1, maintenanceMessage: nil)
    }

    func set(teams: Result<[Team], DepthError>) { teamsResult = teams }
    func set(snapshot: Result<TeamSnapshot, DepthError>) { snapshotResult = snapshot }
    func set(stats: Result<TeamStatsPage, DepthError>) { statsResult = stats }
    func set(schedule: Result<TeamSchedule, DepthError>) { scheduleResult = schedule }
    func set(uniforms: Result<[UniformListing], DepthError>) { uniformsResult = uniforms }
}

private func makeRepository() -> (CachingDepthRepository, MutableSource) {
    let schema = Schema(DepthCacheSchema.models)
    let configuration = ModelConfiguration(schema: schema, isStoredInMemoryOnly: true)
    let container = try! ModelContainer(for: schema, configurations: [configuration])
    let source = MutableSource()
    let repository = CachingDepthRepository(
        underlying: source, store: CachedSnapshotStore(modelContainer: container))
    return (repository, source)
}

private final class Flag: @unchecked Sendable {
    var isSet = false
}

/// True when `read` was invalidated while `body` ran, i.e. SwiftUI would have re-rendered.
@MainActor
private func rendersWhile<T>(
    reading read: @MainActor () -> T, _ body: () async -> Void
) async -> Bool {
    let flag = Flag()
    withObservationTracking {
        _ = read()
    } onChange: {
        flag.isSet = true
    }
    await body()
    return flag.isSet
}

@MainActor
@Suite struct RevalidationTests {
    // MARK: Schedule

    @Test func changedScheduleRevalidateSwapsIntoTheOpenScreen() async {
        let (repository, source) = makeRepository()
        let viewModel = ScheduleViewModel(teamId: "bills", repository: repository)
        await viewModel.load()
        await source.set(schedule: .success(schedule(games: 2)))

        await viewModel.load()
        #expect(viewModel.schedule?.games.count == 1)
        await viewModel.settleRevalidation()

        #expect(viewModel.schedule?.games.count == 2)
        #expect(viewModel.loadState == .loaded)
    }

    @Test func unchangedScheduleRevalidateDoesNotTouchState() async {
        let (repository, _) = makeRepository()
        let viewModel = ScheduleViewModel(teamId: "bills", repository: repository)
        await viewModel.load()
        await viewModel.load()

        let rendered = await rendersWhile(reading: { viewModel.schedule }) {
            await viewModel.settleRevalidation()
        }

        #expect(rendered == false)
        #expect(viewModel.schedule?.games.count == 1)
    }

    @Test func failedScheduleRevalidateKeepsTheCachedSchedule() async {
        let (repository, source) = makeRepository()
        let viewModel = ScheduleViewModel(teamId: "bills", repository: repository)
        await viewModel.load()
        await source.set(schedule: .failure(.server("offline")))

        await viewModel.load()
        await viewModel.settleRevalidation()

        #expect(viewModel.schedule?.games.count == 1)
        #expect(viewModel.loadState == .loaded)
        #expect(viewModel.refreshFailed == false)
    }

    @Test func heldRevalidateWaitsUntilTheInteractionEnds() async {
        let (repository, source) = makeRepository()
        let viewModel = ScheduleViewModel(teamId: "bills", repository: repository)
        await viewModel.load()
        await source.set(schedule: .success(schedule(games: 2)))
        viewModel.holdRevalidation(true)

        await viewModel.load()
        await viewModel.settleRevalidation()
        #expect(viewModel.schedule?.games.count == 1)

        viewModel.holdRevalidation(false)
        #expect(viewModel.schedule?.games.count == 2)
    }

    @Test func pullToRefreshDiscardsAHeldRevalidate() async {
        let (repository, source) = makeRepository()
        let viewModel = ScheduleViewModel(teamId: "bills", repository: repository)
        await viewModel.load()
        await source.set(schedule: .success(schedule(games: 2)))
        viewModel.holdRevalidation(true)
        await viewModel.load()
        await viewModel.settleRevalidation()
        await source.set(schedule: .success(schedule(games: 3)))

        await viewModel.load(forceRefresh: true)
        viewModel.holdRevalidation(false)

        #expect(viewModel.schedule?.games.count == 3)
    }

    // MARK: Snapshot

    @Test func changedSnapshotRevalidateSwapsIn() async {
        let (repository, source) = makeRepository()
        let viewModel = TeamDetailViewModel(teamId: "bills", repository: repository)
        await viewModel.load()
        await source.set(snapshot: .success(snapshot(city: "Orchard Park")))

        await viewModel.load()
        #expect(viewModel.snapshot?.team.city == "Buffalo")
        await viewModel.settleRevalidation()

        #expect(viewModel.snapshot?.team.city == "Orchard Park")
    }

    @Test func unchangedSnapshotRevalidateDoesNotTouchState() async {
        let (repository, _) = makeRepository()
        let viewModel = TeamDetailViewModel(teamId: "bills", repository: repository)
        await viewModel.load()
        await viewModel.load()

        let rendered = await rendersWhile(reading: { viewModel.snapshot }) {
            await viewModel.settleRevalidation()
        }

        #expect(rendered == false)
    }

    @Test func failedSnapshotRevalidateKeepsTheCachedSnapshot() async {
        let (repository, source) = makeRepository()
        let viewModel = TeamDetailViewModel(teamId: "bills", repository: repository)
        await viewModel.load()
        await source.set(snapshot: .failure(.server("offline")))

        await viewModel.load()
        await viewModel.settleRevalidation()

        #expect(viewModel.snapshot?.team.city == "Buffalo")
        #expect(viewModel.loadState == .loaded)
        #expect(viewModel.refreshFailed == false)
    }

    @Test func heldSnapshotRevalidateAppliesWhenReleased() async {
        let (repository, source) = makeRepository()
        let viewModel = TeamDetailViewModel(teamId: "bills", repository: repository)
        await viewModel.load()
        await source.set(snapshot: .success(snapshot(city: "Orchard Park")))
        viewModel.holdRevalidation(true)

        await viewModel.load()
        await viewModel.settleRevalidation()
        #expect(viewModel.snapshot?.team.city == "Buffalo")

        viewModel.holdRevalidation(false)
        #expect(viewModel.snapshot?.team.city == "Orchard Park")
    }

    // MARK: Team list, stats, uniforms

    @Test func changedTeamListRevalidateSwapsIn() async {
        let (repository, source) = makeRepository()
        let viewModel = TeamListViewModel(repository: repository)
        await viewModel.load()
        await source.set(teams: .success([team(city: "Orchard Park")]))

        await viewModel.load()
        #expect(viewModel.teams.first?.city == "Buffalo")
        await viewModel.settleRevalidation()

        #expect(viewModel.teams.first?.city == "Orchard Park")
    }

    @Test func changedStatsRevalidateSwapsInAndKeepsTheSelectedSeason() async {
        let (repository, source) = makeRepository()
        let viewModel = TeamStatsViewModel(teamId: "bills", repository: repository)
        await viewModel.load()
        await source.set(stats: .success(statsPage(season: 2027)))

        await viewModel.load()
        #expect(viewModel.page?.currentSeason == 2026)
        await viewModel.settleRevalidation()

        #expect(viewModel.page?.currentSeason == 2027)
        #expect(viewModel.loadState == .loaded)
    }

    @Test func unchangedStatsRevalidateDoesNotTouchState() async {
        let (repository, _) = makeRepository()
        let viewModel = TeamStatsViewModel(teamId: "bills", repository: repository)
        await viewModel.load()
        await viewModel.load()

        let rendered = await rendersWhile(reading: { viewModel.page }) {
            await viewModel.settleRevalidation()
        }

        #expect(rendered == false)
    }

    @Test func changedUniformRevalidateSwapsIn() async {
        let (repository, source) = makeRepository()
        let viewModel = UniformArchiveViewModel(repository: repository)
        await viewModel.load()
        await source.set(uniforms: .success([listing(id: "a"), listing(id: "b")]))

        await viewModel.load()
        #expect(viewModel.listings.count == 1)
        await viewModel.settleRevalidation()

        #expect(viewModel.listings.count == 2)
        #expect(viewModel.artRefreshToken == 0)
    }
}
