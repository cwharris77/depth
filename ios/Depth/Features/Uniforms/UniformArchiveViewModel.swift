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

    func setKind(_ kind: UniformKind?) {
        filters.kind = kind
    }

    func setEra(_ era: String?) {
        filters.era = era
    }

    func toggleCurrentOnly() {
        filters.currentOnly.toggle()
    }

    private func matches(_ kit: UniformListing) -> Bool {
        UniformArchive.matchesFilters(kit, filters)
    }
}