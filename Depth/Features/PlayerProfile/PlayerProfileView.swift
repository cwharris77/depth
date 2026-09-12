import SwiftUI

// The one "everything about one player" screen (2026-09-10 design spec; merged with the
// player card by the 2026-09-11 merge spec): identity, vitals, the position's depth chart,
// season-by-season stats, bio, and accolades. Pushed from the depth-chart field and from
// Compare's PlayerCell — there is no quick-glance card any more, and reordering lives in
// the edit-mode PositionReorderSheet. A NavigationStack push, not a sheet, so it composes
// into whatever stack pushed it rather than owning its own dismiss chrome.
//
// Layout is Claude Design "Player Profile" option 2 (2026-09-11): a kit-colored jersey
// band (surname over the numeral, sleeve stripe beneath), a name row, one hairline vitals
// strip, then collapsible SEASON STATS (PlayerStatsLedger) and ACCOLADES sections. The
// mock's ghosted city wordmark stands in for a club mark — sports-mark imagery isn't
// cleared for the native app.
//
// Draft history is deferred until DEP-393's `draft_picks` table ships; accolades has no
// confirmed data source yet (DEP-533) and renders as an explicit empty state, kept last
// so an empty section reads as a coda rather than a gap before more content (Cooper,
// 2026-09-10).

/// The position's depth chart as the field rendered it, handed in by TeamDetailView. Nil
/// from Compare, which has no depth chart on screen, so the DEPTH CHART section hides.
struct PlayerDepthContext {
    /// Every player at the pushed player's position, depth-ordered with overrides applied.
    let players: [Player]
    /// The position carries the user's own order (a confirmed override on a live roster).
    let isCustom: Bool
}

struct PlayerProfileView: View {
    let team: Team?
    /// The actively-selected kit when opened from the depth chart, else nil and the screen
    /// falls back to `team?.colors.jersey` (Compare has no kit selection).
    let kitColors: JerseyColors?
    let depthContext: PlayerDepthContext?
    let isHistorical: Bool
    private let repository: DepthRepository

    /// The player on screen. DEPTH CHART row taps replace it in place rather than pushing
    /// another profile, so back always returns to wherever the first push came from (merge
    /// spec: no QB1 → QB2 → QB3 stacks for back to unwind).
    @State private var currentPlayer: Player

    init(
        player: Player,
        team: Team?,
        kitColors: JerseyColors? = nil,
        repository: DepthRepository,
        depthContext: PlayerDepthContext? = nil,
        isHistorical: Bool = false
    ) {
        self.team = team
        self.kitColors = kitColors
        self.repository = repository
        self.depthContext = depthContext
        self.isHistorical = isHistorical
        _currentPlayer = State(initialValue: player)
    }

    var body: some View {
        PlayerProfileScreen(
            player: currentPlayer,
            team: team,
            kitColors: kitColors,
            repository: repository,
            depthContext: depthContext,
            isHistorical: isHistorical,
            onSelectPlayer: { currentPlayer = $0 }
        )
        // A fresh identity per player resets the stats view model, section open state, and
        // scroll position — the same reset the old card got from `.id(player.id)`.
        .id(currentPlayer.id)
    }
}

private struct PlayerProfileScreen: View {
    let player: Player
    let team: Team?
    let kitColors: JerseyColors?
    let depthContext: PlayerDepthContext?
    let isHistorical: Bool
    let onSelectPlayer: (Player) -> Void

    @State private var viewModel: PlayerProfileViewModel
    @State private var depthOpen = true
    @State private var statsOpen = true
    @State private var bioOpen = true
    @State private var accoladesOpen = true

    @ScaledMetric(relativeTo: .largeTitle) private var scaledNumberSize: CGFloat = 116
    @ScaledMetric(relativeTo: .title) private var scaledPhotoSize: CGFloat = 52
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    private var numberSize: CGFloat { min(scaledNumberSize, 160) }
    private var photoSize: CGFloat { min(scaledPhotoSize, 80) }
    private var jersey: JerseyColors? { kitColors ?? team?.colors.jersey }
    private var markColor: Color {
        jersey.map { Color(hex: TeamSurfaces.mark($0)) } ?? DesignTokens.Colors.accent
    }
    /// Text painted on the jersey band's fill.
    private var onBandColor: Color {
        jersey.map { Color(hex: TeamSurfaces.textOnFill($0)) } ?? DesignTokens.Colors.accent
    }
    private var displayName: String { player.name.isEmpty ? "#\(player.number)" : player.name }

