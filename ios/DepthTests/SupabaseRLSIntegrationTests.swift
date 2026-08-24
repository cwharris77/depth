import Darwin
import Foundation
import Supabase
import Testing
@testable import Depth

// RLS actor-matrix tests against a real local Supabase (design spec's "Local Supabase
// for integration tests" locked decision #4 — mocks alone can't validate authorization).
// Requires `supabase start` in the depth repo first; run `npm run db:types`-adjacent
// setup is not needed here since these hit PostgREST directly, not the generated types.
//
// The 5 tables the team snapshot reads (teams, players, depth_chart_entries,
// special_teams_slots, uniforms) are fully public-read with NO owner/non-owner
// distinction (supabase/migrations/20260710140000_base_table_rls.sql: one policy per
// table, `for select to anon, authenticated using (true)`, zero INSERT/UPDATE/DELETE
// policies). So the meaningful actor matrix here is: anon and authenticated both read
// successfully (identical policy), anon and authenticated writes are both denied
// (no write policy exists), and service-role bypasses RLS entirely for both.

enum LocalSupabase {
    // The anon/publishable key is meant to be public — safe to commit, same as
    // ios/xcconfig's SUPABASE_PUBLISHABLE_KEY. Local-only demo value `supabase start`
    // prints, stable across every local Supabase project by default.
    static let url = URL(string: "http://127.0.0.1:54321")!
    static let anonKey =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"

