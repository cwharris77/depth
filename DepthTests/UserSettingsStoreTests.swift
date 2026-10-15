import Foundation
import Testing

@testable import Depth

// coverage for the favorite/start-on-favorite store: the partial-upsert write
// semantics (only the patched column changes), the first-favorite opt-in, and the
// signed-out cut (account-gated by RLS, so no server round-trip should happen).

/// Records the patches it receives instead of talking to Supabase.
private actor RecordingSettingsService: UserSettingsServicing {
    var patches: [UserSettingsPatch] = []
    var stored = UserSettings()

    func settings() async throws -> UserSettings { stored }

    func update(_ patch: UserSettingsPatch) async throws {
        patches.append(patch)
    }

    func recordedPatches() -> [UserSettingsPatch] { patches }

    func store(favorite: String?, startOnFavorite: Bool) {
        stored = UserSettings(
            favoriteTeamId: favorite, lastTeamId: nil, startOnFavorite: startOnFavorite)
    }
}

/// An AuthSessionStore whose restore has already settled, with an optional signed-in user.
/// `accept` takes a non-optional DepthUser, so the signed-out case settles via `refresh()`
/// failing as unauthenticated (the same path a real expired/none session takes).
@MainActor
private func settledSession(user: DepthUser? = DepthUser(id: UUID(), email: "owner@example.com"))
    async -> AuthSessionStore
{
    let service = StubAuthService(user: user)
    let store = AuthSessionStore(service: service)
    if let user {
        store.accept(user)
    } else {
        await store.refresh()
    }
    return store
}

private struct StubAuthService: DepthAuthServicing {
    let user: DepthUser?

    func sessionChanges() -> AsyncStream<DepthUser?> {
        AsyncStream { continuation in
            continuation.yield(user)
            continuation.finish()
        }
    }

    func currentUser() -> DepthUser? { user }
    func sendEmailOtp(to email: String, shouldCreateUser: Bool) async throws {}
    func verifyEmailOtp(email: String, code: String) async throws -> DepthUser {
        guard let user else { throw DepthAuthError.unauthenticated }
        return user
    }
    func refreshSession() async throws -> DepthUser {
        guard let user else { throw DepthAuthError.unauthenticated }
        return user
    }
    func signOut() async throws {}
    func deleteAccount() async throws {}
}

@Test @MainActor func firstFavoriteSendsFavoriteAndStartOnFavoriteTogether() async {
    let service = RecordingSettingsService()
    let store = UserSettingsStore(remote: service, sessionStore: await settledSession())

    await store.load()
    store.selectTeam("chiefs")
    await store.awaitPendingWrites()

    let patches = await service.recordedPatches()
    #expect(patches.count == 1)
    #expect(patches[0].columns[.favoriteTeamID] == "chiefs")
    #expect(patches[0].columns[.startOnFavorite] == "true")
    #expect(store.favoriteTeamId == "chiefs")
    #expect(store.startOnFavorite == true, "first favorite ever set opts into open-at-startup")
}

@Test @MainActor func changingFavoriteSendsOnlyTheFavoriteColumn() async {
    let service = RecordingSettingsService()
    await service.store(favorite: "chiefs", startOnFavorite: true)
    let store = UserSettingsStore(remote: service, sessionStore: await settledSession())

    await store.load()
    store.selectTeam("bills")
    await store.awaitPendingWrites()

    let patches = await service.recordedPatches()
    #expect(patches.count == 1)
    // Only the favorite column — partial upsert must leave start_on_favorite untouched.
    #expect(patches[0].columns.count == 1)
    #expect(patches[0].columns[.favoriteTeamID] == "bills")
    #expect(patches[0].columns[.startOnFavorite] == nil)
}

@Test @MainActor func clearingFavoriteSendsNull() async {
    let service = RecordingSettingsService()
    await service.store(favorite: "chiefs", startOnFavorite: true)
    let store = UserSettingsStore(remote: service, sessionStore: await settledSession())

    await store.load()
    store.selectTeam(nil)
    await store.awaitPendingWrites()

    let patches = await service.recordedPatches()
    #expect(patches.count == 1)
    // Key present with a nil value (clears the column) — `.some(nil)` distinguishes
    // "writes NULL" from "key absent".
    #expect(patches[0].columns[.favoriteTeamID] == .some(nil))
}

@Test @MainActor func startOnFavoriteToggleSendsOnlyThatColumn() async {
    let service = RecordingSettingsService()
    await service.store(favorite: "chiefs", startOnFavorite: true)
    let store = UserSettingsStore(remote: service, sessionStore: await settledSession())

    await store.load()
    store.setStartOnFavorite(false)
    await store.awaitPendingWrites()

    let patches = await service.recordedPatches()
    #expect(patches.count == 1)
    #expect(patches[0].columns.count == 1)
    #expect(patches[0].columns[.startOnFavorite] == "false")
    #expect(patches[0].columns[.favoriteTeamID] == nil)
    #expect(store.startOnFavorite == false)
}

