import Foundation

// The one claim the player profile leads with: a career high that few players have ever
// reached, stated against the seasons the record file covers. Every part of the claim comes
// from the highlight file's own rank and count, so it never says more than the data does.

struct PlayerKnownForClaim: Equatable {
    let stat: RecordStat
    let kind: RecordKind
    let highlight: PlayerHighlight
    let coverage: RecordCoverage

    /// "The 4th-most passing yards in a game since 1999."
    var headline: String {
        let place = rank == 1 ? "the most" : "the \(ordinal(rank))-most"
        let lead = isTied ? "Tied for \(place)" : place.prefix(1).uppercased() + place.dropFirst()
        return "\(lead) \(stat.noun) \(kind.phrase) since \(coverage.fromSeason)."
    }

    /// "520"
    var valueText: String { PlayerKnownForBuilder.integer(highlight.value) }

    /// When the mark was set: "Week 17, 2011", or "2011 season" for a season total. The stat
    /// itself is already in the headline, so it isn't repeated here.
    var when: String {
        highlight.week.map { "Week \($0), \(highlight.season)" } ?? "\(highlight.season) season"
    }

    /// Who it was set for: "Lions vs. Packers", or just "Lions" for a season total.
    var matchup: String? {
        highlight.teamId.map(Self.teamName).map { team in
            highlight.opponentId.map { "\(team) vs. \(Self.teamName($0))" } ?? team
        }
    }

    /// "3 other players have reached 520 passing yards in a game since 1999."
    var comparator: String {
        let others = highlight.playersAtOrAbove - 1
        let mark = "\(valueText) \(stat.noun) \(kind.phrase) since \(coverage.fromSeason)"
        switch others {
        case ..<1: return "No other player has reached \(mark)."
        case 1: return "1 other player has reached \(mark)."
        default: return "\(others) other players have reached \(mark)."
        }
    }

    /// "Regular season, 1999–2026 · each player's best"
    var scope: String {
        "Regular season, \(coverage.fromSeason)–\(coverage.toSeason) · each player’s best"
    }

    private var rank: Int { highlight.allTimeRank }

    /// More players share the mark than rank above it.
    private var isTied: Bool { highlight.playersAtOrAbove > rank }

    /// A team id is a lowercase slug ("lions", "49ers"); only its first letter is raised so
    /// a leading digit doesn't capitalize the rest ("49Ers").
    private static func teamName(_ id: String) -> String {
        id.prefix(1).uppercased() + id.dropFirst()
    }
}

enum PlayerKnownForBuilder {
    /// A claim needs a mark that at most this many players have reached.
    static let maximumPlayers = 10

    /// Earlier wins a tie: a season total over a single game, then passing, rushing,
    /// receiving, yards before touchdowns.
    static let candidates: [(RecordStat, RecordKind)] = RecordKind.ordered.flatMap { kind in
        RecordStat.ordered.map { ($0, kind) }
    }

    /// The highlight the fewest players have matched, or nil when none is rare enough or
    /// the file doesn't say which seasons it covers.
    static func claim(_ highlights: PlayerHighlights?) -> PlayerKnownForClaim? {
        guard let highlights, let coverage = highlights.coverage else { return nil }
        let best = candidates.enumerated().compactMap {
            offset, candidate -> (offset: Int, claim: PlayerKnownForClaim)? in
            guard let highlight = highlights.highlight(candidate.0, candidate.1),
                highlight.playersAtOrAbove >= 1,
                highlight.playersAtOrAbove <= maximumPlayers, highlight.allTimeRank >= 1
            else { return nil }
            return (
                offset,
                PlayerKnownForClaim(
                    stat: candidate.0, kind: candidate.1, highlight: highlight, coverage: coverage)
            )
        }
        .min { lhs, rhs in
            (lhs.claim.highlight.playersAtOrAbove, lhs.offset)
                < (rhs.claim.highlight.playersAtOrAbove, rhs.offset)
        }
        return best?.claim
    }

    static func integer(_ value: Double) -> String {
        Int(value.rounded()).formatted(
            .number.grouping(.automatic).locale(Locale(identifier: "en_US")))
    }
}

extension RecordStat {
    static let ordered: [RecordStat] = [
        .passingYards, .passingTds, .rushingYards, .rushingTds, .receivingYards, .receivingTds,
    ]

    var noun: String {
        switch self {
        case .passingYards: "passing yards"
        case .passingTds: "passing touchdowns"
        case .rushingYards: "rushing yards"
        case .rushingTds: "rushing touchdowns"
        case .receivingYards: "receiving yards"
        case .receivingTds: "receiving touchdowns"
        }
    }
}

extension RecordKind {
    static let ordered: [RecordKind] = [.singleSeason, .singleGame]

    var phrase: String {
        switch self {
        case .singleGame: "in a game"
        case .singleSeason: "in a season"
        }
    }
}