    // The service-role key is never committed, even a well-known local-only default —
    // CLAUDE.md's blanket rule ("never commit a service-role key") has no local-vs-prod
    // carve-out, and a token that *looks* like a real service-role JWT defeats the point
    // of that rule for anyone scanning history later. `xcodebuild test` does not forward
    // host shell environment variables (or `SIMCTL_CHILD_*`) into the simulator test
    // process, so — same pattern as DepthTests/FixtureLoading.swift — this reads a
    // gitignored local file instead: create `ios/.local-service-role-key` (repo root of
    // `ios/`) with the value from `supabase status`, one line, no trailing newline.
    static func serviceRoleKey() throws -> String {
        let fileURL = URL(fileURLWithPath: #filePath)
            .deletingLastPathComponent() // DepthTests/
            .deletingLastPathComponent() // ios/
            .appendingPathComponent(".local-service-role-key")
        guard let key = try? String(contentsOf: fileURL, encoding: .utf8)
            .trimmingCharacters(in: .whitespacesAndNewlines), !key.isEmpty
        else {
            throw DepthError.validation(
                "Create ios/.local-service-role-key (gitignored) with the value from `supabase status` before running this suite."
            )
        }
        return key
    }

    // Each call gets its own Keychain storage key. SupabaseClient's default Auth storage
    // is a *shared* Keychain entry across every client instance in the process — without
    // this, a real session from one test's `auth.signUp()` silently overrides another
    // test's service-role Authorization header, since Postgrest sources it from
    // `auth.session` when one is present rather than the static apiKey. Caught by this
    // suite: `serviceRoleCanReadAndWrite` failed to persist a write only when run
    // alongside the `authenticated*` tests, never in isolation.
    static func client(key: String) -> SupabaseClient {
        SupabaseClient(
            supabaseURL: url,
            supabaseKey: key,
            options: .init(auth: .init(storageKey: "test-\(UUID().uuidString)"))
        )
    }

    // GitHub-hosted macOS CI runners can't run `supabase start` (Docker doesn't run
    // there — no nested virtualization), so these integration suites can't reach a
    // local Supabase stack in CI. Rather than fail the whole job, gate every test in
    // this file (and NativeAuthIntegrationTests, which shares this type) on a real
    // reachability probe of the local API port — the same "skip gracefully without
    // the infra" shape as the web CI's DB-dependent tests (.github/workflows/ci.yml).
    // Full RLS/auth coverage still runs locally before every merge per AGENTS.md's
    // verification command.
    static let isReachable: Bool = {
        let fd = socket(AF_INET, SOCK_STREAM, 0)
        guard fd >= 0 else { return false }
        defer { Darwin.close(fd) }

        var timeout = timeval(tv_sec: 1, tv_usec: 0)
        setsockopt(fd, SOL_SOCKET, SO_SNDTIMEO, &timeout, socklen_t(MemoryLayout<timeval>.size))

        var addr = sockaddr_in()
        addr.sin_len = UInt8(MemoryLayout<sockaddr_in>.size)
        addr.sin_family = sa_family_t(AF_INET)
        addr.sin_port = in_port_t(54321).bigEndian
        addr.sin_addr.s_addr = inet_addr("127.0.0.1")

        let result = withUnsafePointer(to: &addr) { pointer in
            pointer.withMemoryRebound(to: sockaddr.self, capacity: 1) { sockaddrPointer in
                connect(fd, sockaddrPointer, socklen_t(MemoryLayout<sockaddr_in>.size))
            }
        }
        return result == 0
    }()
}

// Anonymous actor — the app's real, default (unauthenticated) path.
@Test(.enabled(if: LocalSupabase.isReachable)) func anonymousCanReadTeamSnapshot() async throws {
    let repository = SupabaseDepthRepository(client: LocalSupabase.client(key: LocalSupabase.anonKey))
    let snapshot = try await repository.teamSnapshot(teamId: "bills")
    #expect(snapshot.team.id == "bills")
    #expect(!snapshot.players.isEmpty)
}

@Test(.enabled(if: LocalSupabase.isReachable)) func anonymousCanReadNflverseMarketSchedule() async throws {
    let repository = SupabaseDepthRepository(client: LocalSupabase.client(key: LocalSupabase.anonKey))
    let schedule = try await repository.teamSchedule(teamId: "bills", season: 2025)
    let market = try #require(schedule.games.first(where: { $0.week == 1 })?.market)

    #expect(market.teamMoneyline == 110)
    #expect(market.opponentMoneyline == -130)
    #expect(market.teamSpread == 1.5)
    #expect(market.totalLine == 50.5)
    #expect(market.source == .nflverse)
    #expect(market.updatedAt != nil)
}

// RLS denies an UPDATE by row-filtering, not by throwing: with no USING policy the row
// simply isn't visible to update, so PostgREST returns 200 with zero affected rows —
// the same shape as a real "no rows matched the WHERE clause" update. Asserting on the
// returned representation (empty array) is the correct check, not `#expect(throws:)`.
@Test(.enabled(if: LocalSupabase.isReachable)) func anonymousWriteToTeamsIsDenied() async throws {
    let client = LocalSupabase.client(key: LocalSupabase.anonKey)
    struct NameOnly: Decodable { let id: String; let name: String }
    let response: [NameOnly] = try await client.from("teams")
        .update(["name": "HackedByAnon"]).eq("id", value: "bills")
        .select("id, name").execute().value
    #expect(response.isEmpty, "RLS should filter the row out of the update entirely")
}

// Authenticated actor — same public-read policy as anon on these 5 tables; there is no
// owner/non-owner distinction to test until depth_overrides ships (T7).
@Test(.enabled(if: LocalSupabase.isReachable)) func authenticatedNonOwnerCanReadTeamSnapshotIdenticallyToAnon() async throws {
    let email = "t4-rls-\(UUID().uuidString)@example.com"
    let authClient = LocalSupabase.client(key: LocalSupabase.anonKey)
    _ = try await authClient.auth.signUp(email: email, password: "test-password-123")

    let repository = SupabaseDepthRepository(client: authClient)
    let snapshot = try await repository.teamSnapshot(teamId: "bills")
    #expect(snapshot.team.id == "bills")
}

@Test(.enabled(if: LocalSupabase.isReachable)) func authenticatedWriteToTeamsIsDenied() async throws {
    let email = "t4-rls-\(UUID().uuidString)@example.com"
    let authClient = LocalSupabase.client(key: LocalSupabase.anonKey)
    _ = try await authClient.auth.signUp(email: email, password: "test-password-123")

    struct NameOnly: Decodable { let id: String; let name: String }
    let response: [NameOnly] = try await authClient.from("teams")
        .update(["name": "HackedByAuthenticated"]).eq("id", value: "bills")
        .select("id, name").execute().value
    #expect(response.isEmpty, "RLS should filter the row out of the update entirely")
}

// Owner-only override operation — one RPC call owns identity through auth.uid(), validates
// the complete ordered group before writing, and leaves the prior group intact after a
// rejected save. Random users isolate this test from parallel simulator runs.
@Test(.enabled(if: LocalSupabase.isReachable)) func overrideActorMatrixAndAtomicValidation() async throws {
    let serviceClient = LocalSupabase.client(key: try LocalSupabase.serviceRoleKey())
    let anonymousClient = LocalSupabase.client(key: LocalSupabase.anonKey)
    let ownerClient = LocalSupabase.client(key: LocalSupabase.anonKey)
    let nonOwnerClient = LocalSupabase.client(key: LocalSupabase.anonKey)
    let ownerAuth = try await ownerClient.auth.signUp(
        email: "t7-owner-\(UUID().uuidString)@example.com",
        password: "test-password-123"
    )
    let nonOwnerAuth: AuthResponse
    do {
        nonOwnerAuth = try await nonOwnerClient.auth.signUp(
            email: "t7-non-owner-\(UUID().uuidString)@example.com",
            password: "test-password-123"
        )
    } catch {
        try? await serviceClient.auth.admin.deleteUser(id: ownerAuth.user.id)
        throw error
    }

    struct UpsertParams: Encodable {
        let pTeamId: String
        let pPosition: String
        let pPlayerIds: [String]

        enum CodingKeys: String, CodingKey {
            case pTeamId = "p_team_id"
            case pPosition = "p_position"
            case pPlayerIds = "p_player_ids"
        }
    }
    struct OverrideRow: Decodable, Equatable {
        let userId: UUID
        let teamId: String
        let position: String
        let playerIds: [String]

        enum CodingKeys: String, CodingKey {
            case userId = "user_id"
            case teamId = "team_id"
            case position
            case playerIds = "player_ids"
        }
    }

    let valid = UpsertParams(
        pTeamId: "bills",
        pPosition: "QB",
        pPlayerIds: [" player-a ", "player-b"]
    )
    do {
        await #expect(throws: PostgrestError.self) {
            try await anonymousClient.rpc("upsert_depth_override_group", params: valid).execute()
        }

        try await ownerClient.rpc("upsert_depth_override_group", params: valid).execute()

        let nonOwnerRows: [OverrideRow] = try await nonOwnerClient.from("depth_overrides")
            .select("user_id, team_id, position, player_ids")
            .eq("user_id", value: ownerAuth.user.id)
            .execute().value
        #expect(nonOwnerRows.isEmpty)

        let serviceRows: [OverrideRow] = try await serviceClient.from("depth_overrides")
            .select("user_id, team_id, position, player_ids")
            .eq("user_id", value: ownerAuth.user.id)
            .execute().value
        #expect(serviceRows == [
            OverrideRow(
                userId: ownerAuth.user.id,
                teamId: "bills",
                position: "QB",
                playerIds: ["player-a", "player-b"]
            )
        ])

        let duplicate = UpsertParams(
            pTeamId: "bills",
            pPosition: "QB",
            pPlayerIds: ["player-a", "player-a"]
        )
        await #expect(throws: PostgrestError.self) {
            try await ownerClient.rpc("upsert_depth_override_group", params: duplicate).execute()
        }

        let ownerRows: [OverrideRow] = try await ownerClient.from("depth_overrides")
            .select("user_id, team_id, position, player_ids")
            .eq("team_id", value: "bills")
            .eq("position", value: "QB")
            .execute().value
        #expect(ownerRows == [
            OverrideRow(
                userId: ownerAuth.user.id,
                teamId: "bills",
                position: "QB",
                playerIds: ["player-a", "player-b"]
            )
        ])
    } catch {
        try? await serviceClient.auth.admin.deleteUser(id: ownerAuth.user.id)
        try? await serviceClient.auth.admin.deleteUser(id: nonOwnerAuth.user.id)
        throw error
    }

    try await serviceClient.auth.admin.deleteUser(id: ownerAuth.user.id)
    try await serviceClient.auth.admin.deleteUser(id: nonOwnerAuth.user.id)
}

