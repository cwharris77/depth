import Foundation
import Observation

// App-lifetime session projection. Supabase owns secure persistence and token refresh;
// this observable exposes only the current user so public browsing never depends on auth.
@Observable
@MainActor
final class AuthSessionStore {
    private(set) var user: DepthUser?
    private(set) var isRestoring = true

    @ObservationIgnored private let service: any DepthAuthServicing
    @ObservationIgnored private var observationTask: Task<Void, Never>?
    /// Parked `waitForRestore()` callers, resumed by `finishRestoring()`.
    @ObservationIgnored private var restoreWaiters: [CheckedContinuation<Void, Never>] = []

    init(service: any DepthAuthServicing) {
        self.service = service
    }

    deinit {
        observationTask?.cancel()
    }

    /// Awaits the initial session restore, returning immediately once it has settled.
    ///
    /// Anything that must know whether there *is* a signed-in user has to await this
    /// first: `user` is nil for the whole restore window, so reading it early reports a
    /// signed-in launch as signed out (which is what would silently drop DEP-319's
    /// favorite tier on every launch). That is also why the caller's `isSignedIn` check
    /// cannot simply be hoisted above the wait to skip it when signed out — "signed out"
    /// is not knowable until this returns.
    ///
    /// Replaces a 25ms `Task.sleep` poll loop in UserSettingsStore: that spun the main
    /// actor at 40Hz for the length of the restore, added up to a poll interval of
    /// latency on top of it, and — because `try? await Task.sleep` returns instantly on
    /// a cancelled task — degenerated into a hot spin whenever its caller was cancelled
    /// mid-restore.
    func waitForRestore() async {
        guard isRestoring else { return }
        await withCheckedContinuation { continuation in
            // Re-check inside the continuation: `finishRestoring()` may have run between
            // the guard above and this closure, and a continuation appended after the
            // last resume would never be resumed.
            guard isRestoring else { return continuation.resume() }
            restoreWaiters.append(continuation)
        }
    }

    /// The one place `isRestoring` drops, so no path can settle the session without
    /// releasing the waiters parked on it.
    private func finishRestoring() {
        isRestoring = false
        let waiters = restoreWaiters
        restoreWaiters = []
        for waiter in waiters { waiter.resume() }
    }

    func start() {
        guard observationTask == nil else { return }
        observationTask = Task { [weak self, service] in
            let changes = await service.sessionChanges()
            for await user in changes {
                guard !Task.isCancelled else { return }
                self?.user = user
                self?.finishRestoring()
            }
        }
    }

    func refresh() async {
        do {
            user = try await service.refreshSession()
        } catch DepthAuthError.unauthenticated {
            user = nil
        } catch {
            // Auto-refresh can retry transient failures. Public browsing remains available,
            // and the last known session is not erased merely because the network is down.
        }
        finishRestoring()
    }

    func accept(_ user: DepthUser) {
        self.user = user
        finishRestoring()
    }

    func signOut() async throws {
        try await service.signOut()
        user = nil
    }

    func accountWasDeleted() {
        user = nil
    }
}
