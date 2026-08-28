import SwiftUI

// Tab 1 of the app's root TabView (2026-08-15 navigation-parity spec). Owns the two
// things the old TeamListView root owned implicitly: which team is current, and when it
// is persisted. It renders TeamDetailView as the stack *root* rather than a pushed
// destination — that is the whole point of the spec ("launch straight into a team's
// depth chart"), and it removes the visible list-then-push transition the old
// `TeamListView.restoreLastTeamIfNeeded()` produced on relaunch.
struct DepthChartsTab: View {
    /// Resolved before first render from the user settings (favorite, if opted in) and
    /// `UserPreferences.lastTeamId` — optimistically, without waiting on the team list,
    /// so the snapshot fetch starts immediately. The `.task` below re-resolves once the
    /// live ids are known and corrects a stale preference (AGENTS.md invariant 6: stale
    /// input degrades, never throws).
    @State private var teamId: String
    @State private var showSwitcher = false
    /// A player picked from the switcher's cross-team search. Setting it alongside
    /// `teamId` lets the (recreated) TeamDetailView open that player's profile once its
    /// snapshot resolves.
    @State private var pendingPlayerID: String?
    /// DEP-280: set by a schedule-card tap (bubbled up through TeamDetailView), driving
    /// the `.navigationDestination(item:)` push below. This tab owns the NavigationStack
    /// TeamDetailView (the stack root) has none of its own, so the push lives here.
    @State private var compareRequest: ScheduleCompareRequest?

    private let repository: CachingDepthRepository
    private let preferences: UserPreferences
    private let sessionStore: AuthSessionStore
    private let overrideService: any DepthOverrideServicing
    private let events: any AppEventsRecording
    /// Receives the current team's accent so the app chrome tints with it.
    private let currentTeamStore: CurrentTeamStore
    /// DEP-319: favorite/start-on-favorite state read at launch for the favorite tier.
    private let userSettingsStore: UserSettingsStore
    /// Cross-tab "open this team" requests (today: the uniform archive's kit sheet).
    private let teamRouteStore: TeamRouteStore
    /// DEP-329: the uniform the user was viewing when they tapped "Open depth
    /// chart" from the uniform kit sheet — applied once on appear so the
    /// depth chart shows the originating kit, not whatever was last persisted.
    @State private var requestedUniformId: String?

    init(
        repository: CachingDepthRepository,
        preferences: UserPreferences,
        sessionStore: AuthSessionStore,
        overrideService: any DepthOverrideServicing,
        events: any AppEventsRecording = NoOpAppEventsRecorder(),
        currentTeamStore: CurrentTeamStore,
        userSettingsStore: UserSettingsStore,
        teamRouteStore: TeamRouteStore
    ) {
        self.repository = repository
        self.preferences = preferences
        self.sessionStore = sessionStore
        self.overrideService = overrideService
        self.events = events
        self.currentTeamStore = currentTeamStore
        self.userSettingsStore = userSettingsStore
        self.teamRouteStore = teamRouteStore
        _teamId = State(initialValue: StartupTeam.resolve(
            favoriteTeamId: userSettingsStore.favoriteTeamId,
            startOnFavorite: userSettingsStore.startOnFavorite,
            lastTeamId: preferences.lastTeamId
        ))
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
                 requestedUniformId: $requestedUniformId,
                 currentTeamStore: currentTeamStore,
                 onOpenTeamSwitcher: { showSwitcher = true },
                 onOpenCompare: { teamAId, teamBId in
                     compareRequest = ScheduleCompareRequest(teamAId: teamAId, teamBId: teamBId)
                 }
             )
            // Rebuilds the whole team-detail subtree (view model, unit picker, history,
            // overrides) when the switcher picks a different team — the SwiftUI
            // key-reset idiom, rather than mutating a view model in place.
            .id(teamId)
            // DEP-280: push Compare pre-populated with the schedule card's two teams.
            // A plain `.navigationDestination(item:)` push (not a sheet), so the pushed
            // Compare screen gets the system back chevron + edge-swipe pop — the only
            // back affordance (2026-08-23: the web-parity "Back to schedule" pill was
            // removed as a duplicate; see DEP-325, the navigation-affordance audit).
            .navigationDestination(item: $compareRequest) { request in
                CompareView(
                    repository: repository,
                    preselectedTeamIds: (a: request.teamAId, b: request.teamBId)
                )
            }
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
            // A stale `lastTeamId`/favorite (team removed or renamed between releases)
            // would otherwise strand the user on a permanently failing chart. Correcting
            // it here — after the cached/refreshed list arrives — is the only place the
            // live ids are known, and it is a no-op in the overwhelmingly common case.
            // DEP-319: the favorite tier applies once the settings row has resolved
            // (load() is a no-op while signed out, so favorites only win when one exists).
            //
            // The two reads run *concurrently*, not in sequence: `load()` parks on
            // `sessionStore.isRestoring` until the Supabase session restore settles
            // (~300ms signed out, a full token-refresh round trip signed in), and
            // awaiting it first delayed the launch team-list read — the one that warms
            // the cache the team switcher reads — by exactly that long. Opening the
            // switcher inside that window then paid a cold network read of its own
            // (behind the same auth refresh when signed in), showing the loading
            // skeleton for over a second. Starting the list read up front costs
            // nothing — the resolve below still waits on both.
            async let teamsResult = repository.teams()
            await userSettingsStore.load()
            guard let teams = try? await teamsResult else { return }
            teamId = StartupTeam.resolve(
                favoriteTeamId: userSettingsStore.favoriteTeamId,
                startOnFavorite: userSettingsStore.startOnFavorite,
                lastTeamId: teamId,
                validIds: teams.map(\.id)
            )
        }
        // Consumed (not just read) so a re-render for an unrelated reason can't re-apply
        // a request the user has since navigated away from — see TeamRouteStore.
        .onChange(of: teamRouteStore.requestedTeamId) { _, _ in
            let (teamId, uniformId) = teamRouteStore.consume()
            if let teamId {
                self.teamId = teamId
                self.requestedUniformId = uniformId
            }
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

/// DEP-280: the `.navigationDestination(item:)` payload for a schedule-card-initiated
/// compare push. `Identifiable` (not just `Equatable`) because `navigationDestination
/// (item:)` requires it; `id` combines both team ids so two different matchups are
/// treated as distinct pushes (relevant if a future compare screen ever lets you pick a
/// different game while it's still on screen — today a new tap always pops first).
private struct ScheduleCompareRequest: Identifiable, Hashable {
    let teamAId: String
    let teamBId: String
    var id: String { "\(teamAId)-\(teamBId)" }
}
