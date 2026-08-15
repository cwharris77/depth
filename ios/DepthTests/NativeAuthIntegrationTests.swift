import Foundation
import Supabase
import Testing

@testable import Depth

// Full native account journey against `supabase start` and Mailpit: real SDK OTP, owner RPC,
// fresh-AMR Edge Function deletion, and cascade verification. The current local CLI runtime
// auto-discovers account-delete; no separate `supabase functions serve` process is required.
// Every run owns a random user.
@Test(.enabled(if: LocalSupabase.isReachable)) func nativeOtpOverrideAndDeletionJourney() async throws {
    let serviceClient = LocalSupabase.client(key: try LocalSupabase.serviceRoleKey())
    let appClient = LocalSupabase.client(key: LocalSupabase.anonKey)
    let email = "t7-native-\(UUID().uuidString)@example.com".lowercased()
    let fixtureUser = try await serviceClient.auth.admin.createUser(
        attributes: AdminUserAttributes(email: email, emailConfirm: true)
    )

    do {
        let authService = SupabaseDepthAuthService(client: appClient)
        let overrideService = SupabaseDepthOverrideService(client: appClient)
        try await authService.sendEmailOtp(to: email, shouldCreateUser: false)
        let code = try await localMailpitCode(for: email)
        let user = try await authService.verifyEmailOtp(email: email, code: code)
        #expect(user.id == fixtureUser.id)

        try await overrideService.save(
            teamId: "bills",
            position: "QB",
            playerIds: ["native-player-a", "native-player-b"]
        )
        let loadedOrders = try await overrideService.load(teamId: "bills")
        #expect(loadedOrders[.qb] == ["native-player-a", "native-player-b"])
        try await authService.deleteAccount()

        await #expect(throws: AuthError.self) {
            _ = try await serviceClient.auth.admin.getUserById(fixtureUser.id)
        }

        struct OverrideId: Decodable { let userId: UUID }
        let remaining: [OverrideId] = try await serviceClient.from("depth_overrides")
            .select("user_id")
            .eq("user_id", value: fixtureUser.id)
            .execute().value
        #expect(remaining.isEmpty)
    } catch {
        try? await serviceClient.auth.admin.deleteUser(id: fixtureUser.id)
        throw error
    }
}

private func localMailpitCode(for email: String) async throws -> String {
    struct Inbox: Decodable { let messages: [Message] }
    struct Message: Decodable {
        let to: [Recipient]
        let subject: String
        let snippet: String

        enum CodingKeys: String, CodingKey {
            case to = "To"
            case subject = "Subject"
            case snippet = "Snippet"
        }
    }
    struct Recipient: Decodable {
        let address: String
        enum CodingKeys: String, CodingKey { case address = "Address" }
    }

    for _ in 0..<30 {
        let (data, response) = try await URLSession.shared.data(
            from: URL(string: "http://127.0.0.1:54324/api/v1/messages")!
        )
        guard let http = response as? HTTPURLResponse, http.statusCode == 200 else {
            throw DepthError.server("Mailpit unavailable")
        }
        let inbox = try JSONDecoder().decode(Inbox.self, from: data)
        if let message = inbox.messages.first(where: {
            $0.subject == "Your Depth sign-in code"
                && $0.to.contains(where: { $0.address == email })
        }), let code = sixDigitCode(in: message.snippet) {
            return code
        }
        try await Task.sleep(for: .milliseconds(100))
    }
    throw DepthError.server("OTP email did not arrive")
}

private func sixDigitCode(in text: String) -> String? {
    let expression = try? NSRegularExpression(pattern: #"\b\d{6}\b"#)
    let range = NSRange(text.startIndex..<text.endIndex, in: text)
    guard let match = expression?.firstMatch(in: text, range: range),
        let codeRange = Range(match.range, in: text)
    else { return nil }
    return String(text[codeRange])
}
