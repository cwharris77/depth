import Foundation
import OSLog

// Converts the immutable historical rows into the existing field domain.
//
// A row this build cannot represent degrades that one player, never the season. The
// previous strict behavior — throw on the first unknown position or out-of-range rank —
// made every new `roster_history` value a client-compatibility event: one row published
// with a vocabulary an installed build didn't know took the whole season's decode down
// with it when a newly published position value is not understood. Tolerating the row
// instead is what lets historical data move forward without a gated release per change.
//
// `depthRank` has no upper bound here on purpose. The 1...3 cap it used to enforce is a
// property of today's ingest (`web/lib/nflverse/depth-heuristic.ts` clamps with
// `Math.min(rank, 3)` while `player_order` beside it keeps the full ordering), not of the
// domain — `byDepthOrder` and the formation resolvers only ever compare ranks. Accepting
// any rank >= 1 means this build already decodes an uncapped season correctly rather than
// merely surviving it. A rank below 1 is still malformed and drops the row.
//
// Dropping every row is a real failure, not an empty roster: a season that decoded to
// nothing would render as a blank field rather than an error the user can act on.
enum HistoricalRosterMapper {
    /// Why a historical row could not become a player. Carries the identifying key so a
    /// drop is actionable rather than a bare count, matching the ingest-side conservation
    /// rule used wherever the client performs the same kind of work.
    struct DroppedRow: Equatable {
        let gsisId: String
        let reason: Reason

        enum Reason: Equatable {
            case unknownPosition(String)
            case invalidDepthRank(Int)
        }
    }

    private static let logger = Logger(
        subsystem: Bundle.main.bundleIdentifier ?? "com.cwharris.depth",
        category: "historical-roster"
    )

    static func map(team: Team, rows: [HistoricalRosterRowDTO]) throws -> TeamSnapshot {
        let result = try mapWithDiagnostics(team: team, rows: rows)
        for drop in result.dropped {
            logger.error(
                "historical roster drop \(drop.gsisId, privacy: .public): \(String(describing: drop.reason), privacy: .public)"
            )
        }
        return result.snapshot
    }

    /// The same mapping, with the dropped rows returned instead of only logged, so the
    /// degrade path is assertable in tests.
    static func mapWithDiagnostics(
        team: Team,
        rows: [HistoricalRosterRowDTO]
    ) throws -> (snapshot: TeamSnapshot, dropped: [DroppedRow]) {
        var players: [Player] = []
        var dropped: [DroppedRow] = []

        for row in rows {
            guard let position = Position(rawValue: row.position) else {
                dropped.append(
                    DroppedRow(gsisId: row.gsisId, reason: .unknownPosition(row.position)))
                continue
            }
            guard row.depthRank >= 1 else {
                dropped.append(
                    DroppedRow(gsisId: row.gsisId, reason: .invalidDepthRank(row.depthRank)))
                continue
            }
            players.append(
                Player(
                    id: "gsis:\(row.gsisId)@\(row.season)", name: row.name, position: position,
                    depthRank: row.depthRank, number: row.number ?? 0, order: row.playerOrder,
                    status: row.depthRank == 1 ? .starter : .backup, age: 0,
                    college: row.college ?? "",
                    experience: 0, height: row.height ?? "", weight: row.weight ?? 0,
                    bio: "\(row.season) · \(team.city) \(team.name)", photoUrl: nil
                )
            )
        }

        guard !players.isEmpty else {
            throw DepthError.decoding(
                "historical roster for \(team.id): no decodable rows (\(dropped.count) of \(rows.count) dropped)"
            )
        }

        let snapshot = TeamSnapshot(
            team: team, players: players, specialTeams: specialTeams(players), uniforms: []
        )
        return (snapshot, dropped)
    }

    /// Kicker, punter and long snapper only. nflverse's roster rows say who was on the
    /// team, never who returned kicks, so a past season has no returner to seat — and a
    /// permanently empty KR/PR dot reads as a broken player circle rather than as a data
    /// gap. Omitting the slots keeps history consistent with how the field already treats
    /// an unresolved offense/defense slot: it draws nothing.
    private static func specialTeams(_ players: [Player]) -> [SpecialSlot] {
        let layout: [(Position, String, Double, Double)] = [
            (.ls, "LS", 50, 68), (.k, "K", 38, 80), (.p, "P", 62, 80),
        ]
        return layout.compactMap { position, label, x, y in
            guard
                let player = players.first(where: { $0.position == position && $0.depthRank == 1 })
            else { return nil }
            return SpecialSlot(
                id: "st-\(label.lowercased())", playerId: player.id, x: x, y: y, label: label)
        }
    }
}
