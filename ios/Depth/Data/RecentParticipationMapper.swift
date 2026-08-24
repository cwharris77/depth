import Foundation

// Swift port of buildRecentParticipation for DEP-313. It selects one complete ingest
// window before mapping players so stale rows or mixed source metadata can never leak
// into a native comparison, and its output is checked against the shared TS fixture.
enum RecentParticipationMapper {
    static func map(_ rows: [RecentParticipationDTO]) throws -> RecentParticipation? {
        guard let season = rows.map(\.season).max() else { return nil }

        let seasonRows = rows.filter { $0.season == season }
        let timestampedRows = try seasonRows.map { row in
            guard let timestamp = parseTimestamp(row.updatedAt) else {
                throw DepthError.decoding("invalid recent participation timestamp")
            }
            return (row: row, timestamp: timestamp)
        }
        guard let winningTimestamp = timestampedRows.map(\.timestamp).max() else { return nil }
        let winningRows = timestampedRows
            .filter { $0.timestamp == winningTimestamp }
            .map(\.row)
        guard let first = winningRows.first,
            winningRows.allSatisfy({ sameWindow(first, $0) })
        else {
            throw DepthError.decoding("inconsistent recent participation metadata")
        }
        guard first.source == "nflverse-pfr" else {
            throw DepthError.decoding("unknown recent participation source: \(first.source)")
        }

        return RecentParticipation(
            teamId: first.teamId,
            season: season,
            windowStartWeek: first.windowStartWeek,
            windowEndWeek: first.windowEndWeek,
            gameIds: first.windowGameIds,
            source: "nflverse / Pro Football Reference",
            updatedAt: first.updatedAt,
            players: winningRows.map(mapPlayer).sorted { $0.playerId < $1.playerId }
        )
    }

    private static func parseTimestamp(_ value: String) -> Date? {
        let fractional = ISO8601DateFormatter()
        fractional.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = fractional.date(from: value) { return date }
        return ISO8601DateFormatter().date(from: value)
    }

    private static func sameWindow(
        _ first: RecentParticipationDTO,
        _ candidate: RecentParticipationDTO
    ) -> Bool {
        first.teamId == candidate.teamId
            && first.windowStartWeek == candidate.windowStartWeek
            && first.windowEndWeek == candidate.windowEndWeek
            && first.windowGameIds == candidate.windowGameIds
            && first.games == candidate.games
            && first.source == candidate.source
    }

    private static func mapPlayer(_ row: RecentParticipationDTO) -> PlayerRecentParticipation {
        PlayerRecentParticipation(
            playerId: row.playerId,
            offense: ParticipationUnit(
                snaps: row.offenseSnaps,
                percentage: row.offensePercentage
            ),
            defense: ParticipationUnit(
                snaps: row.defenseSnaps,
                percentage: row.defensePercentage
            ),
            specialTeams: ParticipationUnit(
                snaps: row.specialTeamsSnaps,
                percentage: row.specialTeamsPercentage
            )
        )
    }
}
