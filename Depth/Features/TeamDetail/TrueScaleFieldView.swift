import SwiftUI

// True-scale mode: a
// full-screen cover opened from the field's corner expand button. There is no backdrop to
// tap, so leaving is always the explicit X, and the chart underneath is exactly as it was
// left. Offense and defense share this one view — `unit` only reaches
// `TrueScaleFieldLayout` and the header's formation name; nothing else here is per-unit.
//
// Everything here is drawn at one scale on both axes (`TrueScaleFieldLayout.pointsPerYard`)
// over a measured NFL field that runs edge to edge. The only chrome is a floating Liquid
// Glass header (personnel, recentre, close) — no opaque bars. The
// formation is wider than the phone, so the playfield pans on both axes inside a window
// with a chip gutter each side: a receiver out of view becomes a tappable edge chip that
// eases the field over to him and selects him. Selecting a dot opens a callout on a leader
// line — full name and on/off the line — in place of the old footer readout.
struct TrueScaleFieldView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    let slots: [RenderSlot]
    /// Which unit's alignment table, framing and formation naming to use.
    let unit: Unit
    let colors: TeamColors
    /// The formation on the field, and the unit's others to switch between without leaving
    /// true scale. Empty for historical / no-data snapshots, which draw the generic layout.
    var formation: TeamFormation? = nil
    var formations: [TeamFormation] = []
    var onSelectFormation: (TeamFormation) -> Void = { _ in }

    /// nil until the user pans: the opening position depends on the window size, which is
    /// only known inside the GeometryReader.
    @State private var pan: CGPoint?
    @State private var dragOrigin: CGPoint?
    @State private var selectedKey: String?
    /// Bumped by a deliberate jump (chip tap, recentre) to fire one light impact. Continuous
    /// dragging stays silent — haptics mark discrete events, the same restraint the unit tab
    /// bar and reorder list use.
    @State private var jumpFeedbackCount = 0

    /// Height of the floating header row; the field below it stays visible through the glass.
    private static let headerHeight: CGFloat = 44

    private var layout: TrueScaleFieldLayout { TrueScaleFieldLayout(slots: slots, unit: unit) }

    var body: some View {
        let layout = layout
        GeometryReader { proxy in
            let insets = proxy.safeAreaInsets
            let fullSize = CGSize(
                width: proxy.size.width + insets.leading + insets.trailing,
                height: proxy.size.height + insets.top + insets.bottom
            )
            let window = TrueScaleFieldLayout.Window(
                size: CGSize(
                    width: max(0, fullSize.width - TrueScaleFieldLayout.gutter * 2),
                    height: fullSize.height),
                topInset: insets.top + Self.headerHeight + DesignTokens.Spacing.sm,
                bottomInset: insets.bottom
            )
            let currentPan = pan ?? layout.initialPan(window: window)

            ZStack(alignment: .top) {
                TrueScaleSurface(
                    layout: layout,
                    pan: currentPan,
                    window: window,
                    colors: colors,
                    selectedKey: selectedKey,
                    onSelect: { key in
                        withAnimation(DesignTokens.Motion.selection) {
                            selectedKey = selectedKey == key ? nil : key
                        }
                    },
                    onDeselect: {
                        withAnimation(DesignTokens.Motion.selection) { selectedKey = nil }
                    },
                    onChip: { chip in
                        withAnimation(DesignTokens.Motion.selection) {
                            selectedKey = chip.dot == nil ? nil : chip.target.key
                        }
                        // A player chip already ticks through the selection change; only the
                        // "+N" chip (no selection) needs the jump impact.
                        move(
                            to: layout.centeringPan(on: chip.target, window: window),
                            feedback: chip.dot == nil)
                    }
                )
                .frame(width: fullSize.width, height: fullSize.height)
                .background(fieldGradient)
                .contentShape(Rectangle())
                .gesture(
                    DragGesture(minimumDistance: 3)
                        .onChanged { value in
                            let origin = dragOrigin ?? currentPan
                            dragOrigin = origin
                            pan = layout.clampPan(
                                CGPoint(
                                    x: origin.x + value.translation.width,
                                    y: origin.y + value.translation.height
                                ),
                                window: window
                            )
                        }
                        .onEnded { _ in dragOrigin = nil }
                )
                .accessibilityIdentifier("true-scale-field")
                .offset(x: -insets.leading, y: -insets.top)

                header(layout: layout, pan: currentPan, window: window)
                    .frame(height: Self.headerHeight)
                    .padding(.horizontal, DesignTokens.Spacing.md)
            }
        }
        // Selecting a player is a selection tick, like the unit tabs; deselecting is silent.
        .sensoryFeedback(.selection, trigger: selectedKey) { _, new in new != nil }
        .sensoryFeedback(.impact(weight: .light), trigger: jumpFeedbackCount)
        .background(DesignTokens.Colors.surfaceField1.ignoresSafeArea())
        .preferredColorScheme(.dark)
    }

    private var fieldGradient: some View {
        LinearGradient(
            stops: [
                .init(color: DesignTokens.Colors.surfaceField1, location: 0),
                .init(color: DesignTokens.Colors.surfaceField2, location: 0.45),
                .init(color: DesignTokens.Colors.surfaceField2, location: 0.55),
                .init(color: DesignTokens.Colors.surfaceField1, location: 1),
            ],
            startPoint: .top,
            endPoint: .bottom
        )
    }

    private func move(to target: CGPoint, feedback: Bool = true) {
        if feedback { jumpFeedbackCount += 1 }
        withAnimation(reduceMotion ? nil : .easeOut(duration: 0.26)) {
            pan = target
        }
    }

    private func header(
        layout: TrueScaleFieldLayout, pan: CGPoint, window: TrueScaleFieldLayout.Window
    ) -> some View {
        let offCentre = layout.isOffCentre(pan: pan, window: window)
        return HStack(spacing: DesignTokens.Spacing.sm) {
            formationControl(layout: layout)

            Spacer(minLength: 0)

            controlBar(layout: layout, window: window, offCentre: offCentre)
        }
    }

    /// The formation is a real control, so it earns glass: "Shotgun 11 ▾" opens a menu of the
    /// unit's formations with their usage. With nothing to switch to it drops to a plain
    /// label — a glass capsule that does nothing on tap reads as broken.
    @ViewBuilder
    private func formationControl(layout: TrueScaleFieldLayout) -> some View {
        if let formation, formations.count > 1 {
            Menu {
                // Buttons rather than an inline Picker: menu Picker rows drop the subtitle,
                // and usage is what tells you which formation matters.
                ForEach(formations.sorted { $0.rank < $1.rank }, id: \.self) { option in
                    Button {
                        onSelectFormation(option)
                    } label: {
                        if option == formation {
                            Label(formationTitle(option), systemImage: "checkmark")
                        } else {
                            Text(verbatim: formationTitle(option))
                        }
                        Text(verbatim: "\(option.pct)% of snaps")
                    }
                }
            } label: {
                HStack(spacing: 6) {
                    Text(verbatim: formationTitle(formation))
                        .font(.subheadline.weight(.semibold))
                    Image(systemName: "chevron.down")
                        .font(.caption.weight(.bold))
                }
                .foregroundStyle(DesignTokens.Colors.textPrimary)
                .padding(.horizontal, DesignTokens.Spacing.md)
                .frame(height: 44)
                .contentShape(Capsule())
                .glassCapsule()
            }
            .accessibilityLabel("Formation, \(formationTitle(formation))")
            .accessibilityHint("Switches the formation shown at true scale")
            .accessibilityIdentifier("true-scale-formation")
        } else {
            let title = formation.map(formationTitle) ?? layout.personnelSummary
            if !title.isEmpty {
                Text(verbatim: title)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(DesignTokens.Colors.textPrimary)
                    .shadow(color: .black.opacity(0.6), radius: 3, y: 1)
                    .accessibilityIdentifier("true-scale-formation")
            }
        }
    }

    /// "Shotgun 11" / "Nickel 4-2-5" — the same name the overflow menu's Formations row
    /// uses. The defense's stored alignment is already its display name ("Nickel"); only
    /// the offense's QB alignment needs mapping through `alignmentLabel`.
    func formationTitle(_ formation: TeamFormation) -> String {
        Self.formationTitle(formation, unit: unit)
    }

    static func formationTitle(_ formation: TeamFormation, unit: Unit) -> String {
        switch unit {
        case .offense: return "\(alignmentLabel(formation.alignment)) \(formation.personnel)"
        case .defense, .special: return "\(formation.alignment) \(formation.personnel)"
        }
    }

    /// Recentre and close share one glass bar — one control cluster instead of two floating
    /// buttons. Recentre is always present so the bar never changes shape; it dims while the
    /// view is already on its opening framing, where tapping it would do nothing.
    private func controlBar(
        layout: TrueScaleFieldLayout,
        window: TrueScaleFieldLayout.Window,
        offCentre: Bool
    ) -> some View {
        HStack(spacing: 0) {
            barButton(
                systemImage: "scope", label: "Recentre on the ball",
                identifier: "true-scale-recentre"
            ) {
                withAnimation(DesignTokens.Motion.selection) { selectedKey = nil }
                move(to: layout.initialPan(window: window))
            }
            .disabled(!offCentre)
            .opacity(offCentre ? 1 : 0.4)
            .animation(DesignTokens.Motion.feedback, value: offCentre)

            Rectangle()
                .fill(DesignTokens.Colors.borderInput)
                .frame(width: 1, height: 20)

            barButton(systemImage: "xmark", label: "Close", identifier: "true-scale-close") {
                dismiss()
            }
        }
        .glassCapsule()
    }

    private func barButton(
        systemImage: String,
        label: String,
        identifier: String,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            Image(systemName: systemImage)
                .font(.body.weight(.medium))
                .foregroundStyle(DesignTokens.Colors.textPrimary)
                .frame(width: 44, height: 44)
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel(label)
        .accessibilityIdentifier(identifier)
    }
}