// Service-role actor — bypasses RLS entirely (used only by ingestion, never the app).
@Test(.enabled(if: LocalSupabase.isReachable)) func serviceRoleCanReadAndWrite() async throws {
    let client = LocalSupabase.client(key: try LocalSupabase.serviceRoleKey())
    let repository = SupabaseDepthRepository(client: client)
    let snapshot = try await repository.teamSnapshot(teamId: "bills")
    #expect(snapshot.team.id == "bills")

    // Round-trip a real write to prove bypass. `defer` can't run async code, so the
    // restore is done in both the success and failure path of this do/catch instead of
    // sequentially after the assertion — the original version restored only after
    // `#expect`, which would have skipped it entirely had the write itself thrown,
    // leaving the shared seed row permanently renamed for every other test/local dev
    // session (caught in review, depth#352).
    let original = snapshot.team.name
    struct NameOnly: Decodable, Equatable { let id: String; let name: String }
    do {
        let writeResponse: [NameOnly] = try await client.from("teams")
            .update(["name": "RLS Test Write"]).eq("id", value: "bills")
            .select("id, name").execute().value
        try await client.from("teams").update(["name": original]).eq("id", value: "bills").execute()
        #expect(writeResponse == [NameOnly(id: "bills", name: "RLS Test Write")])
    } catch {
        try? await client.from("teams").update(["name": original]).eq("id", value: "bills").execute()
        throw error
    }
}

