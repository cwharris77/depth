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
        HStack(spacing: DesignTokens.Spacing.sm) {
            sectionHeader(PlayerProfileSection.depthChartTitle)
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

    // Mirrors web PlayerCardDepthList.depthRankLabel: ranks are capped at 3, so
    // anything past 2 is "reserve" rather than a literal ordinal.
    private func depthRankLabel(_ rank: Int) -> String {
        switch rank {
        case 1: "STARTER"
        case 2: "BACKUP"
        default: "RESERVE"
        }
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

// Mirrors lib/utils/colors.ts statusColor: starter is team-driven, the rest are fixed
// semantic colors shared by every team. DEP-424: the caller now passes a TeamSurfaces-
// resolved color, so `starter` no longer resolves to the retired `uiAccent` — which made
// it 2.12:1 on the Jets.
private func playerStatusColor(_ status: PlayerStatus, accent: Color) -> Color {
    switch status {
    case .starter: accent
    case .backup: DesignTokens.Colors.textMuted
    case .rookie: DesignTokens.Colors.statusRookie
    case .injured: DesignTokens.Colors.statusInjured
    }
}

// Web parity (lucide GripVertical, DEP-241): the six-dot vertical drag grip. SF Symbols
// has no six-dot grip — line.3.horizontal is the hamburger and circle.grid.2x2 is four
// dots — so this draws the 2x3 dot grid GripVertical depicts, the "drag me" affordance
// web uses for both the Reorder toggle and the reorder rows. Sized like web (toggle 12,
// rows 16) so it reads as a small grip, not an oversized icon (DEP-241 follow-up).
private struct SixDotGrip: View {
    let color: Color
    var size: CGFloat = 12

    var body: some View {
        VStack(spacing: size * 0.2) {
            ForEach(0..<3, id: \.self) { _ in
                HStack(spacing: size * 0.24) {
                    dot
                    dot
                }
            }
        }
    }

    private var dot: some View {
        Circle().fill(color).frame(width: size * 0.2, height: size * 0.2)
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
        HStack(spacing: DesignTokens.Spacing.sm) {
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
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @AccessibilityFocusState(for: .voiceOver) private var focusedPlayerID: String?

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
    /// Row mid-Ys in the frozen pickup order — a fixed ruler the finger maps onto. Frozen
    /// so the slot mapping never chases the live-reordered rows (that caused the drag and
    /// the reorder to fight: jittery, over-sensitive, had to overshoot to reach the ends).
    @State private var frozenCenters: [CGFloat] = []
    /// Drives the "lifted" row visual (scale + shadow) while dragging.
    @State private var liftRow = false
    /// Separate counters map the custom gesture's two meaningful physical moments to
    /// haptics: pickup gets one medium impact, and each crossed rank gets one selection
    /// tick. Release stays silent so a short reorder never becomes a three-buzz action.
    @State private var pickupFeedbackCount = 0
    @State private var rankFeedbackCount = 0
    /// Dead-zone around each slot boundary: the row reorders only once the finger crosses
    /// a boundary past this margin, so a finger resting on a boundary doesn't flip-flop.
    private let reorderHysteresis: CGFloat = 6

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
        .sensoryFeedback(.impact(weight: .medium), trigger: pickupFeedbackCount)
        .sensoryFeedback(.selection, trigger: rankFeedbackCount)
    }

    private func row(_ p: Player) -> some View {
        let index = players.firstIndex(where: { $0.id == p.id }) ?? 0
        let accessibility = DepthReorderAccessibility(player: p, index: index, count: players.count)
        return HStack(spacing: DesignTokens.Spacing.sm) {
            // Web parity (PlayerCardDepthList's edit rows): a grip glyph leads each row
            // while reordering — the six-dot drag grip (size 16, matching web's row
            // GripVertical), not a hamburger (DEP-241). Rows are no longer tap-to-switch.
            SixDotGrip(color: DesignTokens.Colors.textMuted, size: 16)
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
        .scaleEffect(draggedPlayerID == p.id && liftRow && !reduceMotion ? 1.03 : 1)
        .shadow(color: draggedPlayerID == p.id && liftRow ? .black.opacity(0.18) : .clear, radius: 8, y: 3)
        // Long-press pick-up = the ScrollView disambiguator: hold still briefly and the row
        // lifts; without it a moving finger is indistinguishable from a scroll.
        .gesture(
            LongPressGesture(minimumDuration: 0.25)
                .sequenced(
                    before: DragGesture(
                        minimumDistance: 0,
                        coordinateSpace: .named("depthReorderList")
                    )
                )
                .onChanged { value in
                    switch value {
                    case .first(true):
                        guard draggedPlayerID == nil else { return }
                        draggedPlayerID = p.id
                        frozenCenters = players.map { rowCenters[$0.id] ?? 0 }
                        pickupFeedbackCount += 1
                        withAnimation(reduceMotion ? nil : .snappy(duration: 0.15)) {
                            liftRow = true
                        }
                    case .second(true, let drag?):
                        guard draggedPlayerID != nil else { return }
                        updateSlot(fingerY: drag.location.y)
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
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(accessibility.label)
        .accessibilityActions {
            if accessibility.destination(offset: -1) != nil {
                Button("Move Up") { moveAccessibly(playerID: p.id, offset: -1) }
            }
            if accessibility.destination(offset: 1) != nil {
                Button("Move Down") { moveAccessibly(playerID: p.id, offset: 1) }
            }
        }
        .accessibilityFocused($focusedPlayerID, equals: p.id)
        .accessibilityIdentifier("player-profile-depth-reorder-row-\(p.id)")
    }

    // DEP-414: resolve the current index when invoked, so repeated rotor actions never
    // use a stale rank. Share drag's move and commit paths, including local persistence.
    private func moveAccessibly(playerID: String, offset: Int) {
        guard draggedPlayerID == nil,
              let from = players.firstIndex(where: { $0.id == playerID }) else { return }
        let accessibility = DepthReorderAccessibility(
            player: players[from], index: from, count: players.count
        )
        guard let to = accessibility.destination(offset: offset) else { return }
        moveDragged(from: from, to: to)
        onCommit(players)
        focusedPlayerID = playerID
        AccessibilityNotification.Announcement(
            DepthReorderAccessibility(player: players[to], index: to, count: players.count)
                .moveAnnouncement
        ).post()
    }

    /// Moves the dragged player one slot at a time as the finger crosses the adjacent slot
    /// boundary (with a small dead-zone). The ruler (`frozenCenters`) is fixed at pickup, so
    /// `frozenCenters[from]` is the center of the slot the dragged row currently occupies —
    /// moving one step keeps the mapping monotonic and lets the finger land exactly on any
    /// middle slot.
    private func updateSlot(fingerY: CGFloat) {
        guard let draggedID = draggedPlayerID,
              let from = players.firstIndex(where: { $0.id == draggedID }),
              frozenCenters.count == players.count else { return }
        // Moving down: cross the boundary below the current slot (with hysteresis).
        if from + 1 < players.count {
            let boundary = (frozenCenters[from] + frozenCenters[from + 1]) / 2
            if fingerY > boundary + reorderHysteresis {
                moveDragged(from: from, to: from + 1)
                return
            }
        }
        // Moving up: cross the boundary above the current slot (with hysteresis).
        if from - 1 >= 0 {
            let boundary = (frozenCenters[from - 1] + frozenCenters[from]) / 2
            if fingerY < boundary - reorderHysteresis {
                moveDragged(from: from, to: from - 1)
            }
        }
    }

    private func moveDragged(from: Int, to: Int) {
        withAnimation(reduceMotion ? nil : .snappy(duration: 0.15)) {
            players.move(
                fromOffsets: IndexSet(integer: from),
                toOffset: to > from ? to + 1 : to
            )
        }
        rankFeedbackCount += 1
    }
}

// DEP-414: spoken rank follows the actual list index, not depthRank (which caps at 3).
// The same bounds determine available rotor actions and reject stale boundary moves.
struct DepthReorderAccessibility {
    let player: Player
    let index: Int
    let count: Int

    func destination(offset: Int) -> Int? {
        guard (offset == -1 || offset == 1), (0..<count).contains(index),
              (0..<count).contains(index + offset) else { return nil }
        return index + offset
    }

    private var identity: String {
        player.name.isEmpty ? "Number \(player.number)" : "\(player.name), number \(player.number)"
    }

    private var rank: String {
        let role = index == 0 ? "Starter" : index == 1 ? "Backup" : "Reserve"
        return "\(player.position.fullName), rank \(index + 1) of \(count), \(role)"
    }

    var label: String { "\(identity), \(rank)" }
    var moveAnnouncement: String { "Moved \(identity) to \(rank)" }
}

enum PlayerProfileSection {
    static let seasonStatsTitle = "SEASON STATS"
    static let depthChartTitle = "DEPTH CHART"
}

// Season-stats columns share one centered width, whether they are labels or values. The table
// uses its preferred readable width for sparse rows and grows only as far as the card allows
// for stat-heavy rows (DEP-292). Every value still arrives paired with its spoken column name
// via `PlayerStatsAccessibility.rowLabel`.
enum PlayerStatsTableLayout {
    enum ColumnAlignment: Equatable {
        case center

        var swiftUI: Alignment {
            .center
        }
    }

    static let alignment: ColumnAlignment = .center
    static let containerAlignment: ColumnAlignment = .center
}

private struct PlayerStatsTable: View {
    let stats: [PlayerSeasonStats]
    let columns: [PlayerStatColumn]
    let accent: Color

    // Keeps short rows compact while leaving room for the widest compact stat labels and
    // values. More columns use the card's available width instead.
    @ScaledMetric(relativeTo: .footnote) private var preferredColumnWidth: CGFloat = 96

    private var preferredTableWidth: CGFloat {
        CGFloat(columns.count + 2) * preferredColumnWidth
    }

    var body: some View {
        ViewThatFits(in: .horizontal) {
            table.frame(width: preferredTableWidth)
            table.frame(maxWidth: .infinity)
        }
        .depthCard(dense: true, padded: false)
    }

    private var table: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: DesignTokens.Spacing.sm) {
                cell("SZN", header: true)
                cell("TM", header: true)
                ForEach(columns, id: \.self) { column in
                    cell(column.header, header: true)
                }
            }
            .padding(.horizontal, DesignTokens.Spacing.sm)
            .padding(.vertical, DesignTokens.Spacing.sm)
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
                HStack(spacing: DesignTokens.Spacing.sm) {
                    cell("\(season.season)", valueColor: isCurrent ? accent : nil)
                    cell(season.teamAbbrev ?? "—")
                    ForEach(columns, id: \.self) { column in
                        cell(column.value(for: season))
                    }
                }
                .padding(.horizontal, DesignTokens.Spacing.sm)
                .padding(.vertical, DesignTokens.Spacing.sm)
                .background(isCurrent ? accent.opacity(0.05) : .clear)
                .accessibilityElement(children: .ignore)
                .accessibilityLabel(
                    PlayerStatsAccessibility.rowLabel(for: season, columns: columns)
                )
            }
        }
    }

    private func cell(_ value: String, header: Bool = false, valueColor: Color? = nil) -> some View {
        Text(value)
            .font(header ? .caption.bold() : .footnote.weight(.semibold))
            .foregroundStyle(valueColor ?? (header ? DesignTokens.Colors.textMuted : DesignTokens.Colors.textPrimary))
            .lineLimit(1)
            .minimumScaleFactor(0.75)
            .frame(
                maxWidth: .infinity,
                alignment: PlayerStatsTableLayout.alignment.swiftUI
            )
    }
}

// Sized against the same scaled metrics as the table it stands in for, so the section
// doesn't resize when real rows land (AGENTS.md's flash-then-jump rule). Matches the
// table's layout: two fixed-width label cells, then one flexible cell per stat column.
private struct PlayerStatsSkeleton: View {
    let columnCount: Int

    // Matches the table's tightened DEP-234 metrics (labelWidth 36, row spacing 12).
    @ScaledMetric(relativeTo: .footnote) private var cellWidth: CGFloat = 36
    @ScaledMetric(relativeTo: .footnote) private var cellHeight: CGFloat = 14

    var body: some View {
        VStack(spacing: DesignTokens.Spacing.sm) {
            ForEach(0..<2, id: \.self) { _ in
                HStack(spacing: DesignTokens.Spacing.sm) {
                    ForEach(0..<2, id: \.self) { _ in
                        RoundedRectangle(cornerRadius: 4)
                            .fill(DesignTokens.Colors.surfacePlaceholder)
                            .frame(width: cellWidth, height: cellHeight)
                    }
                    ForEach(0..<columnCount, id: \.self) { _ in
                        RoundedRectangle(cornerRadius: 4)
                            .fill(DesignTokens.Colors.surfacePlaceholder)
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
