import Foundation
import Testing
@testable import Depth

// The Stats page's metric catalog: the rank copy, the drop-don't-zero filtering, and the
// thin-sample gate. Mirrors web's METRIC_SECTIONS/rankLabel tests.

private func metrics(
    season: Int = 2025,
    offensiveEPAPerPlay: Double? = nil,
    sackRate: Double? = nil,
    passingEPA: Double? = nil,
    defensiveSacks: Double? = nil,
    fieldGoalPercentage: Double? = nil
) -> TeamMatchupMetrics {
    TeamMatchupMetrics(
        source: .nflverse, season: season, updatedAt: "2026-08-27T00:00:00Z",
        games: nil, passingEPA: passingEPA, rushingEPA: nil, passAttempts: nil,
        rushAttempts: nil, sacksSuffered: nil, offensiveEPA: nil, offensivePlays: nil,
        offensiveEPAPerPlay: offensiveEPAPerPlay, sackRate: sackRate,
        passingInterceptions: nil, fumblesLost: nil, giveaways: nil, turnoverMargin: nil,
        defensiveSacks: defensiveSacks, quarterbackHits: nil, quarterbackHitsPerGame: nil,
        defensiveInterceptions: nil, defensiveFumbleRecoveries: nil,
        defensiveFumblesForced: nil, defensiveTakeaways: nil, defensiveTakeawaysPerGame: nil,
        fieldGoalsMade: nil, fieldGoalsAttempted: nil,
        fieldGoalPercentage: fieldGoalPercentage, puntAttempts: nil, netPuntYards: nil,
        netPuntYardsPerAttempt: nil, puntReturns: nil, puntReturnYards: nil,
        puntReturnYardsPerAttempt: nil, kickoffReturns: nil, kickoffReturnYards: nil,
        kickoffReturnYardsPerAttempt: nil, specialTeamsTouchdowns: nil
    )
}

@Suite struct TeamStatsRankLabelTests {
    @Test func namesFirstAndLastRatherThanNumberingThem() {
        #expect(teamStatsRankLabel(1, lastRank: 32, qualifier: .most) == "First in NFL")
        #expect(teamStatsRankLabel(32, lastRank: 32, qualifier: .most) == "Last in NFL")
    }

    @Test func carriesTheQualifierForEveryOtherPosition() {
        #expect(teamStatsRankLabel(3, lastRank: 32, qualifier: .most) == "3rd most")
        #expect(teamStatsRankLabel(6, lastRank: 32, qualifier: .least) == "6th least")
        #expect(teamStatsRankLabel(4, lastRank: 32, qualifier: .overall) == "4th overall")
    }

    @Test func usesThOnTheElevenToThirteenTeens() {
        // 11th, not 11st — the mod-10 rule's exception, matching web's `ordinal`.
        #expect(teamStatsRankLabel(11, lastRank: 32, qualifier: .most) == "11th most")
        #expect(teamStatsRankLabel(12, lastRank: 32, qualifier: .most) == "12th most")
        #expect(teamStatsRankLabel(13, lastRank: 32, qualifier: .most) == "13th most")
        #expect(teamStatsRankLabel(21, lastRank: 32, qualifier: .most) == "21st most")
    }

    @Test func rendersNoCaptionWithoutARank() {
        // A missing rank leaves the value standing alone rather than implying a position.
        #expect(teamStatsRankLabel(nil, lastRank: 32, qualifier: .most) == nil)
        #expect(teamStatsRankLabel(0, lastRank: 32, qualifier: .most) == nil)
    }
}

@Suite struct TeamStatsMetricCatalogTests {
    @Test func rendersNothingWithoutANflverseRow() {
        let groups = TeamStatsMetricCatalog.resolve(
            metrics: nil, ranks: nil, lastRank: 32, showRanks: true
        )
        #expect(groups.isEmpty)
    }

    @Test func dropsMetricsWhoseSourceColumnIsMissing() {
        // Only EPA/play is present, so OFFENSE renders exactly one row and the other two
        // groups render no heading at all.
        let groups = TeamStatsMetricCatalog.resolve(
            metrics: metrics(offensiveEPAPerPlay: 0.09), ranks: nil, lastRank: 32,
            showRanks: true
        )
        #expect(groups.count == 1)
        #expect(groups.first?.title == "OFFENSE")
        #expect(groups.first?.metrics.map(\.label) == ["EPA / PLAY"])
    }

    @Test func groupsWithNothingToShowRenderNoHeading() {
        let groups = TeamStatsMetricCatalog.resolve(
            metrics: metrics(defensiveSacks: 44), ranks: nil, lastRank: 32, showRanks: true
        )
        #expect(groups.map(\.title) == ["DEFENSE"])
    }

    @Test func formatsEachMetricInItsOwnUnits() {
        let groups = TeamStatsMetricCatalog.resolve(
            metrics: metrics(
                offensiveEPAPerPlay: 0.09, sackRate: 0.051, passingEPA: 88.4,
                defensiveSacks: 44, fieldGoalPercentage: 0.875
            ),
            ranks: nil, lastRank: 32, showRanks: true
        )
        let byLabel = Dictionary(
            uniqueKeysWithValues: groups.flatMap(\.metrics).map { ($0.label, $0.display) }
        )
        // Signed to 2dp; rates as percentages even though they are stored 0-1.
        #expect(byLabel["EPA / PLAY"] == "+0.09")
        #expect(byLabel["SACK RATE"] == "5.1%")
        #expect(byLabel["PASS EPA"] == "88.4")
        #expect(byLabel["SACKS"] == "44.0")
        #expect(byLabel["FIELD GOAL %"] == "87.5%")
    }

    @Test func attachesTheRankCaptionFromTheMatchingRank() {
        var ranks = TeamStatsRanks()
        ranks.offensiveEPAPerPlay = 4
        ranks.sackRate = 6
        let groups = TeamStatsMetricCatalog.resolve(
            metrics: metrics(offensiveEPAPerPlay: 0.09, sackRate: 0.051),
            ranks: ranks, lastRank: 32, showRanks: true
        )
        let captions = groups.flatMap(\.metrics).map(\.rankCaption)
        // EPA/play reads "overall", sack rate "least" — fewer sacks is better.
        #expect(captions == ["4th overall", "6th least"])
    }

    @Test func suppressesEveryRankOnAThinSample() {
        var ranks = TeamStatsRanks()
        ranks.offensiveEPAPerPlay = 4
        let groups = TeamStatsMetricCatalog.resolve(
            metrics: metrics(offensiveEPAPerPlay: 0.09), ranks: ranks, lastRank: 32,
            showRanks: false
        )
        // The value still shows; only the league position is withheld.
        #expect(groups.first?.metrics.first?.display == "+0.09")
        #expect(groups.first?.metrics.first?.rankCaption == nil)
    }
}
