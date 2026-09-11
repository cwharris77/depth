import SwiftUI

// Complete native player profile. The sheet owns presentation and semantic layout only;
// profile fields arrive in Player and its independent lazy stats state stays in the
// feature-local view model so a failed stats read never removes the player profile.
struct PlayerDetailView: View {
    let player: Player
    let team: Team?
    /// The actively-selected kit's colors, threaded down from the depth chart so the card
    /// follows the uniform picker (DEP-424). `team.colors` is the *home* kit — the read
    /// layer's withHomeColors overlay — so without this the watermark, headshot ring and
    /// every accent on the card stayed in home colors while the field beside it changed.
    /// Nil falls back to the team's own, which is what a card opened outside the depth
    /// chart (search, deep link) gets.
    let kitColors: JerseyColors?
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

    /// Kept (not just consumed by the view model init) so the "Full stats & history" row
    /// can hand it to `PlayerProfileView`, which needs its own repository access.
    private let repository: DepthRepository

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

    // Portrait and vital tiles scale with body text so an Accessibility XXXL reader
    // gets a proportionate layout rather than large type crammed beside fixed chrome.
    // The portrait is capped because past that it is the text, not the image, that
    // needs the width.
    @ScaledMetric(relativeTo: .title) private var scaledPhotoSize: CGFloat = 96

    // The jersey numeral above the name (web PlayerCardHeader: `text-6xl font-black`,
    // -0.03em tracking). Scales with .title so it grows at accessibility sizes the same
    // way the portrait and vitals do. 64pt rather than web's 60 because the numeral is
    // the card's identity anchor and has to out-rank the `.title` name directly under it
    // (Cooper's visual pass, 2026-09-02) — the portrait beside it caps at 140pt, so the
    // identity column still has room at this size.
    @ScaledMetric(relativeTo: .title) private var scaledNumberSize: CGFloat = 64

    @Environment(\.dynamicTypeSize) private var dynamicTypeSize

    private var photoSize: CGFloat { min(scaledPhotoSize, 140) }

    /// The palette every team-colored surface on this card resolves from: the picked kit
    /// when the card was opened from the depth chart, else the team's own.
    private var jersey: JerseyColors? { kitColors ?? team?.colors.jersey }

    /// The jersey numeral above the name: a filled glyph with a contrasting outline, the
    /// way a real jersey number is built (spec direction 3, locked 2026-09-01).
    ///
    /// This replaces a 26%-opacity watermark. That treatment was decorative by construction
    /// — it carried `accessibilityHidden` — and for dark-primary teams it composited to
    /// 1.02–1.16 against the ground, i.e. invisible. Promoting it to a real object is a
    /// deliberate hierarchy change, so it also gains a label.
    ///
    /// Both colors come from TeamSurfaces.numeral, so the pair is always two real jersey
    /// colors. The swap branch there is why this isn't just "stroke it white": `primary` is
    /// white on every away kit in the archive, so an unconditional white stroke renders
    /// those numerals as a solid white slab.
    ///
    /// The `#` and the digits are separate runs so each can carry its own `strokeWidth`
    /// sign: negative fills *and* strokes (the digits), positive strokes only, leaving the
    /// glyph hollow (the `#`). That sign is the whole trick — see the spec's
    /// implementation note.
    @ViewBuilder
    private var jerseyNumeral: some View {
        if let colors = jersey {
            let numeral = TeamSurfaces.numeral(colors)
            StrokedText(
                runs: [
                    // The `#` gets the digits' exact treatment — filled, same trim — at
                    // half size, so it reads as a small prefix mark rather than a fourth
                    // digit. It carries the SAME stroke percentage as the digits on
                    // purpose: the percentage is relative to each run's own size, so the
                    // half-size `#` also gets a half-as-wide outline. That proportion is
                    // the fix — see hashSizeRatio.
                    .init(
                        text: "#",
                        size: scaledNumberSize * hashSizeRatio,
                        fill: Color(hex: numeral.fill),
                        stroke: Color(hex: numeral.stroke),
                        strokeWidthPercent: numeralStrokePercent
                    ),
                    .init(
                        text: String(player.number),
                        size: scaledNumberSize,
                        fill: Color(hex: numeral.fill),
                        stroke: Color(hex: numeral.stroke),
                        strokeWidthPercent: numeralStrokePercent
                    ),
                ],
                weight: .black,
                tracking: scaledNumberSize * -0.03
            )
            .accessibilityLabel("Jersey number \(player.number)")
        } else {
            // No kit resolved yet: the app accent, unstroked. There is no team pair to
            // outline with, and a stroke in a neutral would read as a rendering artefact.
            Text("#\(player.number)")
                .font(.system(size: scaledNumberSize, weight: .black))
                .tracking(scaledNumberSize * -0.03)
                .foregroundStyle(DesignTokens.Colors.accent)
                .lineLimit(1)
                .minimumScaleFactor(0.5)
                .accessibilityLabel("Jersey number \(player.number)")
        }
    }

