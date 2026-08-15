import Foundation
import Observation

// Feature-local state for the profile's lazy stats read. A monotonically increasing
// request id makes a late response from retry, dismissal, or a replaced sheet inert,
// so it can never overwrite the currently visible profile.
@Observable
@MainActor
final class PlayerProfileViewModel {
    enum StatsState: Equatable {
        case loading
        case loaded
        case empty
        case failed(DepthError)
    }

    let playerID: String
    private(set) var statsState: StatsState = .loading
    private(set) var stats: [PlayerSeasonStats] = []

    private let repository: DepthRepository
    private var latestRequestID = 0

    init(playerID: String, repository: DepthRepository) {
        self.playerID = playerID
        self.repository = repository
    }

    func load() async {
        latestRequestID += 1
        let requestID = latestRequestID
        statsState = .loading
        do {
            let response = try await repository.playerStats(playerId: playerID)
            guard requestID == latestRequestID else { return }
            let played = response.filter(\.hasPlayedGames)
            stats = played
            statsState = played.isEmpty ? .empty : .loaded
        } catch let error as DepthError {
            guard requestID == latestRequestID else { return }
            statsState = .failed(error)
        } catch {
            guard requestID == latestRequestID else { return }
            statsState = .failed(.server("\(error)"))
        }
    }

    func retry() async {
        await load()
    }
}
