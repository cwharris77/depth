#if UITEST_FIXTURES
    import Foundation
    import Supabase
    import Testing

    @testable import Depth

    /// Dev tool, not a correctness test: times the player-stats read over the legacy
    /// `player_stats` query and over the stat files, against the active config's backends
    /// (run under the Staging scheme so both point at staging). Skipped unless
    /// `STAT_TIMING=1` (pass it, and the optional `STAT_TIMING_OFFSET`, with the
    /// `TEST_RUNNER_` prefix).
    ///
    /// TEST_RUNNER_STAT_TIMING=1 xcodebuild -project Depth.xcodeproj -scheme "Depth Stage" \
    /// -destination 'platform=iOS Simulator,id=<sim-udid>' \
    /// -only-testing:'DepthTests/statReadTiming()' test
    ///
    /// Each path gets one throwaway request to open its connection, then `samples` distinct
    /// players read with an empty HTTP cache ("cold"), then the same players again ("warm").
    /// The stat files carry Cache-Control, so their warm pass is served from `URLCache`;
    /// PostgREST responses are not cacheable, so that path's warm pass only reuses the
    /// connection. Time is from request to mapped ledger rows.
    private let shouldMeasure = ProcessInfo.processInfo.environment["STAT_TIMING"] == "1"
    private let samples = 50

    private let legacySelect =
        "season, season_type, games, completions, attempts, passing_yards, passing_tds, passing_interceptions, carries, rushing_yards, rushing_tds, receptions, targets, receiving_yards, receiving_tds, def_tackles_solo, def_sacks, def_interceptions, fg_made, fg_att, def_tackle_assists, def_tackles_for_loss, def_qb_hits, def_pass_defended, def_fumbles_forced, def_tds, def_safeties, fumble_recovery_opp, fumble_recovery_tds, punt_returns, punt_return_yards, kickoff_returns, kickoff_return_yards, special_teams_tds, penalties, penalty_yards, pat_made, pat_att, fg_long, offense_snaps, offense_pct, defense_snaps, defense_pct, special_teams_snaps, special_teams_pct, teams(abbrev)"

    private struct LegacyRow: Decodable {
        let season: Int
    }

    private func milliseconds(_ duration: Duration) -> Double {
        let parts = duration.components
        return Double(parts.seconds) * 1_000 + Double(parts.attoseconds) / 1e15
    }

    private func percentile(_ sorted: [Double], _ fraction: Double) -> Double {
        sorted[min(sorted.count - 1, Int((Double(sorted.count) * fraction).rounded(.up)) - 1)]
    }

    private func report(_ label: String, _ times: [Double]) {
        let sorted = times.sorted()
        let line = String(
            format: "STAT_TIMING %@ n=%d p50=%.0fms p95=%.0fms min=%.0fms max=%.0fms", label,
            sorted.count, percentile(sorted, 0.5), percentile(sorted, 0.95), sorted[0],
            sorted[sorted.count - 1])
        print(line)
    }

    @Test(.enabled(if: shouldMeasure))
    func statReadTiming() async throws {
        let client = DepthEnvironment.supabaseClient
        let files = DepthEnvironment.statFilesClient
        let abbrevs: [String: String] = [:]
        let clock = ContinuousClock()

        // Distinct players spread across the table, so no two samples share a position run.
        struct IdRow: Decodable {
            let playerId: String
            enum CodingKeys: String, CodingKey { case playerId = "player_id" }
        }
        let idRows: [IdRow] =
            try await client.from("player_stats").select("player_id").eq("season", value: 2025)
            .eq("season_type", value: "REG").limit(1_000).execute().value
        let unique = Array(Set(idRows.map(\.playerId))).sorted()
        try #require(unique.count >= samples)
        // STAT_TIMING_OFFSET shifts the slice so a rerun reads players no edge has cached.
        let offset = Int(ProcessInfo.processInfo.environment["STAT_TIMING_OFFSET"] ?? "") ?? 0
        let stride = unique.count / samples
        let ids = (0..<samples).map { unique[($0 * stride + offset) % unique.count] }

        func readLegacy(_ id: String) async throws -> Int {
            let rows: [LegacyRow] =
                try await client.from("player_stats").select(legacySelect)
                .eq("player_id", value: id).eq("season_type", value: "REG")
                .order("season", ascending: false).execute().value
            return rows.count
        }
        func readFiles(_ id: String) async throws -> Int {
            guard let file = try await files.playerSeasons(espnId: id) else { return 0 }
            return StatFilesMapper.map(file, teamAbbrevs: abbrevs).count
        }

        _ = try await readLegacy(ids[0])
        _ = try await readFiles(ids[0])
        URLCache.shared.removeAllCachedResponses()

        var legacyCold: [Double] = []
        var legacyWarm: [Double] = []
        var filesCold: [Double] = []
        var filesWarm: [Double] = []
        for id in ids {
            legacyCold.append(
                milliseconds(try await clock.measure { _ = try await readLegacy(id) }))
        }
        for id in ids {
            legacyWarm.append(
                milliseconds(try await clock.measure { _ = try await readLegacy(id) }))
        }
        for id in ids {
            filesCold.append(milliseconds(try await clock.measure { _ = try await readFiles(id) }))
        }
        for id in ids {
            filesWarm.append(milliseconds(try await clock.measure { _ = try await readFiles(id) }))
        }
        report("supabase cold", legacyCold)
        report("supabase warm", legacyWarm)
        report("r2 cold", filesCold)
        report("r2 warm", filesWarm)
    }
#endif
