import Foundation

// Immutable season-stat rows and display rules for native player profiles. The model
// mirrors the web card's REG-only vocabulary while deliberately retaining only a team
// abbreviation: sports-mark imagery is not cleared for the native app.

enum PlayerSeasonType: String, Codable, Hashable {
    case regular = "REG"
}

struct PlayerSeasonStats: Codable, Hashable, Identifiable {
    let season: Int
    let seasonType: PlayerSeasonType
    let teamAbbrev: String?
    let games: Int?
    let completions: Int?
    let attempts: Int?
    let passingYards: Int?
    let passingTds: Int?
    let passingInterceptions: Int?
    let carries: Int?
    let rushingYards: Int?
    let rushingTds: Int?
    let receptions: Int?
    let targets: Int?
    let receivingYards: Int?
    let receivingTds: Int?
    let defTacklesSolo: Int?
    let defSacks: Double?
    let defInterceptions: Int?
    let fgMade: Int?
    let fgAtt: Int?
    // Same-source nflverse columns added for the position groups that previously had no
    // meaningful line (DEP-538): defensive counters beyond solo/sack/INT, return yards,
    // special-teams scores, penalties, PAT/long-FG, and season snap totals for the
    // participation-only positions (O-line, long snapper, punter). All optional so a row
    // from before this shipped still decodes.
    let defTackleAssists: Int?
    let defTacklesForLoss: Int?
    let defQbHits: Int?
    let defPassDefended: Int?
    let defFumblesForced: Int?
    let defTds: Int?
    let defSafeties: Int?
    let fumbleRecoveries: Int?
    let fumbleRecoveryTds: Int?
    let puntReturns: Int?
    let puntReturnYards: Int?
    let kickoffReturns: Int?
    let kickoffReturnYards: Int?
    let specialTeamsTds: Int?
    let penalties: Int?
    let penaltyYards: Int?
    let patMade: Int?
    let patAtt: Int?
    let fgLong: Int?
    let offenseSnaps: Int?
    /// nflverse's per-unit snap share, 0...1 (nil when the source couldn't compute it).
    let offensePct: Double?
    let defenseSnaps: Int?
    let defensePct: Double?
    let specialTeamsSnaps: Int?
    let specialTeamsPct: Double?

    var id: String { "\(season)-\(seasonType.rawValue)" }
    var hasPlayedGames: Bool { (games ?? 0) > 0 }

    static func empty(season: Int, games: Int? = nil) -> PlayerSeasonStats {
        PlayerSeasonStats(
            season: season, seasonType: .regular, teamAbbrev: nil, games: games,
            completions: nil, attempts: nil, passingYards: nil, passingTds: nil,
            passingInterceptions: nil, carries: nil, rushingYards: nil, rushingTds: nil,
            receptions: nil, targets: nil, receivingYards: nil, receivingTds: nil,
            defTacklesSolo: nil, defSacks: nil, defInterceptions: nil, fgMade: nil, fgAtt: nil,
            defTackleAssists: nil, defTacklesForLoss: nil, defQbHits: nil, defPassDefended: nil,
            defFumblesForced: nil, defTds: nil, defSafeties: nil, fumbleRecoveries: nil,
            fumbleRecoveryTds: nil, puntReturns: nil, puntReturnYards: nil, kickoffReturns: nil,
            kickoffReturnYards: nil, specialTeamsTds: nil, penalties: nil, penaltyYards: nil,
            patMade: nil, patAtt: nil, fgLong: nil, offenseSnaps: nil, offensePct: nil,
            defenseSnaps: nil, defensePct: nil, specialTeamsSnaps: nil, specialTeamsPct: nil
        )
    }
}

// Pure display formatting keeps profile copy and stat-table cells testable outside
// SwiftUI. Source zero/absence is not presented as an invented value.
enum PlayerProfileDisplay {
    static func experience(_ value: Int?) -> String {
        guard let value else { return "—" }
        if value <= 0 { return "Rookie" }
        return value == 1 ? "1 yr" : "\(value) yrs"
    }

    static func age(_ value: Int?) -> String {
        guard let value, value > 0 else { return "—" }
        return "\(value)"
    }

