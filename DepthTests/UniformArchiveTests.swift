import Testing
import SwiftUI
@testable import Depth

@MainActor
@Suite struct UniformPickerOrderingTests {
    private func kit(_ id: String, kind: UniformKind, current: Bool = true) -> Uniform {
        Uniform(
            id: id, teamId: "bills", kind: kind, name: id, yearStart: 2025,
            yearEnd: nil, isCurrent: current, colors: billsColors, imagePath: nil)
    }

    @Test func currentHomeAndAwayPrecedeAlternatesAndHistory() {
        let kits = [
            kit("old-home", kind: .home, current: false),
            kit("alternate", kind: .alternate), kit("away", kind: .away),
            kit("home", kind: .home), kit("throwback", kind: .throwback),
        ]
        let picker = UniformPickerSheet(
            uniforms: kits, teamName: "Buffalo Bills", selectedID: "old-home"
        ) { _ in }
        #expect(
            picker.uniforms.map(\.id) == ["home", "away", "alternate", "throwback", "old-home"])
    }

    @Test func samePriorityKitsKeepTheirSourceOrder() {
        let kits = [kit("second", kind: .alternate), kit("first", kind: .colorRush)]
        let picker = UniformPickerSheet(uniforms: kits, teamName: "Buffalo Bills", selectedID: nil)
        { _ in }
        #expect(picker.uniforms.map(\.id) == ["second", "first"])
    }
}

// Pure-rule tests for the uniform archive. The grouping/ordering rules mirror
// web/lib/uniforms/filter.ts (eraBucket/matchesFilters/compareKits/groupByDivision) so the
// two clients behave identically; the labeling, search, sort, and decade rules are tested here.
// Malformed and empty inputs degrade without throwing.

private let billsColors = TeamColors(
    primary: "#00338D", secondary: "#C60C30", accent: "#D50A0A"
)

private func listing(
    id: String,
    teamId: String = "bills",
    teamName: String = "Buffalo Bills",
    teamAbbrev: String = "BUF",
    teamShortName: String = "Bills",
    conference: String = "AFC",
    division: String = "East",
    kind: UniformKind = .home,
    name: String = "Home",
    yearStart: Int? = 2025,
    yearEnd: Int? = nil,
    isCurrent: Bool = true
) -> UniformListing {
    UniformListing(
        id: id, teamId: teamId, teamName: teamName, teamAbbrev: teamAbbrev,
        teamShortName: teamShortName, conference: conference, division: division,
        kind: kind, name: name, yearStart: yearStart, yearEnd: yearEnd,
        isCurrent: isCurrent, colors: billsColors, imagePath: nil
    )
}

private let bills = listing(id: "bills-home")
private let billsAway = listing(id: "bills-away", kind: .away, name: "Away")
private let jets = listing(
    id: "jets-home", teamId: "jets", teamName: "New York Jets", teamAbbrev: "NYJ",
    teamShortName: "Jets"
)

@Suite("Uniform artwork retry policy")
struct UniformArtworkRetryPolicyTests {
    @Test func retriesTheFirstFailureOnly() {
        #expect(UniformArtworkRetryPolicy.shouldRetry(after: 0))
        #expect(!UniformArtworkRetryPolicy.shouldRetry(after: 1))
    }
}

@Suite("UniformArchive eraBucket")
struct EraBucketTests {
    @Test func nilYearIsUndated() {
        #expect(UniformArchive.eraBucket(yearStart: nil) == "Undated")
    }

    @Test func bucketsByDecade() {
        #expect(UniformArchive.eraBucket(yearStart: 1976) == "1970s")
        #expect(UniformArchive.eraBucket(yearStart: 2001) == "2000s")
        #expect(UniformArchive.eraBucket(yearStart: 1999) == "1990s")
    }
}

@Suite("Uniform presentation")
struct UniformPresentationTests {
    @Test(arguments: [
        ("Buffalo Bills Home 2025–present", "Home"),
        ("Buffalo Bills Away 2025-present", "Away"),
        ("Buffalo Bills Home 2011–present", "Home 2011–present"),
        ("Buffalo Bills Historic Home", "Historic Home"),
        ("Buffalo Billsmen Home", "Buffalo Billsmen Home"),
        ("Boston Patriots Home", "Boston Patriots Home"),
        ("1976 Throwback", "1976 Throwback"),
        ("1960s Throwback", "1960s Throwback"),
        ("Rivalries 2025", "Rivalries 2025"),
        ("Creamsicle", "Creamsicle"),
        ("Buffalo Bills", "Home"),
        ("   ", "Home"),
    ])
    func namesPreserveDistinctiveAndConflictingContext(input: String, expected: String) {
        #expect(listing(id: "kit", name: input).presentation.title == expected)
    }

