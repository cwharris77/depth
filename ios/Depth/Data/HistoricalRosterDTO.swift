import Foundation

// Explicit `roster_history` projection for an on-demand historical field. It deliberately
// excludes headshots and uniforms: native history is a text/number fallback until rights
// are cleared, and it never enters the current-roster snapshot cache.
struct HistoricalRosterRowDTO: Decodable {
    let season: Int
    let teamId: String
    let gsisId: String
    let name: String
    let number: Int?
    let position: String
    let college: String?
    let height: String?
    let weight: Int?
    let depthRank: Int
    let playerOrder: Int

    enum CodingKeys: String, CodingKey {
        case season, name, number, position, college, height, weight
        case teamId = "team_id"
        case gsisId = "gsis_id"
        case depthRank = "depth_rank"
        case playerOrder = "player_order"
    }
}

// A historical identity is intentionally season-pinned because a GSIS id alone does
// not name the team/era represented by a roster-history row.
struct HistoricalPlayerReference: Equatable {
    let gsisId: String
    let season: Int
}

enum PlayerStatsLookup: Equatable {
    case current(playerId: String)
    case historical(HistoricalPlayerReference, teamId: String)
    case invalidHistorical
}

func parseHistoricalPlayerReference(_ playerId: String) -> HistoricalPlayerReference? {
    let prefix = "gsis:"
    guard playerId.hasPrefix(prefix) else { return nil }
    let remainder = playerId.dropFirst(prefix.count)
    guard remainder.filter({ $0 == "@" }).count == 1, let at = remainder.firstIndex(of: "@") else { return nil }
    let gsisId = String(remainder[..<at])
    let seasonText = remainder[remainder.index(after: at)...]
    guard !gsisId.isEmpty, !seasonText.isEmpty, seasonText.allSatisfy(\.isNumber),
          let season = Int(seasonText) else { return nil }
    return HistoricalPlayerReference(gsisId: gsisId, season: season)
}

func playerStatsLookup(for playerId: String, teamId: String?) -> PlayerStatsLookup {
    guard playerId.hasPrefix("gsis:") else { return .current(playerId: playerId) }
    guard let reference = parseHistoricalPlayerReference(playerId),
          let teamId = teamId?.trimmingCharacters(in: .whitespacesAndNewlines), !teamId.isEmpty else {
        return .invalidHistorical
    }
    return .historical(reference, teamId: teamId)
}