    static func height(_ value: String?) -> String { meaningful(value) ?? "—" }

    static func weight(_ value: Int?) -> String {
        guard let value, value > 0 else { return "—" }
        return "\(value) lb"
    }

    static func meaningful(_ value: String?) -> String? {
        guard let value else { return nil }
        let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
        // ESPN ingestion stores an em dash for absent college data; preserve the same
        // absence semantics as an empty source string instead of rendering "College —".
        return trimmed.isEmpty || trimmed == "—" ? nil : trimmed
    }
}

enum PlayerStatColumn: Hashable, CaseIterable {
    case completionsAttempts, passingYards, passingTds, passingInterceptions, passingYardsPerAttempt
    case carries, rushingYards, rushingTds, receptions, rushingYardsPerCarry
    case targets, receivingYards, receivingTds, receivingYardsPerReception
    case games, tackles, sacks, interceptions, fieldGoalsMade, fieldGoalsAttempted, fieldGoalPercentage
    // DEP-538 additions: the counters that give stat-less position groups a real line.
    case assists, tacklesForLoss, qbHits, passDefended, forcedFumbles, fumbleRecoveries, defensiveTds
    case puntReturns, puntReturnYards, kickoffReturns, kickoffReturnYards, returnYards, specialTeamsTds
    case penalties, penaltyYards, patMade, patAtt, fieldGoalLong
    case offenseSnaps, offenseSnapShare, defenseSnaps, defenseSnapShare
    case specialTeamsSnaps, specialTeamsSnapShare

    var header: String {
        switch self {
        case .completionsAttempts: "CMP/ATT"
        case .passingYards, .rushingYards, .receivingYards: "YDS"
        case .passingTds, .rushingTds, .receivingTds: "TD"
        case .passingInterceptions, .interceptions: "INT"
        case .passingYardsPerAttempt: "YPA"
        case .carries: "CAR"
        case .receptions: "REC"
        case .rushingYardsPerCarry: "YPC"
        case .targets: "TGT"
        case .receivingYardsPerReception: "YPR"
        case .games: "GP"
        case .tackles: "TKL"
        case .sacks: "SK"
        case .fieldGoalsMade: "FGM"
        case .fieldGoalsAttempted: "FGA"
        case .fieldGoalPercentage: "FG%"
        case .assists: "AST"
        case .tacklesForLoss: "TFL"
        case .qbHits: "QBH"
        case .passDefended: "PBU"
        case .forcedFumbles: "FF"
        case .fumbleRecoveries: "FR"
        case .defensiveTds: "TD"
        case .puntReturns: "PR"
        case .puntReturnYards: "PR YDS"
        case .kickoffReturns: "KR"
        case .kickoffReturnYards: "KR YDS"
        case .returnYards: "RET YDS"
        case .specialTeamsTds: "ST TD"
        case .penalties: "PEN"
        case .penaltyYards: "PEN YDS"
        case .patMade: "PAT"
        case .patAtt: "PAT ATT"
        case .fieldGoalLong: "LONG"
        case .offenseSnaps: "OFF"
        case .offenseSnapShare: "OFF %"
        case .defenseSnaps: "DEF"
        case .defenseSnapShare: "DEF %"
        case .specialTeamsSnaps: "ST"
        case .specialTeamsSnapShare: "ST %"
        }
    }

