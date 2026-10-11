import Foundation
import Testing

@testable import Depth

private actor FeedFakeRepository: DepthRepository {
    var result: Result<[TeamEvent], any Error>
    private(set) var requestedTeamIds: [String] = []
    init(result: Result<[TeamEvent], any Error>) { self.result = result }
    func setResult(_ result: Result<[TeamEvent], any Error>) { self.result = result }
    func teamEvents(teamId: String) async throws -> [TeamEvent] {
        requestedTeamIds.append(teamId); return try result.get()
    }
    func teams() async throws -> [Team] { [] }
    func teamSnapshot(teamId: String) async throws -> TeamSnapshot { throw DepthError.notFound }
    func teamSeason(teamId: String, season: Int) async throws -> TeamSnapshot {
        throw DepthError.notFound
    }
    func teamSchedule(teamId: String, season: Int?) async throws -> TeamSchedule {
        throw DepthError.notFound
    }
    func playerStats(playerId: String, teamId: String?) async throws -> [PlayerSeasonStats] { [] }
    func teamStats(teamId: String) async throws -> TeamStatsPage { throw DepthError.notFound }
    func appConfig() async throws -> AppConfig { throw DepthError.notFound }
}

private func sampleEvent(_ id: String) -> TeamEvent {
    TeamEvent(
        id: id, type: "trade", tier: "big_moments", teamId: "bills", headline: "h \(id)",
        detail: nil, source: "espn_transactions", occurredAt: Date(timeIntervalSince1970: 0))
}

@MainActor
@Test func feedLoadsEventsInTheOrderGiven() async {
    let repository = FeedFakeRepository(result: .success([sampleEvent("a"), sampleEvent("b")]))
    let model = TeamFeedViewModel(teamId: "bills", repository: repository)
    #expect(model.state == .idle)
    await model.load()
    #expect(model.state == .loaded([sampleEvent("a"), sampleEvent("b")]))
    #expect(await repository.requestedTeamIds == ["bills"])
}

@MainActor
@Test func feedReportsAFailure() async {
    let model = TeamFeedViewModel(
        teamId: "bills", repository: FeedFakeRepository(result: .failure(DepthError.offline)))
    await model.load()
    #expect(model.state == .failed(.offline))
}

@MainActor
@Test func feedRecoversOnALaterLoad() async {
    let repository = FeedFakeRepository(result: .failure(DepthError.offline))
    let model = TeamFeedViewModel(teamId: "bills", repository: repository)
    await model.load()
    await repository.setResult(.success([sampleEvent("a")]))
    await model.load()
    #expect(model.state == .loaded([sampleEvent("a")]))
}

@MainActor
@Test func findingAnEventLoadsTheFeedFirst() async {
    let repository = FeedFakeRepository(result: .success([sampleEvent("a"), sampleEvent("b")]))
    let model = TeamFeedViewModel(teamId: "bills", repository: repository)
    #expect(await model.event(id: "b") == sampleEvent("b"))
    #expect(await repository.requestedTeamIds.count == 1)
    // Already loaded: found without a second read.
    #expect(await model.event(id: "a") == sampleEvent("a"))
    #expect(await repository.requestedTeamIds.count == 1)
}

@MainActor
@Test func anEventThatIsNotInTheFeedIsNotFound() async {
    let model = TeamFeedViewModel(
        teamId: "bills", repository: FeedFakeRepository(result: .success([sampleEvent("a")])))
    #expect(await model.event(id: "gone") == nil)
}

@MainActor
@Test func findingAnEventWhenTheReadFailsIsNotFound() async {
    let model = TeamFeedViewModel(
        teamId: "bills", repository: FeedFakeRepository(result: .failure(DepthError.offline)))
    #expect(await model.event(id: "a") == nil)
    #expect(model.state == .failed(.offline))
}

@MainActor
@Test func aNonDepthErrorIsReportedAsAServerFailure() async {
    struct Odd: Error {}
    let model = TeamFeedViewModel(
        teamId: "bills", repository: FeedFakeRepository(result: .failure(Odd())))
    await model.load()
    guard case .failed(.server) = model.state else {
        Issue.record("Expected server failure"); return
    }
}

@MainActor @Test func aNewNotificationRefreshesAnAlreadyLoadedFeed() async {
    let repository = FeedFakeRepository(result: .success([sampleEvent("a")]))
    let model = TeamFeedViewModel(teamId: "bills", repository: repository)
    await model.load()
    await repository.setResult(.success([sampleEvent("b"), sampleEvent("a")]))
    #expect(await model.event(id: "b") == sampleEvent("b"))
    #expect(await repository.requestedTeamIds == ["bills", "bills"])
}

@MainActor @Test func theNewestEventDateUsesTheLatestTimestamp() async {
    let old = sampleEvent("a")
    let newer = TeamEvent(
        id: "b", type: "trade", tier: "big_moments", teamId: "bills", headline: "h", detail: nil,
        source: "espn_transactions", occurredAt: Date(timeIntervalSince1970: 900))
    let model = TeamFeedViewModel(
        teamId: "bills", repository: FeedFakeRepository(result: .success([old, newer])))
    #expect(model.newestEventDate == nil)
    await model.load()
    #expect(model.newestEventDate == Date(timeIntervalSince1970: 900))
}

