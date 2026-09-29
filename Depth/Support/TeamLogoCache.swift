import SwiftUI
import UIKit

// Persistent on-device cache for team-logo artwork fetched from ESPN's CDN, plus the view
// that renders it.
//
// The cache stores remote logo responses in `URLCache` rather than image blobs in SwiftData.
// It is keyed by logo URL, so repeat renders and offline use never re-download the artwork.
//
// Logos come from ESPN's unofficial API and are only cached on-device; nothing is copied into
// the app bundle at build time.
@MainActor
enum TeamLogoCache {
    private static let cacheTimestampKey = "teamLogoCachedAt"
    private static let maximumCacheAge: TimeInterval = 6 * 60 * 60

    /// Dedicated cache so team logos never share or evict the app's general response cache
    /// (URLSession.shared / URLCache.shared) and never depend on host configuration.
    static let urlCache = URLCache(
        memoryCapacity: 8 * 1024 * 1024,
        diskCapacity: 64 * 1024 * 1024
    )

    /// Uses HTTP cache headers for logo requests. Only logo fetches flow through this
    /// session; the rest of the app keeps URLSession.shared.
    private static let session: URLSession = {
        let config = URLSessionConfiguration.default
        config.urlCache = urlCache
        config.requestCachePolicy = .useProtocolCachePolicy
        return URLSession(configuration: config)
    }()

    /// Synchronous cache read — safe to call from a view's init, which is what makes
    /// already-seen logos render on the first frame instead of flashing initials.
    static func cachedImage(for url: URL) -> UIImage? {
        let request = URLRequest(url: url)
        guard let cached = urlCache.cachedResponse(for: request) else { return nil }

        guard let cachedAt = cached.userInfo?[cacheTimestampKey] as? Date,
            let response = cached.response as? HTTPURLResponse
        else {
            urlCache.removeCachedResponse(for: request)
            return nil
        }

        let cacheControl = responseCacheControl(response)
        let age = Date().timeIntervalSince(cachedAt)
        guard age < cacheAgeLimit(for: response),
            !cacheControl.contains("no-cache"),
            !cacheControl.contains("no-store"),
            let image = UIImage(data: cached.data)
        else {
            urlCache.removeCachedResponse(for: request)
            return nil
        }

        return image
    }

    /// Fetches a logo using CDN freshness rules, then keeps a valid image for synchronous
    /// rendering for at most six hours. A bad cached response is discarded and retried once.
    static func loadImage(from url: URL) async -> UIImage? {
        for attempt in 0..<2 {
            var request = URLRequest(url: url)
            if attempt == 1 {
                request.cachePolicy = .reloadIgnoringLocalCacheData
            }

            do {
                let (data, response) = try await session.data(for: request)
                guard let httpResponse = response as? HTTPURLResponse,
                    (200..<300).contains(httpResponse.statusCode),
                    let image = UIImage(data: data)
                else {
                    urlCache.removeCachedResponse(for: request)
                    if attempt == 0 { continue }
                    return nil
                }

                let cacheControl = responseCacheControl(httpResponse)
                if cacheControl.contains("no-cache") || cacheControl.contains("no-store") {
                    urlCache.removeCachedResponse(for: request)
                } else {
                    urlCache.storeCachedResponse(
                        CachedURLResponse(
                            response: response,
                            data: data,
                            userInfo: [cacheTimestampKey: Date()],
                            storagePolicy: .allowed
                        ),
                        for: request
                    )
                }
                return image
            } catch {
                return nil
            }
        }

        return nil
    }

    private static func responseCacheControl(_ response: HTTPURLResponse) -> String {
        response.value(forHTTPHeaderField: "Cache-Control")?.lowercased() ?? ""
    }

    private static func cacheAgeLimit(for response: HTTPURLResponse) -> TimeInterval {
        for directive in responseCacheControl(response).components(separatedBy: ",") {
            let parts = directive.trimmingCharacters(in: .whitespaces).split(
                separator: "=",
                maxSplits: 1
            )
            if parts.first == "max-age", let seconds = parts.last.flatMap(Double.init) {
                return min(seconds, maximumCacheAge)
            }
        }
        return maximumCacheAge
    }
}

// A team logo rendered from TeamLogoCache: synchronously from cache when present (no
// "BUF → icon" flash), else `placeholder` while the first fetch completes. Replaces
// AsyncImage for team artwork so repeat conference switches and offline use don't
// re-download. Shared by TeamBadge (team list/switcher) and TeamIconView (schedule card)
// so the "which URL + cache policy" rule lives in one place.
@MainActor
struct CachedTeamLogo<Placeholder: View, Content: View>: View {
    let url: URL
    private let placeholder: () -> Placeholder
    private let content: (Image) -> Content

    init(
        url: URL,
        @ViewBuilder placeholder: @escaping () -> Placeholder,
        @ViewBuilder content: @escaping (Image) -> Content
    ) {
        self.url = url
        self.placeholder = placeholder
        self.content = content
    }

    var body: some View {
        // id(url) keys the state-holding child to the URL, so a URL change (e.g. a reused
        // row across teams) becomes a fresh view whose init re-seeds from cache for the
        // new URL instead of showing the previous team's logo.
        CachedTeamLogoBody(url: url, placeholder: placeholder, content: content)
            .id(url)
    }
}

@MainActor
private struct CachedTeamLogoBody<Placeholder: View, Content: View>: View {
    let url: URL
    private let placeholder: () -> Placeholder
    private let content: (Image) -> Content

    @State private var image: UIImage?

    init(
        url: URL,
        placeholder: @escaping () -> Placeholder,
        content: @escaping (Image) -> Content
    ) {
        self.url = url
        self.placeholder = placeholder
        self.content = content
        // Seed from the on-device cache synchronously so an already-seen logo renders on
        // the first frame — the flash was AsyncImage's async-first load, not the artwork.
        _image = State(initialValue: TeamLogoCache.cachedImage(for: url))
    }

    var body: some View {
        Group {
            if let image {
                content(Image(uiImage: image))
            } else {
                placeholder()
            }
        }
        .task {
            if image == nil, let loaded = await TeamLogoCache.loadImage(from: url) {
                image = loaded
            }
        }
    }
}
