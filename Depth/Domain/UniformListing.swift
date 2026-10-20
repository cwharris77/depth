import Foundation

#if canImport(FoundationNetworking)
    import FoundationNetworking
#endif

// Mirrors web/lib/uniforms/art.tsx's uniformArtURL and uniformArtFullURL. Web art resolves
// origin-relative so local dev/preview serve the committed rasters; iOS can't
// use a relative URL — URLSession needs an absolute one — so this pins the same scheme
// to the canonical production origin (the branded domain, not the generated alias).
// The archive shows the `-full` mannequin raster (helmet → cleats); the picker shows
// the plain jersey crop (`<id>.webp`) — the same two kinds of artifact the web
// generator emits.
enum UniformArt {
    static let origin = "https://sticks.cooper-harris.site"
    static let baseURL = "\(origin)/uniforms"

    /// The published artifact manifest, which lists each design's extra verified
    /// combinations (web/lib/uniforms/manifest.ts).
    static let manifestURL = URL(string: "\(baseURL)/manifest.json")

    static func jerseyURL(for id: String) -> URL? {
        URL(string: "\(baseURL)/\(id).webp")
    }

    static func fullURL(for id: String) -> URL? {
        URL(string: "\(baseURL)/\(id)-full.webp")
    }

    /// How many items past the current one get warmed — enough to stay ahead of a flick
    /// without pulling the whole archive over the network.
    static let prefetchLookahead = 10

    /// The art URLs for the `lookahead` items after `index`, clamped to the list and with
    /// missing URLs dropped. The window is positional, so a nil entry doesn't pull in an
    /// extra item from further out.
    static func upcoming(
        after index: Int, in urls: [URL?], lookahead: Int = prefetchLookahead
    ) -> [URL] {
        let start = index + 1
        guard start < urls.count, lookahead > 0 else { return [] }
        return urls[start..<min(urls.count, start + lookahead)].compactMap { $0 }
    }

    /// Warms the HTTP cache `AsyncImage` reads, one request at a time and stopping as soon
    /// as the calling task is cancelled (a cell scrolling away cancels its `.task`).
    /// Anything already cached is skipped, so it never re-fetches what a visible cell loaded.
    static func prefetch(
        _ urls: [URL],
        fetch: (URL) async -> Void = { url in
            _ = try? await URLSession.shared.data(for: URLRequest(url: url))
        },
        isCached: (URL) -> Bool = { url in
            URLCache.shared.cachedResponse(for: URLRequest(url: url)) != nil
        }
    ) async {
        for url in urls {
            if Task.isCancelled { return }
            if isCached(url) { continue }
            await fetch(url)
        }
    }

    /// Drops the HTTP-cached copy of these kits' art so the next load re-fetches it. The art is
    /// served with a one-hour lifetime and `AsyncImage` reads `URLCache.shared`, so a
    /// user-initiated refresh has to evict it explicitly.
    static func removeCachedArt(for ids: [String], from cache: URLCache = .shared) {
        for id in ids {
            for url in [jerseyURL(for: id), fullURL(for: id)].compactMap({ $0 }) {
                cache.removeCachedResponse(for: URLRequest(url: url))
            }
        }
    }
}

// Mirrors web/lib/roster-source.ts's UniformListing: a kit plus the team context the archive
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

// Pure archive rules — the native twins of web/lib/uniforms/filter.ts plus the labelling and
// search logic the archive adds on top:
// decade bucketing for the "By era" mode, a free-text query that matches teams and kits
// together, three sort orders, and the year/season strings the kit rows and detail sheet
// render. All of it lives here so it is unit-testable without a UI and can't drift
// between the archive tab, the team drill-in, and the detail sheet.
enum UniformArchive {
    // Per-team kit order: home first, away second, then everything else. The rest share
    // rank 2 and break ties by name, so the
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

    /// The two team colors behind a uniform's full figure: `edge` frames the hero and
    /// `center` sits directly behind the figure. The figure is mostly the jersey body
    /// (`primary`), so the center takes the first of the kit's other colors that separates
    /// from it, and stays `primary` only when neither does.
    static func heroGround(_ colors: TeamColors) -> (edge: String, center: String) {
        let center =
            [colors.secondary, colors.accent]
            .first { contrastRatio($0, colors.primary) >= heroSeparationMin } ?? colors.primary
        return (colors.primary, center)
    }

    /// Graphical-object contrast (WCAG 1.4.11) between the figure's body and what sits
    /// behind it.
    private static let heroSeparationMin = 3.0

    static func eraBucket(yearStart: Int?) -> String {
        guard let yearStart else { return "Undated" }
        return "\((yearStart / 10) * 10)s"
    }

    // MARK: - Labels

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

