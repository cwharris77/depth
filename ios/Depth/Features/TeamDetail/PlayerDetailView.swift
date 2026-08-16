import SwiftUI

// Complete native player profile. The sheet owns presentation and semantic layout only;
// profile fields arrive in Player and its independent lazy stats state stays in the
// feature-local view model so a failed stats read never removes the player profile.
struct PlayerDetailView: View {
    let player: Player
    let team: Team?
    /// Every player at `player`'s position, depth-ordered (web's `getPlayersByPosition`).
    /// Drives the POSITION DEPTH section — tap another row to switch the card to that
    /// player (web's `onSelectPlayer`).
    let depthChart: [Player]
    var onSelectPlayer: ((Player) -> Void)? = nil

    // DEP-226: inline drag-to-reorder, mirroring web's PlayerCardDepthList. The card is a
    // plain VStack inside a ScrollView (a `List` would nest scroll containers), so reorder
    // uses `.onDrag`/`.onDrop` row delegates instead of `.onMove`. `defaultDepthChart` is
    // the position's default roster order (pre-override) for Reset; `preferences` hosts the
    // one-time hint. TeamDetailView passes `onReorder`/`onResetPosition` as nil in
    // historical/shared-preview contexts, matching web's readOnly prop omission.
    let defaultDepthChart: [Player]
    let preferences: UserPreferences?
    var isPositionCustom = false
    var onReorder: ((Position, [String]) -> Void)? = nil
    var onResetPosition: ((Position) -> Void)? = nil
    /// DEP-231: app-level edit mode, driven by the overflow menu's single "Edit Depth
    /// Chart" toggle (web's `globalEditMode`). When on, the position-depth list renders
    /// already in reorder mode with no per-card "Reorder" tap; the per-card pill hides
    /// since it would be redundant. Stable for this card's lifetime — the toggle lives in
    /// the overflow menu behind the sheet, so it can't change while the card is open.
    var globalEditMode = false

    @State private var viewModel: PlayerProfileViewModel

    // DEP-226: edit/hint state resets when the sheet re-presents a different player —
    // the `.id(player.id)` on the sheet content gives this view a fresh identity per
    // player, so @State below starts over each time (web resets the same state in a
    // render-time prev-player comparison).
    @State private var editing = false
    @State private var showHint: Bool
    @State private var positionIsCustom: Bool
    /// The order the card renders. `depthChart` is a presentation-time prop that can't
    /// update after a reorder (the sheet content closure doesn't re-run), so commits
    /// write back here instead of relying on the prop.
    @State private var displayOrder: [Player]
    @State private var reorderDraft: [Player] = []

    /// DEP-231: the global toggle wins over the card's own state (web's
    /// `effectiveEditing = editing || globalEditMode`) — the list is in reorder mode if
    /// either is on.
    private var effectiveEditing: Bool { editing || globalEditMode }

    @Environment(\.dismiss) private var dismiss

    // Portrait and vital tiles scale with body text so an Accessibility XXXL reader
    // gets a proportionate layout rather than large type crammed beside fixed chrome.
    // The portrait is capped because past that it is the text, not the image, that
    // needs the width.
    @ScaledMetric(relativeTo: .title) private var scaledPhotoSize: CGFloat = 96

    // The jersey-number watermark above the name (web PlayerCardHeader: `text-6xl
    // font-black`, accent at 26% opacity, -0.03em tracking). Scales with .title so it
    // grows at accessibility sizes the same way the portrait and vitals do.
    @ScaledMetric(relativeTo: .title) private var scaledNumberSize: CGFloat = 48

    @Environment(\.dynamicTypeSize) private var dynamicTypeSize

    private var photoSize: CGFloat { min(scaledPhotoSize, 140) }

