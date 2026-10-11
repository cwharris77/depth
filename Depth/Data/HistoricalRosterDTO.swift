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
    /// Jobs held on top of the position. Nil when the player held none, the season has no
    /// depth chart, or the column was not selected.
    var roles: HistoricalRoleRanks? = nil

    enum CodingKeys: String, CodingKey {
        case season, name, number, position, college, height, weight, roles
        case teamId = "team_id"
        case gsisId = "gsis_id"
        case depthRank = "depth_rank"
        case playerOrder = "player_order"
    }
}

// `roster_history.roles`: a map from role (`nb`, `kr`, `pr`) to the club's depth rank for
// it, 1 being the starter. Decoding never fails the row: a value that is not a rank of 1
// or more is skipped, and anything other than an object decodes as no roles, so a role
// vocabulary this build does not know costs nothing.
struct HistoricalRoleRanks: Decodable, Equatable {
    let ranks: [String: Int]

    init(ranks: [String: Int]) {
        self.ranks = ranks
    }

    private struct RoleKey: CodingKey {
        let stringValue: String
        var intValue: Int? { nil }
        init?(stringValue: String) { self.stringValue = stringValue }
        init?(intValue: Int) { nil }
    }

    init(from decoder: Decoder) throws {
        guard let container = try? decoder.container(keyedBy: RoleKey.self) else {
            ranks = [:]
            return
        }
        var ranks: [String: Int] = [:]
        for key in container.allKeys {
            if let rank = try? container.decode(Int.self, forKey: key), rank >= 1 {
                ranks[key.stringValue] = rank
            }
        }
        self.ranks = ranks
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
    guard remainder.filter({ $0 == "@" }).count == 1, let at = remainder.firstIndex(of: "@") else {
        return nil
    }
    let gsisId = String(remainder[..<at])
    let seasonText = remainder[remainder.index(after: at)...]
    guard !gsisId.isEmpty, !seasonText.isEmpty, seasonText.allSatisfy(\.isNumber),
        let season = Int(seasonText)
    else { return nil }
    return HistoricalPlayerReference(gsisId: gsisId, season: season)
}

func playerStatsLookup(for playerId: String, teamId: String?) -> PlayerStatsLookup {
    guard playerId.hasPrefix("gsis:") else { return .current(playerId: playerId) }
    guard let reference = parseHistoricalPlayerReference(playerId),
        let teamId = teamId?.trimmingCharacters(in: .whitespacesAndNewlines), !teamId.isEmpty
    else {
        return .invalidHistorical
    }
    return .historical(reference, teamId: teamId)
}
