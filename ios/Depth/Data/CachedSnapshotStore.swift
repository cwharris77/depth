import Foundation
import SwiftData

// Background-actor SwiftData reader/writer for the T5 cache (design spec: "cache work
// [stays] from the main actor" — Code Quality Review #4). `@ModelActor` gives this its
// own `ModelContext` bound to the shared `ModelContainer`, so callers on any actor can
// safely await these methods without touching a `ModelContext` themselves — the one
// place in the app that reads/writes SwiftData directly.
@ModelActor
actor CachedSnapshotStore {
    func teamList() throws -> (teams: [Team], cachedAt: Date)? {
        let descriptor = FetchDescriptor<CachedTeamListEntry>()
        let rows = try modelContext.fetch(descriptor)
        guard !rows.isEmpty else { return nil }
        guard rows.allSatisfy({ $0.schemaVersion == depthCacheSchemaVersion }) else {
            for row in rows { modelContext.delete(row) }
            try modelContext.save()
            return nil
        }
        let cachedAt = rows.map(\.cachedAt).min() ?? Date()
        return (rows.map(\.team).sorted { $0.city < $1.city }, cachedAt)
    }

    func saveTeamList(_ teams: [Team], cachedAt: Date) throws {
        let existing = try modelContext.fetch(FetchDescriptor<CachedTeamListEntry>())
        for row in existing { modelContext.delete(row) }
        for team in teams {
            modelContext.insert(CachedTeamListEntry(team: team, schemaVersion: depthCacheSchemaVersion, cachedAt: cachedAt))
        }
        try modelContext.save()
    }

    func teamSnapshot(teamId: String) throws -> TeamSnapshot? {
        var descriptor = FetchDescriptor<CachedTeamSnapshot>(predicate: #Predicate { $0.teamId == teamId })
        descriptor.fetchLimit = 1
        guard let row = try modelContext.fetch(descriptor).first else { return nil }
        guard row.schemaVersion == depthCacheSchemaVersion else {
            modelContext.delete(row)
            try modelContext.save()
            return nil
        }
        guard let snapshot = try? JSONDecoder().decode(TeamSnapshot.self, from: row.payload) else {
            // Payload doesn't decode against this build's Domain structs even though the
            // version tag matched — discard rather than surface a decode crash later.
            modelContext.delete(row)
            try modelContext.save()
            return nil
        }
        return snapshot
    }

    func teamSnapshotCachedAt(teamId: String) throws -> Date? {
        var descriptor = FetchDescriptor<CachedTeamSnapshot>(predicate: #Predicate { $0.teamId == teamId })
        descriptor.fetchLimit = 1
        return try modelContext.fetch(descriptor).first?.cachedAt
    }

    func saveTeamSnapshot(_ snapshot: TeamSnapshot, teamId: String, cachedAt: Date) throws {
        let payload = try JSONEncoder().encode(snapshot)
        var descriptor = FetchDescriptor<CachedTeamSnapshot>(predicate: #Predicate { $0.teamId == teamId })
        descriptor.fetchLimit = 1
        if let existing = try modelContext.fetch(descriptor).first {
            existing.payload = payload
            existing.schemaVersion = depthCacheSchemaVersion
            existing.cachedAt = cachedAt
        } else {
            modelContext.insert(
                CachedTeamSnapshot(teamId: teamId, payload: payload, schemaVersion: depthCacheSchemaVersion, cachedAt: cachedAt)
            )
        }
        try enforceSnapshotCacheLimit()
        try modelContext.save()
    }

    /// "Cache at most all 32 teams" — evicts the oldest cached snapshot(s) beyond 32 so
    /// the cache can't grow unbounded if team ids ever change across seasons.
    private func enforceSnapshotCacheLimit(maxTeams: Int = 32) throws {
        let descriptor = FetchDescriptor<CachedTeamSnapshot>(sortBy: [SortDescriptor(\.cachedAt, order: .forward)])
        let rows = try modelContext.fetch(descriptor)
        guard rows.count > maxTeams else { return }
        for row in rows.prefix(rows.count - maxTeams) {
            modelContext.delete(row)
        }
    }

    func appConfig() throws -> AppConfig? {
        let key = CachedAppConfig.key
        var descriptor = FetchDescriptor<CachedAppConfig>(
            predicate: #Predicate { $0.singletonKey == key }
        )
        descriptor.fetchLimit = 1
        return try modelContext.fetch(descriptor).first?.config
    }

    func saveAppConfig(_ config: AppConfig, cachedAt: Date) throws {
        let key = CachedAppConfig.key
        var descriptor = FetchDescriptor<CachedAppConfig>(
            predicate: #Predicate { $0.singletonKey == key }
        )
        descriptor.fetchLimit = 1
        if let existing = try modelContext.fetch(descriptor).first {
            existing.minimumSupportedBuild = config.minimumSupportedBuild
            existing.maintenanceMessage = config.maintenanceMessage
            existing.cachedAt = cachedAt
        } else {
            modelContext.insert(CachedAppConfig(config: config, cachedAt: cachedAt))
        }
        try modelContext.save()
    }
}
