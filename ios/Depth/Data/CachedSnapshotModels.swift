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

enum DepthCacheSchema {
    static var models: [any PersistentModel.Type] {
        [CachedTeamListEntry.self, CachedTeamSnapshot.self, CachedAppConfig.self]
    }
}
