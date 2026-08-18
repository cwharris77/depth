import SwiftUI
import UIKit

// Persistent on-device cache for team-logo artwork fetched from ESPN's CDN, plus the view
// that renders it.
//
// Design spec (2026-08-14-native-ios-app-design.md, "Data and state contract"): "Cache at
// most all 32 teams; store no image blobs. Use `URLCache` for cleared remote images and
// initials/placeholders when images are unavailable or legally unresolved." The SwiftData
// snapshot cache stays text/URL-only; this is the URLCache fetched logos land in, keyed by
// the logo URL, so repeat renders and offline use never re-download the artwork.
//
// Legal stance (DEP-247): NFL team logos are trademarks served by ESPN's unofficial API.
// Caching fetched copies on-device (repeat renders, offline) is low-risk and deliberate;
// BUNDLING/redistributing the artwork inside the app binary is the gray area that needs a
// rights review and is never done here — nothing is copied into the bundle at build time.
@MainActor
enum TeamLogoCache {
    /// Dedicated cache so team logos never share or evict the app's general response cache
    /// (URLSession.shared / URLCache.shared) and never depend on host configuration.
    static let urlCache = URLCache(
        memoryCapacity: 8 * 1024 * 1024,
        diskCapacity: 64 * 1024 * 1024
    )

    /// Cache-first session: a cache hit returns without hitting the network. Only logo
    /// fetches flow through here; the rest of the app keeps URLSession.shared.
    private static let session: URLSession = {
        let config = URLSessionConfiguration.default
        config.urlCache = urlCache
        config.requestCachePolicy = .returnCacheDataElseLoad
        return URLSession(configuration: config)
    }()

    /// Synchronous cache read — safe to call from a view's init, which is what makes
    /// already-seen logos render on the first frame instead of flashing initials.
    static func cachedImage(for url: URL) -> UIImage? {
        guard let cached = urlCache.cachedResponse(for: URLRequest(url: url)),
              let image = UIImage(data: cached.data) else { return nil }
        return image
    }

    /// Fetches the logo (cache-first) and stores it regardless of the CDN's HTTP cache
    /// headers so offline renders are deterministic. Returns nil on failure — the caller
    /// falls back to its initials placeholder.
    static func loadImage(from url: URL) async -> UIImage? {
        do {
            let (data, response) = try await session.data(from: url)
            guard let image = UIImage(data: data) else { return nil }
            urlCache.storeCachedResponse(
                CachedURLResponse(response: response, data: data),
                for: URLRequest(url: url)
            )
            return image
        } catch {
            return nil
        }
    }
}

// A team logo rendered from TeamLogoCache: synchronously from cache when present (no
// "BUF → icon" flash), else `placeholder` while the first fetch completes. Replaces
// AsyncImage for team artwork so repeat conference switches and offline use don't
// re-download. Shared by TeamBadge (team list/switcher) and TeamIconView (schedule card,
// stats NEXT GAME card) so the "which URL + cache policy" rule lives in one place.
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