private extension View {
    /// A Liquid Glass capsule, with a material standing in pre-iOS 26.
    @ViewBuilder
    func glassCapsule() -> some View {
        if #available(iOS 26.0, *) {
            glassEffect(.regular.interactive(), in: Capsule())
        } else {
            background(.ultraThinMaterial, in: Capsule())
        }
    }
}

/// The panned field, dots, callout, and edge chips. `Animatable` over the pan so a chip tap
/// or a recentre eases every layer together — the Canvas, the dot visibility filter, the
/// callout, and the chips all recompute per animation frame instead of jumping.
private struct TrueScaleSurface: View, @MainActor Animatable {
    let layout: TrueScaleFieldLayout
    var pan: CGPoint
    let window: TrueScaleFieldLayout.Window
    let colors: TeamColors
    let selectedKey: String?
    let onSelect: (String) -> Void
    let onDeselect: () -> Void
    let onChip: (TrueScaleFieldLayout.EdgeChip) -> Void

    private static let labelHeight: CGFloat = 28
    private static let calloutHeight: CGFloat = 40
    /// Gap between the selected dot's edge and its callout, spanned by the leader line.
    private static let leaderLength: CGFloat = 22
    private static let selectedScale: CGFloat = 1.18

    var animatableData: AnimatablePair<CGFloat, CGFloat> {
        get { AnimatablePair(pan.x, pan.y) }
        set { pan = CGPoint(x: newValue.first, y: newValue.second) }
    }

