import Foundation

// Immutable regular-season schedule rendered by the Schedule feature. Scores and
// opponent identity remain optional because public source data can legitimately be
// incomplete; callers show an explicit unavailable/no-result state instead of inventing
// a score or opponent.
//
// Codable so T5's cache layer can store one schedule as a JSON payload per SwiftData row
// (same pattern as TeamSnapshot/TeamStatsPage).
struct TeamSchedule: Equatable, Sendable, Codable {
    static let earliestSeason = 1999
    let season: Int
    let games: [ScheduleGame]
}

enum ScheduleResult: String, Equatable, Sendable, Codable {
    case win = "W"
    case loss = "L"
    case tie = "T"
}

struct ScheduleGame: Equatable, Identifiable, Sendable, Codable {
    let week: Int
    let isBye: Bool
    let date: String?
    let isHome: Bool
    let opponent: Team?
    let teamScore: Int?
    let opponentScore: Int?
    let result: ScheduleResult?

    var id: Int { week }
}
