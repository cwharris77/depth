#if UITEST_FIXTURES
    import Foundation

    // Replays a checked-in JSON snapshot of the repository's Domain output so UI tests can run
    // hermetically — no Supabase, no local stack, no network. Enabled only
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
            snapshots =
                try container.decodeIfPresent([String: TeamSnapshot].self, forKey: .snapshots)
                ?? [:]
            seasons =
                try container.decodeIfPresent([String: TeamSnapshot].self, forKey: .seasons) ?? [:]
            schedules =
                try container.decodeIfPresent([String: TeamSchedule].self, forKey: .schedules)
                ?? [:]
            teamStats =
                try container.decodeIfPresent([String: TeamStatsPage].self, forKey: .teamStats)
                ?? [:]
            playerStats =
                try container.decodeIfPresent(
                    [String: [PlayerSeasonStats]].self, forKey: .playerStats) ?? [:]
            recentParticipation =
                try container.decodeIfPresent(
                    [String: RecentParticipation].self, forKey: .recentParticipation) ?? [:]
            rosterLeaders =
                try container.decodeIfPresent([String: RosterLeaders].self, forKey: .rosterLeaders)
                ?? [:]
            uniforms = try container.decodeIfPresent([UniformListing].self, forKey: .uniforms) ?? []
            appConfig = try container.decodeIfPresent(AppConfig.self, forKey: .appConfig)
        }
    }

    actor FixtureDepthRepository: DepthRepository {
        private let bundle: UITestFixtureBundle
        private var failedTeamReads: Set<String> = []
        /// Whether `latestBigMoment` reports an event. Off unless a journey asks for it,
        /// so no other fixture run can meet the notification prompt.
        private let offersBigMoment: Bool

        init(bundle: UITestFixtureBundle, offersBigMoment: Bool = false) {
            self.bundle = bundle
            self.offersBigMoment = offersBigMoment
        }

        /// Loads the bundled fixture JSON. A missing/unreadable bundle is a test-harness fault,
        /// not a data condition — fail loudly rather than degrade to empty screens, which would
        /// produce confidently-wrong screenshots (the failure mode this seam exists to remove).
        static func load(bundleName: String = "UITestFixtures", offersBigMoment: Bool = false)
            -> FixtureDepthRepository
        {
            guard
                let url = Bundle.main.url(forResource: bundleName, withExtension: "json"),
                let data = try? Data(contentsOf: url),
                let decoded = try? JSONDecoder().decode(UITestFixtureBundle.self, from: data)
            else {
                fatalError(
                    "UI_TESTING_FIXTURE_BACKEND was set but \(bundleName).json is missing or unreadable from the app bundle."
                )
            }
            return FixtureDepthRepository(bundle: decoded, offersBigMoment: offersBigMoment)
        }

        func teams() async throws -> [Team] {
            bundle.teams
        }

        func teamSnapshot(teamId: String) async throws -> TeamSnapshot {
            if ProcessInfo.processInfo.arguments.contains("UI_TESTING_TEAM_OFFLINE_ONCE"),
                failedTeamReads.insert(teamId).inserted
            {
                throw DepthError.offline
            }
            guard let snapshot = bundle.snapshots[teamId] else { throw DepthError.notFound }
            return snapshot
        }

        func teamSeason(teamId: String, season: Int) async throws -> TeamSnapshot {
            guard let snapshot = bundle.seasons["\(teamId):\(season)"] else {
                throw DepthError.notFound
            }
            return snapshot
        }

        func teamSchedule(teamId: String, season: Int?) async throws -> TeamSchedule {
            let key = season.map { "\(teamId):\($0)" } ?? "\(teamId):default"
            guard let schedule = bundle.schedules[key] ?? bundle.schedules["\(teamId):default"]
            else {
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

        /// Cross-team player search over every snapshot in the bundle. Without this the protocol
        /// default (`[]`) applies, and the switcher's player search silently returns nothing on
        /// the hermetic backend — which made the cross-team "jump to that player's team and open
        /// the profile" path untestable off a live database. Mirrors the match kinds
        /// SupabaseDepthRepository fans across Postgres (name, college, exact position, jersey
        /// number, colloquial position group) with the same ranking and 8-hit limit, in memory.
        func searchPlayers(query: String) async throws -> [PlayerHit] {
            guard let normalized = PlayerSearch.normalizePlayerSearchQuery(query) else { return [] }
            let needle = normalized.lowercased()
            let number = Int(normalized)
            let group = PlayerSearch.positionGroupPositions(normalized)
            var byID: [String: PlayerHit] = [:]
            for snapshot in bundle.snapshots.values {
                for player in snapshot.players where byID[player.id] == nil {
                    let matches =
                        player.name.lowercased().contains(needle)
                        || player.college.lowercased().contains(needle)
                        || player.position.rawValue.lowercased() == needle
                        || number == player.number
                        || group?.contains(player.position) == true
                    guard matches else { continue }
                    byID[player.id] = PlayerHit(
                        id: player.id, name: player.name, number: player.number,
                        position: player.position, college: player.college,
                        photoUrl: player.photoUrl, team: snapshot.team
                    )
                }
            }
            // Dictionary iteration order is unspecified; the name-prefix-first rank makes the
            // returned order deterministic anyway, exactly as it does on the Supabase path.
            return Array(
                PlayerSearch.rankByNameMatch(Array(byID.values), query: normalized).prefix(8))
        }

        func rosterLeaders(teamId: String, season: Int) async throws -> RosterLeaders? {
            bundle.rosterLeaders["\(teamId):\(season)"]
        }

        func listUniforms() async throws -> [UniformListing] {
            bundle.uniforms
        }

        /// Synthesized, not recorded: the prompt only shows an event from the last few
        /// days, which a checked-in timestamp could not stay.
        func latestBigMoment(teamId: String) async throws -> TeamEvent? {
            guard offersBigMoment, let team = bundle.teams.first(where: { $0.id == teamId })
            else { return nil }
            return TeamEvent(
                id: "fixture-big-moment", type: "starter_change", tier: "big_moments",
                teamId: teamId, headline: "\(team.name): a new starter at quarterback",
                detail: "A sample event from the UI-test fixtures.", source: "fixture",
                occurredAt: Date().addingTimeInterval(-24 * 60 * 60))
        }

        enum FixtureEventID {
            static let starter = "fixture-event-starter"
            static let historic = "fixture-event-historic"
            static let departed = "fixture-event-departed"
        }

        /// Events cover starter changes, a historic week, a record chase and a player
        /// who has left the roster, so journeys can reach each kind of destination.
        func teamEvents(teamId: String) async throws -> [TeamEvent] {
            if ProcessInfo.processInfo.arguments.contains("UI_TESTING_FEED_EMPTY") { return [] }
            if ProcessInfo.processInfo.arguments.contains("UI_TESTING_FEED_OFFLINE") {
                throw DepthError.offline
            }
            guard let snapshot = bundle.snapshots[teamId] else { return [] }
            let clockKey = "uiTesting.teamEventsTimestamp"
            if UserDefaults.standard.object(forKey: clockKey) == nil {
                UserDefaults.standard.set(Date().timeIntervalSince1970, forKey: clockKey)
            }
            let now = Date(timeIntervalSince1970: UserDefaults.standard.double(forKey: clockKey))
            var events: [TeamEvent] = []
            if let quarterback = snapshot.players.first(where: { $0.position == .qb }) {
                events.append(
                    TeamEvent(
                        id: FixtureEventID.starter, type: "starter_change", tier: "big_moments",
                        teamId: teamId, playerId: quarterback.id,
                        headline:
                            "\(snapshot.team.name): \(quarterback.name) is the new starter at QB",
                        detail: "Replaces a sample player.",
                        payload: {
                            var payload = TeamEventPayload()
                            payload.position = "QB"
                            payload.playerName = quarterback.name
                            return payload
                        }(),
                        source: "espn_depth_chart", occurredAt: now.addingTimeInterval(-3600)))
            }
            if let back = snapshot.players.first(where: { $0.position == .rb }) {
                events.append(
                    TeamEvent(
                        id: FixtureEventID.historic, type: "historic_week", tier: "big_moments",
                        teamId: teamId, playerId: back.id,
                        headline:
                            "\(back.name) had 251 rushing yards in Week 4, the 9th-most in a game since 1999",
                        detail: nil,
                        payload: {
                            var payload = TeamEventPayload()
                            payload.stat = "rushing_yards"
                            payload.value = 251
                            payload.rank = 9
                            payload.week = 4
                            payload.fromSeason = 1999
                            return payload
                        }(),
                        source: "nflverse_stats", occurredAt: now.addingTimeInterval(-86_400)))
            }
            events.append(
                TeamEvent(
                    id: FixtureEventID.departed, type: "trade", tier: "big_moments",
                    teamId: teamId, playerId: "fixture-departed-player",
                    headline: "\(snapshot.team.name) traded WR Sample Player", detail: nil,
                    payload: {
                        var payload = TeamEventPayload()
                        payload.direction = "out"
                        payload.position = "WR"
                        return payload
                    }(),
                    source: "espn_transactions", occurredAt: now.addingTimeInterval(-172_800)))
            if let player = snapshot.players.first(where: { $0.position == .qb }) {
                var payload = TeamEventPayload()
                payload.value = 4900
                payload.record = 5000
                payload.season = 2026
                events.append(
                    TeamEvent(
                        id: "fixture-event-chase", type: "record_chase", tier: "big_moments",
                        teamId: teamId, playerId: player.id,
                        headline: "\(player.name) is approaching the passing yards record",
                        detail: nil, payload: payload, source: "nflverse_stats",
                        occurredAt: now.addingTimeInterval(-7200)))
            }
            if let player = snapshot.players.first(where: { $0.position == .de }) {
                var payload = TeamEventPayload()
                payload.position = "DE"
                events.append(
                    TeamEvent(
                        id: "fixture-event-defense", type: "starter_change", tier: "big_moments",
                        teamId: teamId, playerId: player.id,
                        headline: "\(player.name) is the new starter at DE", detail: nil,
                        payload: payload, source: "espn_depth_chart",
                        occurredAt: now.addingTimeInterval(-4000)))
            }
            return events.sorted { $0.occurredAt > $1.occurredAt }
        }

        func appConfig() async throws -> AppConfig {
            guard let config = bundle.appConfig else { throw DepthError.notFound }
            return config
        }
    }
#endif
