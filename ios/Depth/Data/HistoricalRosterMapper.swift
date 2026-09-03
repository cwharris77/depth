import Foundation

// Converts the immutable historical rows into the existing field domain. Strict position
// and rank validation makes a corrupt public row a typed decoding failure rather than an
// inaccurately seated player.
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

    /// Kicker, punter and long snapper only. nflverse's roster rows say who was on the
    /// team, never who returned kicks, so a past season has no returner to seat — and a
    /// permanently empty KR/PR dot reads as a broken player circle rather than as a data
    /// gap (Cooper, 2026-09-02, reversing the earlier "unfilled by policy" call). Omitting
    /// the slots keeps history consistent with how the field already treats an unresolved
    /// offense/defense slot: it draws nothing.
    private static func specialTeams(_ players: [Player]) -> [SpecialSlot] {
        let layout: [(Position, String, Double, Double)] = [
            (.ls, "LS", 50, 68), (.k, "K", 38, 80), (.p, "P", 62, 80),
        ]
        return layout.compactMap { position, label, x, y in
            guard let player = players.first(where: { $0.position == position && $0.depthRank == 1 })
            else { return nil }
            return SpecialSlot(id: "st-\(label.lowercased())", playerId: player.id, x: x, y: y, label: label)
        }
    }
}