    init(
        player: Player,
        team: Team?,
        kitColors: JerseyColors?,
        repository: DepthRepository,
        depthContext: PlayerDepthContext?,
        isHistorical: Bool,
        onSelectPlayer: @escaping (Player) -> Void
    ) {
        self.player = player
        self.team = team
        self.kitColors = kitColors
        self.depthContext = depthContext
        self.isHistorical = isHistorical
        self.onSelectPlayer = onSelectPlayer
        _viewModel = State(initialValue: PlayerProfileViewModel(
            playerID: player.id, teamID: team?.id, repository: repository
        ))
    }

    var body: some View {
        // The scroll view ignores the top safe area so the jersey band can run up behind the
        // back button, as the design draws it; the reader captures the inset first so the
        // band's own content still starts below the bar.
        GeometryReader { proxy in
            scrollContent(topInset: proxy.safeAreaInsets.top)
        }
        .background(DesignTokens.Colors.bg)
        // No bar title: the band's surname and the name row already identify the player, and
        // a title over the band competes with the numeral (Cooper, 2026-09-11).
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(.hidden, for: .navigationBar)
        .accessibilityIdentifier("player-profile-full-content")
        .task { await viewModel.load() }
    }

    private func scrollContent(topInset: CGFloat) -> some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                jerseyBand
                    .padding(.top, topInset)
                    .background { bandBackground }
                VStack(alignment: .leading, spacing: 0) {
                    identity
                        .padding(.top, 14)
                    vitals
                        .padding(.top, 14)
                    // Merge spec order: the short depth list answers "where does he sit"
                    // before the long ledger; bio is secondary prose; accolades stays the
                    // coda. Depth and bio carry their own top padding because each can
                    // render nothing.
                    depthSection
                    statsSection
                        .padding(.top, DesignTokens.Spacing.sm)
                    bioSection
                    accoladesSection
                        .padding(.top, 10)
                }
                .padding(.horizontal, DesignTokens.Spacing.screenMargin)
                .padding(.bottom, DesignTokens.Spacing.xl)
            }
        }
        .scrollIndicators(.hidden)
        .ignoresSafeArea(.container, edges: .top)
    }

    // MARK: - Jersey band

    private var jerseyBand: some View {
        VStack(spacing: 0) {
            VStack(spacing: DesignTokens.Spacing.xs) {
                if let surname = PlayerProfileDisplay.jerseyName(player.name) {
                    Text(surname)
                        .font(.footnote.weight(.heavy))
                        .tracking(5)
                        // Painted on the jersey fill, not the app ground, so it takes the
                        // fill-judged color: `mark` is Denver's own orange and vanished there.
                        .foregroundStyle(onBandColor)
                        .lineLimit(1)
                        .minimumScaleFactor(0.6)
                        .accessibilityHidden(true)
                }
                jerseyNumeral
            }
            .frame(maxWidth: .infinity)
            .padding(.horizontal, DesignTokens.Spacing.md)
            .padding(.top, DesignTokens.Spacing.md)
            .padding(.bottom, 26)
            // Dropped so the numeral's top edge crosses the wordmark's middle: the upper half
            // reads above the digits and the lower half sits hidden behind them (Cooper,
            // 2026-09-11).
            .background(alignment: .top) {
                cityWordmark.padding(.top, DesignTokens.Spacing.lg + DesignTokens.Spacing.xs)
            }

            sleeveStripe
        }
        .clipped()
    }

    @ViewBuilder
    private var bandBackground: some View {
        if let jersey {
            let body = Color(hex: TeamSurfaces.fill(jersey))
            body.overlay {
                LinearGradient(
                    stops: [
                        .init(color: .white.opacity(0.06), location: 0),
                        .init(color: .clear, location: 0.58),
                        .init(color: .black.opacity(0.25), location: 1),
                    ],
                    startPoint: .top, endPoint: .bottom
                )
            }
        } else {
            DesignTokens.Colors.surfaceCard
        }
    }

    @ViewBuilder
    private var cityWordmark: some View {
        if let city = team?.city, !city.isEmpty {
            Text(city.uppercased())
                .font(.system(size: 58, weight: .black))
                .tracking(6)
                .foregroundStyle(wordmarkGhost)
                .lineLimit(1)
                // Long cities ("WASHINGTON", "SAN FRANCISCO") shrink to the screen width
                // rather than running off both edges.
                .minimumScaleFactor(0.3)
                .padding(.horizontal, DesignTokens.Spacing.md)
                .frame(maxWidth: .infinity)
                .accessibilityHidden(true)
        }
    }

    // A ghost reads by barely separating from the fill, so its tint follows the fill: white
    // on dark bodies (the design's Seattle navy), near-black on light ones. White on Denver's
    // orange washed out entirely. Dark-on-light needs more alpha to register the same.
    private var wordmarkGhost: Color {
        guard let jersey else { return .white.opacity(0.055) }
        let ink = readableTextOn(TeamSurfaces.fill(jersey))
        return Color(hex: ink).opacity(ink == darkBackgroundHex ? 0.14 : 0.055)
    }

    @ViewBuilder
    private var sleeveStripe: some View {
        // The stripe separates the fill from the page, which is exactly `ring`'s job; `mark`
        // matches the fill on kits like Denver's and the stripe disappeared into the band.
        if let jersey {
            Color(hex: TeamSurfaces.ring(jersey))
                .frame(height: 6)
                .accessibilityHidden(true)
        }
    }

    @ViewBuilder
    private var jerseyNumeral: some View {
        if let colors = jersey {
            let numeral = TeamSurfaces.numeral(colors)
            StrokedText(
                runs: [
                    .init(
                        text: String(player.number),
                        size: numberSize,
                        fill: Color(hex: numeral.fill),
                        stroke: Color(hex: numeral.stroke),
                        strokeWidthPercent: 3
                    ),
                ],
                weight: .black,
                tracking: numberSize * -0.05
            )
            .accessibilityLabel("Jersey number \(player.number)")
        } else {
            Text(String(player.number))
                .font(.system(size: numberSize, weight: .black))
                .tracking(numberSize * -0.05)
                .foregroundStyle(DesignTokens.Colors.accent)
                .lineLimit(1)
                .minimumScaleFactor(0.5)
                .accessibilityLabel("Jersey number \(player.number)")
        }
    }

    // MARK: - Identity

    private var identity: some View {
        let accent = markColor
        let position = Text(player.position.fullName)
            .font(.subheadline.weight(.semibold))
            .foregroundStyle(DesignTokens.Colors.textSecondary)
            .accessibilityIdentifier("player-profile-full-position")
        let status = Text(player.status.rawValue.uppercased())
            .font(.caption2.weight(.bold))
            .tracking(1)
            .foregroundStyle(playerStatusColor(player.status, accent: accent))
            .accessibilityIdentifier("player-profile-full-status")

        return HStack(alignment: .center, spacing: 13) {
            photo
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
                Text(displayName)
                    .font(.title.weight(.heavy))
                    .tracking(-0.7)
                    .foregroundStyle(DesignTokens.Colors.textPrimary)
                    .accessibilityIdentifier("player-profile-full-name")
                // At accessibility sizes the position name alone fills the line.
                if dynamicTypeSize.isAccessibilitySize {
                    position
                    status
                } else {
                    HStack(alignment: .firstTextBaseline, spacing: 9) {
                        position
                        status
                    }
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .accessibilityElement(children: .contain)
    }

    private var photo: some View {
        let ring = jersey.map { Color(hex: TeamSurfaces.ring($0)) } ?? DesignTokens.Colors.accent
        let fill = jersey.map { Color(hex: TeamSurfaces.fill($0)) } ?? DesignTokens.Colors.accent
        let onFill = jersey.map { Color(hex: readableTextOn(TeamSurfaces.fill($0))) }
            ?? DesignTokens.Colors.onAccent
        return ZStack {
            Circle().fill(fill)
            if let url = player.photoUrl.flatMap(URL.init(string:)) {
                AsyncImage(url: url) { phase in
                    if let image = phase.image {
                        image.resizable().scaledToFill()
                    } else {
                        initials(onFill)
                    }
                }
                .clipShape(Circle())
            } else {
                initials(onFill)
            }
        }
        .frame(width: photoSize, height: photoSize)
        .overlay { Circle().strokeBorder(ring, lineWidth: 2) }
        .accessibilityHidden(true)
    }

    private func initials(_ color: Color) -> some View {
        Text(PlayerProfileDisplay.initials(player.name) ?? String(player.number))
            .font(.headline.weight(.bold))
            .foregroundStyle(color)
            .minimumScaleFactor(0.6)
    }

    // MARK: - Vitals

    @ViewBuilder
    private var vitals: some View {
        let parts = PlayerProfileDisplay.vitals(
            age: player.age, experience: player.experience, height: player.height,
            weight: player.weight, college: player.college
        )
        if !parts.isEmpty {
            // One line with dot separators; at accessibility sizes that line wraps and strands
            // a separator at the start of a row, so each vital gets its own line instead.
            Group {
                if dynamicTypeSize.isAccessibilitySize {
                    VStack(spacing: DesignTokens.Spacing.xs) {
                        ForEach(parts, id: \.self) { Text($0.text) }
                    }
                } else {
                    HStack(spacing: 0) {
                        ForEach(Array(parts.enumerated()), id: \.offset) { index, part in
                            if index > 0 {
                                Text("·")
                                    .foregroundStyle(DesignTokens.Colors.textFaintest)
                                    .padding(.horizontal, 7)
                            }
                            Text(part.text)
                        }
                    }
                    .lineLimit(1)
                    // College rides in this strip (2026-09-11 merge spec) and real values run
                    // long — a third of the roster's schools exceed 11 characters. 0.6 keeps
                    // the whole line on one row instead of truncating the vitals ahead of it.
                    .minimumScaleFactor(0.6)
                }
            }
            .font(.caption2.weight(.bold))
            .tracking(1.2)
            .monospacedDigit()
            .foregroundStyle(DesignTokens.Colors.textMuted)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 9)
            .overlay(alignment: .top) { hairline }
            .overlay(alignment: .bottom) { hairline }
            .accessibilityElement(children: .ignore)
            .accessibilityLabel(parts.map(\.spoken).joined(separator: ", "))
            .accessibilityIdentifier("player-profile-full-vitals")
        }
    }

    private var hairline: some View {
        Rectangle().fill(DesignTokens.Colors.borderDefault).frame(height: 1)
    }

    // MARK: - Sections

    private var statsMeta: String {
        switch viewModel.statsState {
        case .loaded: PlayerStatLedger.seasonCountLabel(viewModel.stats.count)
        case .loading, .empty, .failed: PlayerSeasonType.regular.rawValue
        }
    }

    private var statsSection: some View {
        VStack(alignment: .leading, spacing: 0) {
            sectionHeader(
                PlayerProfileSection.seasonStatsTitle, meta: statsMeta, isOpen: $statsOpen,
                identifier: "player-profile-full-stats-toggle"
            )
            if statsOpen {
                switch viewModel.statsState {
                case .loading:
                    PlayerStatsLedgerSkeleton()
                case .loaded:
                    PlayerStatsLedger(
                        stats: viewModel.stats,
                        position: player.position,
                        currentTeamAbbrev: team?.abbrev,
                        mark: markColor
                    )
                case .empty:
                    ContentUnavailableView("No stats available", systemImage: "chart.bar.xaxis")
                        .frame(maxWidth: .infinity)
                case .failed(let error):
                    VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
                        Text(error.recoveryDescription)
                            .foregroundStyle(DesignTokens.Colors.textMuted)
                        Button("Retry") { Task { await viewModel.retry() } }
                            .frame(minWidth: 44, minHeight: 44)
                            .accessibilityIdentifier("player-profile-full-stats-retry")
                    }
                    .padding(.top, DesignTokens.Spacing.sm)
                }
            }
        }
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("player-profile-full-stats")
    }

    // Merge spec: the deleted card's POSITION DEPTH list, read-only here — reordering is
    // the edit-mode PositionReorderSheet's job. Tapping another row swaps this screen to
    // that player in place (onSelectPlayer); it never pushes.
    @ViewBuilder
    private var depthSection: some View {
        if let depthContext {
            VStack(alignment: .leading, spacing: 0) {
                sectionHeader(
                    PlayerProfileSection.depthChartTitle, meta: depthMeta(depthContext),
                    isOpen: $depthOpen, identifier: "player-profile-full-depth-toggle"
                )
                if depthOpen {
                    if depthContext.players.count <= 1 {
                        Text("No backups available")
                            .font(.footnote)
                            .foregroundStyle(DesignTokens.Colors.textMuted)
                            .frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)
                    } else {
                        VStack(spacing: 0) {
                            ForEach(depthContext.players) { p in
                                depthRow(p)
                                if p.id != depthContext.players.last?.id {
                                    hairline
                                }
                            }
                        }
                    }
                }
            }
            .padding(.top, DesignTokens.Spacing.sm)
            .accessibilityElement(children: .contain)
            .accessibilityIdentifier("player-profile-full-depth")
        }
    }

    /// "QUARTERBACK", or "QUARTERBACK · CUSTOM" when the user reordered this position, so a
    /// custom order stays legible even though editing moved to the reorder sheet.
    private func depthMeta(_ context: PlayerDepthContext) -> String {
        let position = player.position.fullName.uppercased()
        return context.isCustom ? "\(position) · CUSTOM" : position
    }

    // The row for the player already on screen is inert: it is a destination, not a
    // control. Rendering it as a Button with a no-op action would make VoiceOver announce
    // "button, selected" on something that does nothing (.isSelected *adds to* the
    // inherent button trait rather than replacing it), so the current row is a plain view.
    @ViewBuilder
    private func depthRow(_ p: Player) -> some View {
        let isCurrent = p.id == player.id
        if isCurrent {
            depthRowAccessibility(depthRowLabel(p, isCurrent: true), p, traits: [.isSelected])
        } else {
            depthRowAccessibility(
                Button { onSelectPlayer(p) } label: { depthRowLabel(p, isCurrent: false) }
                    .buttonStyle(.plain),
                p, traits: [.isButton]
            )
        }
    }

    private func depthRowLabel(_ p: Player, isCurrent: Bool) -> some View {
        DepthRowContent(player: p, isCurrent: isCurrent, accent: markColor)
            .padding(.vertical, DesignTokens.Spacing.sm)
            .frame(minHeight: 44)
            // DEP-395: the whole row accepts the tap, not just its glyphs.
            .contentShape(Rectangle())
    }

    private func depthRowAccessibility<V: View>(
        _ row: V, _ p: Player, traits: AccessibilityTraits
    ) -> some View {
        row
            .accessibilityElement(children: .ignore)
            .accessibilityLabel(
                "\(depthRankLabel(p.depthRank)), #\(p.number), \(p.name.isEmpty ? "#\(p.number)" : p.name)"
            )
            .accessibilityAddTraits(traits)
            .accessibilityIdentifier("player-profile-full-depth-row-\(p.id)")
    }

    // Merge spec: the card's Bio block, collapsible like every other section here. Hidden
    // when empty or historical (PlayerProfileDisplay.bio).
    @ViewBuilder
    private var bioSection: some View {
        if let bio = PlayerProfileDisplay.bio(player.bio, isHistorical: isHistorical) {
            VStack(alignment: .leading, spacing: 0) {
                sectionHeader(
                    PlayerProfileSection.bioTitle, meta: nil, isOpen: $bioOpen,
                    identifier: "player-profile-full-bio-toggle"
                )
                if bioOpen {
                    Text(bio)
                        .font(.subheadline)
                        .foregroundStyle(DesignTokens.Colors.textSecondary)
                        .fixedSize(horizontal: false, vertical: true)
                        .padding(.top, DesignTokens.Spacing.xs)
                }
            }
            .padding(.top, 10)
            .accessibilityElement(children: .contain)
            .accessibilityIdentifier("player-profile-full-bio")
        }
    }

    // DEP-533 (accolades data source) is unresolved — this stays a visible, explicit
    // empty state rather than a hidden section, per the design spec's locked decision:
    // the screen keeps its promise that accolades exist here, just not yet.
    private var accoladesSection: some View {
        VStack(alignment: .leading, spacing: 0) {
            sectionHeader(
                PlayerProfileSection.accoladesTitle, meta: "NONE YET", isOpen: $accoladesOpen,
                identifier: "player-profile-full-accolades-toggle"
            )
            if accoladesOpen {
                VStack(alignment: .leading, spacing: 10) {
                    HStack(spacing: DesignTokens.Spacing.sm) {
                        ForEach(0..<4, id: \.self) { _ in
                            RoundedRectangle(cornerRadius: DesignTokens.Radius.sm)
                                .strokeBorder(
                                    DesignTokens.Colors.borderInput,
                                    style: StrokeStyle(lineWidth: 1, dash: [4, 3])
                                )
                                .frame(height: 64)
                                .overlay {
                                    Image(systemName: "trophy")
                                        .foregroundStyle(DesignTokens.Colors.textFaintest)
                                }
                        }
                    }
                    .accessibilityHidden(true)
                    Text("Pro Bowls, All-Pro selections and franchise records land here. Not tracked yet.")
                        .font(.caption)
                        .foregroundStyle(DesignTokens.Colors.textFaint)
                }
                .padding(.top, 10)
            }
        }
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("player-profile-full-accolades")
    }

    private func sectionHeader(
        _ title: String, meta: String?, isOpen: Binding<Bool>, identifier: String
    ) -> some View {
        Button {
            withAnimation(reduceMotion ? nil : DesignTokens.Motion.selection) {
                isOpen.wrappedValue.toggle()
            }
        } label: {
            let titleText = Text(title)
                .font(.caption2.weight(.heavy))
                .tracking(1.4)
                .foregroundStyle(DesignTokens.Colors.textMuted)
            let metaText = meta.map {
                Text($0)
                    .font(.caption2)
                    .tracking(0.6)
                    .foregroundStyle(DesignTokens.Colors.textFaintest)
            }
            HStack(spacing: DesignTokens.Spacing.sm) {
                // Side by side, the meta squeezes the title into a mid-word hyphenation
                // ("ACCO-LADES") at accessibility sizes, so the pair stacks there.
                if dynamicTypeSize.isAccessibilitySize {
                    VStack(alignment: .leading, spacing: 2) {
                        titleText
                        if let metaText { metaText }
                    }
                } else {
                    titleText
                    if let metaText { metaText }
                }
                Spacer(minLength: 0)
                Image(systemName: isOpen.wrappedValue ? "chevron.up" : "chevron.down")
                    .font(.footnote.weight(.bold))
                    .foregroundStyle(markColor)
            }
            .frame(minHeight: 44)
            // DEP-395: the full header row accepts the tap, not just the label glyphs.
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(meta.map { "\(title.capitalized), \($0.lowercased())" } ?? title.capitalized)
        .accessibilityValue(isOpen.wrappedValue ? "Expanded" : "Collapsed")
        .accessibilityAddTraits(.isHeader)
        .accessibilityIdentifier(identifier)
    }
}

// Mirrors lib/utils/colors.ts statusColor: starter is team-driven, the rest are fixed
// semantic colors shared by every team. DEP-424: the caller now passes a TeamSurfaces-
// resolved color, so `starter` no longer resolves to the retired `uiAccent` — which made
// it 2.12:1 on the Jets.
func playerStatusColor(_ status: PlayerStatus, accent: Color) -> Color {
    switch status {
    case .starter: accent
    case .backup: DesignTokens.Colors.textMuted
    case .rookie: DesignTokens.Colors.statusRookie
    case .injured: DesignTokens.Colors.statusInjured
    }
}

enum PlayerProfileSection {
    static let seasonStatsTitle = "SEASON STATS"
    static let depthChartTitle = "DEPTH CHART"
    static let bioTitle = "BIO"
    static let accoladesTitle = "ACCOLADES"
}
