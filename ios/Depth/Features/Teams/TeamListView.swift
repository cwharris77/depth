import SwiftUI

enum TeamSearchRowPresentation {
    static func showsSeparator(after index: Int, count: Int) -> Bool {
        index + 1 < count
    }
}

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
    /// DEP-273 follow-up: the sheet's overlay close X (TeamListPickerSheet) is
    /// positioned assuming the nav bar's title band is present above the conference
    /// picker. `.searchable` collapses that title band the moment the search field is
    /// focused — before any text is typed, so `isSearching` alone doesn't catch it —
    /// and the picker (still shown; search results only replace it once there's text)
    /// slides up into the space the title used to occupy, back under the fixed X.
    /// Tracking focus lets `content` reserve that same clearance itself while focused.
    @FocusState private var isSearchFieldFocused: Bool

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
            .searchFocused($isSearchFieldFocused)
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
            // The skeleton mirrors the loaded state's structure — conference
            // picker placeholder on top, then grouped division sections — so
            // the team rows appear in the same position when data lands,
            // avoiding a jarring layout shift (AGENTS.md mistake #16).
            VStack(spacing: 0) {
                // Placeholder matching the conference picker's height and padding.
                RoundedRectangle(cornerRadius: DesignTokens.Radius.sm)
                    .fill(DesignTokens.Colors.surfacePlaceholder)
                    .frame(height: 44)
                    .padding(.horizontal)
                    .padding(.top, DesignTokens.Spacing.sm)
                    .padding(.bottom, DesignTokens.Spacing.xs)

                List {
                    ForEach(skeletonDivisions, id: \.division) { division in
                        Section(header: sectionHeader(divisionHeader(division.division))) {
                            ForEach(division.teams, id: \.self) { _ in
                                TeamRowSkeleton()
                                    .accessibilityHidden(true)
                            }
                        }
                    }
                }
                .listStyle(.plain)
                .scrollIndicators(.hidden)
                .scrollContentBackground(.hidden)
            }
            .background(DesignTokens.Colors.bg)
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
                    .frame(minWidth: 44, minHeight: 44)
                    .accessibilityIdentifier("teams-retry")
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
                        // Reserve the same clearance the nav-bar title band would
                        // otherwise give the sheet's overlay close X — the title
                        // collapses the instant the search field is focused (before
                        // any text lands and hides the picker below), so without this
                        // the picker slides up under the fixed-position X.
                        if isSearchFieldFocused {
                            Color.clear.frame(height: 44)
                        }
                        conferencePicker
                    }
                    teamList
                }
                .background(DesignTokens.Colors.bg)
            }
        }
    }

    // Mirrors the web NavSwitcher's AFC/NFC SegmentedControl — rendered with native's
    // port of that same web component (DepthSegmentedControl), not a stock
    // UISegmentedControl that paints a different pill than every other switcher.
    // Hidden while searching, same as the web.
    private var conferencePicker: some View {
        DepthSegmentedControl(
            options: [
                DepthSegmentedOption(value: "AFC", label: "AFC", identifier: "team-conference-afc"),
                DepthSegmentedOption(value: "NFC", label: "NFC", identifier: "team-conference-nfc"),
            ],
            selection: conference,
            onChange: { conference = $0 },
            // Superseded DEP-262's "app accent, not team-scoped" locked decision: the
            // conference picker's job is literally to distinguish AFC from NFC, so it
            // tints with the real NFL conference colors instead — matching web's
            // `CONFERENCE_COLORS`.
            activeColor: conference == "AFC" ? DesignTokens.Colors.conferenceAFC : DesignTokens.Colors.conferenceNFC,
            activeTextColor: Color(hex: readableTextOn(conference == "AFC" ? "#D50A0A" : "#013369")),
            // Web parity: the NavSwitcher conference picker is `fullWidth` (a standalone
            // bar over the division list), same as the Matchup/By-position and page
            // switchers.
            fullWidth: true
        )
        .padding(.horizontal)
        .padding(.top, DesignTokens.Spacing.sm)
        .padding(.bottom, DesignTokens.Spacing.xs)
        .accessibilityElement(children: .contain)
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
                    Section(header: sectionHeader("TEAMS")) {
                        ForEach(Array(viewModel.filteredTeams.enumerated()), id: \.element.id) { index, team in
                            teamRow(team)
                                .listRowSeparator(
                                    TeamSearchRowPresentation.showsSeparator(
                                        after: index,
                                        count: viewModel.filteredTeams.count
                                    ) ? .visible : .hidden,
                                    edges: .bottom
                                )
                        }
                    }
                }
                if !viewModel.playerHits.isEmpty {
                    Section(header: sectionHeader("PLAYERS")) {
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
                        ForEach(Array(division.teams.enumerated()), id: \.element.id) { index, team in
                            teamRow(team)
                                .listRowSeparator(
                                    TeamSearchRowPresentation.showsSeparator(
                                        after: index,
                                        count: division.teams.count
                                    ) ? .visible : .hidden,
                                    edges: .bottom
                                )
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
            // DEP-281: without this, the Spacer's transparent stretch between the team
            // name and the trailing checkmark doesn't register taps — only the badge
            // and text (the drawn content) did, leaving most of the visual row dead.
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        // DEP-262: row height is content-derived (36pt badge + vertical padding), which
        // shrinks under 44pt at small Dynamic Type — enforce the minimum here, matching
        // the 44pt guarantee the team-switcher pill in TeamDetailView keeps.
        .frame(minHeight: 44)
        .accessibilityIdentifier("team-row-\(team.id)")
        .listRowBackground(DesignTokens.Colors.surfaceCard2)
    }

    // Web NavSwitcher player-hit parity: a player badge in their team's accent, name,
    // and the team they play for. Tapping switches to that team and opens the player.
    @ViewBuilder
    private func playerRow(_ hit: PlayerHit) -> some View {
        // DEP-262: with no `onSelectPlayer` handler (CompareView renders TeamListView
        // without one), the old code wrapped every row in a Button that did nothing —
        // a tappable-but-dead hit. Render the row non-interactive instead.
        let label = HStack(spacing: DesignTokens.Spacing.sm) {
            playerHitAvatar(hit)
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

        Group {
            if let onSelectPlayer {
                Button {
                    onSelectPlayer(hit)
                } label: {
                    // DEP-281: same fix as teamRow above — the trailing Spacer needs an
                    // explicit hit shape or taps past the avatar/text don't register.
                    label.contentShape(Rectangle())
                }
                .buttonStyle(.plain)
            } else {
                label
            }
        }
        .frame(minHeight: 44)
        .accessibilityIdentifier("player-hit-\(hit.id)")
        .listRowBackground(DesignTokens.Colors.surfaceCard2)
    }

    // Real headshot when available (PlayerDetailView's `photo` pattern); falls back to
    // the jersey-number-on-team-accent badge, matching this row's prior always-shown
    // treatment, rather than web NavSwitcher's neutral silhouette fallback — a jersey
    // number is more informative in a dense search-result list.
    @ViewBuilder
    private func playerHitAvatar(_ hit: PlayerHit) -> some View {
        // The search-result avatar is a team-colored *fill* with the jersey number on it,
        // so it takes the jersey body and resolves its own readable label (DEP-424) rather
        // than the retired uiAccent/onAccent pair.
        let accent = Color(hex: TeamSurfaces.fill(hit.team.colors.jersey))
        let onAccent = Color(hex: TeamSurfaces.textOnFill(hit.team.colors.jersey))
        ZStack {
            Circle().fill(accent)
            if let url = hit.photoUrl.flatMap(URL.init(string:)) {
                AsyncImage(url: url) { phase in
                    if let image = phase.image {
                        image.resizable().scaledToFill()
                    } else {
                        numberBadge(hit.number, color: onAccent)
                    }
                }
                .clipShape(Circle())
            } else {
                numberBadge(hit.number, color: onAccent)
            }
        }
        // DEP-262: matches the team badge's @ScaledMetric (same base size), so the two
        // row types scale together at large Dynamic Type instead of the player-hit badge
        // staying fixed at 36pt while every team badge grows.
        .frame(width: playerBadgeSize, height: playerBadgeSize)
        .accessibilityHidden(true)
    }

    /// The player-hit avatar's scaled diameter — the same `TeamBadge.baseSize` scaling
    /// the team rows use, so the two row types stay in step at large type.
    @ScaledMetric(relativeTo: .body) private var playerBadgeSize: CGFloat = TeamBadge.baseSize

    private func numberBadge(_ number: Int, color: Color) -> some View {
        Text("\(number)")
            .font(.caption.bold())
            .foregroundStyle(color)
    }
}

private struct TeamRow: View {
    let team: Team

    var body: some View {
        HStack(spacing: DesignTokens.Spacing.sm) {
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

// Skeleton divisions that mirror the loaded state's AFC division grouping,
// so the team rows land in the same vertical position when data arrives.
// Uses the same division order as the loaded state (divisionOrder in
// TeamListView.divisions). Each division carries a placeholder team count
// matching the real AFC division size (4 teams per division).
private let skeletonDivisions = [
    (division: "East", teams: Array(repeating: 0, count: 4)),
    (division: "North", teams: Array(repeating: 0, count: 4)),
    (division: "South", teams: Array(repeating: 0, count: 4)),
    (division: "West", teams: Array(repeating: 0, count: 4)),
]

// Sized against the same scaled badge metric as `TeamRow`, so the list doesn't resize
// under the user when real rows land (AGENTS.md's flash-then-jump rule). Single line,
// matching the post-DEP-238 TeamRow (division subtitle removed).
// DEP-262: the real teamRow enforces a 44pt minimum height via .frame(minHeight: 44);
// the skeleton must match so placeholder and real rows are the same height and the
// loaded content doesn't jump when data arrives.
private struct TeamRowSkeleton: View {
    @ScaledMetric(relativeTo: .body) private var badgeSize: CGFloat = TeamBadge.baseSize
    @ScaledMetric(relativeTo: .body) private var titleHeight: CGFloat = 16

    var body: some View {
        HStack(spacing: DesignTokens.Spacing.sm) {
            Circle().fill(DesignTokens.Colors.surfacePlaceholder).frame(width: badgeSize, height: badgeSize)
            RoundedRectangle(cornerRadius: 4)
                .fill(DesignTokens.Colors.surfacePlaceholder)
                .frame(maxWidth: 140, maxHeight: titleHeight)
        }
        .padding(.vertical, 4)
        .frame(minHeight: 44)
    }
}

/// Colored initials badge with the team logo layered on when available. Fill defaults to
/// `colors.primary` with a `colors.secondary` ring (web NavSwitcher parity, DEP-237); teams
/// whose logo blends into their own primary carry a pinned override via `TeamBadgeOverride`.
/// DEP-262: the logo itself is composed through `TeamIconView` (the shared "which URL +
/// how to render a team logo" rule), not re-implemented here — this badge supplies only
/// the ring + initials fallback that TeamIconView does not own.
struct TeamBadge: View {
    /// Shared with `TeamRowSkeleton` so the placeholder and the real row scale together.
    static let baseSize: CGFloat = 36
    /// DEP-262: the logo's inset inside the circle, carried over from the old
    /// `.padding(6)` on the logo content so it keeps its gap from the ring.
    private static let logoInset: CGFloat = 6

    let team: Team

    @ScaledMetric(relativeTo: .body) private var size: CGFloat = TeamBadge.baseSize

    var body: some View {
        let backgroundColor = Color(hex: TeamBadgeOverride.backgroundColorHex(for: team))
        let ringColor = Color(hex: TeamBadgeOverride.ringColorHex(for: team))
        let onBackground = Color(hex: readableTextOn(TeamBadgeOverride.backgroundColorHex(for: team)))
        ZStack {
            Circle().fill(backgroundColor)
            if (team.logoDark ?? team.logo).flatMap(URL.init(string:)) != nil {
                // DEP-262: the logo renders through TeamIconView (the shared "which URL +
                // how to render a team logo" rule); the smaller frame keeps the old 6pt
                // inset from the ring. Its placeholder shows the initials below while the
                // first fetch completes instead of flashing an empty circle (DEP-247).
                TeamIconView(team: team, size: size - 2 * Self.logoInset) {
                    initials(onBackground)
                }
            } else {
                initials(onBackground)
            }
        }
        .frame(width: size, height: size)
        .overlay {
            Circle().strokeBorder(ringColor, lineWidth: 2)
        }
        .accessibilityHidden(true)
    }

    private func initials(_ color: Color) -> some View {
        Text(team.abbrev)
            .font(.caption2.bold())
            .foregroundStyle(color)
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
