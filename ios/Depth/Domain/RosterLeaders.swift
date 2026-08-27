import Foundation

// Swift port of lib/utils/roster/roster-leaders.ts for the Stats page's ROSTER LEADERS
// card (handoff: ../../obsidian/Projects/depth/specs/2026-08-27-ios-roster-leaders-handoff.md).
// Pure: no fetch, no DB — the read layer (DepthRepository.rosterLeaders,
// SupabaseDepthRepository's players + player_stats queries) hands this every roster
// player's stats row for one season and this decides the leaders. A category with no
// positive yardage degrades to nil rather than a zeroed row (repo's "show nothing, not
// zeros" posture).

/// Team production leaders for one season, shown on the stats page. A single leader per
/// category (passing/rushing/receiving); `line` is the preformatted summary the view
/// renders verbatim. Any category can be nil — a team with no positive yardage in it
/// (e.g. a defense-heavy sample) shows nothing, not a zero-filled row.
struct Leader: Equatable, Codable, Sendable {
    let playerId: String
    let name: String
    let line: String
}

struct RosterLeaders: Equatable, Codable, Sendable {
    let season: Int
    let passing: Leader?
    let rushing: Leader?
    let receiving: Leader?
}

struct LeaderEntry {
    let playerId: String
    let name: String
    let stats: PlayerSeasonStats
}

private func n(_ value: Int?) -> Int { value ?? 0 }

/// Thousands separators without depending on Locale/ICU — hand-rolled to keep output
/// identical to web's `grp` (`lib/utils/roster/roster-leaders.ts`) across environments,
/// rather than `NumberFormatter`, which is locale-dependent.
private func grp(_ value: Int?) -> String {
    let digits = String(n(value))
    guard digits.count > 3 else { return digits }
    var result = ""
    for (index, char) in digits.reversed().enumerated() {
        if index > 0 && index % 3 == 0 { result.append(",") }
        result.append(char)
    }
    return String(result.reversed())
}

/// Highest `yards` wins; strictly-greater comparison from a 0 floor means a category
/// with no positive yardage yields no leader, and ties keep the first entry seen.
private func topBy(
    _ entries: [LeaderEntry],
    yards: (PlayerSeasonStats) -> Int?,
    line: (PlayerSeasonStats) -> String
) -> Leader? {
    var best: LeaderEntry?
    var bestYards = 0
    for entry in entries {
        let y = n(yards(entry.stats))
        if y > bestYards {
            bestYards = y
            best = entry
        }
    }
    guard let best else { return nil }
    return Leader(playerId: best.playerId, name: best.name, line: line(best.stats))
}

// Named distinctly from web's `rosterLeaders` (not just `rosterLeaders`) to avoid
// colliding with `DepthRepository.rosterLeaders(teamId:season:)` at call sites in the
// same module — Swift's overload resolution picks the member function in that scope.
func selectRosterLeaders(_ entries: [LeaderEntry]) -> RosterLeaders? {
    guard !entries.isEmpty else { return nil }
    // Leaders describe the current roster's most recent production, so scope to the
    // newest season present and ignore older rows (a player's prior-team seasons,
    // backfilled history) when the caller hands over more than one season's entries.
    guard let season = entries.map(\.stats.season).max() else { return nil }
    let inSeason = entries.filter { $0.stats.season == season }

    return RosterLeaders(
        season: season,
        passing: topBy(
            inSeason,
            yards: { $0.passingYards },
            line: { "\(n($0.completions))/\(n($0.attempts)) · \(grp($0.passingYards)) yds · \(n($0.passingTds)) TD" }
        ),
        rushing: topBy(
            inSeason,
            yards: { $0.rushingYards },
            line: { "\(n($0.carries)) car · \(grp($0.rushingYards)) yds · \(n($0.rushingTds)) TD" }
        ),
        receiving: topBy(
            inSeason,
            yards: { $0.receivingYards },
            line: { "\(n($0.receptions)) rec · \(grp($0.receivingYards)) yds · \(n($0.receivingTds)) TD" }
        )
    )
}