    var body: some View {
        let gutter = TrueScaleFieldLayout.gutter
        let visible = layout.dots.filter { layout.isVisible($0, pan: pan, window: window) }
        let selected = visible.first { $0.key == selectedKey }
        ZStack(alignment: .topLeading) {
            ZStack(alignment: .topLeading) {
                TrueScaleFurniture(layout: layout, pan: pan)
                // Tapping open grass dismisses the callout; a drag still pans (the parent's
                // DragGesture wins once the touch moves).
                Color.clear
                    .contentShape(Rectangle())
                    .onTapGesture { onDeselect() }
                ForEach(visible) { dot in
                    // The callout carries the selected player's name, so his label steps aside.
                    if dot.key != selectedKey {
                        label(for: dot)
                    }
                    dotButton(dot)
                }
                if let selected {
                    callout(for: selected)
                        .transition(.opacity.combined(with: .scale(scale: 0.9)))
                }
            }
            .frame(width: window.size.width, height: window.size.height, alignment: .topLeading)
            // Clip vertically at the window, but let a visible dot near the edge overhang
            // into the gutter by up to its radius rather than be sliced.
            .mask(
                Rectangle()
                    .frame(
                        width: window.size.width + TrueScaleFieldLayout.dotSize,
                        height: window.size.height)
            )
            .offset(x: gutter)

            ForEach(layout.edgeChips(pan: pan, window: window)) { chip in
                chipButton(chip)
                    .position(
                        x: chip.side == .leading ? gutter / 2 : gutter * 1.5 + window.size.width,
                        y: chip.y
                    )
            }
        }
        .frame(
            width: window.size.width + gutter * 2, height: window.size.height,
            alignment: .topLeading)
    }

