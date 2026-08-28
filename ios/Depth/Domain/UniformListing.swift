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

// Mirrors lib/roster-source.ts's UniformListing: a kit plus the team context the archive
// groups, searches and labels by — dead flat, exactly the web's `listUniforms()` shape.
// `teamAbbrev`/`teamShortName` are carried on the row rather than derived in the view:
// the archive v2 design keys its team cards and era cells off the abbreviation, and
// splitting a nickname back out of `teamName` in the UI would re-derive data the join
// already had.
struct UniformListing: Codable, Equatable, Identifiable {
    let id: String
    let teamId: String
    let teamName: String
    let teamAbbrev: String
    /// The nickname alone ("Seahawks") — `teams.name`, not a substring of `teamName`.
    let teamShortName: String
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

// Pure archive rules — the native twins of lib/uniforms/filter.ts plus the labelling and
// search logic the v2 archive design (Uniform Archive v2, 2026-08-27) added on top:
// decade bucketing for the "By era" mode, a free-text query that matches teams and kits
// together, three sort orders, and the year/season strings the kit rows and detail sheet
// render. All of it lives here so it is unit-testable without a UI and can't drift
// between the archive tab, the team drill-in, and the detail sheet.
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

    /// Kind chips in display order (design's KIND_ORDER).
    static let kindOrder: [UniformKind] = [.home, .away, .throwback, .alternate, .colorRush]

    static func eraBucket(yearStart: Int?) -> String {
        guard let yearStart else { return "Undated" }
        return "\((yearStart / 10) * 10)s"
    }

    // MARK: - Labels

    /// Compact year range for dense cells ("1970–76", "2025–", "1998–2001").
    static func years(_ kit: UniformListing) -> String {
        guard let start = kit.yearStart else { return "—" }
        guard let end = kit.yearEnd else { return "\(start)–" }
        if end == start { return "\(start)" }
        let sameCentury = end / 100 == start / 100
        return sameCentury ? "\(start)–\(String(end).suffix(2))" : "\(start)–\(end)"
    }

    /// Full year range for the detail sheet, where there is room for both centuries.
    static func yearsLong(_ kit: UniformListing) -> String {
        guard let start = kit.yearStart else { return "—" }
        guard let end = kit.yearEnd else { return "\(start)–" }
        return end == start ? "\(start)" : "\(start)–\(end)"
    }

    /// Season math only where both ends are real. An open-ended throwback's start year is
    /// the era it recreates, not a first-worn date — counting seasons from it would
    /// invent a fact ("1923 Throwback · 103 seasons"), so open-ended kits state status.
    static func spanLabel(_ kit: UniformListing) -> String {
        guard let start = kit.yearStart else { return "Undated" }
        guard let end = kit.yearEnd else {
            return kit.kind == .throwback ? "Recreates the \(start) kit" : "Still in rotation"
        }
        let seasons = max(1, end - start)
        return "\(seasons) \(seasons == 1 ? "season" : "seasons"), retired \(end)"
    }

    /// The compact era cell drops a leading year from the name — the year label right
    /// below already carries it ("1976 Throwback" + "1976–2001" says the same thing
    /// twice).
    static func shortKitName(_ name: String) -> String {
        guard let space = name.firstIndex(of: " ") else { return name }
        let head = name[name.startIndex..<space]
        let digits = head.hasSuffix("s") ? head.dropLast() : head[...]
        let isYearToken = digits.allSatisfy(\.isNumber)
            && (digits.count == 4 || (digits.count == 2 && head.hasSuffix("s")))
        guard isYearToken else { return name }
        return String(name[name.index(after: space)...])
    }

    static func kindLabel(_ kind: UniformKind) -> String {
        switch kind {
        case .home: "HOME"
        case .away: "AWAY"
        case .throwback: "THROWBACK"
        case .alternate: "ALTERNATE"
        case .colorRush: "COLOR RUSH"
        }
    }

    /// Sentence-case name for the filter chips, where the label is read as a word rather
    /// than as a badge.
    static func kindChipLabel(_ kind: UniformKind) -> String {
        switch kind {
        case .home: "Home"
        case .away: "Away"
        case .throwback: "Throwback"
        case .alternate: "Alternate"
        case .colorRush: "Color Rush"
        }
    }

    // MARK: - Filtering, search, sort

    enum SortOrder: String, CaseIterable, Identifiable {
        /// Home, away, then alternates — the archive's own order, and the default.
        case kit
        case newest
        case oldest

        var id: String { rawValue }

        var label: String {
            switch self {
            case .kit: "Kit order"
            case .newest: "Newest first"
            case .oldest: "Oldest first"
            }
        }

        var hint: String {
            switch self {
            case .kit: "Home, away, then alternates"
            case .newest: "Most recently introduced"
            case .oldest: "Longest-running kits"
            }
        }
    }

    /// v2 (2026-08-27 archive redesign): kind became multi-select and sort moved in from
    /// the top bar; the single-decade `era` filter is gone because "By era" is now a whole
    /// view mode rather than a filter value. `query` is deliberately *not* here — search
    /// is always-visible top-bar state, not something the Filters sheet resets or counts.
    struct Filters: Equatable {
        var kinds: Set<UniformKind> = []
        var currentOnly = false
        var sort: SortOrder = .kit

        var isDefault: Bool { self == Filters() }

