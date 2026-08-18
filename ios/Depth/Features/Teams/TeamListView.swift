import SwiftUI

// The searchable 32-team list. This used to be the app's root screen; as of the
// 2026-08-15 navigation-parity spec (locked decision #5) it is the *content of the team
// switcher sheet* instead — "the list stops being a place you are and becomes a control
// you use". It therefore owns no NavigationStack, no navigation destination, and no
// last-team restoration: the enclosing TeamSwitcherSheet supplies the stack and chrome,
// and DepthChartsTab owns which team is current. Selection is a callback, not a push.
struct TeamListView: View {
    @State private var viewModel: TeamListViewModel
    /// AFC/NFC picker, mirroring the web NavSwitcher's segmented control (which defaults
    /// to the current team's conference). Only the selected conference's teams render,
    /// grouped by division.
    @State private var conference: String
    /// The web seeds its picker once from the current team's conference (`useState`
    /// initial value); native's conference is only known after the team list loads, so
    /// this seeds once on first load and never again (a later refresh must not undo the
    /// user's picker choice).
    @State private var didSeedConference = false

    /// Highlighted with a checkmark so the sheet shows where you are, matching the web
    /// switcher's current-team affordance.
    private let selectedTeamId: String
    private let onSelect: (String) -> Void
    private let onSelectPlayer: ((PlayerHit) -> Void)?

    init(
        repository: CachingDepthRepository,
        events: any AppEventsRecording = NoOpAppEventsRecorder(),
        selectedTeamId: String,
        onSelect: @escaping (String) -> Void,
        onSelectPlayer: ((PlayerHit) -> Void)? = nil
    ) {
        self.selectedTeamId = selectedTeamId
        self.onSelect = onSelect
        self.onSelectPlayer = onSelectPlayer
        _viewModel = State(initialValue: TeamListViewModel(repository: repository, events: events))
        // Default to AFC until the selected team's conference is known (the web's
        // NavSwitcher defaults to `team?.conference ?? 'AFC'`).
        _conference = State(initialValue: "AFC")
    }

    var body: some View {
        content
            .searchable(text: $viewModel.searchText, prompt: "Search teams and players")
            .task { await viewModel.load() }
            .task(id: viewModel.searchText) { await viewModel.searchPlayers() }
            .onChange(of: viewModel.loadState) { _, _ in
                // Seed the picker from the selected team's conference, mirroring the web
                // (which opens on the current team's conference). Exactly once — a later
                // refresh must not undo the user's picker choice.
                guard !didSeedConference,
                    let team = viewModel.filteredTeams.first(where: { $0.id == selectedTeamId }),
                    viewModel.filteredTeams.contains(where: { $0.conference == team.conference })
                else { return }
                didSeedConference = true
                conference = team.conference
            }
    }