    private func label(for dot: TrueScaleFieldLayout.Dot) -> some View {
        let size = TrueScaleFieldLayout.dotSize
        let width = TrueScaleFieldLayout.labelWidth(for: dot)
        // Centred on the dot, then pinned inside the window so panning never slices a
        // name against the gutter.
        let x = min(window.size.width - width / 2 - 4, max(width / 2 + 4, dot.center.x + pan.x))
        return VStack(spacing: 1) {
            Text(verbatim: dot.label)
                .font(.system(size: 10, weight: .semibold))
                .tracking(0.4)
                .foregroundStyle(DesignTokens.Colors.textMuted)
            Text(verbatim: formatLastName(dot.player.name))
                .font(.system(size: 11, weight: .bold))
                .foregroundStyle(DesignTokens.Colors.textPrimary)
        }
        .lineLimit(1)
        .fixedSize()
        .frame(height: Self.labelHeight)
        .shadow(color: .black.opacity(0.7), radius: 1, y: 1)
        // Hangs below the dot, or above it for alternate dots in a tight row.
        .position(
            x: x,
            y: dot.center.y + pan.y + (size / 2 + 4 + Self.labelHeight / 2)
                * (dot.labelAbove ? -1 : 1)
        )
        .accessibilityHidden(true)
    }

    /// The selected player's name tag on a short leader line — the same tag-and-line
    /// language the depth chart uses for names that don't fit under a dot. It opens on the
    /// side his label occupied (so it doesn't land on a tight row's alternating labels) and
    /// flips if that side is under the header or off the bottom.
    private func callout(for dot: TrueScaleFieldLayout.Dot) -> some View {
        let center = CGPoint(x: dot.center.x + pan.x, y: dot.center.y + pan.y)
        let radius = TrueScaleFieldLayout.dotSize / 2 * Self.selectedScale
        let reach = radius + Self.leaderLength + Self.calloutHeight
        var above = dot.labelAbove
        if above && center.y - reach < window.topInset { above = false }
        if !above && center.y + reach > window.size.height - window.bottomInset { above = true }
        let direction: CGFloat = above ? -1 : 1
        let lineStart = CGPoint(x: center.x, y: center.y + direction * (radius + 2))
        let lineEnd = CGPoint(x: center.x, y: center.y + direction * (radius + Self.leaderLength))
        let tagY = lineEnd.y + direction * Self.calloutHeight / 2
        let name =
            dot.player.name.isEmpty
            ? "#\(dot.player.number)" : "#\(dot.player.number) \(dot.player.name)"
        // Estimated width only to keep the tag inside the window; the tag sizes itself.
        let halfWidth = (CGFloat(name.count) * 7 + 24) / 2
        let tagX = min(window.size.width - halfWidth - 4, max(halfWidth + 4, center.x))

        return ZStack(alignment: .topLeading) {
            Path { path in
                path.move(to: lineStart)
                path.addLine(to: lineEnd)
            }
            .stroke(Color.white.opacity(0.5), lineWidth: 1)

            VStack(spacing: 2) {
                Text(verbatim: name)
                    .font(.system(size: 13, weight: .bold))
                    .foregroundStyle(DesignTokens.Colors.textPrimary)
                Text(verbatim: TrueScaleFieldLayout.lineStatus(for: dot))
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(DesignTokens.Colors.textMuted)
            }
            .lineLimit(1)
            .fixedSize()
            .padding(.horizontal, 10)
            .frame(height: Self.calloutHeight)
            .background(
                Color.black.opacity(0.72),
                in: RoundedRectangle(cornerRadius: DesignTokens.Radius.sm)
            )
            .overlay(
                RoundedRectangle(cornerRadius: DesignTokens.Radius.sm)
                    .strokeBorder(Color.white.opacity(0.16))
            )
            .position(x: tagX, y: tagY)
        }
        .allowsHitTesting(false)
        .accessibilityHidden(true)
    }

