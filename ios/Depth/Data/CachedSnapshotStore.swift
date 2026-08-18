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
        // Signpost interval around the SwiftData cache read transaction (Performance
        // Review #5's "cache transaction" budget — this is the fast, warm-cache path
        // the <1s "warm cached content" budget targets).
        let signpostID = DepthSignposts.signposter.makeSignpostID()
        let state = DepthSignposts.signposter.beginInterval(DepthSignposts.teamSnapshotCacheTransaction, id: signpostID)
        defer { DepthSignposts.signposter.endInterval(DepthSignposts.teamSnapshotCacheTransaction, state) }
        guard let row = try validSnapshotRow(teamId: teamId) else { return nil }
        // Row passed the version check in validSnapshotRow — decode it for real here
        // (validSnapshotRow only trial-decodes to validate, it doesn't return the value,
        // keeping that helper cheap for teamSnapshotCachedAt's metadata-only callers).
        return try? JSONDecoder().decode(TeamSnapshot.self, from: row.payload)
    }

    /// Same validity rules as `teamSnapshot` (version check + payload decode), so a
    /// caller using this for a stale-label timestamp never sees a `cachedAt` for a row
    /// `teamSnapshot` would treat as a cache miss.
    func teamSnapshotCachedAt(teamId: String) throws -> Date? {
        try validSnapshotRow(teamId: teamId)?.cachedAt
    }

    /// Fetches the row for `teamId`, discarding (and returning nil for) anything that
    /// fails the schema-version check or doesn't decode against this build's Domain
    /// structs — the one place both read paths above apply "safe schema discard."
    private func validSnapshotRow(teamId: String) throws -> CachedTeamSnapshot? {
        var descriptor = FetchDescriptor<CachedTeamSnapshot>(predicate: #Predicate { $0.teamId == teamId })
        descriptor.fetchLimit = 1
        guard let row = try modelContext.fetch(descriptor).first else { return nil }
        guard row.schemaVersion == depthCacheSchemaVersion,
            (try? JSONDecoder().decode(TeamSnapshot.self, from: row.payload)) != nil
        else {
            modelContext.delete(row)
            try modelContext.save()
            return nil
        }
        return row
    }

    func saveTeamSnapshot(_ snapshot: TeamSnapshot, teamId: String, cachedAt: Date) throws {
        // Same cache-transaction signpost interval as the read path above, covering the
        // write side (initial network-primed save + background-refresh overwrite).
        let signpostID = DepthSignposts.signposter.makeSignpostID()
        let state = DepthSignposts.signposter.beginInterval(DepthSignposts.teamSnapshotCacheTransaction, id: signpostID)
        defer { DepthSignposts.signposter.endInterval(DepthSignposts.teamSnapshotCacheTransaction, state) }
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

    // MARK: - Team stats (round-4 Stats page)

    /// Same validity rules as `teamSnapshot` (version check + payload decode) so a stale
    /// label and a value read never disagree about whether a page is cached.
    func teamStats(teamId: String) throws -> TeamStatsPage? {
        let signpostID = DepthSignposts.signposter.makeSignpostID()
        let state = DepthSignposts.signposter.beginInterval(DepthSignposts.teamStatsCacheTransaction, id: signpostID)
        defer { DepthSignposts.signposter.endInterval(DepthSignposts.teamStatsCacheTransaction, state) }
        guard let row = try validStatsRow(teamId: teamId) else { return nil }
        return try? JSONDecoder().decode(TeamStatsPage.self, from: row.payload)
    }

    func teamStatsCachedAt(teamId: String) throws -> Date? {
        try validStatsRow(teamId: teamId)?.cachedAt
    }

    private func validStatsRow(teamId: String) throws -> CachedTeamStats? {
        var descriptor = FetchDescriptor<CachedTeamStats>(predicate: #Predicate { $0.teamId == teamId })
        descriptor.fetchLimit = 1
        guard let row = try modelContext.fetch(descriptor).first else { return nil }
        guard row.schemaVersion == depthCacheSchemaVersion,
            (try? JSONDecoder().decode(TeamStatsPage.self, from: row.payload)) != nil
        else {
            modelContext.delete(row)
            try modelContext.save()
            return nil
        }
        return row
    }

    func saveTeamStats(_ page: TeamStatsPage, teamId: String, cachedAt: Date) throws {
        let signpostID = DepthSignposts.signposter.makeSignpostID()
        let state = DepthSignposts.signposter.beginInterval(DepthSignposts.teamStatsCacheTransaction, id: signpostID)
        defer { DepthSignposts.signposter.endInterval(DepthSignposts.teamStatsCacheTransaction, state) }
        let payload = try JSONEncoder().encode(page)
        var descriptor = FetchDescriptor<CachedTeamStats>(predicate: #Predicate { $0.teamId == teamId })
        descriptor.fetchLimit = 1
        if let existing = try modelContext.fetch(descriptor).first {
            existing.payload = payload
            existing.schemaVersion = depthCacheSchemaVersion
            existing.cachedAt = cachedAt
        } else {
            modelContext.insert(
                CachedTeamStats(teamId: teamId, payload: payload, schemaVersion: depthCacheSchemaVersion, cachedAt: cachedAt)
            )
        }
        try modelContext.save()
    }

    // MARK: - Team schedule (DEP-248)

    /// Same validity rules as `teamStats` (version check + payload decode). `season` is
    /// folded into the row key so the current/default read (nil) and any historical
    /// season are separate cache entries.
    func teamSchedule(teamId: String, season: Int?) throws -> TeamSchedule? {
        let signpostID = DepthSignposts.signposter.makeSignpostID()
        let state = DepthSignposts.signposter.beginInterval(DepthSignposts.teamScheduleCacheTransaction, id: signpostID)
        defer { DepthSignposts.signposter.endInterval(DepthSignposts.teamScheduleCacheTransaction, state) }
        guard let row = try validScheduleRow(cacheKey: scheduleCacheKey(teamId: teamId, season: season)) else { return nil }
        return try? JSONDecoder().decode(TeamSchedule.self, from: row.payload)
    }

    func teamScheduleCachedAt(teamId: String, season: Int?) throws -> Date? {
        try validScheduleRow(cacheKey: scheduleCacheKey(teamId: teamId, season: season))?.cachedAt
    }

    private func validScheduleRow(cacheKey: String) throws -> CachedTeamSchedule? {
        var descriptor = FetchDescriptor<CachedTeamSchedule>(predicate: #Predicate { $0.cacheKey == cacheKey })
        descriptor.fetchLimit = 1
        guard let row = try modelContext.fetch(descriptor).first else { return nil }
        guard row.schemaVersion == depthCacheSchemaVersion,
            (try? JSONDecoder().decode(TeamSchedule.self, from: row.payload)) != nil
        else {
            modelContext.delete(row)
            try modelContext.save()
            return nil
        }
        return row
    }

    func saveTeamSchedule(_ schedule: TeamSchedule, teamId: String, season: Int?, cachedAt: Date) throws {
        let signpostID = DepthSignposts.signposter.makeSignpostID()
        let state = DepthSignposts.signposter.beginInterval(DepthSignposts.teamScheduleCacheTransaction, id: signpostID)
        defer { DepthSignposts.signposter.endInterval(DepthSignposts.teamScheduleCacheTransaction, state) }
        let payload = try JSONEncoder().encode(schedule)
        try upsertScheduleRow(cacheKey: scheduleCacheKey(teamId: teamId, season: season), payload: payload, cachedAt: cachedAt)
    }

    /// The current-season (nil) read also primes a row under the resolved concrete
    /// season, so a later `teamSchedule(teamId, season: N)` is warm too.
    func saveDefaultSeasonSchedule(_ schedule: TeamSchedule, teamId: String, cachedAt: Date) throws {
        let payload = try JSONEncoder().encode(schedule)
        try upsertScheduleRow(cacheKey: scheduleCacheKey(teamId: teamId, season: nil), payload: payload, cachedAt: cachedAt)
        try upsertScheduleRow(cacheKey: scheduleCacheKey(teamId: teamId, season: schedule.season), payload: payload, cachedAt: cachedAt)
    }

    private func upsertScheduleRow(cacheKey: String, payload: Data, cachedAt: Date) throws {
        var descriptor = FetchDescriptor<CachedTeamSchedule>(predicate: #Predicate { $0.cacheKey == cacheKey })
        descriptor.fetchLimit = 1
        if let existing = try modelContext.fetch(descriptor).first {
            existing.payload = payload
            existing.schemaVersion = depthCacheSchemaVersion
            existing.cachedAt = cachedAt
        } else {
            modelContext.insert(
                CachedTeamSchedule(cacheKey: cacheKey, payload: payload, schemaVersion: depthCacheSchemaVersion, cachedAt: cachedAt)
            )
        }
        try modelContext.save()
    }

    func appConfig() throws -> AppConfig? {
        let key = CachedAppConfig.key
        var descriptor = FetchDescriptor<CachedAppConfig>(
            predicate: #Predicate { $0.singletonKey == key }
        )
        descriptor.fetchLimit = 1
        guard let row = try modelContext.fetch(descriptor).first else { return nil }
        guard row.schemaVersion == depthCacheSchemaVersion else {
            // A future app_config contract change (safe schema discard, same as the
            // snapshot/list caches) must not let a differently-shaped old value reach
            // the update gate.
            modelContext.delete(row)
            try modelContext.save()
            return nil
        }
        return row.config
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
            existing.schemaVersion = depthCacheSchemaVersion
            existing.cachedAt = cachedAt
        } else {
            modelContext.insert(CachedAppConfig(config: config, schemaVersion: depthCacheSchemaVersion, cachedAt: cachedAt))
        }
        try modelContext.save()
    }
}