    /// Whether the list is in search mode — the web hides the conference picker once
    /// the user types and shows flat team (and player) results instead.
    private var isSearching: Bool {
        !viewModel.searchText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    @ViewBuilder
    private var content: some View {
        switch viewModel.loadState {
        case .loading:
            // Hiding the placeholder rows keeps VoiceOver from reading eight blank
            // stand-ins, but a fully hidden screen announces nothing at all — the
            // container carries the state instead.
            List(0..<8, id: \.self) { _ in
                TeamRowSkeleton().accessibilityHidden(true)
            }
            .listStyle(.plain)
            .scrollIndicators(.hidden)
            .redacted(reason: .placeholder)
            .accessibilityElement(children: .ignore)
            .accessibilityLabel("Loading teams")
            .accessibilityIdentifier("team-list-loading")

        case .failed(let error):
            ContentUnavailableView {
                Label("Couldn't load teams", systemImage: "wifi.slash")
            } description: {
                Text(error.recoveryDescription)
            } actions: {
                Button("Retry") { Task { await viewModel.load() } }
            }

        case .loaded:
            if viewModel.filteredTeams.isEmpty && viewModel.playerHits.isEmpty {
                if viewModel.searchText.isEmpty {
                    ContentUnavailableView("No Teams", systemImage: "sportscourt")
                } else {
                    ContentUnavailableView.search(text: viewModel.searchText)
                }
            } else {
                VStack(spacing: 0) {
                    if !isSearching {
                        conferencePicker
                    }
                    teamList
                }
                .background(DesignTokens.Colors.bg)
            }
        }
    }

    // Mirrors the web NavSwitcher's AFC/NFC SegmentedControl. Hidden while searching,
    // same as the web.
    private var conferencePicker: some View {
        Picker("Conference", selection: $conference) {
            Text("AFC").tag("AFC")
            Text("NFC").tag("NFC")
        }
        .pickerStyle(.segmented)
        .padding(.horizontal)
        .padding(.top, DesignTokens.Spacing.sm)
        .padding(.bottom, DesignTokens.Spacing.xs)
        .accessibilityIdentifier("team-conference-picker")
    }

    @ViewBuilder
    private var teamList: some View {
        if isSearching {
            // Flat, filtered by the search text across every team — no conference
            // grouping (web's search results are a single flat list). Player hits from
            // any of the 32 teams sit in their own section below the team matches.
            List {
                if !viewModel.filteredTeams.isEmpty {
                    Section(header: sectionHeader("Teams")) {
                        ForEach(viewModel.filteredTeams) { team in
                            teamRow(team)
                        }
                    }
                }
                if !viewModel.playerHits.isEmpty {
                    Section(header: sectionHeader("Players")) {
                        ForEach(viewModel.playerHits) { hit in
                            playerRow(hit)
                        }
                    }
                }
            }
            .listStyle(.plain)
            .scrollIndicators(.hidden)
            .scrollContentBackground(.hidden)
        } else {
            List {
                ForEach(divisions, id: \.division) { division in
                    Section(header: sectionHeader(divisionHeader(division.division))) {
                        ForEach(division.teams) { team in
                            teamRow(team)
                        }
                    }
                }
            }
            .listStyle(.plain)
            .scrollIndicators(.hidden)
            .scrollContentBackground(.hidden)
            .refreshable { await viewModel.load() }
        }
    }

    // Web parity (components/NavSwitcher.tsx groupByDivision): the selected conference's
    // teams, division in East/North/South/West order, teams sorted by city within a
    // division.
    private var divisions: [(division: String, teams: [Team])] {
        let divisionOrder = ["East", "North", "South", "West"]
        let confTeams = viewModel.filteredTeams.filter { $0.conference == conference }
        return divisionOrder.compactMap { division in
            let teams = confTeams
                .filter { $0.division == division }
                .sorted { $0.city.localizedCaseInsensitiveCompare($1.city) == .orderedAscending }
            return teams.isEmpty ? nil : (division, teams)
        }
    }

    private func divisionHeader(_ division: String) -> String {
        "\(conference) \(division.uppercased())"
    }

    private func sectionHeader(_ title: String) -> some View {
        Text(title)
            .font(.caption)
            .foregroundStyle(DesignTokens.Colors.textMuted)
            .accessibilityAddTraits(.isHeader)
    }

    private func teamRow(_ team: Team) -> some View {
        Button {
            onSelect(team.id)
        } label: {
            HStack {
                TeamRow(team: team)
                Spacer()
                if team.id == selectedTeamId {
                    Image(systemName: "checkmark")
                        .foregroundStyle(.tint)
                        .accessibilityHidden(true)
                }
            }
        }
        .buttonStyle(.plain)
        .accessibilityIdentifier("team-row-\(team.id)")
        .listRowBackground(DesignTokens.Colors.surfaceCard2)
    }

    // Web NavSwitcher player-hit parity: a player badge in their team's accent, name,
    // and the team they play for. Tapping switches to that team and opens the player.
    private func playerRow(_ hit: PlayerHit) -> some View {
        Button {
            onSelectPlayer?(hit)
        } label: {
            HStack(spacing: 12) {
                ZStack {
                    Circle().fill(Color(hex: hit.team.colors.uiAccent))
                    Text("\(hit.number)")
                        .font(.caption.bold())
                        .foregroundStyle(Color(hex: hit.team.colors.onAccent))
                }
                .frame(width: 36, height: 36)
                .accessibilityHidden(true)
                VStack(alignment: .leading) {
                    Text(hit.name)
                        .font(.subheadline)
                    Text("\(hit.position.rawValue) · \(hit.team.city) \(hit.team.name)")
                        .font(.caption)
                        .foregroundStyle(DesignTokens.Colors.textMuted)
                }
                Spacer()
            }
            .padding(.vertical, 4)
            .accessibilityElement(children: .combine)
        }
        .buttonStyle(.plain)
        .accessibilityIdentifier("player-hit-\(hit.id)")
        .listRowBackground(DesignTokens.Colors.surfaceCard2)
    }
}

private struct TeamRow: View {
    let team: Team