    private func dotButton(_ dot: TrueScaleFieldLayout.Dot) -> some View {
        let selected = dot.key == selectedKey
        let fill = selected ? colors.secondary : colors.primary
        return Button {
            onSelect(dot.key)
        } label: {
            Circle()
                .fill(Color(hex: fill))
                .overlay {
                    Circle().strokeBorder(
                        selected ? Color.white : Color(hex: colors.secondary), lineWidth: 2)
                }
                .overlay {
                    Text(verbatim: "\(dot.player.number)")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundStyle(Color(hex: readableTextOn(fill)))
                }
                .frame(width: TrueScaleFieldLayout.dotSize, height: TrueScaleFieldLayout.dotSize)
                .scaleEffect(selected ? Self.selectedScale : 1)
                .frame(width: 44, height: 44)
                .contentShape(Circle())
        }
        .buttonStyle(.plain)
        .position(x: dot.center.x + pan.x, y: dot.center.y + pan.y)
        .accessibilityLabel("\(dot.label), \(dot.player.name)")
        .accessibilityValue(TrueScaleFieldLayout.lineStatus(for: dot))
        .accessibilityAddTraits(selected ? .isSelected : [])
        .accessibilityIdentifier("true-scale-dot-\(dot.key)")
    }

    private func chipButton(_ chip: TrueScaleFieldLayout.EdgeChip) -> some View {
        let arrow = chip.side == .leading ? "\u{2039}" : "\u{203A}"
        let title = chip.dot.map { "\(arrow)\($0.player.number)" } ?? "+\(chip.overflowCount)"
        let subtitle = chip.dot?.label ?? "MORE"
        let accent = Color(hex: colors.secondary)
        return Button {
            onChip(chip)
        } label: {
            VStack(spacing: 1) {
                Text(verbatim: title)
                    .font(.system(size: 11, weight: .bold))
                    .foregroundStyle(Color(hex: readableTextOn(colors.primary)))
                Text(verbatim: subtitle)
                    .font(.system(size: 8, weight: .semibold))
                    .foregroundStyle(accent)
            }
            .lineLimit(1)
            .fixedSize()
            .frame(width: TrueScaleFieldLayout.gutter)
            .padding(.vertical, 5)
            .background(Color(hex: colors.primary).opacity(0.94))
            .overlay(alignment: .top) { Rectangle().fill(accent.opacity(0.5)).frame(height: 1) }
            .overlay(alignment: .bottom) { Rectangle().fill(accent.opacity(0.5)).frame(height: 1) }
            // The drawn chip is only 30pt wide; the hit area meets 44pt vertically and
            // stays inside the gutter so it can't steal taps from the playfield.
            .frame(minHeight: 44)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel(
            chip.dot.map {
                "\($0.label) \($0.player.name), off screen \(chip.side == .leading ? "left" : "right")"
            }
                ?? "\(chip.overflowCount) more players off screen \(chip.side == .leading ? "left" : "right")"
        )
        .accessibilityHint("Pans the field to the player")
        .accessibilityIdentifier("true-scale-chip-\(chip.id)")
    }
}

/// Real field furniture — out-of-bounds shade, mow bands, sidelines, 5-yd lines, 1-yd
/// sideline and hash marks, rotated numerals, and the scrimmage line — in one Canvas sized
/// to the window and translated by the pan, so a 2,600pt surface never becomes a bitmap.
private struct TrueScaleFurniture: View {
    let layout: TrueScaleFieldLayout
    let pan: CGPoint

