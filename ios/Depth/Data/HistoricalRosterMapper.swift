import Foundation

// Converts the immutable historical rows into the existing field domain. Strict position
// and rank validation makes a corrupt public row a typed decoding failure rather than an
// inaccurately seated player; special-team returners remain visibly unfilled by policy.
enum HistoricalRosterMapper {
    static func map(team: Team, rows: [HistoricalRosterRowDTO]) throws -> TeamSnapshot {
        let players = try rows.map { row in
            guard let position = Position(rawValue: row.position) else {
                throw DepthError.decoding("historical player \(row.gsisId): unknown position \"\(row.position)\"")
            }
            guard (1...3).contains(row.depthRank) else {
                throw DepthError.decoding("historical player \(row.gsisId): depthRank \(row.depthRank) out of range 1...3")
            }
            return Player(
                id: "gsis:\(row.gsisId)@\(row.season)", name: row.name, position: position,
                depthRank: row.depthRank, number: row.number ?? 0, order: row.playerOrder,
                status: row.depthRank == 1 ? .starter : .backup, age: 0, college: row.college ?? "",
                experience: 0, height: row.height ?? "", weight: row.weight ?? 0,
                bio: "\(row.season) · \(team.city) \(team.name)", photoUrl: nil
            )
        }
        return TeamSnapshot(team: team, players: players, specialTeams: specialTeams(players), uniforms: [])
    }

    private static func specialTeams(_ players: [Player]) -> [SpecialSlot] {
        let layout: [(Position, String, Double, Double)] = [
            (.kr, "KR", 30, 18), (.pr, "PR", 70, 18), (.ls, "LS", 50, 68),
            (.k, "K", 38, 80), (.p, "P", 62, 80),
        ]
        return layout.map { position, label, x, y in
            let playerId: String?
            switch position {
            case .k, .p, .ls:
                playerId = players.first { $0.position == position && $0.depthRank == 1 }?.id
            case .kr, .pr:
                playerId = nil
            default:
                playerId = nil
            }
            return SpecialSlot(id: "st-\(label.lowercased())", playerId: playerId, x: x, y: y, label: label)
        }
    }
}
