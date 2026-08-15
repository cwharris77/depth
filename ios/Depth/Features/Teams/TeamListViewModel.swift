import Foundation
import Observation

// Feature-local observable state for the team selector (design spec's "Prefer
// feature-local observable state over a giant global state object"). Owns the
// list-loading lifecycle only; search filtering is a pure computed property so there's
// nothing to keep in sync by hand.
@Observable
@MainActor
final class TeamListViewModel {
    enum LoadState: Equatable {
        case loading
        case loaded
        case failed(DepthError)
    }

    private(set) var loadState: LoadState = .loading
    private(set) var teams: [Team] = []
    /// The on-device cache timestamp for the team list, surfaced by Settings' Data
    /// section (task-8d brief). Only ever set after a successful load — a failed load
    /// must not report a stale/guessed timestamp as if it were current.
    private(set) var cachedAt: Date?
    var searchText: String = ""

    private let repository: CachingDepthRepository
    private let events: any AppEventsRecording

    init(repository: CachingDepthRepository, events: any AppEventsRecording = NoOpAppEventsRecorder()) {
        self.repository = repository
        self.events = events
    }

    var filteredTeams: [Team] {
        let query = searchText.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        guard !query.isEmpty else { return teams }
        return teams.filter {
            $0.name.lowercased().contains(query)
                || $0.city.lowercased().contains(query)
                || $0.abbrev.lowercased().contains(query)
                || "\($0.city) \($0.name)".lowercased().contains(query)
        }
    }

    func load() async {
        loadState = .loading
        do {
            teams = try await repository.teams()
            cachedAt = await repository.teamListCachedAt()
            loadState = .loaded
            // Closes the app-launch signpost on the first screen with real, user-visible
            // content — see DepthSignposts.appLaunch's doc comment for why this is the
            // proxy for "first useful render" rather than the depth chart itself.
            DepthSignposts.endAppLaunchIfNeeded()
        } catch let error as DepthError {
            loadState = .failed(error)
            events.record(.error(category: error.telemetryCategory))
        } catch {
            loadState = .failed(.server("\(error)"))
            events.record(.error(category: "server"))
        }
    }
}
