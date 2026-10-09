import Foundation
import Observation

// Feature-local state for the profile's lazy stats and highlights reads. A monotonically increasing
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
    let teamID: String?
    private(set) var statsState: StatsState = .loading
    private(set) var stats: [PlayerSeasonStats] = []
    /// The profile's lead claim, from the player's highlight file. Nil while loading, when
    /// the file is missing, or when no career high is rare enough to claim.
    private(set) var knownFor: PlayerKnownForClaim?
    /// The season still being played, from the profile team's schedule. Nil without a team,
    /// when the schedule read fails, or once the regular season is played out.
    private(set) var inProgressSeason: Int?

    private let repository: DepthRepository
    private var latestRequestID = 0

    init(playerID: String, teamID: String?, repository: DepthRepository) {
        self.playerID = playerID
        self.teamID = teamID
        self.repository = repository
    }

    func load() async {
        latestRequestID += 1
        let requestID = latestRequestID
        statsState = .loading
        async let highlights = try? repository.playerHighlights(
            playerId: playerID, teamId: teamID)
        async let schedule = scheduleForInProgressSeason()
        do {
            let response = try await repository.playerStats(playerId: playerID, teamId: teamID)
            let claim = PlayerKnownForBuilder.claim(await highlights)
            let liveSeason = PlayerStatLedger.inProgressSeason(await schedule)
            guard requestID == latestRequestID else { return }
            knownFor = claim
            inProgressSeason = liveSeason
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

    // The team's current schedule decides whether its newest season is still running. A
    // failed read only drops the in-progress treatment, so it never fails the stats load.
    private func scheduleForInProgressSeason() async -> TeamSchedule? {
        guard let teamID else { return nil }
        return try? await repository.teamSchedule(teamId: teamID, season: nil)
    }

    func retry() async {
        await load()
    }
}
