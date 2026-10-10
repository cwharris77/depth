import Foundation
import Testing

@testable import Depth

@Suite struct UniformArtCacheTests {
    private static func store(_ url: URL, in cache: URLCache) {
        let response = HTTPURLResponse(
            url: url, statusCode: 200, httpVersion: nil,
            headerFields: ["Cache-Control": "public, max-age=3600"])!
        cache.storeCachedResponse(
            CachedURLResponse(response: response, data: Data([1])),
            for: URLRequest(url: url))
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