    @Test(arguments: [
        (1970 as Int?, 1976 as Int?, false, "1970–1976"),
        (1998, 2001, false, "1998–2001"),
        (2025, 2025, true, "2025"),
        (2012, nil, true, "2012–present"),
        (2012, nil, false, "From 2012 · end unknown"),
        (nil, 2001, false, "Through 2001 · start unknown"),
        (nil, nil, true, "Dates unknown"),
        (2025, 2020, false, "Dates unknown"),
    ])
    func datesDescribeKnownBounds(start: Int?, end: Int?, current: Bool, expected: String) {
        let kit = listing(id: "kit", yearStart: start, yearEnd: end, isCurrent: current)
        #expect(kit.presentation.dates == expected)
        #expect(kit.presentation.status == (current ? "Current" : "Retired"))
    }

    @Test func rangeSuffixOnlyDisappearsWhenItAgrees() {
        #expect(
            listing(id: "a", name: "Home 1998–2001", yearStart: 1998, yearEnd: 2001).presentation
                .title == "Home")
        #expect(
            listing(id: "a", name: "Home 2012–present", yearStart: 2012, isCurrent: false)
                .presentation.title == "Home 2012–present")
        #expect(
            listing(id: "a", name: "Home 2025–2020", yearStart: 2025, yearEnd: 2020).presentation
                .title == "Home 2025–2020")
    }

    @Test func kindAppearsOnlyWhenItAddsContext() {
        #expect(listing(id: "a").presentation.metadata == "Current")
        #expect(
            listing(id: "a", kind: .throwback, name: "1976 Throwback").presentation.metadata
                == "Current")
        #expect(
            listing(id: "a", kind: .throwback, name: "Creamsicle", isCurrent: false).presentation
                .metadata == "Throwback · Retired")
        #expect(
            listing(id: "a", kind: .home, name: "Homecoming").presentation.metadata
                == "Home · Current")
    }

    @Test func archiveAndPickerShareReadableLabels() {
        let kit = listing(id: "a", name: "Buffalo Bills Home 2025–present")
        let uniform = Uniform(
            id: kit.id, teamId: kit.teamId, kind: kit.kind, name: kit.name,
            yearStart: kit.yearStart, yearEnd: kit.yearEnd, isCurrent: kit.isCurrent,
            colors: kit.colors, imagePath: nil)
        let picker = UniformPresentation(uniform, teamName: kit.teamName)
        #expect(picker == kit.presentation)
        #expect(picker.accessibilityLabel == "Home, 2025–present, Current")
    }
}

@Suite("UniformArchive filters")
struct ArchiveFilterTests {
    @Test func noKindsSelectedMatchesEverything() {
        #expect(UniformArchive.matchesFilters(bills, UniformArchive.Filters()))
        #expect(UniformArchive.matchesFilters(billsAway, UniformArchive.Filters()))
    }

    @Test func kindIsMultiSelect() {
        let filters = UniformArchive.Filters(kinds: [.home, .throwback])
        #expect(UniformArchive.matchesFilters(bills, filters))
        #expect(!UniformArchive.matchesFilters(billsAway, filters))
    }

    @Test func currentOnlyExcludesRetiredKits() {
        let retired = listing(
            id: "a", kind: .throwback, yearStart: 1965, yearEnd: 1968, isCurrent: false)
        #expect(!UniformArchive.matchesFilters(retired, UniformArchive.Filters(currentOnly: true)))
        #expect(UniformArchive.matchesFilters(retired, UniformArchive.Filters()))
    }

    @Test func activeCountCountsSortAsAFilter() {
        #expect(UniformArchive.Filters().activeCount == 0)
        #expect(UniformArchive.Filters().isDefault)
        #expect(UniformArchive.Filters(kinds: [.home, .away]).activeCount == 2)
        #expect(UniformArchive.Filters(currentOnly: true, sort: .newest).activeCount == 2)
    }
}

@Suite("UniformArchive search")
struct ArchiveSearchTests {
    @Test func emptyQueryMatchesEverything() {
        #expect(UniformArchive.matchesTeam(bills, query: "   "))
        #expect(UniformArchive.matchesQuery(bills, query: "", teamMatches: true))
    }