@Test @MainActor func signedOutLoadIsANoOpAndWritesDoNotReachTheServer() async {
    let service = RecordingSettingsService()
    await service.store(favorite: "chiefs", startOnFavorite: true)
    let store = UserSettingsStore(remote: service, sessionStore: await settledSession(user: nil))

    await store.load()
    // Signed out: nothing read, defaults shown (no favorite, toggle on).
    #expect(store.favoriteTeamId == nil)
    #expect(store.startOnFavorite == true)

    store.selectTeam("bills")
    store.setStartOnFavorite(false)
    await store.awaitPendingWrites()

    let patches = await service.recordedPatches()
    #expect(patches.isEmpty, "signed out, no server write should occur (RLS-gated row)")
    // Optimistic local value still updates for the current session.
    #expect(store.favoriteTeamId == "bills")
}

@Test @MainActor func loadResolvesTheStoredRow() async {
    let service = RecordingSettingsService()
    await service.store(favorite: "chiefs", startOnFavorite: false)
    let store = UserSettingsStore(remote: service, sessionStore: await settledSession())

    await store.load()

    #expect(store.favoriteTeamId == "chiefs")
    #expect(store.startOnFavorite == false)
    #expect(store.isLoading == false)
}

// MARK: - Kept on the device

private func isolatedPreferences() throws -> UserPreferences {
    let suite = "UserSettingsStoreTests.\(UUID().uuidString)"
    let defaults = try #require(UserDefaults(suiteName: suite))
    defaults.removePersistentDomain(forName: suite)
    return UserPreferences(defaults: defaults)
}

@Test @MainActor func aSignedOutFavoriteIsKeptOnTheDevice() async throws {
    let preferences = try isolatedPreferences()
    let service = RecordingSettingsService()
    let session = await settledSession(user: nil)
    let store = UserSettingsStore(
        remote: service, sessionStore: session, preferences: preferences,
        keepsOnDevice: { true })
    #expect(store.canHoldFavorite)

    store.selectTeam("bills")
    store.setStartOnFavorite(false)
    await store.awaitPendingWrites()
    #expect(await service.recordedPatches().isEmpty)

    let relaunched = UserSettingsStore(
        remote: service, sessionStore: session, preferences: preferences,
        keepsOnDevice: { true })
    #expect(relaunched.favoriteTeamId == "bills")
    #expect(!relaunched.startOnFavorite)
    await relaunched.load()
    #expect(relaunched.favoriteTeamId == "bills")
}

@Test @MainActor func nothingIsKeptOnTheDeviceWhileThatIsOff() async throws {
    let preferences = try isolatedPreferences()
    preferences.favoriteTeamId = "bills"
    let session = await settledSession(user: nil)
    let store = UserSettingsStore(
        remote: RecordingSettingsService(), sessionStore: session, preferences: preferences)
    #expect(store.favoriteTeamId == nil)
    #expect(!store.canHoldFavorite)
    store.selectTeam("dolphins")
    #expect(preferences.favoriteTeamId == "bills")
}

@Test @MainActor func signingInToAnAccountWithoutAFavoriteGivesItTheDevices() async throws {
    let preferences = try isolatedPreferences()
    preferences.favoriteTeamId = "bills"
    preferences.startOnFavorite = false
    let service = RecordingSettingsService()
    let store = UserSettingsStore(
        remote: service, sessionStore: await settledSession(), preferences: preferences,
        keepsOnDevice: { true })

    await store.load()
    await store.awaitPendingWrites()

    #expect(store.favoriteTeamId == "bills")
    #expect(await service.recordedPatches() == [.favorite("bills", startOnFavorite: false)])
}

@Test @MainActor func theAccountsFavoriteReplacesTheDevices() async throws {
    let preferences = try isolatedPreferences()
    preferences.favoriteTeamId = "bills"
    let service = RecordingSettingsService()
    await service.store(favorite: "dolphins", startOnFavorite: false)
    let store = UserSettingsStore(
        remote: service, sessionStore: await settledSession(), preferences: preferences,
        keepsOnDevice: { true })

    await store.load()
    await store.awaitPendingWrites()

    #expect(store.favoriteTeamId == "dolphins")
    #expect(preferences.favoriteTeamId == "dolphins")
    #expect(!preferences.startOnFavorite)
    #expect(await service.recordedPatches().isEmpty)
}

@Test @MainActor func theFavoriteIsAnnouncedWhenKnownSetAndCleared() async throws {
    let preferences = try isolatedPreferences()
    preferences.favoriteTeamId = "bills"
    var announced: [String?] = []
    let store = UserSettingsStore(
        remote: RecordingSettingsService(), sessionStore: await settledSession(user: nil),
        preferences: preferences, keepsOnDevice: { true },
        onFavoriteChange: { announced.append($0) })

    await store.load()
    store.selectTeam("bills")
    store.selectTeam("dolphins")
    store.selectTeam(nil)

    #expect(announced == ["bills", "dolphins", nil])
}

@Test @MainActor func noFavoriteOptionClearsTheFavorite() async {
    let service = RecordingSettingsService()
    await service.store(favorite: "chiefs", startOnFavorite: true)
    let store = UserSettingsStore(remote: service, sessionStore: await settledSession())
    await store.load()

    let option = TeamListLeadingOption.noFavorite(in: store)
    #expect(option.isSelected == false)
    option.action()
    await store.awaitPendingWrites()

    #expect(store.favoriteTeamId == nil)
    let patches = await service.recordedPatches()
    #expect(patches.count == 1)
    #expect(patches[0].columns[.favoriteTeamID] == .some(nil))
    #expect(TeamListLeadingOption.noFavorite(in: store).isSelected == true)
}
