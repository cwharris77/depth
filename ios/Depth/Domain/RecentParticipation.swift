import Foundation

// Native mirror of web's RecentParticipation contract for DEP-313. Strings and
// optional percentages stay lossless across the shared TypeScript-oracle fixture:
// an unavailable percentage remains nil while a measured zero remains 0.
struct RecentParticipation: Equatable, Codable, Sendable {
    let teamId: String
    let season: Int
    let windowStartWeek: Int
    let windowEndWeek: Int
    let gameIds: [String]
    let source: String
    let updatedAt: String
    let players: [PlayerRecentParticipation]
}

struct PlayerRecentParticipation: Equatable, Codable, Sendable {
    let playerId: String
    let offense: ParticipationUnit
    let defense: ParticipationUnit
    let specialTeams: ParticipationUnit
}

struct ParticipationUnit: Equatable, Codable, Sendable {
    let snaps: Int
    let percentage: Double?
}
