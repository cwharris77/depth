import Foundation
import Testing

@testable import Depth

private actor FetchLog {
    private(set) var urls: [URL] = []
    func record(_ url: URL) { urls.append(url) }
}

@Suite struct UniformArtCacheTests {
    private static func store(_ url: URL, in cache: URLCache) {
        let response = HTTPURLResponse(
            url: url, statusCode: 200, httpVersion: nil,
            headerFields: ["Cache-Control": "public, max-age=3600"])!
        cache.storeCachedResponse(
            CachedURLResponse(response: response, data: Data([1])),
            for: URLRequest(url: url))
    }

    private static func urls(_ count: Int) -> [URL?] {
        (0..<count).map { URL(string: "https://example.test/\($0).webp") }
    }

    @Test func upcomingIsTheTenItemsAfterTheCurrentOne() {
        let all = Self.urls(40)
        let upcoming = UniformArt.upcoming(after: 3, in: all)
        #expect(upcoming == all[4...13].compactMap { $0 })
        #expect(upcoming.count == UniformArt.prefetchLookahead)
    }

    @Test func upcomingStopsAtTheEndOfTheList() {
        let all = Self.urls(12)
        #expect(UniformArt.upcoming(after: 9, in: all) == all[10...11].compactMap { $0 })
        #expect(UniformArt.upcoming(after: 11, in: all).isEmpty)
        #expect(UniformArt.upcoming(after: 50, in: all).isEmpty)
    }

    @Test func upcomingSkipsMissingURLsWithoutShiftingTheWindow() {
        var all = Self.urls(20)
        all[2] = nil
        let upcoming = UniformArt.upcoming(after: 0, in: all, lookahead: 3)
        #expect(upcoming == [all[1], all[3]].compactMap { $0 })
    }

    @Test func prefetchFillsTheCacheAndSkipsWhatIsAlreadyThere() async throws {
        let cache = URLCache(memoryCapacity: 1_000_000, diskCapacity: 0)
        let cached = try #require(URL(string: "https://example.test/cached.webp"))
        let fresh = try #require(URL(string: "https://example.test/fresh.webp"))
        Self.store(cached, in: cache)
        let fetched = FetchLog()

        await UniformArt.prefetch([cached, fresh]) { url in
            await fetched.record(url)
        } isCached: { url in
            cache.cachedResponse(for: URLRequest(url: url)) != nil
        }

        #expect(await fetched.urls == [fresh])
    }

    @Test func prefetchStopsWhenCancelled() async throws {
        let all = Self.urls(5).compactMap { $0 }
        let fetched = FetchLog()
        let task = Task {
            await UniformArt.prefetch(all) { url in
                await fetched.record(url)
                withUnsafeCurrentTask { $0?.cancel() }
            } isCached: { _ in
                false
            }
        }
        await task.value
        #expect(await fetched.urls.count == 1)
    }

    @Test func removeCachedArtDropsBothRastersForTheGivenKitsOnly() throws {
        let cache = URLCache(memoryCapacity: 1_000_000, diskCapacity: 0)
        let jersey = try #require(UniformArt.jerseyURL(for: "bills-home-2025"))
        let full = try #require(UniformArt.fullURL(for: "bills-home-2025"))
        let other = try #require(UniformArt.jerseyURL(for: "jets-home-2025"))
        for url in [jersey, full, other] { Self.store(url, in: cache) }

        UniformArt.removeCachedArt(for: ["bills-home-2025"], from: cache)

        #expect(cache.cachedResponse(for: URLRequest(url: jersey)) == nil)
        #expect(cache.cachedResponse(for: URLRequest(url: full)) == nil)
        #expect(cache.cachedResponse(for: URLRequest(url: other)) != nil)
    }
}
