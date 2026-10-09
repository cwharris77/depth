import Testing
import UIKit
@testable import Depth

// Pins TeamLogoCache's contract: an already-stored logo reads back synchronously, an
// untouched URL reads nil, and garbage never decodes as an image. The async fetch path is
// network I/O — deliberately not exercised here (the suite never hits ESPN), so these
// tests seed the cache directly via storeCachedResponse and use unique example.test URLs
// that can't collide with real team logo URLs. Seeds are memory-only: URLCache writes
// disk-allowed entries asynchronously, and a write landing after a removal resurrects the
// entry the test just watched get deleted.
@MainActor
struct TeamLogoCacheTests {
    // A 1×1 transparent PNG — a real decodable image for the round-trip test.
    private static let png1x1 = Data(
        base64Encoded:
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
    )!

    @Test func untouchedURLReadsNil() {
        let url = URL(string: "https://example.test/untouched.png")!
        #expect(TeamLogoCache.cachedImage(for: url) == nil)
    }

    @Test func storedImageReadsBackSynchronously() {
        let url = URL(string: "https://example.test/buf.png")!
        let request = URLRequest(url: url)
        let response = HTTPURLResponse(
            url: url, statusCode: 200, httpVersion: nil, headerFields: nil)!
        TeamLogoCache.urlCache.storeCachedResponse(
            CachedURLResponse(
                response: response,
                data: Self.png1x1,
                userInfo: ["teamLogoCachedAt": Date()],
                storagePolicy: .allowedInMemoryOnly
            ),
            for: request
        )
        defer { TeamLogoCache.urlCache.removeCachedResponse(for: request) }
        #expect(TeamLogoCache.cachedImage(for: url) != nil)
    }

    @Test func expiredImageIsNotRendered() {
        let url = URL(string: "https://example.test/expired.png")!
        let request = URLRequest(url: url)
        let response = HTTPURLResponse(
            url: url, statusCode: 200, httpVersion: nil, headerFields: nil)!
        TeamLogoCache.urlCache.storeCachedResponse(
            CachedURLResponse(
                response: response,
                data: Self.png1x1,
                userInfo: ["teamLogoCachedAt": Date().addingTimeInterval(-7 * 60 * 60)],
                storagePolicy: .allowedInMemoryOnly
            ),
            for: request
        )
        defer { TeamLogoCache.urlCache.removeCachedResponse(for: request) }

        #expect(TeamLogoCache.cachedImage(for: url) == nil)
    }

    @Test func garbageNeverDecodesAsAnImage() {
        let url = URL(string: "https://example.test/garbage.png")!
        let request = URLRequest(url: url)
        let response = HTTPURLResponse(
            url: url, statusCode: 200, httpVersion: nil, headerFields: nil)!
        TeamLogoCache.urlCache.storeCachedResponse(
            CachedURLResponse(
                response: response, data: Data("not an image".utf8), userInfo: nil,
                storagePolicy: .allowedInMemoryOnly),
            for: request
        )
        defer { TeamLogoCache.urlCache.removeCachedResponse(for: request) }
        #expect(TeamLogoCache.urlCache.cachedResponse(for: request) != nil)
        #expect(TeamLogoCache.cachedImage(for: url) == nil)
        #expect(TeamLogoCache.urlCache.cachedResponse(for: request) == nil)
    }
}