    var body: some View {
        HStack(spacing: 12) {
            TeamBadge(team: team)
            // DEP-238: city + name only — the division is already the section header above
            // (a division has at most 4 teams, so it's always in view), so repeating it
            // under every row was redundant. Matches web's NavSwitcher team rows.
            Text("\(team.city) \(team.name)")
                .font(.subheadline)
        }
        .padding(.vertical, 4)
        .accessibilityElement(children: .combine)
    }
}

// Sized against the same scaled badge metric as `TeamRow`, so the list doesn't resize
// under the user when real rows land (AGENTS.md's flash-then-jump rule). Single line,
// matching the post-DEP-238 TeamRow (division subtitle removed).
private struct TeamRowSkeleton: View {
    @ScaledMetric(relativeTo: .body) private var badgeSize: CGFloat = TeamBadge.baseSize
    @ScaledMetric(relativeTo: .body) private var titleHeight: CGFloat = 16

    var body: some View {
        HStack(spacing: 12) {
            Circle().fill(.gray).frame(width: badgeSize, height: badgeSize)
            RoundedRectangle(cornerRadius: 4).fill(.gray).frame(maxWidth: 140, maxHeight: titleHeight)
        }
        .padding(.vertical, 4)
    }
}

/// Colored initials badge with the team logo layered on when available. The app never
/// bundles logo artwork and the SwiftData snapshot cache stays text/URL-only (design
/// spec: "no image blobs") — fetched logos land in TeamLogoCache (a URLCache), so an
/// already-seen logo renders instantly instead of flashing initials (DEP-247);
/// `logo`/`logoDark` stay opportunistic with these initials as the first-load or
/// URL-nil fallback.
struct TeamBadge: View {
    /// Shared with `TeamRowSkeleton` so the placeholder and the real row scale together.
    static let baseSize: CGFloat = 36

    let team: Team

    @ScaledMetric(relativeTo: .body) private var size: CGFloat = TeamBadge.baseSize

    var body: some View {
        ZStack {
            Circle().fill(Color(hex: team.colors.uiAccent))
            // DEP-239: prefer `logoDark` — the app forces an always-dark theme (and team
            // badges sit on that dark bg), so the dark-optimized ESPN variant is the right
            // asset; same reasoning as the player season-stats card using `logo_dark_url`.
            // Falls back to the light `logo` for a team with no dark variant populated.
            if let url = (team.logoDark ?? team.logo).flatMap(URL.init(string:)) {
                CachedTeamLogo(url: url) {
                    initials
                } content: { image in
                    image.resizable().scaledToFit().padding(6)
                }
            } else {
                initials
            }
        }
        .frame(width: size, height: size)
        .accessibilityHidden(true)
    }

    private var initials: some View {
        Text(team.abbrev)
            .font(.caption2.bold())
            .foregroundStyle(Color(hex: team.colors.onAccent))
    }
}

extension Color {
    /// Minimal `#RRGGBB` parser — the only hex shape `teams.color_*`/`uiAccent`/`onAccent`
    /// ever store (AGENTS.md's color-token invariants).
    init(hex: String) {
        var s = hex.trimmingCharacters(in: .whitespacesAndNewlines)
        if s.hasPrefix("#") { s.removeFirst() }
        var value: UInt64 = 0
        Scanner(string: s).scanHexInt64(&value)
        let r = Double((value >> 16) & 0xFF) / 255
        let g = Double((value >> 8) & 0xFF) / 255
        let b = Double(value & 0xFF) / 255
        self = Color(red: r, green: g, blue: b)
    }
}
