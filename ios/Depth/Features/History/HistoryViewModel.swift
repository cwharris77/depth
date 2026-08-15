import Foundation
import Observation

// Owns only historical-season selection and on-demand state. A request counter makes
// selection changes immediately discard stale content, so a slow prior season cannot
// reintroduce live or older roster data after the user changes course.
enum HistorySeason: Equatable, Hashable, Identifiable {
    case current(Int)
    case past(Int)

    var year: Int {
        switch self {
        case .current(let year), .past(let year): year
        }
    }

    var id: String {
        switch self {
        case .current(let year): "current-\(year)"
        case .past(let year): "past-\(year)"
        }
    }
}

enum HistoryLoadState: Equatable {
    case current
    case loading
    case loaded
    case empty
    case failed(DepthError)
}

func currentRosterSeason(at date: Date = Date(), calendar: Calendar = .current) -> Int {
    let year = calendar.component(.year, from: date)
    return calendar.component(.month, from: date) == 1 ? year - 1 : year
}

func historySeasonOptions(currentSeason: Int, minimumSeason: Int = 1999) -> [HistorySeason] {
    [.current(currentSeason)] + (minimumSeason..<currentSeason).reversed().map(HistorySeason.past)
}

@Observable
@MainActor
final class HistoryViewModel {
    let teamId: String
    let currentSeason: Int
    private(set) var selectedSeason: HistorySeason
    private(set) var state: HistoryLoadState = .current
    private(set) var snapshot: TeamSnapshot?

    private let repository: DepthRepository
    private var latestRequestID = 0

    init(teamId: String, repository: DepthRepository, currentSeason: Int = currentRosterSeason()) {
        self.teamId = teamId
        self.repository = repository
        self.currentSeason = currentSeason
        selectedSeason = .current(currentSeason)
    }

    var seasons: [HistorySeason] { historySeasonOptions(currentSeason: currentSeason) }
    var isHistorical: Bool {
        if case .past = selectedSeason { return true }
        return false
    }

    func select(_ season: HistorySeason) async {
        guard let request = beginSelection(season) else { return }
        await fetch(season: request.season, requestID: request.id)
    }

    /// The sheet calls this synchronous entry point so a past-season tap removes the
    /// live/override field before its network task can suspend.
    func selectImmediately(_ season: HistorySeason) {
        guard let request = beginSelection(season) else { return }
        Task { await self.fetch(season: request.season, requestID: request.id) }
    }

    func retry() async { await select(selectedSeason) }

    private func beginSelection(_ season: HistorySeason) -> (season: Int, id: Int)? {
        latestRequestID += 1
        let requestID = latestRequestID
        selectedSeason = season
        snapshot = nil
        guard case .past(let year) = season else {
            state = .current
            return nil
        }
        state = .loading
        return (year, requestID)
    }

    private func fetch(season: Int, requestID: Int) async {
        do {
            let result = try await repository.teamSeason(teamId: teamId, season: season)
            guard requestID == latestRequestID else { return }
            snapshot = result
            state = .loaded
        } catch let error as DepthError {
            guard requestID == latestRequestID else { return }
            state = error == .notFound ? .empty : .failed(error)
        } catch {
            guard requestID == latestRequestID else { return }
            state = .failed(.server("\(error)"))
        }
    }
}