    /// Kind is multi-select and sort is part of the filter state; the single-decade `era`
    /// filter is gone because "By era" is now a whole
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
        let divisionTerms =
            "\(kit.conference) \(kit.division) \(kit.conference) \(divisionInitial(kit.division))"
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
        return ar != br
            ? ar < br : a.name.localizedCaseInsensitiveCompare(b.name) == .orderedAscending
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
        /// newest home kit (current before retired, then latest first season), or the first
        /// kit surviving the filters if every home was filtered out.
        var representativeKit: UniformListing {
            kits.filter { $0.kind == .home }.max {
                ($0.isCurrent ? 1 : 0, $0.yearStart ?? Int.min)
                    < ($1.isCurrent ? 1 : 0, $1.yearStart ?? Int.min)
            } ?? kits[0]
        }
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
    // web/lib/uniforms/filter.ts groupByDivision. Teams identical on the two axes sort by
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
                groups.append(
                    DivisionGroup(conference: conference, division: division, teams: teams))
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
        return
            buckets
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

/// Shared display rules for archive listings and the team's uniform picker.
struct UniformPresentation: Equatable {
    let title: String
    let dates: String
    let status: String
    let kindLabel: String?

    var metadata: String {
        [kindLabel, status].compactMap { $0 }.joined(separator: " · ")
    }

    var accessibilityLabel: String {
        [title, kindLabel, dates, status].compactMap { $0 }.joined(separator: ", ")
    }

    init(
        name: String, teamName: String, kind: UniformKind, yearStart: Int?, yearEnd: Int?,
        isCurrent: Bool
    ) {
        var title = name.trimmingCharacters(in: .whitespacesAndNewlines)
        if !teamName.isEmpty, title == teamName {
            title = ""
        } else if !teamName.isEmpty, title.hasPrefix(teamName + " ") {
            title = String(title.dropFirst(teamName.count + 1))
        }
        if let start = yearStart, yearEnd.map({ $0 >= start }) ?? isCurrent {
            let end = yearEnd.map(String.init) ?? "present"
            for separator in ["–", "-"] {
                let suffix = " \(start)\(separator)\(end)"
                if title.hasSuffix(suffix) {
                    title = String(title.dropLast(suffix.count))
                    break
                }
            }
        }
        title = title.trimmingCharacters(in: .whitespacesAndNewlines)
        let kindName = UniformArchive.kindChipLabel(kind)
        self.title = title.isEmpty ? kindName : title
        let words = self.title.lowercased().split(whereSeparator: { !$0.isLetter && !$0.isNumber })
            .map(String.init)
        let kindWords = kindName.lowercased().split(separator: " ").map(String.init)
        let containsKind =
            words.count >= kindWords.count
            && (0...(words.count - kindWords.count)).contains {
                Array(words[$0..<($0 + kindWords.count)]) == kindWords
            }
        kindLabel = containsKind ? nil : kindName
        status = isCurrent ? "Current" : "Retired"
        switch (yearStart, yearEnd) {
        case let (start?, end?) where end >= start:
            dates = start == end ? "\(start)" : "\(start)–\(end)"
        case (_?, _?):
            dates = "Dates unknown"
        case let (start?, nil):
            dates = isCurrent ? "\(start)–present" : "From \(start) · end unknown"
        case let (nil, end?):
            dates = "Through \(end) · start unknown"
        case (nil, nil):
            dates = "Dates unknown"
        }
    }

    init(_ uniform: Uniform, teamName: String) {
        self.init(
            name: uniform.name, teamName: teamName, kind: uniform.kind,
            yearStart: uniform.yearStart, yearEnd: uniform.yearEnd, isCurrent: uniform.isCurrent)
    }
}

extension UniformListing {
    var presentation: UniformPresentation {
        UniformPresentation(
            name: name, teamName: teamName, kind: kind,
            yearStart: yearStart, yearEnd: yearEnd, isCurrent: isCurrent)
    }
}

/// One verified way a design was worn: the same jersey with a different helmet, pants or
/// socks. The archive lists a design once; its combinations live only on its detail page.
struct UniformCombination: Equatable, Identifiable, Sendable {
    let key: String
    let label: String
    let fullURL: URL?

    var id: String { key }
}

extension UniformListing {
    /// A uniform in rotation shows only the year it started; its tier already says it is
    /// still worn, so an open-ended range would repeat that.
    var rotationDates: String {
        yearStart.map(String.init) ?? presentation.dates
    }
}

extension UniformArchive {
    /// A team's page: every uniform in rotation, then the rest by the decade they were
    /// first worn.
    struct TeamSections: Equatable {
        let inRotation: [UniformListing]
        let past: [DecadeGroup]
    }

    /// Kits in rotation keep home → away → rest order. Retired kits are grouped by the
    /// decade of their first wearing year, newest decade first, undated last.
    static func teamSections(_ kits: [UniformListing]) -> TeamSections {
        let inRotation = kits.filter(\.isCurrent).sorted(by: compareKits)
        let byDecade = Dictionary(grouping: kits.filter { !$0.isCurrent }) { kit in
            kit.yearStart.map { ($0 / 10) * 10 }
        }
        let past =
            byDecade
            .map { DecadeGroup(decade: $0.key, kits: $0.value.sorted(by: compareKits)) }
            .sorted { ($0.decade ?? .min) > ($1.decade ?? .min) }
        return TeamSections(inRotation: inRotation, past: past)
    }

    static let canonicalCombinationKey = "canonical"

    /// The design's own figure first, then each extra verified combination.
    static func combinationOptions(
        for kit: UniformListing, extra: [UniformCombination]
    ) -> [UniformCombination] {
        [
            UniformCombination(
                key: canonicalCombinationKey, label: "Standard",
                fullURL: UniformArt.fullURL(for: kit.id))
        ] + extra
    }
}
