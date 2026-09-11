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
    private(set) var playerHits: [PlayerHit] = []
    var searchText: String = ""

    private let repository: CachingDepthRepository
    private let events: any AppEventsRecording
    /// Monotonic id so a late search response from an earlier keystroke can never
    /// overwrite the hits for the query the user is actually looking at (same
    /// request-invalidation pattern as PlayerProfileViewModel).
    private var searchRequestID = 0

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
            loadState = .loaded
        } catch let error as DepthError {
            loadState = .failed(error)
            events.record(.error(category: error.telemetryCategory))
        } catch {
            loadState = .failed(.server("\(error)"))
            events.record(.error(category: "server"))
        }
    }

    /// Cross-team player search (web NavSwitcher parity): fires per keystroke and clears
    /// on an empty query. A failed search surfaces as no player hits (the team results
    /// above are unaffected) rather than blocking the switcher.
    func searchPlayers() async {
        let query = searchText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !query.isEmpty else {
            playerHits = []
            return
        }
        searchRequestID += 1
        let requestID = searchRequestID
        do {
            let hits = try await repository.searchPlayers(query: query)
            guard requestID == searchRequestID else { return }
            playerHits = hits
        } catch let error as DepthError {
            guard requestID == searchRequestID else { return }
            playerHits = []
            events.record(.error(category: error.telemetryCategory))
        } catch {
            guard requestID == searchRequestID else { return }
            playerHits = []
            events.record(.error(category: "server"))
        }
    }
}
