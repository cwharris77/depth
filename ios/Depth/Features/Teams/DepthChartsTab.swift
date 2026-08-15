import SwiftUI

// Tab 1 of the app's root TabView (2026-08-15 navigation-parity spec). Owns the two
// things the old TeamListView root owned implicitly: which team is current, and when it
// is persisted. It renders TeamDetailView as the stack *root* rather than a pushed
// destination — that is the whole point of the spec ("launch straight into a team's
// depth chart"), and it removes the visible list-then-push transition the old
// `TeamListView.restoreLastTeamIfNeeded()` produced on relaunch.
struct DepthChartsTab: View {
    /// Resolved before first render from `UserPreferences.lastTeamId` — optimistically,
    /// without waiting on the team list, so the snapshot fetch starts immediately. The
    /// `.task` below re-resolves once the live ids are known and corrects a stale
    /// preference (AGENTS.md invariant 6: stale input degrades, never throws).
    @State private var teamId: String
    @State private var showSwitcher = false

    private let repository: CachingDepthRepository
    private let preferences: UserPreferences
    private let sessionStore: AuthSessionStore
    private let authService: any DepthAuthServicing
    private let overrideService: any DepthOverrideServicing
    private let events: any AppEventsRecording

    init(
        repository: CachingDepthRepository,
        preferences: UserPreferences,
        sessionStore: AuthSessionStore,
        authService: any DepthAuthServicing,
        overrideService: any DepthOverrideServicing,
        events: any AppEventsRecording = NoOpAppEventsRecorder()
    ) {
        self.repository = repository
        self.preferences = preferences
        self.sessionStore = sessionStore
        self.authService = authService
        self.overrideService = overrideService
        self.events = events
        _teamId = State(initialValue: StartupTeam.resolve(lastTeamId: preferences.lastTeamId))
    }

    var body: some View {
        NavigationStack {
            TeamDetailView(
                viewModel: TeamDetailViewModel(teamId: teamId, repository: repository, events: events),
                repository: repository,
                preferences: preferences,
                sessionStore: sessionStore,
                authService: authService,
                overrideService: overrideService,
                events: events,
                onOpenTeamSwitcher: { showSwitcher = true }
            )
            // Rebuilds the whole team-detail subtree (view model, unit picker, history,
            // overrides) when the switcher picks a different team — the SwiftUI
            // key-reset idiom, rather than mutating a view model in place.
            .id(teamId)
        }
        .sheet(isPresented: $showSwitcher) {
            TeamSwitcherSheet(
                repository: repository,
                events: events,
                selectedTeamId: teamId
            ) { selected in
                teamId = selected
            }
        }
        .task {
            // A stale `lastTeamId` (team removed or renamed between releases) would
            // otherwise strand the user on a permanently failing chart. Correcting it
            // here — after the cached/refreshed list arrives — is the only place the
            // live ids are known, and it is a no-op in the overwhelmingly common case.
            guard let teams = try? await repository.teams() else { return }
            teamId = StartupTeam.resolve(lastTeamId: teamId, validIds: teams.map(\.id))
        }
        .onChange(of: teamId, initial: true) { _, newValue in
            preferences.lastTeamId = newValue
        }
    }
}