    func value(for stats: PlayerSeasonStats) -> String {
        return switch self {
        case .completionsAttempts: "\(integer(stats.completions))/\(integer(stats.attempts))"
        case .passingYards: grouped(stats.passingYards)
        case .passingTds: "\(integer(stats.passingTds))"
        case .passingInterceptions: "\(integer(stats.passingInterceptions))"
        case .passingYardsPerAttempt: ratio(stats.passingYards, stats.attempts)
        case .carries: "\(integer(stats.carries))"
        case .rushingYards: grouped(stats.rushingYards)
        case .rushingTds: "\(integer(stats.rushingTds))"
        case .receptions: "\(integer(stats.receptions))"
        case .rushingYardsPerCarry: ratio(stats.rushingYards, stats.carries)
        case .targets: "\(integer(stats.targets))"
        case .receivingYards: grouped(stats.receivingYards)
        case .receivingTds: "\(integer(stats.receivingTds))"
        case .receivingYardsPerReception: ratio(stats.receivingYards, stats.receptions)
        case .games: "\(integer(stats.games))"
        case .tackles: "\(integer(stats.defTacklesSolo))"
        case .sacks: formatSacks(stats.defSacks)
        case .interceptions: "\(integer(stats.defInterceptions))"
        case .fieldGoalsMade: "\(integer(stats.fgMade))"
        case .fieldGoalsAttempted: "\(integer(stats.fgAtt))"
        case .fieldGoalPercentage:
            fieldGoalPercentage(made: stats.fgMade, attempts: stats.fgAtt)
        case .assists: "\(integer(stats.defTackleAssists))"
        case .tacklesForLoss: "\(integer(stats.defTacklesForLoss))"
        case .qbHits: "\(integer(stats.defQbHits))"
        case .passDefended: "\(integer(stats.defPassDefended))"
        case .forcedFumbles: "\(integer(stats.defFumblesForced))"
        case .fumbleRecoveries: "\(integer(stats.fumbleRecoveries))"
        case .defensiveTds: "\(integer(stats.defTds))"
        case .puntReturns: "\(integer(stats.puntReturns))"
        case .puntReturnYards: grouped(stats.puntReturnYards)
        case .kickoffReturns: "\(integer(stats.kickoffReturns))"
        case .kickoffReturnYards: grouped(stats.kickoffReturnYards)
        case .returnYards: grouped((stats.puntReturnYards ?? 0) + (stats.kickoffReturnYards ?? 0))
        case .specialTeamsTds: "\(integer(stats.specialTeamsTds))"
        case .penalties: "\(integer(stats.penalties))"
        case .penaltyYards: "\(integer(stats.penaltyYards))"
        case .patMade: "\(integer(stats.patMade))"
        case .patAtt: "\(integer(stats.patAtt))"
        case .fieldGoalLong: "\(integer(stats.fgLong))"
        case .offenseSnaps: grouped(stats.offenseSnaps)
        case .offenseSnapShare: percentage(stats.offensePct)
        case .defenseSnaps: grouped(stats.defenseSnaps)
        case .defenseSnapShare: percentage(stats.defensePct)
        case .specialTeamsSnaps: grouped(stats.specialTeamsSnaps)
        case .specialTeamsSnapShare: percentage(stats.specialTeamsPct)
        }
    }

    private func integer(_ value: Int?) -> Int { value ?? 0 }

    private func grouped(_ value: Int?) -> String {
        Self.numberFormatter.string(from: NSNumber(value: integer(value))) ?? "0"
    }

    private func ratio(_ numerator: Int?, _ denominator: Int?) -> String {
        guard let denominator, denominator > 0 else { return "—" }
        return String(format: "%.1f", Double(integer(numerator)) / Double(denominator))
    }

    private func fieldGoalPercentage(made: Int?, attempts: Int?) -> String {
        guard let attempts, attempts > 0 else { return "—" }
        return "\(Int((Double(integer(made)) / Double(attempts) * 100).rounded()))"
    }

    /// A stored 0...1 share as one-decimal percent ("92.0"), or "—" when the source had
    /// no denominator to divide by (never a fabricated 0%).
    private func percentage(_ value: Double?) -> String {
        guard let value else { return "—" }
        return String(format: "%.1f", value * 100)
    }

    private func formatSacks(_ value: Double?) -> String {
        let value = value ?? 0
        return value.rounded() == value ? "\(Int(value))" : String(format: "%.1f", value)
    }

    private static let numberFormatter: NumberFormatter = {
        let formatter = NumberFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.numberStyle = .decimal
        formatter.usesGroupingSeparator = true
        formatter.maximumFractionDigits = 0
        return formatter
    }()
}

