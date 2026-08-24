import Foundation
import Supabase

// One projected nested query loads a team snapshot (design spec locked decision #7) —
// team + depth-chart entries + special-teams slots + uniforms in a single round trip,
// replacing the web app's four-parallel-reads-plus-a-player-read pattern
// (lib/roster-source.db.ts fetchTeamRoster). Column list is explicit; `select(*)` is
// prohibited (Performance Review #1) so payload size stays bounded to what v1 renders.
actor SupabaseDepthRepository: DepthRepository {
    private let client: SupabaseClient

    init(client: SupabaseClient) {
        self.client = client
    }

    private static let teamSnapshotSelect = """
        id, abbrev, city, name, conference, division, \
        color_primary, color_secondary, color_accent, ui_accent, on_accent, logo_url, logo_dark_url, \
        depth_chart_entries(team_id, position, depth_rank, player_id, \
        player:players(id, team_id, name, number, position, status, age, college, experience, height, weight, bio, photo_url)), \
        special_teams_slots(id, team_id, label, player_id, x, y, \
        player:players(id, team_id, name, number, position, status, age, college, experience, height, weight, bio, photo_url)), \
        uniforms(id, team_id, kind, name, year_start, year_end, is_current, \
        color_primary, color_secondary, color_accent, ui_accent, on_accent, image_path), \
        team_formations(season, rank, unit, alignment, personnel, pct)
        """

    func teamSnapshot(teamId: String) async throws -> TeamSnapshot {
        // Signpost interval around the network query + JSON decode (Performance Review
        // #5/#6's "query, decode" budget: p95 <1.5s good Wi-Fi, <3s constrained).
        let signpostID = DepthSignposts.signposter.makeSignpostID()
        let state = DepthSignposts.signposter.beginInterval(DepthSignposts.teamSnapshotQuery, id: signpostID)
        defer { DepthSignposts.signposter.endInterval(DepthSignposts.teamSnapshotQuery, state) }
        do {
            let dto: TeamDTO = try await client
                .from("teams")
                .select(Self.teamSnapshotSelect)
                .eq("id", value: teamId)
                .single()
                .execute()
                .value
            return try TeamSnapshotMapper.map(dto)
        } catch let error as DepthError {
            throw error
        } catch let error as PostgrestError {
            throw Self.mapPostgrestError(error)
        } catch let error as DecodingError {
            throw DepthError.decoding("\(error)")
        } catch let error as URLError {
            throw error.isNetworkUnavailable ? DepthError.offline : DepthError.server("\(error)")
        } catch {
            throw DepthError.server("\(error)")
        }
    }

    private static let teamListSelect =
        "id, abbrev, city, name, conference, division, color_primary, color_secondary, color_accent, ui_accent, on_accent, logo_url, logo_dark_url"

    private static let teamStatsSelect =
        "season, overall_wins, overall_losses, overall_ties, home_wins, home_losses, road_wins, road_losses, division_wins, division_losses, conference_wins, conference_losses, points_for, points_against, point_differential"
    private static let teamMatchupMetricsSelect =
        "season, updated_at, games, attempts, carries, sacks_suffered, passing_epa, rushing_epa, passing_interceptions, fumbles_lost_total, def_sacks, def_qb_hits, def_interceptions, def_fumbles, def_fumbles_forced, fg_made, fg_att, pt_att, pt_net_yards, punt_returns, punt_return_yards, kickoff_returns, kickoff_return_yards, special_teams_tds"
    private static let recentParticipationSelect =
        "team_id, season, player_id, window_start_week, window_end_week, window_game_ids, games, offense_snaps, offense_pct, defense_snaps, defense_pct, special_teams_snaps, special_teams_pct, source, updated_at"
    private static let scheduleSelect = "team_id, season"
    private static let gameSelect =
        "game_id, season, game_type, week, gameday, home_team_id, away_team_id, home_score, away_score"
    private static let playerStatsSelect =
        "season, season_type, games, completions, attempts, passing_yards, passing_tds, passing_interceptions, carries, rushing_yards, rushing_tds, receptions, targets, receiving_yards, receiving_tds, def_tackles_solo, def_sacks, def_interceptions, fg_made, fg_att, teams(abbrev)"
    private static let historicalRosterSelect =
        "season, team_id, gsis_id, name, number, position, college, height, weight, depth_rank, player_order"
    private static let playerSearchSelect = """
        id, name, number, position, college, photo_url, \
        teams(id, abbrev, city, name, conference, division, color_primary, color_secondary, color_accent, ui_accent, on_accent, logo_url, logo_dark_url)
        """

    private static let uniformListingSelect =
        "id, team_id, kind, name, year_start, year_end, is_current, color_primary, color_secondary, color_accent, ui_accent, on_accent, image_path"

    func teams() async throws -> [Team] {
        do {
            let rows: [TeamListRowDTO] = try await client
                .from("teams")
                .select(Self.teamListSelect)
                .order("city")
                .execute()
                .value
            return rows.map(TeamSnapshotMapper.mapTeamListRow)
        } catch let error as PostgrestError {
            throw Self.mapPostgrestError(error)
        } catch let error as DecodingError {
            throw DepthError.decoding("\(error)")
        } catch let error as URLError {
            throw error.isNetworkUnavailable ? DepthError.offline : DepthError.server("\(error)")
        } catch {
            throw DepthError.server("\(error)")
        }
    }

    func listUniforms() async throws -> [UniformListing] {
        do {
            async let teamsResult: [TeamListRowDTO] = client
                .from("teams")
                .select(Self.teamListSelect)
                .order("city")
                .execute()
                .value
            async let uniformRows: [UniformListingRowDTO] = client
                .from("uniforms")
                .select(Self.uniformListingSelect)
                .order("team_id")
                .execute()
                .value
            let (teamRows, uniRows) = try await (teamsResult, uniformRows)
            let teamsById = Dictionary(uniqueKeysWithValues: teamRows.map { ($0.id, $0) })
            // Dangling team refs are skipped (untrusted input degrades), matching web's
            // listUniforms flatMap skip (invariant 6).
            var listings: [UniformListing] = []
            for row in uniRows {
                guard let team = teamsById[row.teamId] else { continue }
                listings.append(try TeamSnapshotMapper.mapUniformListing(row, team: TeamSnapshotMapper.mapTeamListRow(team)))
            }
            return listings
        } catch let error as DepthError {
            throw error
        } catch let error as PostgrestError {
            throw Self.mapPostgrestError(error)
        } catch let error as DecodingError {
            throw DepthError.decoding("\(error)")
        } catch let error as URLError {
            throw error.isNetworkUnavailable ? DepthError.offline : DepthError.server("\(error)")
        } catch {
            throw DepthError.server("\(error)")
        }
    }

    func teamSchedule(teamId: String, season: Int?) async throws -> TeamSchedule {
        if let season, season < TeamSchedule.earliestSeason {
            throw DepthError.validation("season")
        }
        do {
            let schedules: [ScheduleDTO] = try await client
                .from("schedules")
                .select(Self.scheduleSelect)
                .eq("team_id", value: teamId)
                .order("season", ascending: false)
                .execute()
                .value
            guard let selectedSchedule = season.map({ requested in
                schedules.first(where: { $0.season == requested })
            }) ?? schedules.first else {
                throw DepthError.notFound
            }

            async let homeGames: [GameDTO] = client
                .from("games")
                .select(Self.gameSelect)
                .eq("season", value: selectedSchedule.season)
                .eq("home_team_id", value: teamId)
                .execute()
                .value
            async let awayGames: [GameDTO] = client
                .from("games")
                .select(Self.gameSelect)
                .eq("season", value: selectedSchedule.season)
                .eq("away_team_id", value: teamId)
                .execute()
                .value
            let (home, away) = try await (homeGames, awayGames)
            let allTeams = try await teams()
            return try ScheduleMapper.map(
                schedule: selectedSchedule,
                games: home + away,
                teamsById: Dictionary(uniqueKeysWithValues: allTeams.map { ($0.id, $0) })
            )
        } catch let error as DepthError {
            throw error
        } catch let error as PostgrestError {
            throw Self.mapPostgrestError(error)
        } catch let error as DecodingError {
            throw DepthError.decoding("\(error)")
        } catch let error as URLError {
            throw error.isNetworkUnavailable ? DepthError.offline : DepthError.server("\(error)")
        } catch {
            throw DepthError.server("\(error)")
        }
    }

    func teamSeason(teamId: String, season: Int) async throws -> TeamSnapshot {
        guard (1999...currentRosterSeason()).contains(season) else {
            throw DepthError.validation("season")
        }
        do {
            let team: TeamListRowDTO = try await client
                .from("teams")
                .select(Self.teamListSelect)
                .eq("id", value: teamId)
                .single()
                .execute()
                .value
            let rows: [HistoricalRosterRowDTO] = try await client
                .from("roster_history")
                .select(Self.historicalRosterSelect)
                .eq("team_id", value: teamId)
                .eq("season", value: season)
                .order("position")
                .order("player_order")
                .execute()
                .value
            guard !rows.isEmpty else { throw DepthError.notFound }
            return try HistoricalRosterMapper.map(team: TeamSnapshotMapper.mapTeamListRow(team), rows: rows)
        } catch let error as DepthError {
            throw error
        } catch let error as PostgrestError {
            throw Self.mapPostgrestError(error)
        } catch let error as DecodingError {
            throw DepthError.decoding("\(error)")
        } catch let error as URLError {
            throw error.isNetworkUnavailable ? DepthError.offline : DepthError.server("\(error)")
        } catch {
            throw DepthError.server("\(error)")
        }
    }

    /// Stats/Compare data contract: team identity, season records, and DEP-312's bounded
    /// nflverse matchup projection are fetched concurrently through the repository seam.
    /// An unknown team id surfaces as `.notFound` (the `.single()` PGRST116 path); an
    /// empty `team_stats` result is a valid page (web's "no stats available yet" / 0-0
    /// states), not an error.
    func teamStats(teamId: String) async throws -> TeamStatsPage {
        do {
            async let teamResult: TeamListRowDTO = client
                .from("teams")
                .select(Self.teamListSelect)
                .eq("id", value: teamId)
                .single()
                .execute()
                .value
            async let statsResult: [TeamStatsRowDTO] = client
                .from("team_stats")
                .select(Self.teamStatsSelect)
                .eq("team_id", value: teamId)
                .order("season", ascending: false)
                .execute()
                .value
            async let matchupResult: [TeamMatchupMetricsDTO] = client
                .from("team_season_stats")
                .select(Self.teamMatchupMetricsSelect)
                .eq("team_id", value: teamId)
                .order("season", ascending: false)
                .execute()
                .value
            let (team, rows, matchupRows) = try await (teamResult, statsResult, matchupResult)
            return TeamStatsMapper.map(
                team: TeamSnapshotMapper.mapTeamListRow(team),
                rows: rows,
                matchupRows: matchupRows
            )
        } catch let error as DepthError {
            throw error
        } catch let error as PostgrestError {
            throw Self.mapPostgrestError(error)
        } catch let error as DecodingError {
            throw DepthError.decoding("\(error)")
        } catch let error as URLError {
            throw error.isNetworkUnavailable ? DepthError.offline : DepthError.server("\(error)")
        } catch {
            throw DepthError.server("\(error)")
        }
    }

    /// Mirrors web's bounded player_recent_snaps read: only the current source season
    /// and its predecessor cross the wire, then the pure mapper selects one complete
    /// winning ingest window and excludes stale rows.
    func recentParticipation(teamId: String) async throws -> RecentParticipation? {
        let state = TeamStatsMapper.nflSeasonState()
        let currentSeason = state.isOffseason ? state.upcomingSeason : state.upcomingSeason - 1
        do {
            let rows: [RecentParticipationDTO] = try await client
                .from("player_recent_snaps")
                .select(Self.recentParticipationSelect)
                .eq("team_id", value: teamId)
                .in("season", values: [currentSeason, currentSeason - 1])
                .execute()
                .value
            return try RecentParticipationMapper.map(rows)
        } catch let error as DepthError {
            throw error
        } catch let error as PostgrestError {
            throw Self.mapPostgrestError(error)
        } catch let error as DecodingError {
            throw DepthError.decoding("\(error)")
        } catch let error as URLError {
            throw error.isNetworkUnavailable ? DepthError.offline : DepthError.server("\(error)")
        } catch {
            throw DepthError.server("\(error)")
        }
    }

    func playerStats(playerId: String, teamId: String?) async throws -> [PlayerSeasonStats] {
        do {
            let resolvedId: String
            switch playerStatsLookup(for: playerId, teamId: teamId) {
            case .current(let playerId):
                resolvedId = playerId
            case .historical(let reference, let teamId):
                struct HistoricalStatsPlayerDTO: Decodable {
                    let espnId: String?

                    enum CodingKeys: String, CodingKey { case espnId = "espn_id" }
                }
                let row: HistoricalStatsPlayerDTO? = try await client
                    .from("roster_history")
                    .select("espn_id")
                    .eq("gsis_id", value: reference.gsisId)
                    .eq("season", value: reference.season)
                    .eq("team_id", value: teamId)
                    .maybeSingle()
                    .execute()
                    .value
                guard let espnId = row?.espnId, !espnId.isEmpty else { return [] }
                resolvedId = espnId
            case .invalidHistorical:
                return []
            }
            let rows: [PlayerSeasonStatsDTO] = try await client
                .from("player_stats")
                .select(Self.playerStatsSelect)
                .eq("player_id", value: resolvedId)
                .eq("season_type", value: "REG")
                .order("season", ascending: false)
                .execute()
                .value
            return rows.map(TeamSnapshotMapper.mapPlayerSeasonStats)
        } catch let error as PostgrestError {
            throw Self.mapPostgrestError(error)
        } catch let error as DecodingError {
            throw DepthError.decoding("\(error)")
        } catch let error as URLError {
            throw error.isNetworkUnavailable ? DepthError.offline : DepthError.server("\(error)")
        } catch {
            throw DepthError.server("\(error)")
        }
    }

    /// Web parity (searchAllPlayers): fan the normalized query across match kinds — name
    /// substring, college substring, exact position, exact number, and colloquial
    /// position groups ("OL", "secondary") — as separate queries, then merge by id and
    /// rank name-prefix-first. Each match kind runs as its own ILIKE filter rather than
    /// building one OR'd string, so user input never gets interpolated into PostgREST
    /// filter syntax.
    func searchPlayers(query: String) async throws -> [PlayerHit] {
        guard let normalized = PlayerSearch.normalizePlayerSearchQuery(query) else { return [] }
        let escaped = PlayerSearch.escapeLike(normalized)
        let limit = 8

        var searches: [Task<[PlayerSearchRowDTO], Error>] = [
            Task { try await self.playersByName(escaped, limit: limit) },
            Task { try await self.playersByCollege(escaped, limit: limit) },
            Task { try await self.playersByPosition(escaped, limit: limit) },
        ]
        if let number = Int(normalized) {
            searches.append(Task { try await self.playersByNumber(number, limit: limit) })
        }
        if let group = PlayerSearch.positionGroupPositions(normalized) {
            searches.append(Task { try await self.playersByPositions(group, limit: limit) })
        }

        do {
            // The Tasks are created up front so the queries already run in parallel;
            // collecting sequentially just waits on each in turn.
            var all: [[PlayerSearchRowDTO]] = []
            for search in searches {
                all.append(try await search.value)
            }
            var byID: [String: PlayerSearchRowDTO] = [:]
            for rows in all {
                for row in rows where byID[row.id] == nil {
                    byID[row.id] = row
                }
            }
            let hits = byID.values.compactMap(TeamSnapshotMapper.mapPlayerHit)
            return Array(PlayerSearch.rankByNameMatch(hits, query: normalized).prefix(limit))
        } catch let error as PostgrestError {
            throw Self.mapPostgrestError(error)
        } catch let error as DecodingError {
            throw DepthError.decoding("\(error)")
        } catch let error as URLError {
            throw error.isNetworkUnavailable ? DepthError.offline : DepthError.server("\(error)")
        } catch {
            throw DepthError.server("\(error)")
        }
    }

    private func playersByName(_ pattern: String, limit: Int) async throws -> [PlayerSearchRowDTO] {
        try await client
            .from("players")
            .select(Self.playerSearchSelect)
            .ilike("name", pattern: "%\(pattern)%")
            .limit(limit)
            .execute()
            .value
    }

    private func playersByCollege(_ pattern: String, limit: Int) async throws -> [PlayerSearchRowDTO] {
        try await client
            .from("players")
            .select(Self.playerSearchSelect)
            .ilike("college", pattern: "%\(pattern)%")
            .limit(limit)
            .execute()
            .value
    }

    private func playersByPosition(_ pattern: String, limit: Int) async throws -> [PlayerSearchRowDTO] {
        try await client
            .from("players")
            .select(Self.playerSearchSelect)
            .ilike("position", pattern: pattern)
            .limit(limit)
            .execute()
            .value
    }

    private func playersByNumber(_ number: Int, limit: Int) async throws -> [PlayerSearchRowDTO] {
        try await client
            .from("players")
            .select(Self.playerSearchSelect)
            .eq("number", value: number)
            .limit(limit)
            .execute()
            .value
    }

    private func playersByPositions(_ positions: [Position], limit: Int) async throws -> [PlayerSearchRowDTO] {
        try await client
            .from("players")
            .select(Self.playerSearchSelect)
            .in("position", values: positions.map(\.rawValue))
            .limit(limit)
            .execute()
            .value
    }

    func appConfig() async throws -> AppConfig {
        do {
            let dto: AppConfigDTO = try await client
                .from("app_config")
                .select("minimum_supported_build, maintenance_message")
                .single()
                .execute()
                .value
            return TeamSnapshotMapper.mapAppConfig(dto)
        } catch let error as PostgrestError {
            throw Self.mapPostgrestError(error)
        } catch let error as DecodingError {
            throw DepthError.decoding("\(error)")
        } catch let error as URLError {
            throw error.isNetworkUnavailable ? DepthError.offline : DepthError.server("\(error)")
        } catch {
            throw DepthError.server("\(error)")
        }
    }

    /// PostgREST error codes seen with `.single()` and RLS-restricted tables — see
    /// https://postgrest.org/en/stable/references/errors.html. Anything unrecognized
    /// maps to `.server` rather than being silently swallowed.
    private static func mapPostgrestError(_ error: PostgrestError) -> DepthError {
        switch error.code {
        case "PGRST116": // single() matched zero (or more than one) row
            return .notFound
        case "42501": // insufficient_privilege — RLS denied
            return .permissionDenied
        default:
            return .server(error.message)
        }
    }
}
