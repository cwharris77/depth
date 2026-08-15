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

    init(service: any DepthAuthServicing) {
        self.service = service
    }

    deinit {
        observationTask?.cancel()
    }

    func start() {
        guard observationTask == nil else { return }
        observationTask = Task { [weak self, service] in
            let changes = await service.sessionChanges()
            for await user in changes {
                guard !Task.isCancelled else { return }
                self?.user = user
                self?.isRestoring = false
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
        isRestoring = false
    }

    func accept(_ user: DepthUser) {
        self.user = user
        isRestoring = false
    }

    func signOut() async throws {
        try await service.signOut()
        user = nil
    }

    func accountWasDeleted() {
        user = nil
    }
}
