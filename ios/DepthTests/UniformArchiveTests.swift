import Testing
@testable import Depth

// Pure-rule port tests for the uniform archive grouping/filtering. The rules mirror
// lib/uniforms/filter.ts (eraBucket/eraOptions/matchesFilters/compareKits/groupByDivision)
// so the two clients behave identically — the malformed/empty cases included, per the
// house "untrusted input degrades, never throws" invariant.

private let bills = UniformListing(
    id: "bills-home", teamId: "bills", teamName: "Buffalo Bills", conference: "AFC",
    division: "East", kind: .home, name: "Home", yearStart: 2025, yearEnd: nil,
    isCurrent: true,
    colors: TeamColors(
        primary: "#00338D", secondary: "#C60C30", accent: "#D50A0A",
        uiAccent: "#4D8BFF", onAccent: "#0a0e1a"
    ),
    imagePath: "https://depth-ashen.vercel.app/uniforms/bills-home.webp"
)
private let billsAway = UniformListing(
    id: "bills-away", teamId: "bills", teamName: "Buffalo Bills", conference: "AFC",
    division: "East", kind: .away, name: "Away", yearStart: 2025, yearEnd: nil,
    isCurrent: true,
    colors: TeamColors(
        primary: "#FFFFFF", secondary: "#00338D", accent: "#C60C30",
        uiAccent: "#FFFFFF", onAccent: "#0a0e1a"
    ),
    imagePath: "https://depth-ashen.vercel.app/uniforms/bills-away.webp"
)
private let jete = UniformListing(
    id: "jets-home", teamId: "jets", teamName: "New York Jets", conference: "AFC",
    division: "East", kind: .home, name: "Home", yearStart: 2025, yearEnd: nil,
    isCurrent: true,
    colors: TeamColors(
        primary: "#125740", secondary: "#000000", accent: "#D50A0A",
        uiAccent: "#2E9B6B", onAccent: "#0a0e1a"
    ),
    imagePath: "https://depth-ashen.vercel.app/uniforms/jets-home.webp"
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

@Suite("UniformArchive eraOptions")
struct EraOptionsTests {
    @Test func distinctDecadesAscendingThenUndated() {
        let undated = UniformListing(
            id: "bills-x", teamId: "bills", teamName: "Buffalo Bills", conference: "AFC",
            division: "East", kind: .throwback, name: "X", yearStart: nil, yearEnd: nil,
            isCurrent: false,
            colors: bills.colors,
            imagePath: nil
        )
        let options = UniformArchive.eraOptions([undated, bills, billsAway])
        #expect(options == ["2020s", "Undated"])
    }

    @Test func emptyIsEmpty() {
        #expect(UniformArchive.eraOptions([]).isEmpty)
    }
}

@Suite("UniformArchive filters")
struct ArchiveFilterTests {
    @Test func kindFilterMatchesOnlyThatKind() {
        #expect(UniformArchive.matchesFilters(bills, UniformArchive.Filters(kind: .home)))
        #expect(!UniformArchive.matchesFilters(billsAway, UniformArchive.Filters(kind: .home)))
        #expect(UniformArchive.matchesFilters(billsAway, UniformArchive.Filters(kind: .away)))
    }

    @Test func currentOnlyExcludesRetiredKits() {
        let retired = UniformListing(
            id: "bills-retired", teamId: "bills", teamName: "Buffalo Bills", conference: "AFC",
            division: "East", kind: .throwback, name: "Retired", yearStart: 1965, yearEnd: 1968,
            isCurrent: false,
            colors: bills.colors,
            imagePath: nil
        )
        #expect(UniformArchive.matchesFilters(retired, UniformArchive.Filters(currentOnly: true)) == false)
        #expect(UniformArchive.matchesFilters(retired, UniformArchive.Filters(currentOnly: false)))
    }

    @Test func eraFilterUsesEraBucket() {
        let old = UniformListing(
            id: "bills-old", teamId: "bills", teamName: "Buffalo Bills", conference: "AFC",
            division: "East", kind: .throwback, name: "Old", yearStart: 1965, yearEnd: nil,
            isCurrent: false,
            colors: bills.colors,
            imagePath: nil
        )
        #expect(UniformArchive.matchesFilters(old, UniformArchive.Filters(era: "1960s")))
        #expect(!UniformArchive.matchesFilters(old, UniformArchive.Filters(era: "2020s")))
    }
}

@Suite("UniformArchive compareKits and grouping")
struct ArchiveGroupingTests {
    @Test func homeBeforeAwayBeforeAlternates() {
        #expect(UniformArchive.compareKits(bills, billsAway))
        #expect(!UniformArchive.compareKits(billsAway, bills))
    }

    @Test func groupsByDivisionAndOrdersTeamsByCity() {
        let groups = UniformArchive.groupByDivision([bills, billsAway, jete])
        #expect(groups.count == 1)
        #expect(groups[0].conference == "AFC")
        #expect(groups[0].division == "East")
        // Buffalo (city) sorts before New York — but both are "East", so both in one group.
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
}
