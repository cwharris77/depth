import Foundation
import Observation

// Feature-local state for the uniform archive tab (web UniformArchive a
// la the "Desktop shell for uniform archive" docs — the app's first archive surface).
// Loads the all-32-kits list through the repository seam, then filters and groups
// client-side exactly like the web's pure helpers (lib/uniforms/filter.ts, ported to
// UniformListing.swift). LoadState keeps loading/loaded/empty/failed distinct so the
// view can offer the right recovery action — never a flash-then-jump (AGENTS.md #16).
@Observable
@MainActor
final class UniformArchiveViewModel {
    enum LoadState: Equatable {
        case loading
        case loaded
        case failed(DepthError)
    }

    private(set) var loadState: LoadState = .loading
    private(set) var listings: [UniformListing] = []

    var filters = UniformArchive.Filters()

    private let repository: DepthRepository

    init(repository: DepthRepository) {
        self.repository = repository
    }

    var eraOptions: [String] {
        UniformArchive.eraOptions(listings)
    }

    var groups: [UniformArchive.DivisionGroup] {
        UniformArchive.groupByDivision(listings.filter { matches($0) })
    }

    var kitCount: Int { listings.count }

    /// Count of non-default filters currently applied. Drives the Filters button's
    /// badge (DEP-271) — now that kind/era/current-only live behind a sheet instead of
    /// a visible chip row, this is the only surface showing that a filter is active.
    var activeFilterCount: Int {
        [filters.kind != nil, filters.era != nil, filters.currentOnly]
            .filter { $0 }
            .count
    }

    func load() async {
        loadState = .loading
        do {
            listings = try await repository.listUniforms()
            loadState = .loaded
        } catch let error as DepthError {
            loadState = .failed(error)
        } catch {
            loadState = .failed(.server("\(error)"))
        }
    }

    private func matches(_ kit: UniformListing) -> Bool {
        UniformArchive.matchesFilters(kit, filters)
    }
}