    @Test func teamMatchesOnNameAbbrevAndDivision() {
        #expect(UniformArchive.matchesTeam(bills, query: "buffalo"))
        #expect(UniformArchive.matchesTeam(bills, query: "BUF"))
        #expect(UniformArchive.matchesTeam(bills, query: "afc east"))
        #expect(UniformArchive.matchesTeam(bills, query: "afc e"))
        #expect(!UniformArchive.matchesTeam(bills, query: "seahawks"))
    }

    /// A team hit keeps all of that team's kits — searching "Bills" returns the team,
    /// not only the kits whose own names contain "Bills".
    @Test func aTeamHitKeepsEveryKit() {
        #expect(UniformArchive.matchesQuery(billsAway, query: "buffalo", teamMatches: true))
        #expect(!UniformArchive.matchesQuery(billsAway, query: "buffalo", teamMatches: false))
    }

    @Test func kitMatchesOnNameKindDecadeAndYear() {
        let kit = listing(
            id: "a", kind: .throwback, name: "Creamsicle", yearStart: 1976, yearEnd: 1996)
        #expect(UniformArchive.matchesQuery(kit, query: "cream", teamMatches: false))
        #expect(UniformArchive.matchesQuery(kit, query: "throwback", teamMatches: false))
        #expect(UniformArchive.matchesQuery(kit, query: "1970s", teamMatches: false))
        #expect(UniformArchive.matchesQuery(kit, query: "1976", teamMatches: false))
        #expect(!UniformArchive.matchesQuery(kit, query: "1980s", teamMatches: false))
    }

    @Test func undatedKitsDoNotCrashOnAYearQuery() {
        let undated = listing(id: "a", name: "Mystery", yearStart: nil)
        #expect(!UniformArchive.matchesQuery(undated, query: "1970", teamMatches: false))
        #expect(UniformArchive.matchesQuery(undated, query: "undated", teamMatches: false))
    }
}

@Suite("UniformArchive sorting")
struct ArchiveSortTests {
    private let old = listing(
        id: "old", kind: .throwback, name: "Old", yearStart: 1965, yearEnd: 1970)
    private let mid = listing(
        id: "mid", kind: .alternate, name: "Mid", yearStart: 1995, yearEnd: 2000)

    @Test func kitOrderLeavesTheCallersOrderAlone() {
        let input = [mid, old, bills]
        #expect(UniformArchive.sortKits(input, by: .kit).map(\.id) == ["mid", "old", "bills-home"])
    }

    @Test func newestAndOldestOrderByStartYear() {
        let input = [mid, bills, old]
        #expect(
            UniformArchive.sortKits(input, by: .newest).map(\.id) == ["bills-home", "mid", "old"])
        #expect(
            UniformArchive.sortKits(input, by: .oldest).map(\.id) == ["old", "mid", "bills-home"])
    }

    @Test func undatedKitsSortLastOldestFirstAndFirstNewestFirst() {
        let undated = listing(id: "undated", yearStart: nil)
        #expect(
            UniformArchive.sortKits([undated, old], by: .oldest).map(\.id) == ["old", "undated"])
        #expect(
            UniformArchive.sortKits([undated, old], by: .newest).map(\.id) == ["old", "undated"])
    }

    @Test func emptyInputIsEmpty() {
        #expect(UniformArchive.sortKits([], by: .newest).isEmpty)
    }
}

@Suite("UniformArchive compareKits and grouping")
struct ArchiveGroupingTests {
    @Test func homeBeforeAwayBeforeAlternates() {
        #expect(UniformArchive.compareKits(bills, billsAway))
        #expect(!UniformArchive.compareKits(billsAway, bills))
    }

    @Test func groupsByDivisionAndOrdersTeamsByCity() {
        let groups = UniformArchive.groupByDivision([bills, billsAway, jets])
        #expect(groups.count == 1)
        #expect(groups[0].label == "AFC EAST")
        #expect(groups[0].teams.count == 2)
        #expect(groups[0].teams[0].teamName == "Buffalo Bills")
    }

    @Test func emptyInputYieldsNoGroups() {
        #expect(UniformArchive.groupByDivision([]).isEmpty)
    }

    @Test func teamKitsAreHomeFirst() {
        let groups = UniformArchive.groupByDivision([billsAway, bills])
        #expect(groups[0].teams[0].kits.first?.kind == .home)
    }

