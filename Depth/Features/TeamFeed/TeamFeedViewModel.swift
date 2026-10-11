import Foundation
import Observation

/// Loads one team's events for the feed, and finds a single event by id for a
/// notification that names it.
@Observable
@MainActor
final class TeamFeedViewModel {
    enum LoadState: Equatable {
        case idle
        case loading
        case loaded([TeamEvent])
        case failed(DepthError)
    }

    private(set) var state: LoadState = .idle
    /// True when the latest load failed while a list was already showing. The list is
    /// kept, so this is the only sign that it may be out of date.
    private(set) var refreshFailed = false

    private let teamId: String
    private let repository: any DepthRepository

    init(teamId: String, repository: any DepthRepository) {
        self.teamId = teamId
        self.repository = repository
    }

    var newestEventDate: Date? {
        guard case .loaded(let events) = state else { return nil }
        return events.map(\.occurredAt).max()
    }

    func load() async {
        let previous = state
        refreshFailed = false
        // Keep showing a loaded list while it refreshes.
        if case .loaded = state {} else { state = .loading }
        do {
            state = .loaded(try await repository.teamEvents(teamId: teamId))
        } catch {
            if error is CancellationError || Task.isCancelled {
                // A cancelled read says nothing about the feed, so it undoes only its own
                // step into loading. A list that an overlapping load has put up since stays.
                if case .loading = state, previous != .loading { state = previous }
            } else if case .loaded = state {
                refreshFailed = true
            } else {
                state = .failed(error as? DepthError ?? .server("\(error)"))
            }
        }
    }

    /// Returns a known event or refreshes to find a newly delivered one. Nil when the
    /// refreshed feed does not hold it or could not be read.
    func event(id: String) async -> TeamEvent? {
        if case .loaded(let events) = state, let event = events.first(where: { $0.id == id }) {
            return event
        }
        await load()
        guard case .loaded(let events) = state else { return nil }
        return events.first { $0.id == id }
    }
}