    var body: some View {
        let furniture = layout.furniture
        Canvas { context, _ in
            context.translateBy(x: pan.x, y: pan.y)
            let content = layout.contentSize
            let chalk = Color.white

            context.fill(
                Path(CGRect(x: 0, y: 0, width: furniture.fieldMinX, height: content.height)),
                with: .color(.black.opacity(0.2))
            )
            context.fill(
                Path(
                    CGRect(
                        x: furniture.fieldMaxX, y: 0,
                        width: content.width - furniture.fieldMaxX, height: content.height
                    )),
                with: .color(.black.opacity(0.2))
            )
            for band in furniture.bands {
                context.fill(
                    Path(band.rect),
                    with: .color(band.light ? .white.opacity(0.028) : .black.opacity(0.045))
                )
            }
            for x in [furniture.fieldMinX, furniture.fieldMaxX] {
                context.fill(
                    Path(CGRect(x: x - 2, y: 0, width: 4, height: content.height)),
                    with: .color(chalk.opacity(0.8))
                )
            }
            for tick in furniture.ticks {
                context.fill(Path(tick), with: .color(chalk.opacity(0.62)))
            }
            for y in furniture.yardLineYs {
                context.fill(
                    Path(
                        CGRect(
                            x: furniture.fieldMinX, y: y - 1,
                            width: furniture.fieldMaxX - furniture.fieldMinX, height: 2
                        )),
                    with: .color(chalk.opacity(0.78))
                )
            }

            let numeralColor = chalk.opacity(0.62)
            let numeralFont = Font.system(size: furniture.numeralFontSize, weight: .heavy).width(
                .condensed)
            for numeral in furniture.numerals {
                let text = context.resolve(
                    Text(verbatim: numeral.text).font(numeralFont).foregroundStyle(numeralColor))
                let textSize = text.measure(in: CGSize(width: 1000, height: 1000))
                context.drawLayer { layer in
                    layer.translateBy(x: numeral.center.x, y: numeral.center.y)
                    layer.rotate(by: .degrees(numeral.degrees))
                    layer.draw(text, at: .zero, anchor: .center)
                    if let positive = numeral.arrowOnPositiveSide {
                        let arrow = layer.resolve(
                            Text(verbatim: positive ? "\u{25B8}" : "\u{25C2}")
                                .font(.system(size: furniture.numeralFontSize * 0.4))
                                .foregroundStyle(numeralColor)
                        )
                        let offset = textSize.width / 2 + furniture.numeralFontSize * 0.16
                        layer.draw(
                            arrow, at: CGPoint(x: positive ? offset : -offset, y: 0),
                            anchor: .center)
                    }
                }
            }

            // Sideline to sideline, like the broadcast line — not across the out-of-bounds grass.
            context.fill(
                Path(
                    CGRect(
                        x: furniture.fieldMinX, y: layout.lineOfScrimmageY - 1,
                        width: furniture.fieldMaxX - furniture.fieldMinX, height: 2
                    )),
                with: .color(DesignTokens.Colors.fieldLineOfScrimmage)
            )
        }
        .allowsHitTesting(false)
        .accessibilityHidden(true)
    }
}
