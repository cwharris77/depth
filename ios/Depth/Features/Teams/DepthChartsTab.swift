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
    /// A player picked from the switcher's cross-team search. Setting it alongside
    /// `teamId` lets the (recreated) TeamDetailView open that player's profile once its
    /// snapshot resolves.
    @State private var pendingPlayerID: String?

    private let repository: CachingDepthRepository
    private let preferences: UserPreferences
    private let sessionStore: AuthSessionStore
    private let overrideService: any DepthOverrideServicing
    private let events: any AppEventsRecording
    /// Receives the current team's accent so the app chrome tints with it.
    private let currentTeamStore: CurrentTeamStore

    init(
        repository: CachingDepthRepository,
        preferences: UserPreferences,
        sessionStore: AuthSessionStore,
        overrideService: any DepthOverrideServicing,
        events: any AppEventsRecording = NoOpAppEventsRecorder(),
        currentTeamStore: CurrentTeamStore
    ) {
        self.repository = repository
        self.preferences = preferences
        self.sessionStore = sessionStore
        self.overrideService = overrideService
        self.events = events
        self.currentTeamStore = currentTeamStore
        _teamId = State(initialValue: StartupTeam.resolve(lastTeamId: preferences.lastTeamId))
    }

    var body: some View {
        NavigationStack {
            TeamDetailView(
                viewModel: TeamDetailViewModel(teamId: teamId, repository: repository, events: events),
                repository: repository,
                preferences: preferences,
                sessionStore: sessionStore,
                overrideService: overrideService,
                events: events,
                requestedPlayerID: $pendingPlayerID,
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
            } onSelectPlayer: { hit in
                // Switch to the hit's team and hand its player to TeamDetailView (web's
                // NavSwitcher does the same: jumping to the team and opening the card).
                teamId = hit.team.id
                pendingPlayerID = hit.id
            }
            // `.sheet()` content gets a fresh UITraitCollection rather than inheriting
            // ContentView's UI_TESTING_DYNAMIC_TYPE override — see that modifier's doc
            // comment. Re-applied here so the switcher's team-row scaling (TeamBadge's
            // @ScaledMetric) actually reflects the accessibility size in real use and in
            // AccessibilityUITests.
            .modifier(UITestingDynamicTypeOverride())
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
            // Publish the accent for the root chrome tint. Fires on first render
            // (initial: true) and on every switch, so it also covers the stale-id
            // correction in `.task` above. teams() is cached after the first load.
            Task {
                let teams = (try? await repository.teams()) ?? []
                currentTeamStore.apply(teamId: newValue, from: teams)
            }
        }
    }
}