// Not-found actor-independent behavior — confirms DepthError.notFound, not a crash or a
// bare decoding failure, for a team id that doesn't exist.
@Test(.enabled(if: LocalSupabase.isReachable)) func unknownTeamIdMapsToNotFound() async throws {
    let repository = SupabaseDepthRepository(client: LocalSupabase.client(key: LocalSupabase.anonKey))
    await #expect(throws: DepthError.notFound) {
        _ = try await repository.teamSnapshot(teamId: "does-not-exist")
    }
}

// T5 additions to the repository seam — same public-read RLS shape as teamSnapshot.
@Test(.enabled(if: LocalSupabase.isReachable)) func anonymousCanReadTeamList() async throws {
    let repository = SupabaseDepthRepository(client: LocalSupabase.client(key: LocalSupabase.anonKey))
    let teams = try await repository.teams()
    #expect(teams.count == 32)
    #expect(teams.contains { $0.id == "bills" })
}

@Test(.enabled(if: LocalSupabase.isReachable)) func anonymousCanReadAppConfig() async throws {
    let repository = SupabaseDepthRepository(client: LocalSupabase.client(key: LocalSupabase.anonKey))
    let config = try await repository.appConfig()
    #expect(config.minimumSupportedBuild >= 1)
}

// app_config never grants UPDATE to anon at all (unlike teams, which grants it and
// relies on RLS to filter the row out) — Postgres denies this at the privilege level
// before RLS is even evaluated, so the failure mode here is a thrown error, not an
// empty-array response.
@Test(.enabled(if: LocalSupabase.isReachable)) func anonymousWriteToAppConfigIsDenied() async throws {
    let client = LocalSupabase.client(key: LocalSupabase.anonKey)
    await #expect(throws: (any Error).self) {
        try await client.from("app_config")
            .update(["minimum_supported_build": 999]).eq("id", value: true)
            .execute()
    }
}

// Task 8F: app_events is insert-only for clients (design spec Milestone 2B item 26,
// docs/ios-privacy-telemetry.md). No SELECT grant exists for anon/authenticated at
// all — same privilege-level (not RLS-level) denial shape as app_config's UPDATE case
// above — so the only client-visible operation is a successful, unreadable insert.

@Test(.enabled(if: LocalSupabase.isReachable)) func anonymousCanInsertAnAppEvent() async throws {
    let client = LocalSupabase.client(key: LocalSupabase.anonKey)
    try await client.from("app_events").insert(["event_name": "app_launch"]).execute()
}

// Greptile review on depth#368: an unrestricted INSERT grant would let a client set
// `created_at` explicitly, forging a timestamp that corrupts time-based aggregate
// analytics. The grant is column-restricted to event_name/error_category, so any
// attempt to also set created_at (or id) must be denied at the privilege level.
@Test(.enabled(if: LocalSupabase.isReachable)) func anonymousCannotForgeAnEventTimestamp() async throws {
    let client = LocalSupabase.client(key: LocalSupabase.anonKey)
    await #expect(throws: (any Error).self) {
        try await client.from("app_events")
            .insert(["event_name": "app_launch", "created_at": "2020-01-01T00:00:00Z"])
            .execute()
    }
}

@Test(.enabled(if: LocalSupabase.isReachable)) func anonymousCannotReadAppEvents() async throws {
    let client = LocalSupabase.client(key: LocalSupabase.anonKey)
    await #expect(throws: (any Error).self) {
        try await client.from("app_events").select().execute()
    }
}

@Test(.enabled(if: LocalSupabase.isReachable)) func insertingAnUnknownEventNameIsRejectedByTheCheckConstraint() async throws {
    let client = LocalSupabase.client(key: LocalSupabase.anonKey)
    await #expect(throws: (any Error).self) {
        try await client.from("app_events").insert(["event_name": "not_a_real_event"]).execute()
    }
}

@Test(.enabled(if: LocalSupabase.isReachable)) func insertingAnErrorCategoryWithoutTheErrorEventNameIsRejected() async throws {
    let client = LocalSupabase.client(key: LocalSupabase.anonKey)
    await #expect(throws: (any Error).self) {
        try await client.from("app_events")
            .insert(["event_name": "app_launch", "error_category": "offline"])
            .execute()
    }
}

@Test(.enabled(if: LocalSupabase.isReachable)) func serviceRoleCanInsertAndReadAppEvents() async throws {
    let client = LocalSupabase.client(key: try LocalSupabase.serviceRoleKey())
    try await client.from("app_events").insert(["event_name": "override_saved"]).execute()

    struct Row: Decodable {
        let eventName: String
        enum CodingKeys: String, CodingKey { case eventName = "event_name" }
    }
    let rows: [Row] = try await client.from("app_events")
        .select("event_name")
        .eq("event_name", value: "override_saved")
        .execute().value
    #expect(!rows.isEmpty)
}
