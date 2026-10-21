import Foundation
import Observation

/// Loads one team's events for the feed, finds a single event by id for a notification
/// that names it, and keeps which events this device has opened or cleared.
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

    private(set) var readIds: Set<String>
    private(set) var dismissedIds: Set<String>

    private let teamId: String
    private let repository: any DepthRepository
    private let preferences: UserPreferences

    init(teamId: String, repository: any DepthRepository, preferences: UserPreferences) {
        self.teamId = teamId
        self.repository = repository
        self.preferences = preferences
        readIds = preferences.teamFeedReadIds(for: teamId)
        dismissedIds = preferences.teamFeedDismissedIds(for: teamId)
    }

    /// The loaded events minus the ones cleared on this device.
    var visibleEvents: [TeamEvent] {
        guard case .loaded(let events) = state else { return [] }
        return events.filter { !dismissedIds.contains($0.id) }
    }

    /// Unread until opened, and never once it is older than the bell's unread window.
    func isUnread(_ event: TeamEvent, now: Date) -> Bool {
        !readIds.contains(event.id)
            && now.timeIntervalSince(event.occurredAt) <= TeamFeedUnread.window
    }

    func markRead(_ ids: some Sequence<String>) {
        let next = readIds.union(ids)
        guard next != readIds else { return }
        readIds = next
        preferences.setTeamFeedReadIds(readIds, for: teamId)
    }

    func dismiss(_ id: String) {
        dismissedIds.insert(id)
        preferences.setTeamFeedDismissedIds(dismissedIds, for: teamId)
    }

    func clearAll() {
        guard case .loaded(let events) = state else { return }
        dismissedIds.formUnion(events.map(\.id))
        preferences.setTeamFeedDismissedIds(dismissedIds, for: teamId)
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
            let events = try await repository.teamEvents(teamId: teamId)
            state = .loaded(events)
            forgetIds(notIn: events)
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

    /// The feed is the newest events only, so an id that has left it never comes back.
    /// Dropping those keeps the stored sets as small as the feed. An empty read is not
    /// taken as every event having aged out.
    private func forgetIds(notIn events: [TeamEvent]) {
        guard !events.isEmpty else { return }
        let loaded = Set(events.map(\.id))
        if !readIds.isSubset(of: loaded) {
            readIds.formIntersection(loaded)
            preferences.setTeamFeedReadIds(readIds, for: teamId)
        }
        if !dismissedIds.isSubset(of: loaded) {
            dismissedIds.formIntersection(loaded)
            preferences.setTeamFeedDismissedIds(dismissedIds, for: teamId)
        }
    }
}
