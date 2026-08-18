import Foundation
import SwiftData

// SwiftData persistence models for T5's versioned public snapshot cache (design spec
// locked decision #8). These never cross into Features/ — CachingDepthRepository is the
// only reader/writer, and it always hands back plain Domain structs (Code Quality Review
// #2's "keep DTO, domain, and SwiftData models separate").
//
// `schemaVersion` on every row is compared against `depthCacheSchemaVersion` on read; a
// mismatch means the on-disk shape (or the JSON payload it decodes to) may no longer
// match this build's Domain structs, so the row is discarded rather than risking a
// decode crash or silently-wrong stale data ("safe schema discard").
let depthCacheSchemaVersion = 1

@Model
final class CachedTeamListEntry {
    @Attribute(.unique) var id: String
    var abbrev: String
    var city: String
    var name: String
    var conference: String
    var division: String
    var colorPrimary: String
    var colorSecondary: String
    var colorAccent: String
    var uiAccent: String
    var onAccent: String
    var logoUrl: String?
    var logoDarkUrl: String?
    var schemaVersion: Int
    var cachedAt: Date

    init(team: Team, schemaVersion: Int, cachedAt: Date) {
        self.id = team.id
        self.abbrev = team.abbrev
        self.city = team.city
        self.name = team.name
        self.conference = team.conference
        self.division = team.division
        self.colorPrimary = team.colors.primary
        self.colorSecondary = team.colors.secondary
        self.colorAccent = team.colors.accent
        self.uiAccent = team.colors.uiAccent
        self.onAccent = team.colors.onAccent
        self.logoUrl = team.logo
        self.logoDarkUrl = team.logoDark
        self.schemaVersion = schemaVersion
        self.cachedAt = cachedAt
    }

    var team: Team {
        Team(
            id: id, city: city, name: name, abbrev: abbrev, conference: conference, division: division,
            colors: TeamColors(
                primary: colorPrimary, secondary: colorSecondary, accent: colorAccent,
                uiAccent: uiAccent, onAccent: onAccent
            ),
            logo: logoUrl, logoDark: logoDarkUrl
        )
    }
}

// One row per cached team (design spec: "cache at most all 32 teams"). The nested
// players/specialTeams/uniforms shape isn't worth modeling relationally for v1 — it's
// stored as one JSON-encoded `TeamSnapshot` payload per row, matching "no image blobs"
// (the payload holds URLs/text only).
@Model
final class CachedTeamSnapshot {
    @Attribute(.unique) var teamId: String
    var payload: Data
    var schemaVersion: Int
    var cachedAt: Date

    init(teamId: String, payload: Data, schemaVersion: Int, cachedAt: Date) {
        self.teamId = teamId
        self.payload = payload
        self.schemaVersion = schemaVersion
        self.cachedAt = cachedAt
    }
}

// Singleton row for the last-fetched app_config (update-gate fallback value).
@Model
final class CachedAppConfig {
    @Attribute(.unique) var singletonKey: String
    var minimumSupportedBuild: Int
    var maintenanceMessage: String?
    var schemaVersion: Int
    var cachedAt: Date

    static let key = "app_config"

    init(config: AppConfig, schemaVersion: Int, cachedAt: Date) {
        self.singletonKey = Self.key
        self.minimumSupportedBuild = config.minimumSupportedBuild
        self.maintenanceMessage = config.maintenanceMessage
        self.schemaVersion = schemaVersion
        self.cachedAt = cachedAt
    }

    var config: AppConfig {
        AppConfig(minimumSupportedBuild: minimumSupportedBuild, maintenanceMessage: maintenanceMessage)
    }
}

// Round-4 Stats page cache row (spec Data flow: reuse the snapshot cache layer rather
// than inventing a second one). One JSON-encoded `TeamStatsPage` per team, mirroring
// `CachedTeamSnapshot`'s payload-as-Data shape — the page is Codable and holds text/URLs
// only, so it satisfies "no image blobs" and the same safe-schema-discard read path
// (`schemaVersion` compare + trial decode) applies verbatim.
@Model
final class CachedTeamStats {
    @Attribute(.unique) var teamId: String
    var payload: Data
    var schemaVersion: Int
    var cachedAt: Date

    init(teamId: String, payload: Data, schemaVersion: Int, cachedAt: Date) {
        self.teamId = teamId
        self.payload = payload
        self.schemaVersion = schemaVersion
        self.cachedAt = cachedAt
    }
}

// DEP-248 Schedule cache row. Keyed by a `cacheKey` that folds the season into the key
// (`"\(teamId)|\(season)"`, with a sentinel for the "default/latest season" read — the
// Schedule feature's first fetch uses season == nil, so that nil-default path needs its
// own row or revisits would miss). Mirrors `CachedTeamStats`' payload-as-Data + safe
// schema-discard shape.
@Model
final class CachedTeamSchedule {
    @Attribute(.unique) var cacheKey: String
    var payload: Data
    var schemaVersion: Int
    var cachedAt: Date

    init(cacheKey: String, payload: Data, schemaVersion: Int, cachedAt: Date) {
        self.cacheKey = cacheKey
        self.payload = payload
        self.schemaVersion = schemaVersion
        self.cachedAt = cachedAt
    }
}

// Uniform-archive list cache row. The archive's all-32-kits read is stable and small
// (~105 rows of kit metadata), so it earns a cache-first row like the team list — one
// JSON-encoded `[UniformListing]` payload, same safe-schema-discard shape as the other
// cached payloads. Never crosses into Features/.
@Model
final class CachedUniformList {
    @Attribute(.unique) var cacheKey: String
    var payload: Data
    var schemaVersion: Int
    var cachedAt: Date

    init(cacheKey: String, payload: Data, schemaVersion: Int, cachedAt: Date) {
        self.cacheKey = cacheKey
        self.payload = payload
        self.schemaVersion = schemaVersion
        self.cachedAt = cachedAt
    }

    static let key = "uniforms"
}

/// Schedule cache row key. A nil `season` (the Schedule feature's "latest season" read)
/// uses a `default` sentinel so it gets its own row distinct from any concrete season.
func scheduleCacheKey(teamId: String, season: Int?) -> String {
    season.map { "\(teamId)|\($0)" } ?? "\(teamId)|default"
}

enum DepthCacheSchema {
    static var models: [any PersistentModel.Type] {
        [
            CachedTeamListEntry.self, CachedTeamSnapshot.self, CachedTeamStats.self,
            CachedTeamSchedule.self, CachedUniformList.self, CachedAppConfig.self,
        ]
    }
}
