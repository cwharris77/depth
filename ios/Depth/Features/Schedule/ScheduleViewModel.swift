import Foundation
import Observation

// Feature-local state for schedule loading and season selection. It never converts a
// failed read into a blank scorecard: loading, empty, and typed failure stay distinct so
// the view can offer the right recovery action.
@Observable
@MainActor
final class ScheduleViewModel {
    enum LoadState: Equatable {
        case loading
        case loaded
        case empty
        case failed(DepthError)
    }

    let teamId: String
    private(set) var loadState: LoadState = .loading
    private(set) var schedule: TeamSchedule?
    private(set) var selectedSeason: Int?
    private(set) var defaultSeason: Int?

    private let repository: DepthRepository
    private var latestRequestID = 0

    init(teamId: String, repository: DepthRepository) {
        self.teamId = teamId
        self.repository = repository
    }

    var seasonOptions: [Int] {
        guard let defaultSeason, defaultSeason >= TeamSchedule.earliestSeason else { return [] }
        return Array(stride(from: defaultSeason, through: TeamSchedule.earliestSeason, by: -1))
    }

    var isPastSeason: Bool {
        guard let defaultSeason, let selectedSeason else { return false }
        return selectedSeason < defaultSeason
    }

    func load() async {
        await fetch(season: selectedSeason)
    }

    func selectSeason(_ season: Int) async {
        guard let defaultSeason, (TeamSchedule.earliestSeason...defaultSeason).contains(season) else {
            loadState = .failed(.validation("season"))
            return
        }
        selectedSeason = season
        await fetch(season: season)
    }

    private func fetch(season: Int?) async {
        latestRequestID += 1
        let requestID = latestRequestID
        schedule = nil
        loadState = .loading
        do {
            let result = try await repository.teamSchedule(teamId: teamId, season: season)
            guard requestID == latestRequestID else { return }
            if defaultSeason == nil {
                defaultSeason = result.season
            }
            selectedSeason = result.season
            schedule = result
            loadState = result.games.isEmpty ? .empty : .loaded
        } catch let error as DepthError {
            guard requestID == latestRequestID else { return }
            schedule = nil
            loadState = error == .notFound ? .empty : .failed(error)
        } catch {
            guard requestID == latestRequestID else { return }
            schedule = nil
            loadState = .failed(.server("\(error)"))
        }
    }
}
