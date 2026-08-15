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

    init(teamId: String, repository: CachingDepthRepository) {
        self.teamId = teamId
        self.repository = repository
    }

    var isStale: Bool {
        guard let cachedAt else { return false }
        return CachingDepthRepository.isStale(cachedAt)
    }

    func load() async {
        if snapshot == nil {
            loadState = .loading
        }
        do {
            let result = try await repository.teamSnapshot(teamId: teamId)
            snapshot = result
            cachedAt = await repository.teamSnapshotCachedAt(teamId: teamId)
            loadState = .loaded
        } catch let error as DepthError {
            // A failure never clears a snapshot already on screen — retain last good
            // data (design spec's "retain the last good snapshot on failure").
            if snapshot == nil {
                loadState = .failed(error)
            }
        } catch {
            if snapshot == nil {
                loadState = .failed(.server("\(error)"))
            }
        }
    }
}
