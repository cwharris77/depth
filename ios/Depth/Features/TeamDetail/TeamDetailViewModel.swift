import Foundation
import Observation

// Feature-local observable state for one team's depth chart (design spec's "feature-local
// observable state" preference). Renders cache-first: `CachingDepthRepository.teamSnapshot`
// already returns instantly from disk when a cached row exists and refreshes in the
// background, so this view model just displays whatever it gets and re-renders if a
// later call (foreground refresh, pull-to-refresh) returns something newer.
@Observable
@MainActor
final class TeamDetailViewModel {
    enum LoadState: Equatable {
        case loading
        case loaded
        case failed(DepthError)
    }

    let teamId: String
    private(set) var loadState: LoadState = .loading
    private(set) var snapshot: TeamSnapshot?
    private(set) var cachedAt: Date?

    private let repository: CachingDepthRepository
    private let events: any AppEventsRecording

    init(
        teamId: String, repository: CachingDepthRepository,
        events: any AppEventsRecording = NoOpAppEventsRecorder()
    ) {
        self.teamId = teamId
        self.repository = repository
        self.events = events
    }

    var isStale: Bool {
        guard let cachedAt else { return false }
        return CachingDepthRepository.isStale(cachedAt)
    }

    func load() async {
        let firstLoad = snapshot == nil
        if snapshot == nil {
            loadState = .loading
        }
        do {
            let result = try await repository.teamSnapshot(teamId: teamId)
            snapshot = result
            cachedAt = await repository.teamSnapshotCachedAt(teamId: teamId)
            loadState = .loaded
            // Closes the app-launch signpost on the first screen with real, user-visible
            // content. As of the 2026-08-15 navigation-parity change that is this depth
            // chart — the launch destination — not the team list, which now only loads
            // when the switcher sheet is opened. No-op on every later load (background
            // refresh, pull-to-refresh, team switch).
            DepthSignposts.endAppLaunchIfNeeded()
            // Fires once per team-detail visit, on the first successful resolve —
            // not on every 15-minute background/pull-to-refresh reload, which would
            // inflate the "reached a depth chart" funnel step (design spec Milestone
            // 2B item 26).
            if firstLoad { events.record(.depthChartReached) }
        } catch let error as DepthError {
            // A failure never clears a snapshot already on screen — retain last good
            // data (design spec's "retain the last good snapshot on failure").
            if snapshot == nil {
                loadState = .failed(error)
                events.record(.error(category: error.telemetryCategory))
            }
        } catch {
            if snapshot == nil {
                loadState = .failed(.server("\(error)"))
                events.record(.error(category: "server"))
            }
        }
    }
}
