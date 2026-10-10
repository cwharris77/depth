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
        // Keep showing a loaded list while it refreshes.
        if case .loaded = state {} else { state = .loading }
        do {
            state = .loaded(try await repository.teamEvents(teamId: teamId))
        } catch let error as DepthError {
            state = .failed(error)
        } catch {
            state = .failed(.server("\(error)"))
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