    init(
        player: Player,
        team: Team?,
        repository: DepthRepository,
        depthChart: [Player],
        onSelectPlayer: ((Player) -> Void)? = nil,
        defaultDepthChart: [Player] = [],
        preferences: UserPreferences? = nil,
        isPositionCustom: Bool = false,
        onReorder: ((Position, [String]) -> Void)? = nil,
        onResetPosition: ((Position) -> Void)? = nil,
        globalEditMode: Bool = false
    ) {
        self.player = player
        self.team = team
        self.depthChart = depthChart
        self.onSelectPlayer = onSelectPlayer
        self.defaultDepthChart = defaultDepthChart.isEmpty ? depthChart : defaultDepthChart
        self.preferences = preferences
        self.isPositionCustom = isPositionCustom
        self.onReorder = onReorder
        self.onResetPosition = onResetPosition
        self.globalEditMode = globalEditMode
        _viewModel = State(initialValue: PlayerProfileViewModel(
            playerID: player.id, teamID: team?.id, repository: repository
        ))
        // The hint shows until the user has seen it once (web's localStorage flag); the
        // reorder affordances only exist when a writer is wired up, so no hint without one.
        _showHint = State(initialValue: onReorder != nil && preferences?.seenReorderHint == false)
        _positionIsCustom = State(initialValue: isPositionCustom)
        _displayOrder = State(initialValue: depthChart)
        // DEP-231: opening a card while the app-level toggle is on must show the list
        // already reorderable — seed the drag draft from the rendered order up front
        // (the per-card toggle would otherwise be the only thing that populated it).
        _reorderDraft = State(initialValue: globalEditMode ? depthChart : [])
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    header
                    vitals
                    if let college = PlayerProfileDisplay.meaningful(player.college) {
                        labeledText("College", value: college)
                    }
                    if let bio = PlayerProfileDisplay.meaningful(player.bio) {
                        labeledText("Bio", value: bio)
                    }
                    positionDepth
                    statsSection
                }
                .padding()
            }
            .accessibilityIdentifier("player-profile-content")
            .toolbar {
                // Top-trailing X, matching the web PlayerCardHeader's close. An xmark is
                // more discoverable than a "Close" text button, and mirrors the familiar
                // swipe-down sheet affordance.
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        dismiss()
                    } label: {
                        Image(systemName: "xmark")
                    }
                    .frame(minWidth: 44, minHeight: 44)
                    .accessibilityLabel("Close")
                }
            }
        }
        .presentationBackground(DesignTokens.Colors.bg)
        .task { await viewModel.load() }
        // Visible grabber so the swipe-to-dismiss gesture is discoverable, not just
        // the X (web's player card is a right-hand drawer; native is a sheet).
        .presentationDragIndicator(.visible)
        .presentationDetents([.large])
    }

    // Side-by-side portrait and name only works while the name still has room to wrap on
    // word boundaries. At accessibility sizes the remaining column is narrower than a
    // single word, so the layout stacks instead — otherwise names break mid-word
    // ("DJ Moor / e"), which is the failure this switch exists to prevent.
    private var header: some View {
        let accent = team.map { Color(hex: $0.colors.uiAccent) } ?? .accentColor
        let identity = VStack(alignment: .leading, spacing: 8) {
            // Web parity (PlayerCardHeader): a large team-accent watermark number above
            // the name — the most recognizable jersey identity, placed first per
            // Cooper's visual pass ("make it a large team-colored number that appears
            // above the name"). The `#12 · QB · Quarterback` line below stays.
            Text("#\(player.number)")
                .font(.system(size: scaledNumberSize, weight: .black))
                .tracking(scaledNumberSize * -0.03)
                .foregroundStyle(accent.opacity(0.26))
                .lineLimit(1)
                .minimumScaleFactor(0.5)
                .accessibilityHidden(true)
            Text(player.name.isEmpty ? "#\(player.number)" : player.name)
                .font(.title.bold())
                .accessibilityIdentifier("player-profile-name")
            // Web parity (components/PlayerCardHeader.tsx): position renders as a
            // Badge pill, not plain text, and the number isn't repeated here — the
            // watermark above already shows it (DEP-223).
            HStack(spacing: 6) {
                positionBadge(accent: accent)
                Text(player.position.fullName)
                    .font(.caption)
                    .foregroundStyle(DesignTokens.Colors.textMuted)
            }
            .accessibilityElement(children: .combine)
            .accessibilityIdentifier("player-profile-position")
            // Web parity (Badge variant="status"): team accent when starter, fixed
            // semantic colors otherwise — this line had no color at all before (DEP-223).
            Text(player.status.rawValue.capitalized)
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(playerStatusColor(player.status, accent: accent))
                .accessibilityIdentifier("player-profile-status")
        }
        .frame(maxWidth: .infinity, alignment: .leading)

        return Group {
            if dynamicTypeSize.isAccessibilitySize {
                VStack(alignment: .leading, spacing: 16) {
                    photo
                    identity
                }
            } else {
                HStack(alignment: .top, spacing: 16) {
                    photo
                    identity
                }
            }
        }
        .accessibilityElement(children: .contain)
    }

    // Vitals render as the web StatGrid's one row of four equal columns (AGE / EXP /
    // HT / WT): a single card, label above value, both centered, thin vertical dividers
    // between columns. Replaces the old adaptive grid that wrapped to two rows and
    // left-aligned everything (Cooper's visual pass: values should be centered and
    // smaller so all four fit on one line).
    private var vitals: some View {
        HStack(spacing: 0) {
            vital("Age", PlayerProfileDisplay.age(player.age))
            divider
            vital("Experience", PlayerProfileDisplay.experience(player.experience))
            divider
            vital("Height", PlayerProfileDisplay.height(player.height))
            divider
            vital("Weight", PlayerProfileDisplay.weight(player.weight))
        }
        .depthCard(dense: true)
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("player-profile-vitals")
    }

    private var divider: some View {
        Rectangle()
            .fill(DesignTokens.Colors.borderDefault)
            .frame(width: 1)
            .padding(.vertical, 4)
    }

    private var statsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Season Stats")
                .font(.headline)
            switch viewModel.statsState {
            case .loading:
                PlayerStatsSkeleton(columnCount: playerStatColumns(for: player.position).count)
            case .loaded:
                PlayerStatsTable(
                    stats: viewModel.stats,
                    columns: playerStatColumns(for: player.position),
                    accent: team.map { Color(hex: $0.colors.uiAccent) } ?? .accentColor
                )
            case .empty:
                ContentUnavailableView("No stats available", systemImage: "chart.bar.xaxis")
                    .frame(maxWidth: .infinity)
            case .failed(let error):
                VStack(alignment: .leading, spacing: 8) {
                    Text(error.recoveryDescription)
                        .foregroundStyle(.secondary)
                    Button("Retry") { Task { await viewModel.retry() } }
                        .frame(minWidth: 44, minHeight: 44)
                        .accessibilityIdentifier("player-profile-stats-retry")
                }
            }
        }
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("player-profile-stats")
    }

    private func vital(_ label: String, _ value: String) -> some View {
        VStack(alignment: .center, spacing: 2) {
            Text(label.uppercased())
                .font(.caption)
                .tracking(0.5)
                .foregroundStyle(DesignTokens.Colors.textMuted)
            Text(value)
                .font(.subheadline.weight(.black))
                .foregroundStyle(DesignTokens.Colors.textPrimary)
        }
        .frame(maxWidth: .infinity, alignment: .center)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(label), \(value)")
    }

    private func labeledText(_ label: String, value: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label).font(.caption.bold()).foregroundStyle(.secondary)
            Text(value).fixedSize(horizontal: false, vertical: true)
        }
        .accessibilityElement(children: .combine)
    }

    // Web parity (components/PlayerCardDepthList.tsx): the position's players in depth
    // order, STARTER/BACKUP/RESERVE rank labels, current player highlighted with the
    // team accent + checkmark, others tappable to switch the card. DEP-226 adds the
    // card's own Reorder/Done toggle, one-time hint, CUSTOM tag, Reset, and drag rows.
    @ViewBuilder
    private var positionDepth: some View {
        VStack(alignment: .leading, spacing: 12) {
            // DEP-225: dropped the repeated position — the header's badge (DEP-223)
            // already shows it. Native-only divergence from web, which still repeats
            // it in this title; don't "fix" this back to match web without checking
            // that ticket first.
            Text("Position Depth")
                .font(.headline)
                .accessibilityIdentifier("player-profile-depth-title")

            if displayOrder.count <= 1 {
                Text("No backups available")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity, minHeight: 56)
                    .depthCard(dense: true)
            } else {
                depthHeader
                // DEP-231: no hint while reordering — a card opened in app-level edit
                // mode is already reordering, so the discoverability copy would be moot.
                if showHint && !effectiveEditing {
                    depthHint
                }
                if effectiveEditing {
                    DepthReorderList(
                        players: $reorderDraft,
                        currentPlayerID: player.id,
                        accent: accent,
                        onCommit: commitReorder
                    )
                    .depthCard(dense: true, padded: false)
                } else {
                    // DEP-225: padded: false + each row keeping its own padding lets the
                    // current-player row's highlight reach the card's rounded edges —
                    // depthCard's own outer padding was insetting every row away from
                    // them before.
                    VStack(spacing: 0) {
                        ForEach(displayOrder) { p in
                            depthRow(p)
                            if p.id != displayOrder.last?.id {
                                Divider().overlay(DesignTokens.Colors.borderSubtle)
                            }
                        }
                    }
                    .depthCard(dense: true, padded: false)
                }
            }
        }
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("player-profile-depth")
    }

    /// Web parity (PlayerCardDepthList's header row): CUSTOM tag on the left once the
    /// position has a saved custom order, Reset + the Reorder/Done toggle on the right.
    private var depthHeader: some View {
        HStack(spacing: 8) {
            if positionIsCustom {
                customTag
            }
            Spacer()
            if positionIsCustom, let onResetPosition {
                Button {
                    resetPosition(onResetPosition)
                } label: {
                    HStack(spacing: 4) {
                        Image(systemName: "arrow.counterclockwise")
                            .font(.caption2.weight(.bold))
                        Text("Reset")
                            .font(.caption.bold())
                    }
                    .foregroundStyle(DesignTokens.Colors.textMuted)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                }
                .accessibilityIdentifier("player-profile-depth-reset")
            }
            // DEP-231: the per-card Reorder/Done pill is hidden while the app-level toggle
            // is on — that toggle is the only way in or out of edit mode for every group at
            // once, so a per-card button here would be redundant (already editing) or
            // misleadingly imply this one card can opt out on its own (web parity).
            if let onReorder, !globalEditMode {
                Button {
                    toggleEditing(onReorder)
                } label: {
                    HStack(spacing: 4) {
                        if !editing {
                            // Web parity: a grip glyph leads the "Reorder" label.
                            Image(systemName: "line.3.horizontal")
                                .font(.caption2.weight(.bold))
                        }
                        Text(editing ? "Done" : "Reorder")
                            .font(.caption.bold())
                    }
                    .foregroundStyle(editing ? onAccent : accent)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    // Web parity (PlayerCardDepthList's toggle pill): accent fill +
                    // onAccent text while editing, accent-tinted fill/border otherwise.
                    .background(Capsule().fill(editing ? accent : accent.opacity(0.10)))
                    .overlay {
                        Capsule().strokeBorder(accent.opacity(0.33), lineWidth: 1)
                    }
                }
                .accessibilityIdentifier("player-profile-depth-reorder-toggle")
            }
        }
    }

    // Web parity (Badge variant="tag"): accent text on a 10%-alpha accent fill with an
    // accent-tinted border — the "CUSTOM" flag pill beside the Reorder toggle.
    private var customTag: some View {
        Text("CUSTOM")
            .font(.caption.bold())
            .foregroundStyle(accent)
            .padding(.horizontal, 6)
            .padding(.vertical, 2)
            .background(Capsule().fill(accent.opacity(0.10)))
            .overlay {
                Capsule().strokeBorder(accent.opacity(0.33), lineWidth: 1)
            }
            .accessibilityIdentifier("player-profile-depth-custom")
    }

    // Web parity (PlayerCardDepthList's first-use hint): shown once, before the first
    // edit, while the card is not in reorder mode; marking it seen is what dismisses it.
    private var depthHint: some View {
        Text("Tip: tap Reorder to build your own depth chart — your order is saved on this device.")
            .font(.caption)
            .foregroundStyle(accent)
            .accessibilityIdentifier("player-profile-depth-hint")
    }

    private func toggleEditing(_ onReorder: @escaping (Position, [String]) -> Void) {
        // The hint is dismissed the first time the toggle is used, then never again
        // (web's markReorderHintSeen + the one-time localStorage flag).
        preferences?.markReorderHintSeen()
        showHint = false
        editing.toggle()
        if editing {
            reorderDraft = displayOrder
        }
    }

    private func commitReorder(_ ordered: [Player]) {
        let reranked = rerankedPlayers(ordered)
        onReorder?(player.position, reranked.map(\.id))
        displayOrder = reranked
        reorderDraft = reranked
        positionIsCustom = true
    }

    private func resetPosition(_ reset: (Position) -> Void) {
        reset(player.position)
        displayOrder = defaultDepthChart
        reorderDraft = defaultDepthChart
        positionIsCustom = false
        editing = false
    }

    private func depthRow(_ p: Player) -> some View {
        let isCurrent = p.id == player.id
        return Button {
            if !isCurrent { onSelectPlayer?(p) }
        } label: {
            depthRowContent(p, isCurrent: isCurrent)
                .padding(DesignTokens.Spacing.md)
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .background(isCurrent ? accent.opacity(0.10) : .clear)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(
            "\(depthRankLabel(p.depthRank)), #\(p.number), \(p.name.isEmpty ? "#\(p.number)" : p.name)"
        )
        .accessibilityAddTraits(isCurrent ? [.isSelected] : [.isButton])
        .accessibilityIdentifier("player-profile-depth-row-\(p.id)")
    }

    /// The shared rank/number/name (+ checkmark for the current player) row content used
    /// by both the tap-to-switch rows and the drag-to-reorder rows.
    private func depthRowContent(_ p: Player, isCurrent: Bool) -> some View {
        DepthRowContent(player: p, isCurrent: isCurrent, accent: accent)
    }

    private var accent: Color {
        team.map { Color(hex: $0.colors.uiAccent) } ?? .accentColor
    }

    private var onAccent: Color {
        (team?.colors.onAccent).map { Color(hex: $0) } ?? .white
    }

    // Mirrors web PlayerCardDepthList.depthRankLabel: ranks are capped at 3, so
    // anything past 2 is "reserve" rather than a literal ordinal.
    private func depthRankLabel(_ rank: Int) -> String {
        switch rank {
        case 1: "STARTER"
        case 2: "BACKUP"
        default: "RESERVE"
        }
    }

    // Web parity (components/PlayerCardHeader.tsx's Avatar: fillColor={colors.primary},
    // ringColor={accent}). Fill was accidentally the ring color with no ring at all
    // before (DEP-224) — fill is the team's `primary`, ring is a 2px `uiAccent` border.
    @ViewBuilder
    private var photo: some View {
        let accent = team.map { Color(hex: $0.colors.uiAccent) } ?? .accentColor
        let fill = team.map { Color(hex: $0.colors.primary) } ?? .accentColor
        let onFillHex = team.map { readableTextOn($0.colors.primary) }
        let onFill = onFillHex.map(Color.init(hex:)) ?? .white
        ZStack {
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
        .overlay {
            Circle().strokeBorder(accent, lineWidth: 2)
        }
        .accessibilityHidden(true)
    }

    // Web parity (components/ui/Badge.tsx default variant): surfaceNavy fill,
    // accent-colored text + border, rounded-full (DEP-223).
    private func positionBadge(accent: Color) -> some View {
        Text(player.position.rawValue)
            .font(.caption.bold())
            .foregroundStyle(accent)
            .padding(.horizontal, 8)
            .padding(.vertical, 2)
            .background(DesignTokens.Colors.surfaceNavy, in: Capsule())
            .overlay {
                Capsule().strokeBorder(accent.opacity(0.40), lineWidth: 1)
            }
    }

    private func initials(_ color: Color) -> some View {
        Text("\(player.number)")
            .font(.title.bold())
            .foregroundStyle(color)
    }
}

// Mirrors lib/utils/colors.ts statusColor: starter is team-driven (uiAccent), the
// rest are fixed semantic colors shared by every team.
private func playerStatusColor(_ status: PlayerStatus, accent: Color) -> Color {
    switch status {
    case .starter: accent
    case .backup: Color(hex: "#A5ACAF")
    case .rookie: Color(hex: "#4fc3f7")
    case .injured: Color(hex: "#ef5350")
    }
}

// The single rank/number/name (+ checkmark) row body shared by the tap-to-switch rows
// (depthRow) and the drag-to-reorder rows (DepthReorderList) — mirrors web's
// DepthRowContent.
private struct DepthRowContent: View {
    let player: Player
    let isCurrent: Bool
    let accent: Color

    var body: some View {
        HStack(spacing: 12) {
            Text(depthRankLabel(player.depthRank))
                .font(.caption.bold())
                .foregroundStyle(playerStatusColor(player.status, accent: accent))
                .frame(minWidth: 64, alignment: .leading)
            Text("#\(player.number)")
                .font(.footnote.bold())
                .foregroundStyle(DesignTokens.Colors.textMuted)
                .frame(minWidth: 28, alignment: .leading)
            Text(player.name.isEmpty ? "#\(player.number)" : player.name)
                .font(.subheadline.bold())
                .foregroundStyle(isCurrent ? accent : DesignTokens.Colors.textPrimary)
                .lineLimit(1)
            Spacer()
            if isCurrent {
                Image(systemName: "checkmark")
                    .font(.footnote.bold())
                    .foregroundStyle(accent)
                    .accessibilityHidden(true)
            }
        }
    }

    private func depthRankLabel(_ rank: Int) -> String {
        switch rank {
        case 1: "STARTER"
        case 2: "BACKUP"
        default: "RESERVE"
        }
    }
}

// DEP-226: drag-to-reorder row list for the position-depth section. SwiftUI's `.onMove`
// only exists on ForEach inside a List, and a List can't nest inside the card's ScrollView
// without introducing a nested scroll container. The earlier attempts (`.onDrag`/`.onDrop`,
// then `.draggable`/`.dropDestination`) all failed with a real finger: inside a ScrollView
// the scroll pan claims vertical drags, so the system drag interaction never starts by hand.
// This version disambiguates the way every scrollable reorder does — the row is "picked up"
// with a short long-press, then dragged with a DragGesture. Live reorder targets use row
// frames frozen at pickup, so the finger maps to a slot without a feedback loop; the commit
// fires once on release.
private struct DepthReorderList: View {
    @Binding var players: [Player]
    let currentPlayerID: String
    let accent: Color
    let onCommit: ([Player]) -> Void

    /// Row mid-Ys in the list's coordinate space, keyed by player id, collected via
    /// `.onGeometryChange`. Frozen at pickup — the slot mapping below must not track the
    /// live-reordered rows or the drag and the reorder would chase each other.
    @State private var rowCenters: [String: CGFloat] = [:]
    /// The id of the row currently being dragged, set by the long-press phase.
    @State private var draggedPlayerID: String?
    /// Row centers frozen at pickup — the live mapping for the drag.
    @State private var draftCentersFrozen: [String: CGFloat] = [:]
    /// Drives the "lifted" row visual (scale + shadow) while dragging.
    @State private var liftRow = false

    var body: some View {
        VStack(spacing: 0) {
            ForEach(players) { p in
                row(p)
                    .onGeometryChange(for: CGFloat.self) { proxy in
                        proxy.frame(in: .named("depthReorderList")).midY
                    } action: { midY in
                        rowCenters[p.id] = midY
                    }
                if p.id != players.last?.id {
                    Divider().overlay(DesignTokens.Colors.borderSubtle)
                }
            }
        }
        .coordinateSpace(name: "depthReorderList")
    }

    private func row(_ p: Player) -> some View {
        HStack(spacing: 12) {
            // Web parity (PlayerCardDepthList's edit rows): a grip glyph leads each row
            // while reordering; rows are no longer tap-to-switch.
            Image(systemName: "line.3.horizontal")
                .font(.footnote.weight(.semibold))
                .foregroundStyle(DesignTokens.Colors.textMuted)
                .accessibilityHidden(true)
            DepthRowContent(
                player: p,
                isCurrent: p.id == currentPlayerID,
                accent: accent
            )
        }
        .padding(DesignTokens.Spacing.md)
        .background(p.id == currentPlayerID ? accent.opacity(0.10) : .clear)
        .contentShape(Rectangle())
        .zIndex(draggedPlayerID == p.id ? 1 : 0)
        .scaleEffect(draggedPlayerID == p.id && liftRow ? 1.03 : 1)
        .shadow(color: draggedPlayerID == p.id && liftRow ? .black.opacity(0.18) : .clear, radius: 8, y: 3)
        // Long-press pick-up = the ScrollView disambiguator: hold still briefly and the row
        // lifts; without it a moving finger is indistinguishable from a scroll.
        .gesture(
            LongPressGesture(minimumDuration: 0.25)
                .sequenced(before: DragGesture(minimumDistance: 0))
                .onChanged { value in
                    switch value {
                    case .first(true):
                        draggedPlayerID = p.id
                        draftCentersFrozen = rowCenters
                        withAnimation(.snappy(duration: 0.15)) { liftRow = true }
                    case .second(true, let drag?):
                        guard draggedPlayerID != nil else { return }
                        updateSlot(fingerY: drag.startLocation.y + drag.translation.height)
                    default:
                        break
                    }
                }
                .onEnded { _ in
                    guard draggedPlayerID == p.id else { return }
                    draggedPlayerID = nil
                    liftRow = false
                    onCommit(players)
                }
        )
        .accessibilityElement(children: .combine)
        .accessibilityLabel(
            "\(rankLabel(p.depthRank)), #\(p.number), \(p.name.isEmpty ? "#\(p.number)" : p.name)"
        )
        .accessibilityIdentifier("player-profile-depth-reorder-row-\(p.id)")
    }

    /// Moves the dragged player to the slot whose frozen row center best matches the
    /// finger's Y. Frozen centers make this monotonic as the finger travels — no feedback.
    private func updateSlot(fingerY: CGFloat) {
        guard let draggedID = draggedPlayerID,
              let from = players.firstIndex(where: { $0.id == draggedID }) else { return }
        // The player currently the closest (by its frozen center) to the finger.
        var target = from
        var bestDistance = CGFloat.greatestFiniteMagnitude
        for (i, p) in players.enumerated() where p.id != draggedID {
            guard let center = draftCentersFrozen[p.id] else { continue }
            let distance = abs(fingerY - center)
            if distance < bestDistance {
                bestDistance = distance
                target = i
            }
        }
        guard target != from else { return }
        withAnimation(.snappy(duration: 0.15)) {
            players.move(
                fromOffsets: IndexSet(integer: from),
                toOffset: target > from ? target + 1 : target
            )
        }
    }

    private func rankLabel(_ rank: Int) -> String {
        switch rank {
        case 1: "STARTER"
        case 2: "BACKUP"
        default: "RESERVE"
        }
    }
}

// Web parity (components/PlayerCardSeasonStats.tsx): the table's columns stretch to fill
// the card's full width regardless of how many stats a position has — the old fixed-width
// cells made the card narrower for a 1-column OL row than a 5-column QB row (2026-08-15
// visual-pass round 3). SZN/TM stay fixed-width; the stat columns split the remaining
// space equally. The former horizontal ScrollView (which existed so columns could grow at
// Accessibility XXXL) is gone: flexed columns shrink gracefully like the web's grid, and
// every value still arrives paired with its spoken column name via
// `PlayerStatsAccessibility.rowLabel`.
private struct PlayerStatsTable: View {
    let stats: [PlayerSeasonStats]
    let columns: [PlayerStatColumn]
    let accent: Color

    @ScaledMetric(relativeTo: .footnote) private var labelWidth: CGFloat = 44

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: 16) {
                cell("SZN", header: true, fixed: true)
                cell("TM", header: true, fixed: true)
                ForEach(columns, id: \.self) { column in
                    cell(column.header, header: true, fixed: false)
                }
            }
            .padding(.horizontal, DesignTokens.Spacing.md)
            .padding(.vertical, 8)
            // Web parity (components/PlayerCardSeasonStats.tsx): a hairline separates
            // the header from data rows — missing before (DEP-227).
            .overlay(alignment: .bottom) {
                Rectangle().fill(DesignTokens.Colors.borderDefault).frame(height: 1)
            }
            // Each data row carries the full spoken label, so repeating the compact
            // headers as their own VoiceOver stops is pure noise.
            .accessibilityHidden(true)

            ForEach(Array(stats.enumerated()), id: \.element.id) { index, season in
                // Web parity: the most recent season (index 0 — `stats` arrives
                // newest-first) is highlighted, its year colored accent (DEP-227).
                let isCurrent = index == 0
                HStack(spacing: 16) {
                    cell("\(season.season)", fixed: true, valueColor: isCurrent ? accent : nil)
                    cell(season.teamAbbrev ?? "—", fixed: true)
                    ForEach(columns, id: \.self) { column in
                        cell(column.value(for: season), fixed: false)
                    }
                }
                .padding(.horizontal, DesignTokens.Spacing.md)
                .padding(.vertical, 8)
                .background(isCurrent ? accent.opacity(0.05) : .clear)
                .accessibilityElement(children: .ignore)
                .accessibilityLabel(
                    PlayerStatsAccessibility.rowLabel(for: season, columns: columns)
                )
            }
        }
        .frame(maxWidth: .infinity)
        .depthCard(dense: true, padded: false)
    }

    private func cell(_ value: String, header: Bool = false, fixed: Bool, valueColor: Color? = nil) -> some View {
        Text(value)
            .font(header ? .caption.bold() : .footnote.weight(.semibold))
            .foregroundStyle(valueColor ?? (header ? .secondary : .primary))
            .lineLimit(1)
            .minimumScaleFactor(0.6)
            .frame(maxWidth: fixed ? labelWidth : .infinity, alignment: .leading)
    }
}