/// Holds every `teamEvents` read open until the test answers it, so two loads can be
/// made to overlap and finish in a chosen order.
private actor GatedFeedRepository: DepthRepository {
    private var waiting: [CheckedContinuation<Result<[TeamEvent], any Error>, Never>] = []

    func teamEvents(teamId: String) async throws -> [TeamEvent] {
        try await withCheckedContinuation { waiting.append($0) }.get()
    }

    /// Answers the oldest read still open, once `count` reads are open.
    func answerOldest(whenWaiting count: Int, with result: Result<[TeamEvent], any Error>) async {
        while waiting.count < count { await Task.yield() }
        waiting.removeFirst().resume(returning: result)
    }

    func teams() async throws -> [Team] { [] }
    func teamSnapshot(teamId: String) async throws -> TeamSnapshot { throw DepthError.notFound }
    func teamSeason(teamId: String, season: Int) async throws -> TeamSnapshot {
        throw DepthError.notFound
    }
    func teamSchedule(teamId: String, season: Int?) async throws -> TeamSchedule {
        throw DepthError.notFound
    }
    func teamStats(teamId: String) async throws -> TeamStatsPage { throw DepthError.notFound }
    func playerStats(playerId: String, teamId: String?) async throws -> [PlayerSeasonStats] { [] }
    func appConfig() async throws -> AppConfig { throw DepthError.notFound }
}

@MainActor
@Test func aLoadCancelledAfterAnOverlappingOneLandedKeepsItsList() async {
    let repository = GatedFeedRepository()
    let model = TeamFeedViewModel(teamId: "bills", repository: repository)
    let first = Task { await model.load() }
    let second = Task { await model.load() }
    await repository.answerOldest(whenWaiting: 2, with: .success([sampleEvent("a")]))
    await first.value
    await repository.answerOldest(whenWaiting: 1, with: .failure(CancellationError()))
    await second.value
    #expect(model.state == .loaded([sampleEvent("a")]))
    #expect(!model.refreshFailed)
}

@MainActor
@Test func aLoadThatFailsAfterAnOverlappingOneLandedKeepsItsList() async {
    let repository = GatedFeedRepository()
    let model = TeamFeedViewModel(teamId: "bills", repository: repository)
    let first = Task { await model.load() }
    let second = Task { await model.load() }
    await repository.answerOldest(whenWaiting: 2, with: .success([sampleEvent("a")]))
    await first.value
    await repository.answerOldest(whenWaiting: 1, with: .failure(DepthError.offline))
    await second.value
    #expect(model.state == .loaded([sampleEvent("a")]))
    #expect(model.refreshFailed)
}

@MainActor
@Test func aCancelledFirstLoadLeavesTheFeedIdle() async {
    let model = TeamFeedViewModel(
        teamId: "bills", repository: FeedFakeRepository(result: .failure(CancellationError())))
    await model.load()
    #expect(model.state == .idle)
    #expect(!model.refreshFailed)
}

@MainActor
@Test func aCancelledRefreshKeepsTheLoadedFeed() async {
    let repository = FeedFakeRepository(result: .success([sampleEvent("a")]))
    let model = TeamFeedViewModel(teamId: "bills", repository: repository)
    await model.load()
    await repository.setResult(.failure(CancellationError()))
    await model.load()
    #expect(model.state == .loaded([sampleEvent("a")]))
    #expect(!model.refreshFailed)
}

@MainActor
@Test func aCancelledRetryGoesBackToTheEarlierFailure() async {
    let repository = FeedFakeRepository(result: .failure(DepthError.offline))
    let model = TeamFeedViewModel(teamId: "bills", repository: repository)
    await model.load()
    await repository.setResult(.failure(CancellationError()))
    await model.load()
    #expect(model.state == .failed(.offline))
}

@MainActor
@Test func aReadThatFailsInACancelledTaskRestoresTheEarlierState() async {
    let model = TeamFeedViewModel(
        teamId: "bills", repository: FeedFakeRepository(result: .failure(DepthError.offline)))
    let task = Task { @MainActor in
        withUnsafeCurrentTask { $0?.cancel() }
        await model.load()
    }
    await task.value
    #expect(model.state == .idle)
}

@MainActor
@Test func aFailedRefreshKeepsTheLoadedFeedAndSaysSo() async {
    let repository = FeedFakeRepository(result: .success([sampleEvent("a")]))
    let model = TeamFeedViewModel(teamId: "bills", repository: repository)
    await model.load()
    #expect(!model.refreshFailed)
    await repository.setResult(.failure(DepthError.offline))
    await model.load()
    #expect(model.state == .loaded([sampleEvent("a")]))
    #expect(model.refreshFailed)
    // The kept list still answers a lookup, without another read.
    let reads = await repository.requestedTeamIds.count
    #expect(await model.event(id: "a") == sampleEvent("a"))
    #expect(await repository.requestedTeamIds.count == reads)
}

@MainActor
@Test func aLaterSuccessfulRefreshClearsTheRefreshFailure() async {
    let repository = FeedFakeRepository(result: .success([sampleEvent("a")]))
    let model = TeamFeedViewModel(teamId: "bills", repository: repository)
    await model.load()
    await repository.setResult(.failure(DepthError.offline))
    await model.load()
    await repository.setResult(.success([sampleEvent("b")]))
    await model.load()
    #expect(model.state == .loaded([sampleEvent("b")]))
    #expect(!model.refreshFailed)
}

@MainActor
@Test func aFailureWithNothingLoadedIsNotARefreshFailure() async {
    let model = TeamFeedViewModel(
        teamId: "bills", repository: FeedFakeRepository(result: .failure(DepthError.offline)))
    await model.load()
    #expect(model.state == .failed(.offline))
    #expect(!model.refreshFailed)
}
