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

private enum LocalSupabase {
    // Local-only demo keys `supabase start` prints — stable across every local Supabase
    // project by default, valid only against 127.0.0.1:54321. Never used outside these
    // integration tests; never a real credential.
    static let url = URL(string: "http://127.0.0.1:54321")!
    static let anonKey =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"
    static let serviceRoleKey =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU"

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
}

// Anonymous actor — the app's real, default (unauthenticated) path.
@Test func anonymousCanReadTeamSnapshot() async throws {
    let repository = SupabaseDepthRepository(client: LocalSupabase.client(key: LocalSupabase.anonKey))
    let snapshot = try await repository.teamSnapshot(teamId: "bills")
    #expect(snapshot.team.id == "bills")
    #expect(!snapshot.players.isEmpty)
}

// RLS denies an UPDATE by row-filtering, not by throwing: with no USING policy the row
// simply isn't visible to update, so PostgREST returns 200 with zero affected rows —
// the same shape as a real "no rows matched the WHERE clause" update. Asserting on the
// returned representation (empty array) is the correct check, not `#expect(throws:)`.
@Test func anonymousWriteToTeamsIsDenied() async throws {
    let client = LocalSupabase.client(key: LocalSupabase.anonKey)
    struct NameOnly: Decodable { let id: String; let name: String }
    let response: [NameOnly] = try await client.from("teams")
        .update(["name": "HackedByAnon"]).eq("id", value: "bills")
        .select("id, name").execute().value
    #expect(response.isEmpty, "RLS should filter the row out of the update entirely")
}

// Authenticated actor — same public-read policy as anon on these 5 tables; there is no
// owner/non-owner distinction to test until depth_overrides ships (T7).
@Test func authenticatedNonOwnerCanReadTeamSnapshotIdenticallyToAnon() async throws {
    let email = "t4-rls-\(UUID().uuidString)@example.com"
    let authClient = LocalSupabase.client(key: LocalSupabase.anonKey)
    _ = try await authClient.auth.signUp(email: email, password: "test-password-123")

    let repository = SupabaseDepthRepository(client: authClient)
    let snapshot = try await repository.teamSnapshot(teamId: "bills")
    #expect(snapshot.team.id == "bills")
}

@Test func authenticatedWriteToTeamsIsDenied() async throws {
    let email = "t4-rls-\(UUID().uuidString)@example.com"
    let authClient = LocalSupabase.client(key: LocalSupabase.anonKey)
    _ = try await authClient.auth.signUp(email: email, password: "test-password-123")

    struct NameOnly: Decodable { let id: String; let name: String }
    let response: [NameOnly] = try await authClient.from("teams")
        .update(["name": "HackedByAuthenticated"]).eq("id", value: "bills")
        .select("id, name").execute().value
    #expect(response.isEmpty, "RLS should filter the row out of the update entirely")
}

// Service-role actor — bypasses RLS entirely (used only by ingestion, never the app).
@Test func serviceRoleCanReadAndWrite() async throws {
    let client = LocalSupabase.client(key: LocalSupabase.serviceRoleKey)
    let repository = SupabaseDepthRepository(client: client)
    let snapshot = try await repository.teamSnapshot(teamId: "bills")
    #expect(snapshot.team.id == "bills")

    // Round-trip a real write to prove bypass, then restore the original value —
    // never leave seed data mutated for other tests/local dev use.
    let original = snapshot.team.name
    struct NameOnly: Decodable, Equatable { let id: String; let name: String }
    let writeResponse: [NameOnly] = try await client.from("teams")
        .update(["name": "RLS Test Write"]).eq("id", value: "bills")
        .select("id, name").execute().value
    #expect(writeResponse == [NameOnly(id: "bills", name: "RLS Test Write")])
    try await client.from("teams").update(["name": original]).eq("id", value: "bills").execute()
}

// Not-found actor-independent behavior — confirms DepthError.notFound, not a crash or a
// bare decoding failure, for a team id that doesn't exist.
@Test func unknownTeamIdMapsToNotFound() async throws {
    let repository = SupabaseDepthRepository(client: LocalSupabase.client(key: LocalSupabase.anonKey))
    await #expect(throws: DepthError.notFound) {
        _ = try await repository.teamSnapshot(teamId: "does-not-exist")
    }
}
