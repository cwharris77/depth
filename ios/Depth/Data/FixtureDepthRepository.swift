#if UITEST_FIXTURES
import Foundation

// Replays a checked-in JSON snapshot of the repository's Domain output so UI tests can run
// hermetically — no Supabase, no local stack, no network (spec:
// 2026-09-10-ios-test-data-and-snapshot-testing-design, locked decision 1). Enabled only
// when the app launches with `UI_TESTING_FIXTURE_BACKEND` (see DepthEnvironment.repository),
// and compiled under the `UITEST_FIXTURES` condition (Debug + Staging) — CI builds Staging,
// so `#if DEBUG` would vanish exactly where the hermetic suite runs.
//
// The JSON is *recorded* from the local seeded stack by DepthTests/FixtureRecordingTests
// (record -> replay), encoding the same Domain Codable conformances the SwiftData cache
// already persists. That is deliberate: nothing hand-authors the shape, so a new field on a
// Domain struct is picked up by re-running the recorder rather than by editing JSON by hand.
//
// Only the reads the hermetic UI journeys exercise need entries; a missing entry throws
// `.notFound` (or falls back to the protocol default) instead of silently rendering empty,
// so a journey that needs new data fails loudly and names the gap.
struct UITestFixtureBundle: Codable {
    var teams: [Team] = []
    /// Keyed by team id.
    var snapshots: [String: TeamSnapshot] = [:]
    /// Keyed by "teamId:season".
    var seasons: [String: TeamSnapshot] = [:]
    /// Keyed by "teamId:season" for an explicit season, "teamId:default" for the nil-season read.
    var schedules: [String: TeamSchedule] = [:]
    /// Keyed by team id.
    var teamStats: [String: TeamStatsPage] = [:]
    /// Keyed by player id.
    var playerStats: [String: [PlayerSeasonStats]] = [:]
    /// Keyed by team id.
    var recentParticipation: [String: RecentParticipation] = [:]
    /// Keyed by "teamId:season".
    var rosterLeaders: [String: RosterLeaders] = [:]
    var uniforms: [UniformListing] = []
    var appConfig: AppConfig?

    init() {}

    // Synthesized Decodable ignores property default values, so a bundle missing an
    // optional key (JSONEncoder omits a nil `appConfig`) would fail to decode. Decode
    // every key leniently so adding a field never invalidates an older recorded bundle.
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        teams = try container.decodeIfPresent([Team].self, forKey: .teams) ?? []
        snapshots = try container.decodeIfPresent([String: TeamSnapshot].self, forKey: .snapshots) ?? [:]
        seasons = try container.decodeIfPresent([String: TeamSnapshot].self, forKey: .seasons) ?? [:]
        schedules = try container.decodeIfPresent([String: TeamSchedule].self, forKey: .schedules) ?? [:]
        teamStats = try container.decodeIfPresent([String: TeamStatsPage].self, forKey: .teamStats) ?? [:]
        playerStats = try container.decodeIfPresent([String: [PlayerSeasonStats]].self, forKey: .playerStats) ?? [:]
        recentParticipation =
            try container.decodeIfPresent([String: RecentParticipation].self, forKey: .recentParticipation) ?? [:]
        rosterLeaders = try container.decodeIfPresent([String: RosterLeaders].self, forKey: .rosterLeaders) ?? [:]
        uniforms = try container.decodeIfPresent([UniformListing].self, forKey: .uniforms) ?? []
        appConfig = try container.decodeIfPresent(AppConfig.self, forKey: .appConfig)
    }
}

actor FixtureDepthRepository: DepthRepository {
    private let bundle: UITestFixtureBundle

    init(bundle: UITestFixtureBundle) {
        self.bundle = bundle
    }

    /// Loads the bundled fixture JSON. A missing/unreadable bundle is a test-harness fault,
    /// not a data condition — fail loudly rather than degrade to empty screens, which would
    /// produce confidently-wrong screenshots (the failure mode this seam exists to remove).
    static func load(bundleName: String = "UITestFixtures") -> FixtureDepthRepository {
        guard
            let url = Bundle.main.url(forResource: bundleName, withExtension: "json"),
            let data = try? Data(contentsOf: url),
            let decoded = try? JSONDecoder().decode(UITestFixtureBundle.self, from: data)
        else {
            fatalError(
                "UI_TESTING_FIXTURE_BACKEND was set but \(bundleName).json is missing or unreadable from the app bundle."
            )
        }
        return FixtureDepthRepository(bundle: decoded)
    }

    func teams() async throws -> [Team] {
        bundle.teams
    }

    func teamSnapshot(teamId: String) async throws -> TeamSnapshot {
        guard let snapshot = bundle.snapshots[teamId] else { throw DepthError.notFound }
        return snapshot
    }

    func teamSeason(teamId: String, season: Int) async throws -> TeamSnapshot {
        guard let snapshot = bundle.seasons["\(teamId):\(season)"] else { throw DepthError.notFound }
        return snapshot
    }

    func teamSchedule(teamId: String, season: Int?) async throws -> TeamSchedule {
        let key = season.map { "\(teamId):\($0)" } ?? "\(teamId):default"
        guard let schedule = bundle.schedules[key] ?? bundle.schedules["\(teamId):default"] else {
            throw DepthError.notFound
        }
        return schedule
    }

    func teamStats(teamId: String) async throws -> TeamStatsPage {
        guard let page = bundle.teamStats[teamId] else { throw DepthError.notFound }
        return page
    }

    func playerStats(playerId: String, teamId: String?) async throws -> [PlayerSeasonStats] {
        bundle.playerStats[playerId] ?? []
    }

    func recentParticipation(teamId: String) async throws -> RecentParticipation? {
        bundle.recentParticipation[teamId]
    }

    func rosterLeaders(teamId: String, season: Int) async throws -> RosterLeaders? {
        bundle.rosterLeaders["\(teamId):\(season)"]
    }

    func listUniforms() async throws -> [UniformListing] {
        bundle.uniforms
    }

    func appConfig() async throws -> AppConfig {
        guard let config = bundle.appConfig else { throw DepthError.notFound }
        return config
    }
}
#endif