    @Test func teamGroupLabelsAndRepresentativeKit() {
        let team = UniformArchive.groupByDivision([billsAway, bills])[0].teams[0]
        #expect(team.divisionLabel == "AFC East")
        #expect(team.kitCountLabel == "2 kits")
        #expect(team.representativeKit.kind == .home)
    }

    /// The home kit can be filtered out from under a card; the first surviving kit stands
    /// in rather than the card losing its artwork.
    @Test func representativeKitFallsBackWhenHomeIsFiltered() {
        let team = UniformArchive.groupByDivision([billsAway])[0].teams[0]
        #expect(team.representativeKit.id == "bills-away")
    }

    @Test func singleKitTeamIsNotPluralised() {
        let team = UniformArchive.groupByDivision([bills])[0].teams[0]
        #expect(team.kitCountLabel == "1 kit")
    }
}

@Suite("UniformArchive groupByDecade")
struct ArchiveDecadeTests {
    private let sixties = listing(id: "a", kind: .throwback, yearStart: 1965, yearEnd: 1970)
    private let seventies = listing(
        id: "b", teamId: "jets", teamAbbrev: "NYJ", kind: .throwback, yearStart: 1976, yearEnd: 1980
    )
    private let undated = listing(id: "c", yearStart: nil)

    @Test func decadesAscendingWithUndatedLast() {
        let groups = UniformArchive.groupByDecade([undated, seventies, sixties], sort: .kit)
        #expect(groups.map(\.label) == ["1960s", "1970s", "Undated"])
        #expect(groups[0].countLabel == "1 kit")
    }

    /// `.kit` has no meaning across teams — there is no single team's home/away sequence
    /// to preserve — so a decade row falls back to alphabetical by team.
    @Test func kitOrderFallsBackToTeamAbbreviation() {
        let earlierAlphabetically = listing(id: "d", teamAbbrev: "ATL", yearStart: 1978)
        let groups = UniformArchive.groupByDecade([seventies, earlierAlphabetically], sort: .kit)
        #expect(groups[0].kits.map(\.teamAbbrev) == ["ATL", "NYJ"])
    }

    @Test func explicitSortsApplyWithinADecade() {
        let later = listing(id: "d", teamAbbrev: "ATL", yearStart: 1978)
        let groups = UniformArchive.groupByDecade([later, seventies], sort: .oldest)
        #expect(groups[0].kits.map(\.id) == ["b", "d"])
    }

    @Test func emptyInputYieldsNoDecades() {
        #expect(UniformArchive.groupByDecade([], sort: .kit).isEmpty)
    }
}

/// Only `listUniforms` is exercised by the archive; the rest of the seam is unreachable
/// from this screen and fails loudly rather than returning plausible empty data.
private struct StubUniformRepository: DepthRepository {
    var listings: [UniformListing] = []
    var failure: DepthError?
    var combinations: [String: [UniformCombination]] = [:]
    var combinationsFailure: DepthError?

    func listUniforms() async throws -> [UniformListing] {
        if let failure { throw failure }
        return listings
    }

    func uniformCombinations() async throws -> [String: [UniformCombination]] {
        if let combinationsFailure { throw combinationsFailure }
        return combinations
    }

    func teams() async throws -> [Team] { throw DepthError.server("unused") }
    func teamSnapshot(teamId: String) async throws -> TeamSnapshot {
        throw DepthError.server("unused")
    }
    func teamSeason(teamId: String, season: Int) async throws -> TeamSnapshot {
        throw DepthError.server("unused")
    }
    func teamSchedule(teamId: String, season: Int?) async throws -> TeamSchedule {
        throw DepthError.server("unused")
    }
    func playerStats(playerId: String, teamId: String?) async throws -> [PlayerSeasonStats] {
        throw DepthError.server("unused")
    }
    func teamStats(teamId: String) async throws -> TeamStatsPage {
        throw DepthError.server("unused")
    }
    func appConfig() async throws -> AppConfig { throw DepthError.server("unused") }
}

@MainActor
@Suite("UniformArchiveViewModel")
struct UniformArchiveViewModelTests {
    private let allKits = [bills, billsAway, jets]

    private func loaded(_ listings: [UniformListing]) async -> UniformArchiveViewModel {
        let model = UniformArchiveViewModel(repository: StubUniformRepository(listings: listings))
        await model.load()
        return model
    }

