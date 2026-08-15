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
    var searchText: String = ""

    private let repository: CachingDepthRepository

    init(repository: CachingDepthRepository) {
        self.repository = repository
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
        } catch {
            loadState = .failed(.server("\(error)"))
        }
    }
}
