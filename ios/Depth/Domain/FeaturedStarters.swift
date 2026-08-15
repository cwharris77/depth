import Foundation

// Mirrors lib/utils/og.ts's featuredStarters — a few marquee starters for a team's
// share card: QB, RB, then top WR, in that order. Uses the same deterministic
// byDepthOrder as the field and silently skips any position the roster lacks, so an
// incomplete roster still produces a valid (possibly shorter) card.
struct FeaturedStarter: Equatable {
    let label: String
    let name: String
}

private let featuredPositions: [(label: String, position: Position)] = [
    (label: "QB", position: .qb),
    (label: "RB", position: .rb),
    (label: "WR", position: .wr),
]

func featuredStarters(from snapshot: TeamSnapshot) -> [FeaturedStarter] {
    featuredPositions.compactMap { entry in
        snapshot.players
            .filter { $0.position == entry.position }
            .sorted(by: byDepthOrder)
            .first
            .map { FeaturedStarter(label: entry.label, name: $0.name) }
    }
}