    @Test func loadedCombinationsJoinTheKitsOwnFigure() async {
        let extra = UniformCombination(key: "white-pants", label: "White pants", fullURL: nil)
        let model = UniformArchiveViewModel(
            repository: StubUniformRepository(
                listings: allKits, combinations: [bills.id: [extra]]))
        await model.load()
        await model.loadCombinations()
        #expect(model.combinationOptions(for: bills).map(\.key) == ["canonical", "white-pants"])
        #expect(model.combinationOptions(for: jets).count == 1)
    }

    @Test func aCombinationsFailureLeavesOnlyTheKitsOwnFigure() async {
        let model = UniformArchiveViewModel(
            repository: StubUniformRepository(listings: allKits, combinationsFailure: .offline))
        await model.load()
        await model.loadCombinations()
        #expect(model.loadState == .loaded)
        #expect(model.combinationOptions(for: bills).count == 1)
    }

    @Test func aKitStaysReachableWhenFiltersHideIt() async {
        let model = await loaded(allKits)
        model.filters.kinds = [.away]
        #expect(model.team(id: jets.teamId) == nil)
        #expect(model.kit(id: jets.id) == jets)
    }

    @Test func loadFailureIsSurfacedNotSwallowed() async {
        let model = UniformArchiveViewModel(
            repository: StubUniformRepository(failure: .offline)
        )
        await model.load()
        #expect(model.loadState == .failed(.offline))
        // An empty archive behind a *failure* must not read as "nothing matches".
        #expect(!model.isEmpty)
    }

    @Test func pristineSummaryNamesWhatTheCurrentModeMakesTappable() async {
        let model = await loaded(allKits)
        #expect(model.summary == "3 kits · 2 teams · tap a team")
        model.viewMode = .era
        #expect(model.summary == "3 kits · 2 teams · tap a kit")
    }

    @Test func narrowedSummaryDropsTheHint() async {
        let model = await loaded(allKits)
        model.filters.kinds = [.away]
        #expect(model.summary == "1 kit · 1 team")
        #expect(model.applyLabel == "Show 1 kit")
    }

    @Test func applyLabelUsesSingularForOnePristineKit() async {
        let model = await loaded([bills])
        #expect(model.applyLabel == "Show all 1 kit")
    }

    @Test func applyLabelUsesPluralForNoResults() async {
        let model = await loaded(allKits)
        model.query = "no matching team"
        #expect(model.applyLabel == "Show 0 kits")
    }

    @Test func pristineApplyLabelSaysAll() async {
        let model = await loaded(allKits)
        #expect(model.applyLabel == "Show all 3 kits")
    }

    /// Search and filters compose: a team-name hit keeps that team's kits, and a kind
    /// filter still narrows within it.
    @Test func searchAndFiltersCompose() async {
        let model = await loaded(allKits)
        model.query = "buffalo"
        #expect(model.shownKitCount == 2)
        model.filters.kinds = [.home]
        #expect(model.shownKitCount == 1)
        #expect(model.team(id: "bills")?.kits.map(\.id) == ["bills-home"])
    }

    @Test func emptyIsOnlyEmptyOnceLoaded() async {
        let model = await loaded(allKits)
        model.query = "zzz"
        #expect(model.isEmpty)
        #expect(model.groups.isEmpty)
        #expect(model.decades.isEmpty)
    }

    @Test func kindCountsAreOfTheWholeArchiveNotTheFilteredSet() async {
        let model = await loaded(allKits)
        model.filters.kinds = [.away]
        #expect(model.kindCounts[.home] == 2)
        #expect(model.kindCounts[.away] == 1)
    }

    @Test func resetAllClearsSearchAsWellAsFilters() async {
        let model = await loaded(allKits)
        model.query = "zzz"
        model.filters.kinds = [.away]
        model.resetAll()
        #expect(!model.hasQuery)
        #expect(model.filters.isDefault)
        #expect(model.shownKitCount == 3)
    }

    /// A drill-in whose team is filtered out from under it resolves to nil rather than
    /// a stale snapshot — the pushed screen shows its own explanation.
    @Test func teamLookupFollowsTheLiveFilters() async {
        let model = await loaded(allKits)
        #expect(model.team(id: "jets") != nil)
        model.filters.kinds = [.away]
        #expect(model.team(id: "jets") == nil)
    }
}

