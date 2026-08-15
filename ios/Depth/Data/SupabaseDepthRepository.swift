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
        color_primary, color_secondary, color_accent, ui_accent, on_accent, image_path)
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
        } catch is URLError {
            throw DepthError.offline
        } catch {
            throw DepthError.server("\(error)")
        }
    }

    private static let teamListSelect =
        "id, abbrev, city, name, conference, division, color_primary, color_secondary, color_accent, ui_accent, on_accent, logo_url, logo_dark_url"

    private static let scheduleSelect = "team_id, season"
    private static let gameSelect =
        "game_id, season, game_type, week, gameday, home_team_id, away_team_id, home_score, away_score"
    private static let playerStatsSelect =
        "season, season_type, games, completions, attempts, passing_yards, passing_tds, passing_interceptions, carries, rushing_yards, rushing_tds, receptions, targets, receiving_yards, receiving_tds, def_tackles_solo, def_sacks, def_interceptions, fg_made, fg_att, teams(abbrev)"
    private static let historicalRosterSelect =
        "season, team_id, gsis_id, name, number, position, college, height, weight, depth_rank, player_order"

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
        } catch is URLError {
            throw DepthError.offline
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
        } catch is URLError {
            throw DepthError.offline
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
        } catch is URLError {
            throw DepthError.offline
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
        } catch is URLError {
            throw DepthError.offline
        } catch {
            throw DepthError.server("\(error)")
        }
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
        } catch is URLError {
            throw DepthError.offline
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
