import Testing
@testable import Depth

// Pure-rule tests for the uniform archive. The grouping/ordering rules mirror
// lib/uniforms/filter.ts (eraBucket/matchesFilters/compareKits/groupByDivision) so the
// two clients behave identically; the labelling, search, sort and decade rules are the
// 2026-08-27 archive v2 design's own. Malformed/empty cases included throughout, per the
// house "untrusted input degrades, never throws" invariant.

private let billsColors = TeamColors(
    primary: "#00338D", secondary: "#C60C30", accent: "#D50A0A",
    uiAccent: "#4D8BFF", onAccent: "#0a0e1a"
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

@Suite("UniformArchive year labels")
struct YearLabelTests {
    @Test func compactRangeAbbreviatesWithinACentury() {
        #expect(UniformArchive.years(listing(id: "a", yearStart: 1970, yearEnd: 1976)) == "1970–76")
    }

    @Test func compactRangeKeepsBothCenturiesWhenTheyDiffer() {
        #expect(UniformArchive.years(listing(id: "a", yearStart: 1998, yearEnd: 2001)) == "1998–2001")
    }

    @Test func openEndedAndSingleSeasonAndUndated() {
        #expect(UniformArchive.years(listing(id: "a", yearStart: 2025, yearEnd: nil)) == "2025–")
        #expect(UniformArchive.years(listing(id: "a", yearStart: 1994, yearEnd: 1994)) == "1994")
        #expect(UniformArchive.years(listing(id: "a", yearStart: nil, yearEnd: nil)) == "—")
    }

    @Test func longRangeNeverAbbreviates() {
        #expect(UniformArchive.yearsLong(listing(id: "a", yearStart: 1970, yearEnd: 1976)) == "1970–1976")
        #expect(UniformArchive.yearsLong(listing(id: "a", yearStart: nil, yearEnd: nil)) == "—")
    }
}

@Suite("UniformArchive spanLabel")
struct SpanLabelTests {
    @Test func retiredKitsCountSeasons() {
        #expect(
            UniformArchive.spanLabel(listing(id: "a", yearStart: 1970, yearEnd: 1976, isCurrent: false))
                == "6 seasons, retired 1976"
        )
    }

    @Test func aSingleSeasonIsNotPluralised() {
        #expect(
            UniformArchive.spanLabel(listing(id: "a", yearStart: 1994, yearEnd: 1994, isCurrent: false))
                == "1 season, retired 1994"
        )
    }

    /// An open-ended throwback's start year is the era it recreates, not a first-worn
    /// date — counting seasons from it would invent a fact.
    @Test func openEndedThrowbackStatesWhatItRecreates() {
        let throwback = listing(id: "a", kind: .throwback, yearStart: 1923, yearEnd: nil)
        #expect(UniformArchive.spanLabel(throwback) == "Recreates the 1923 kit")
    }

    @Test func openEndedCurrentKitStatesRotation() {
        #expect(UniformArchive.spanLabel(bills) == "Still in rotation")
    }

    @Test func undatedDegradesRatherThanCalculating() {
        #expect(UniformArchive.spanLabel(listing(id: "a", yearStart: nil)) == "Undated")
    }
}

@Suite("UniformArchive shortKitName")
struct ShortKitNameTests {
    @Test func stripsALeadingYearToken() {
        #expect(UniformArchive.shortKitName("1976 Throwback") == "Throwback")
        #expect(UniformArchive.shortKitName("1960s Throwback") == "Throwback")
        #expect(UniformArchive.shortKitName("70s Throwback") == "Throwback")
    }

    @Test func leavesNamesWithoutAYearAlone() {
        #expect(UniformArchive.shortKitName("Color Rush") == "Color Rush")
        #expect(UniformArchive.shortKitName("Creamsicle") == "Creamsicle")
        #expect(UniformArchive.shortKitName("") == "")
        // Not a year token — four digits are required, or two plus an "s".
        #expect(UniformArchive.shortKitName("100 Seasons") == "100 Seasons")
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
        let retired = listing(id: "a", kind: .throwback, yearStart: 1965, yearEnd: 1968, isCurrent: false)
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
        let kit = listing(id: "a", kind: .throwback, name: "Creamsicle", yearStart: 1976, yearEnd: 1996)
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
    private let old = listing(id: "old", kind: .throwback, name: "Old", yearStart: 1965, yearEnd: 1970)
    private let mid = listing(id: "mid", kind: .alternate, name: "Mid", yearStart: 1995, yearEnd: 2000)

    @Test func kitOrderLeavesTheCallersOrderAlone() {
        let input = [mid, old, bills]
        #expect(UniformArchive.sortKits(input, by: .kit).map(\.id) == ["mid", "old", "bills-home"])
    }

    @Test func newestAndOldestOrderByStartYear() {
        let input = [mid, bills, old]
        #expect(UniformArchive.sortKits(input, by: .newest).map(\.id) == ["bills-home", "mid", "old"])
        #expect(UniformArchive.sortKits(input, by: .oldest).map(\.id) == ["old", "mid", "bills-home"])
    }

    @Test func undatedKitsSortLastOldestFirstAndFirstNewestFirst() {
        let undated = listing(id: "undated", yearStart: nil)
        #expect(UniformArchive.sortKits([undated, old], by: .oldest).map(\.id) == ["old", "undated"])
        #expect(UniformArchive.sortKits([undated, old], by: .newest).map(\.id) == ["old", "undated"])
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

    func listUniforms() async throws -> [UniformListing] {
        if let failure { throw failure }
        return listings
    }

    func teams() async throws -> [Team] { throw DepthError.server("unused") }
    func teamSnapshot(teamId: String) async throws -> TeamSnapshot { throw DepthError.server("unused") }
    func teamSeason(teamId: String, season: Int) async throws -> TeamSnapshot { throw DepthError.server("unused") }
    func teamSchedule(teamId: String, season: Int?) async throws -> TeamSchedule { throw DepthError.server("unused") }
    func playerStats(playerId: String, teamId: String?) async throws -> [PlayerSeasonStats] { throw DepthError.server("unused") }
    func teamStats(teamId: String) async throws -> TeamStatsPage { throw DepthError.server("unused") }
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
        #expect(model.applyLabel == "Show 1 kits")
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