@Suite struct UniformTeamSectionsTests {
    @Test func rotationHoldsOnlyCurrentKitsInHomeAwayOrder() {
        let sections = UniformArchive.teamSections([
            listing(id: "alt", kind: .alternate, name: "Rivalries"),
            listing(id: "old-home", yearStart: 2020, yearEnd: 2025, isCurrent: false),
            listing(id: "away", kind: .away, name: "Away"),
            listing(id: "home"),
        ])
        #expect(sections.inRotation.map(\.id) == ["home", "away", "alt"])
    }

    @Test func pastKitsGroupByStartDecadeNewestFirstWithUndatedLast() {
        let sections = UniformArchive.teamSections([
            listing(id: "home"),
            listing(id: "undated", yearStart: nil, yearEnd: nil, isCurrent: false),
            listing(
                id: "crush", kind: .throwback, name: "Orange Crush", yearStart: 1968,
                yearEnd: 1996, isCurrent: false),
            listing(
                id: "away-2018", kind: .away, name: "Away", yearStart: 2018, yearEnd: 2025,
                isCurrent: false),
            listing(id: "home-2018", yearStart: 2018, yearEnd: 2025, isCurrent: false),
            listing(
                id: "blue", kind: .alternate, name: "Blue", yearStart: 2025, yearEnd: 2025,
                isCurrent: false),
        ])
        #expect(sections.past.map(\.label) == ["2020s", "2010s", "1960s", "Undated"])
        #expect(sections.past[1].kits.map(\.id) == ["home-2018", "away-2018"])
    }

    @Test func aTeamWithNoPastKitsHasNoDecades() {
        #expect(UniformArchive.teamSections([listing(id: "home")]).past.isEmpty)
    }

    @Test func rotationDatesShowTheStartYearAlone() {
        #expect(listing(id: "home", yearStart: 2026).rotationDates == "2026")
        #expect(listing(id: "undated", yearStart: nil).rotationDates == "Dates unknown")
    }

    @Test func combinationOptionsPutTheCanonicalFigureFirst() {
        let extra = UniformCombination(
            key: "bone-pants", label: "Bone pants",
            fullURL: URL(string: "https://example.com/rams-home-2020--bone-pants-full.webp"))
        let options = UniformArchive.combinationOptions(
            for: listing(id: "rams-home-2020"), extra: [extra])
        #expect(options.map(\.label) == ["Standard", "Bone pants"])
        #expect(options[0].fullURL == UniformArt.fullURL(for: "rams-home-2020"))
    }

    @Test func aKitWithNoExtrasHasOneOption() {
        #expect(UniformArchive.combinationOptions(for: listing(id: "home"), extra: []).count == 1)
    }
}

@Suite struct UniformManifestMapperTests {
    @Test func mapsEachRowsCombinationsToAbsoluteArtURLs() throws {
        let json = """
            {"version":1,"revision":"x","rows":[
              {"catalogId":"rams-home-2020","combinations":[
                {"key":"bone-pants","label":"Bone pants",
                 "full":{"path":"/uniforms/rams-home-2020--bone-pants-full.webp","sha256":"a"}}]},
              {"catalogId":"rams-away-2026-2026"}
            ]}
            """
        let map = try UniformManifestMapper.combinations(from: Data(json.utf8))
        #expect(map.keys.sorted() == ["rams-home-2020"])
        #expect(map["rams-home-2020"]?.first?.label == "Bone pants")
        #expect(
            map["rams-home-2020"]?.first?.fullURL?.absoluteString
                == "https://sticks.cooper-harris.site/uniforms/rams-home-2020--bone-pants-full.webp"
        )
    }

    @Test func skipsCombinationsWhosePathIsNotOriginRelative() throws {
        let json = """
            {"rows":[{"catalogId":"a","combinations":[
              {"key":"x","label":"X","full":{"path":"https://evil.example/x.webp"}},
              {"key":"y","label":"Y"}]}]}
            """
        #expect(try UniformManifestMapper.combinations(from: Data(json.utf8)).isEmpty)
    }

    @Test func aMistypedRowOrCombinationDoesNotDropTheRest() throws {
        let json = """
            {"rows":[
              {"catalogId":7,"combinations":"nope"},
              {"catalogId":"b","combinations":[
                {"key":1,"label":"Bad"},
                {"key":"ok","label":"OK","full":{"path":"/uniforms/b--ok-full.webp"}}]}]}
            """
        let map = try UniformManifestMapper.combinations(from: Data(json.utf8))
        #expect(map.keys.sorted() == ["b"])
        #expect(map["b"]?.map(\.key) == ["ok"])
    }
}
