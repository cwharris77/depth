import Foundation

// The one seam Features/ is allowed to depend on for data access — views never query
// Supabase or receive a raw client directly (design spec's Architecture section).
protocol DepthRepository: Sendable {
    func teamSnapshot(teamId: String) async throws -> TeamSnapshot
}
