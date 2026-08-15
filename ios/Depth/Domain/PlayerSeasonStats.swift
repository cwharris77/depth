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

    var id: String { "\(season)-\(seasonType.rawValue)" }
    var hasPlayedGames: Bool { (games ?? 0) > 0 }

    static func empty(season: Int, games: Int? = nil) -> PlayerSeasonStats {
        PlayerSeasonStats(
            season: season, seasonType: .regular, teamAbbrev: nil, games: games,
            completions: nil, attempts: nil, passingYards: nil, passingTds: nil,
            passingInterceptions: nil, carries: nil, rushingYards: nil, rushingTds: nil,
            receptions: nil, targets: nil, receivingYards: nil, receivingTds: nil,
            defTacklesSolo: nil, defSacks: nil, defInterceptions: nil, fgMade: nil, fgAtt: nil
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

enum PlayerStatColumn: Hashable {
    case completionsAttempts, passingYards, passingTds, passingInterceptions, passingYardsPerAttempt
    case carries, rushingYards, rushingTds, receptions, rushingYardsPerCarry
    case targets, receivingYards, receivingTds, receivingYardsPerReception
    case games, tackles, sacks, interceptions, fieldGoalsMade, fieldGoalsAttempted, fieldGoalPercentage

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

func playerStatColumns(for position: Position) -> [PlayerStatColumn] {
    switch position {
    case .qb:
        [.completionsAttempts, .passingYards, .passingTds, .passingInterceptions, .passingYardsPerAttempt]
    case .rb, .fb:
        [.carries, .rushingYards, .rushingTds, .receptions, .rushingYardsPerCarry]
    case .wr, .te:
        [.receptions, .targets, .receivingYards, .receivingTds, .receivingYardsPerReception]
    case .lt, .lg, .c, .rg, .rt, .p, .ls, .kr, .pr:
        [.games]
    case .de, .lde, .rde, .dt, .nt, .lb, .wlb, .lilb, .rilb, .slb, .cb, .lcb, .rcb, .nb, .s, .ss, .fs:
        [.tackles, .sacks, .interceptions]
    case .k:
        [.fieldGoalsMade, .fieldGoalsAttempted, .fieldGoalPercentage]
    }
}