    /// Outline weight as a percentage of the glyph size, so it holds its proportion at
    /// accessibility text sizes rather than thinning out as the numeral grows. 3% (~1.9pt
    /// at 64pt) is a trim line around the digit. 6% was tried first and was the single
    /// biggest thing wrong with this treatment (Cooper, 2026-09-02: *"way worse overall …
    /// the outline should be thinner"*): it read as a slab rather than trim, and it nearly
    /// closed the counters of round digits like 3, 6 and 8.
    private var numeralStrokePercent: CGFloat { 3 }

    /// The `#`'s size relative to the digits. Half-size keeps it subordinate to the number,
    /// and because the outline is a percentage of each run's own size it also halves the
    /// `#`'s trim — which is the actual fix for the original complaint. A stroke is centred
    /// on the glyph path, so on a bar of thickness `t` a stroke of width `w` meets itself
    /// in the middle once `w` approaches `t`. The `#`'s bars are the thinnest strokes in
    /// the numeral, so the weight that merely looked heavy on the digits was wide enough to
    /// close the `#` — that is what "the outline goes through the hashtag" was.
    private var hashSizeRatio: CGFloat { 0.5 }

    /// The card's accent for anything drawn straight on the page — watermark, row text,
    /// stats highlights, chip labels and borders. `mark` rather than `ring` because none of
    /// these sit on a fill to borrow contrast from.
    private var markColor: Color {
        jersey.map { Color(hex: TeamSurfaces.mark($0)) } ?? DesignTokens.Colors.accent
    }

    init(
        player: Player,
        team: Team?,
        kitColors: JerseyColors? = nil,
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
        self.kitColors = kitColors
        self.depthChart = depthChart
        self.onSelectPlayer = onSelectPlayer
        self.defaultDepthChart = defaultDepthChart.isEmpty ? depthChart : defaultDepthChart
        self.preferences = preferences
        self.isPositionCustom = isPositionCustom
        self.onReorder = onReorder
        self.onResetPosition = onResetPosition
        self.globalEditMode = globalEditMode
        self.repository = repository
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
        // Visible grabber so the swipe-to-dismiss gesture is discoverable, not just
        // the X (web's player card is a right-hand drawer; native is a sheet).
        DepthSheet(showDragIndicator: true) {
            ScrollView {
                VStack(alignment: .leading, spacing: DesignTokens.Spacing.lg) {
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
                    fullProfileLink
                }
                .padding()
            }
            .scrollIndicators(.hidden)
            .accessibilityIdentifier("player-profile-content")
            .task { await viewModel.load() }
        }
    }

    // Side-by-side portrait and name only works while the name still has room to wrap on
    // word boundaries. At accessibility sizes the remaining column is narrower than a
    // single word, so the layout stacks instead — otherwise names break mid-word
    // ("DJ Moor / e"), which is the failure this switch exists to prevent.
    private var header: some View {
        let accent = markColor
        let identity = VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            // Web parity (PlayerCardHeader): a large team-accent watermark number above
            // the name — the most recognizable jersey identity, placed first per
            // Cooper's visual pass ("make it a large team-colored number that appears
            // above the name"). The `#12 · QB · Quarterback` line below stays.
            jerseyNumeral
            Text(player.name.isEmpty ? "#\(player.number)" : player.name)
                .font(.title.bold())
                .accessibilityIdentifier("player-profile-name")
            // Web parity (components/PlayerCardHeader.tsx): position renders as a
            // Badge pill, not plain text, and the number isn't repeated here — the
            // watermark above already shows it (DEP-223). The position badge, full
            // name, and the depth-chart-order status read as one unit — "QB ·
            // Quarterback · Starter" on a single line (DEP-242). At accessibility
            // sizes the row would overflow, so the status drops back to its own line
            // there.
            if dynamicTypeSize.isAccessibilitySize {
                positionLabel(accent)
                statusLabel(accent)
            } else {
                HStack(spacing: 6) {
                    positionLabel(accent)
                    statusLabel(accent)
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)

        return Group {
            if dynamicTypeSize.isAccessibilitySize {
                VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
                    photo
                    identity
                }
            } else {
                HStack(alignment: .top, spacing: DesignTokens.Spacing.md) {
                    photo
                    identity
                }
            }
        }
        .accessibilityElement(children: .contain)
    }