// Sized against the same scaled metrics as the table it stands in for, so the section
// doesn't resize when real rows land (AGENTS.md's flash-then-jump rule). Matches the
// table's layout: two fixed-width label cells, then one flexible cell per stat column.
private struct PlayerStatsSkeleton: View {
    let columnCount: Int

    @ScaledMetric(relativeTo: .footnote) private var cellWidth: CGFloat = 44
    @ScaledMetric(relativeTo: .footnote) private var cellHeight: CGFloat = 14

    var body: some View {
        VStack(spacing: 12) {
            ForEach(0..<2, id: \.self) { _ in
                HStack(spacing: 16) {
                    ForEach(0..<2, id: \.self) { _ in
                        RoundedRectangle(cornerRadius: 4)
                            .fill(.tertiary)
                            .frame(width: cellWidth, height: cellHeight)
                    }
                    ForEach(0..<columnCount, id: \.self) { _ in
                        RoundedRectangle(cornerRadius: 4)
                            .fill(.tertiary)
                            .frame(maxWidth: .infinity)
                            .frame(height: cellHeight)
                    }
                }
            }
        }
        .frame(maxWidth: .infinity, minHeight: 72)
        .depthCard(dense: true)
        .redacted(reason: .placeholder)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Loading season stats")
    }
}
