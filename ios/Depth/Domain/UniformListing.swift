import Foundation

// Mirrors lib/uniforms/art.tsx's UNIFORM_ART_BASE_URL, uniformArtURL, and
// uniformArtFullURL. The archive shows the `-full` mannequin raster (helmet → cleats);
// the picker shows the plain jersey crop (`<id>.webp`) — the same two kinds of artifact
// the web generator emits.
enum UniformArt {
    static let baseURL = "https://depth-ashen.vercel.app/uniforms"

    static func jerseyURL(for id: String) -> URL? {
        URL(string: "\(baseURL)/\(id).webp")
    }

    static func fullURL(for id: String) -> URL? {
        URL(string: "\(baseURL)/\(id)-full.webp")
    }
}

// Mirrors lib/roster-source.ts's UniformListing and lib/uniforms/filter.ts's pure
// archive grouping/filtering (web uniform archive page). A listing is a kit plus the
// team context (name/conference/division) the archive groups by — dead flat, exactly
// the web's `listUniforms()` shape. The pure helpers below are the native twins of
// eraBucket/eraOptions/matchesFilters/compareKits/groupByDivision so the grouping and
// filter rules stay byte-identical across clients and unit-testable without a UI.
struct UniformListing: Codable, Equatable, Identifiable {
    let id: String
    let teamId: String
    let teamName: String
    let conference: String
    let division: String
    let kind: UniformKind
    let name: String
    let yearStart: Int?
    let yearEnd: Int?
    let isCurrent: Bool
    let colors: TeamColors
    let imagePath: String?
}

enum UniformArchive {
    // Per-team kit order: home first, away second, then everything else — Cooper's call
    // on the web (KIND_RANK). The rest share rank 2 and break ties by name, so the
    // order is stable and identical across teams.
    static let kindRank: [UniformKind: Int] = [
        .home: 0,
        .away: 1,
        .throwback: 2,
        .alternate: 2,
        .colorRush: 2,
    ]

    static func eraBucket(yearStart: Int?) -> String {
        guard let yearStart else { return "Undated" }
        return "\((yearStart / 10) * 10)s"
    }

    // Distinct buckets present, decades ascending, 'Undated' last — mirrors
    // lib/uniforms/filter.ts eraOptions.
    static func eraOptions(_ kits: [UniformListing]) -> [String] {
        var buckets = Set(kits.map { eraBucket(yearStart: $0.yearStart) })
        let undated = buckets.remove("Undated")
        let decades = buckets.sorted()
        return undated != nil ? decades + ["Undated"] : decades
    }

    struct Filters: Equatable {
        var kind: UniformKind? = nil  // nil = All kits
        var era: String? = nil        // nil = All eras
        var currentOnly = false
    }

    static func matchesFilters(_ kit: UniformListing, _ f: Filters) -> Bool {
        if let kind = f.kind, kit.kind != kind { return false }
        if let era = f.era, eraBucket(yearStart: kit.yearStart) != era { return false }
        if f.currentOnly && !kit.isCurrent { return false }
        return true
    }

    static func compareKits(_ a: UniformListing, _ b: UniformListing) -> Bool {
        let ar = kindRank[a.kind] ?? 2
        let br = kindRank[b.kind] ?? 2
        return ar != br ? ar < br : a.name.localizedCaseInsensitiveCompare(b.name) == .orderedAscending
    }

    struct TeamGroup: Equatable {
        let teamId: String
        let teamName: String
        var kits: [UniformListing]
    }

    struct DivisionGroup: Equatable, Identifiable {
        let conference: String
        let division: String
        var teams: [TeamGroup]

        var id: String { "\(conference)-\(division)" }
    }

    static let conferences = ["AFC", "NFC"]
    static let divisions = ["East", "North", "South", "West"]

    // Stable conference → division → team order (matches the switcher convention); each
    // team's kits are ordered home → away → rest via compareKits. Mirrors
    // lib/uniforms/filter.ts groupByDivision. Teams identical on the two axes sort by
    // name to keep the order deterministic.
    static func groupByDivision(_ kits: [UniformListing]) -> [DivisionGroup] {
        var groups: [DivisionGroup] = []
        for conference in conferences {
            for division in divisions {
                let inDivision = kits.filter {
                    $0.conference == conference && $0.division == division
                }
                if inDivision.isEmpty { continue }
                let byTeam = Dictionary(grouping: inDivision, by: { $0.teamId })
                var teams = byTeam.map { teamId, kits in
                    TeamGroup(
                        teamId: teamId,
                        teamName: kits[0].teamName,
                        kits: kits.sorted(by: compareKits)
                    )
                }
                teams.sort {
                    $0.teamName.localizedCaseInsensitiveCompare($1.teamName) == .orderedAscending
                }
                groups.append(DivisionGroup(conference: conference, division: division, teams: teams))
            }
        }
        return groups
    }
}

// The kind choices shown in the archive's filter bar, in display order (web's
// KIND_OPTIONS). `nil` represents "All kits".
enum UniformArchiveKindOption: CaseIterable, Identifiable {
    case all, home, away, throwback, alternate, colorRush

    var id: String {
        switch self {
        case .all: "all"
        case .home: "home"
        case .away: "away"
        case .throwback: "throwback"
        case .alternate: "alternate"
        case .colorRush: "colorRush"
        }
    }

    var label: String {
        switch self {
        case .all: "All kits"
        case .home: "Home"
        case .away: "Away"
        case .throwback: "Throwback"
        case .alternate: "Alternate"
        case .colorRush: "Color rush"
        }
    }

    var kind: UniformKind? {
        switch self {
        case .all: nil
        case .home: .home
        case .away: .away
        case .throwback: .throwback
        case .alternate: .alternate
        case .colorRush: .colorRush
        }
    }
}