        /// Drives the Filters button's badge — the only always-visible signal that a
        /// filter is on, so it must count every non-default choice including sort.
        var activeCount: Int {
            kinds.count + (currentOnly ? 1 : 0) + (sort == .kit ? 0 : 1)
        }
    }

    /// Whether a kit survives the Filters sheet's choices. Search is applied separately
    /// (`matchesQuery`) because a query that matches the *team* keeps all of its kits.
    static func matchesFilters(_ kit: UniformListing, _ filters: Filters) -> Bool {
        if !filters.kinds.isEmpty && !filters.kinds.contains(kit.kind) { return false }
        if filters.currentOnly && !kit.isCurrent { return false }
        return true
    }

    static func matchesTeam(_ kit: UniformListing, query: String) -> Bool {
        let q = normalized(query)
        guard !q.isEmpty else { return true }
        let divisionTerms = "\(kit.conference) \(kit.division) \(kit.conference) \(divisionInitial(kit.division))"
        return kit.teamName.lowercased().contains(q)
            || kit.teamAbbrev.lowercased().contains(q)
            || divisionTerms.lowercased().contains(q)
    }

    /// A kit matches a query on its own name, its kind, its decade, or its start year.
    /// Callers pass `teamMatches: true` when the query already matched the team, so
    /// searching "Seahawks" returns the whole team rather than only its "Seahawks"-named
    /// kits.
    static func matchesQuery(_ kit: UniformListing, query: String, teamMatches: Bool) -> Bool {
        let q = normalized(query)
        if q.isEmpty || teamMatches { return true }
        return kit.name.lowercased().contains(q)
            || kindLabel(kit.kind).lowercased().contains(q)
            || eraBucket(yearStart: kit.yearStart).lowercased().contains(q)
            || (kit.yearStart.map { String($0).contains(q) } ?? false)
    }

    private static func normalized(_ query: String) -> String {
        query.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
    }

    private static func divisionInitial(_ division: String) -> String {
        String(division.prefix(1))
    }

    static func compareKits(_ a: UniformListing, _ b: UniformListing) -> Bool {
        let ar = kindRank[a.kind] ?? 2
        let br = kindRank[b.kind] ?? 2
        return ar != br ? ar < br : a.name.localizedCaseInsensitiveCompare(b.name) == .orderedAscending
    }

    /// `.kit` leaves the caller's existing order alone — it is already home → away → rest
    /// from `groupByDivision`, and re-sorting would undo the name tiebreak.
    static func sortKits(_ kits: [UniformListing], by order: SortOrder) -> [UniformListing] {
        switch order {
        case .kit: kits
        case .newest: kits.sorted { ($0.yearStart ?? 0) > ($1.yearStart ?? 0) }
        case .oldest: kits.sorted { ($0.yearStart ?? 9999) < ($1.yearStart ?? 9999) }
        }
    }

    // MARK: - Grouping

    struct TeamGroup: Equatable, Identifiable {
        let teamId: String
        let teamName: String
        let teamAbbrev: String
        let teamShortName: String
        let conference: String
        let division: String
        var kits: [UniformListing]

        var id: String { teamId }

        var divisionLabel: String { "\(conference) \(division)" }

        var kitCountLabel: String { "\(kits.count) \(kits.count == 1 ? "kit" : "kits")" }

        /// The kit whose colors and jersey art stand in for the team on its card: its
        /// home kit, or the first kit surviving the filters if home was filtered out.
        var representativeKit: UniformListing { kits.first(where: { $0.kind == .home }) ?? kits[0] }
    }

    struct DivisionGroup: Equatable, Identifiable {
        let conference: String
        let division: String
        var teams: [TeamGroup]

        var id: String { "\(conference)-\(division)" }

        /// "AFC EAST" — the section header.
        var label: String { "\(conference) \(division.uppercased())" }
    }

    struct DecadeGroup: Equatable, Identifiable {
        /// The decade's first year, or `nil` for the undated bucket (sorted last).
        let decade: Int?
        var kits: [UniformListing]

        var id: String { decade.map(String.init) ?? "undated" }

        var label: String { decade.map { "\($0)s" } ?? "Undated" }

        var countLabel: String { "\(kits.count) \(kits.count == 1 ? "kit" : "kits")" }
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
                        teamAbbrev: kits[0].teamAbbrev,
                        teamShortName: kits[0].teamShortName,
                        conference: conference,
                        division: division,
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

    /// "By era" mode: every surviving kit bucketed by the decade it was introduced,
    /// decades ascending with the undated bucket last. `.kit` sort has no meaning across
    /// teams here (there is no single team's home/away sequence to preserve), so it falls
    /// back to alphabetical-by-team — the design's own rule for the decade rows.
    static func groupByDecade(_ kits: [UniformListing], sort: SortOrder) -> [DecadeGroup] {
        let buckets = Dictionary(grouping: kits) { kit in
            kit.yearStart.map { ($0 / 10) * 10 }
        }
        return buckets
            .map { decade, kits in
                DecadeGroup(
                    decade: decade,
                    kits: sort == .kit
                        ? kits.sorted { $0.teamAbbrev < $1.teamAbbrev }
                        : sortKits(kits, by: sort)
                )
            }
            .sorted { ($0.decade ?? .max) < ($1.decade ?? .max) }
    }
}