    // DEP-415: retain the tuned four-column row at standard sizes. Accessibility
    // sizes need a full-width cell per vital so Experience never breaks into letters.
    private var vitals: some View {
        let layout = dynamicTypeSize.isAccessibilitySize
            ? AnyLayout(VStackLayout(spacing: DesignTokens.Spacing.sm))
            : AnyLayout(HStackLayout(spacing: 0))
        return layout {
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

    @ViewBuilder
    private var divider: some View {
        if dynamicTypeSize.isAccessibilitySize {
            Divider().overlay(DesignTokens.Colors.borderDefault)
        } else {
            Rectangle()
                .fill(DesignTokens.Colors.borderDefault)
                .frame(width: 1)
                .padding(.vertical, 4)
        }
    }

    private var statsSection: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            sectionHeader(PlayerProfileSection.seasonStatsTitle)
            switch viewModel.statsState {
            case .loading:
                PlayerStatsSkeleton(columnCount: playerStatColumns(for: player.position).count)
            case .loaded:
                PlayerStatsTable(
                    stats: viewModel.stats,
                    columns: playerStatColumns(for: player.position),
                    accent: markColor
                )
                .frame(maxWidth: .infinity, alignment: PlayerStatsTableLayout.containerAlignment.swiftUI)
            case .empty:
                ContentUnavailableView("No stats available", systemImage: "chart.bar.xaxis")
                    .frame(maxWidth: .infinity)
            case .failed(let error):
                VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
                    Text(error.recoveryDescription)
                        .foregroundStyle(DesignTokens.Colors.textMuted)
                    Button("Retry") { Task { await viewModel.retry() } }
                        .frame(minWidth: 44, minHeight: 44)
                        .accessibilityIdentifier("player-profile-stats-retry")
                }
            }
        }
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("player-profile-stats")
    }

    // DEP-369 entry point: the card's own quick-glance stats table stays as-is; this row
    // is the one door to the full-screen destination (season-by-season stats, draft
    // history, accolades) that a single card sheet has no room for.
    private var fullProfileLink: some View {
        NavigationLink {
            PlayerProfileView(player: player, team: team, kitColors: kitColors, repository: repository)
        } label: {
            HStack {
                Text("Full stats & history")
                    .font(.subheadline.bold())
                    .foregroundStyle(DesignTokens.Colors.textPrimary)
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.caption.bold())
                    .foregroundStyle(DesignTokens.Colors.textMuted)
            }
            .padding(DesignTokens.Spacing.md)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .depthCard(dense: true, padded: false)
        .accessibilityIdentifier("player-profile-full-stats-link")
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
        .accessibilityIdentifier("player-vital-\(label.lowercased())")
    }

    // DEP-259: unified onto the vitals eyebrow pattern (caption + tracking + textMuted
    // uppercase) — College/Bio previously used a second, different "field label" style
    // (`.caption.bold()` + `.secondary` title-case) in the same sheet.
    private func labeledText(_ label: String, value: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label.uppercased())
                .font(.caption)
                .tracking(0.5)
                .foregroundStyle(DesignTokens.Colors.textMuted)
            Text(value)
                .foregroundStyle(DesignTokens.Colors.textPrimary)
                .fixedSize(horizontal: false, vertical: true)
        }
        .accessibilityElement(children: .combine)
    }

    private func sectionHeader(_ title: String) -> some View {
        Text(title)
            .font(.caption)
            .tracking(0.5)
            .foregroundStyle(DesignTokens.Colors.textMuted)
    }

    // Web parity (components/PlayerCardDepthList.tsx): the position's players in depth
    // order, STARTER/BACKUP/RESERVE rank labels, current player highlighted with the
    // team accent + checkmark, others tappable to switch the card. DEP-226 adds the
    // card's own Reorder/Done toggle, one-time hint, CUSTOM tag, Reset, and drag rows.
    @ViewBuilder
    private var positionDepth: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            if displayOrder.count <= 1 {
                sectionHeader(PlayerProfileSection.depthChartTitle)
                Text("No backups available")
                    .font(.footnote)
                    .foregroundStyle(DesignTokens.Colors.textMuted)
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

    /// Web parity (PlayerCardDepthList's header row): depth-chart eyebrow and CUSTOM tag
    /// on the left, Reset + the Reorder/Done toggle on the right.
    private var depthHeader: some View {
        let layout = dynamicTypeSize.isAccessibilitySize
            ? AnyLayout(VStackLayout(alignment: .leading, spacing: DesignTokens.Spacing.sm))
            : AnyLayout(HStackLayout(spacing: DesignTokens.Spacing.sm))
        return layout {
            sectionHeader(PlayerProfileSection.depthChartTitle)
            if positionIsCustom {
                customTag
            }
            if !dynamicTypeSize.isAccessibilitySize { Spacer() }
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
                    // DEP-259: 44pt hit target without inflating the pill's small visual
                    // size — same visual-size/hit-slop split the field's player dots use
                    // (DepthChartFieldView.swift), frame added after the pill's own chrome.
                    .frame(minWidth: 44, minHeight: 44)
                    .contentShape(Rectangle())
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
                            // Web parity: a grip glyph leads the "Reorder" label (DEP-241).
                            SixDotGrip(color: accent)
                                .accessibilityHidden(true)
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
                    // DEP-259: see the Reset button's identical comment above.
                    .frame(minWidth: 44, minHeight: 44)
                    .contentShape(Rectangle())
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

    private var accent: Color { markColor }

    /// The label for text sitting on the editing affordance's team-colored fill. Derived
    /// from `mark` — the exact color behind it — and never from a second resolver: an
    /// earlier revision paired a `ring` fill with a `textOnFill` label, which measures
    /// against `primary`, and for 21 of 32 teams both returned the same hex (the Seahawks
    /// rendered #69BE28 on #69BE28, contrast 1.00).
    private var onAccent: Color {
        jersey.map { Color(hex: readableTextOn(TeamSurfaces.mark($0))) }
            ?? DesignTokens.Colors.onAccent
    }

    // Fill is the team's jersey body, ring is a 2px band in the kit's contrast color
    // (DEP-224 fixed a version where fill was the ring color and there was no ring at all).
    // DEP-424: both now resolve through TeamSurfaces — the ring is the one surface the
    // rules cover exactly, since it borrows contrast from the fill it encloses.
    @ViewBuilder
    private var photo: some View {
        let accent = jersey.map { Color(hex: TeamSurfaces.ring($0)) } ?? DesignTokens.Colors.accent
        let fill = jersey.map { Color(hex: TeamSurfaces.fill($0)) } ?? DesignTokens.Colors.accent
        let onFillHex = jersey.map { readableTextOn(TeamSurfaces.fill($0)) }
        let onFill = onFillHex.map(Color.init(hex:)) ?? DesignTokens.Colors.onAccent
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

    // The combined "QB + Quarterback" group — kept as its own accessibility element
    // (player-profile-position) even when the status sits beside it on the same line
    // (DEP-242), because the status keeps its own element/identifier.
    private func positionLabel(_ accent: Color) -> some View {
        HStack(spacing: 6) {
            positionBadge(accent: accent)
            Text(player.position.fullName)
                .font(.caption)
                .foregroundStyle(DesignTokens.Colors.textMuted)
        }
        .accessibilityElement(children: .combine)
        .accessibilityIdentifier("player-profile-position")
    }

    // Web parity (Badge variant="status"): team accent when starter, fixed semantic
    // colors otherwise — this had no color at all before (DEP-223). Sits on the same
    // line as the position at default sizes, its own line at accessibility sizes.
    private func statusLabel(_ accent: Color) -> some View {
        Text(player.status.rawValue.capitalized)
            .font(.caption.weight(.semibold))
            .foregroundStyle(playerStatusColor(player.status, accent: accent))
            .accessibilityIdentifier("player-profile-status")
    }

    private func initials(_ color: Color) -> some View {
        Text("\(player.number)")
            .font(.title.bold())
            .foregroundStyle(color)
    }
}