// Spoken column names and combined row labels for VoiceOver (design spec Milestone 3
// item 30). The stat table's on-screen headers are deliberately compact ("YDS", "YPA")
// so numeric columns fit; VoiceOver reads those as opaque letter strings, and a row
// combined from bare cells announces a run of unlabeled numbers. These pure builders
// keep the spoken vocabulary testable outside SwiftUI, the same split
// `PlayerProfileDisplay` already uses for visible copy.
extension PlayerStatColumn {
    var accessibleName: String {
        switch self {
        case .completionsAttempts: "Completions of attempts"
        case .passingYards: "Passing yards"
        case .passingTds: "Passing touchdowns"
        case .passingInterceptions: "Interceptions thrown"
        case .passingYardsPerAttempt: "Yards per attempt"
        case .carries: "Carries"
        case .rushingYards: "Rushing yards"
        case .rushingTds: "Rushing touchdowns"
        case .rushingYardsPerCarry: "Yards per carry"
        case .receptions: "Receptions"
        case .targets: "Targets"
        case .receivingYards: "Receiving yards"
        case .receivingTds: "Receiving touchdowns"
        case .receivingYardsPerReception: "Yards per reception"
        case .games: "Games played"
        case .tackles: "Solo tackles"
        case .sacks: "Sacks"
        case .interceptions: "Interceptions"
        case .fieldGoalsMade: "Field goals made"
        case .fieldGoalsAttempted: "Field goals attempted"
        case .fieldGoalPercentage: "Field goal percentage"
        case .assists: "Assists"
        case .tacklesForLoss: "Tackles for loss"
        case .qbHits: "Quarterback hits"
        case .passDefended: "Passes defended"
        case .forcedFumbles: "Forced fumbles"
        case .fumbleRecoveries: "Fumble recoveries"
        case .defensiveTds: "Defensive touchdowns"
        case .puntReturns: "Punt returns"
        case .puntReturnYards: "Punt return yards"
        case .kickoffReturns: "Kickoff returns"
        case .kickoffReturnYards: "Kickoff return yards"
        case .returnYards: "Return yards"
        case .specialTeamsTds: "Special teams touchdowns"
        case .penalties: "Penalties"
        case .penaltyYards: "Penalty yards"
        case .patMade: "Extra points made"
        case .patAtt: "Extra points attempted"
        case .fieldGoalLong: "Longest field goal"
        case .offenseSnaps: "Offensive snaps"
        case .offenseSnapShare: "Offensive snap share"
        case .defenseSnaps: "Defensive snaps"
        case .defenseSnapShare: "Defensive snap share"
        case .specialTeamsSnaps: "Special teams snaps"
        case .specialTeamsSnapShare: "Special teams snap share"
        }
    }
}

enum PlayerStatsAccessibility {
    /// One spoken sentence per season row: the season, the team it was played for when
    /// known, then every column paired with its own value so no number is announced
    /// without the stat it belongs to.
    static func rowLabel(for stats: PlayerSeasonStats, columns: [PlayerStatColumn]) -> String {
        var parts = ["\(stats.season) season"]
        if let teamAbbrev = stats.teamAbbrev, !teamAbbrev.isEmpty {
            parts.append(teamAbbrev)
        }
        parts.append(contentsOf: columns.map { "\($0.accessibleName) \($0.value(for: stats))" })
        return parts.joined(separator: ", ")
    }
}

func playerStatColumns(for position: Position) -> [PlayerStatColumn] {
    switch position {
    case .qb:
        [.completionsAttempts, .passingYards, .passingTds, .passingInterceptions, .passingYardsPerAttempt]
    case .rb, .fb:
        [.carries, .rushingYards, .rushingTds, .receptions, .rushingYardsPerCarry]
    case .wr, .te:
        [.receptions, .targets, .receivingYards, .receivingTds, .receivingYardsPerReception]
    case .lt, .lg, .c, .rg, .rt, .ot, .g, .p, .ls, .kr, .pr:
        [.games]
    case .de, .lde, .rde, .dt, .nt, .lb, .wlb, .lilb, .rilb, .slb, .cb, .lcb, .rcb, .nb, .s, .ss, .fs:
        [.tackles, .sacks, .interceptions]
    case .k:
        [.fieldGoalsMade, .fieldGoalsAttempted, .fieldGoalPercentage]
    }
}
