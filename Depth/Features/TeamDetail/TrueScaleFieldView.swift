import SwiftUI

// The offense's true-scale mode (design "Field Scale Options", turn 2): a full-screen
// cover opened from the field's corner expand button. There is no backdrop to tap, so
// leaving is always the explicit X, and the chart underneath is exactly as it was left.
//
// Everything here is drawn at one scale on both axes (`TrueScaleFieldLayout.pointsPerYard`)
// over a measured NFL field. The formation is wider than the phone, so the playfield pans
// on both axes inside a window with a chip gutter each side: a receiver out of view becomes
// a tappable edge chip that eases the field over to him and selects him. Selecting a dot
// fills the footer with his real alignment — that sentence is the reason to come here.
struct TrueScaleFieldView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    let slots: [RenderSlot]
    let colors: TeamColors

    /// nil until the user pans: the opening position depends on the window size, which is
    /// only known inside the GeometryReader.
    @State private var pan: CGPoint?
    @State private var dragOrigin: CGPoint?
    @State private var selectedKey: String?

    private static let headerHeight: CGFloat = 52
    private static let footerHeight: CGFloat = 68

    private var layout: TrueScaleFieldLayout { TrueScaleFieldLayout(slots: slots) }

    var body: some View {
        let layout = layout
        GeometryReader { proxy in
            let viewport = CGSize(
                width: max(0, proxy.size.width - TrueScaleFieldLayout.gutter * 2),
                height: max(0, proxy.size.height - Self.headerHeight - Self.footerHeight)
            )
            let currentPan = pan ?? layout.initialPan(viewport: viewport)

            VStack(spacing: 0) {
                header(layout: layout, pan: currentPan, viewport: viewport)
                    .frame(height: Self.headerHeight)

                TrueScaleSurface(
                    layout: layout,
                    pan: currentPan,
                    viewport: viewport,
                    colors: colors,
                    selectedKey: selectedKey,
                    onSelect: { key in
                        withAnimation(DesignTokens.Motion.feedback) {
                            selectedKey = selectedKey == key ? nil : key
                        }
                    },
                    onChip: { chip in
                        selectedKey = chip.dot == nil ? nil : chip.target.key
                        move(to: layout.centeringPan(on: chip.target, viewport: viewport))
                    }
                )
                .frame(height: viewport.height)
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
                                viewport: viewport
                            )
                        }
                        .onEnded { _ in dragOrigin = nil }
                )
                .accessibilityIdentifier("true-scale-field")

                footer(layout: layout, pan: currentPan, viewport: viewport)
                    .frame(height: Self.footerHeight)
            }
        }
        .background(
            LinearGradient(
                colors: [DesignTokens.Colors.navy, DesignTokens.Colors.bg],
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea()
        )
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

    private func move(to target: CGPoint) {
        withAnimation(reduceMotion ? nil : .easeOut(duration: 0.26)) {
            pan = target
        }
    }

    private func header(layout: TrueScaleFieldLayout, pan: CGPoint, viewport: CGSize) -> some View {
        HStack(spacing: DesignTokens.Spacing.sm) {
            VStack(alignment: .leading, spacing: 2) {
                Text("TRUE SCALE")
                    .font(.caption.weight(.semibold))
                    .tracking(0.9)
                    .foregroundStyle(DesignTokens.Colors.textMuted)
                Text(verbatim: [layout.personnelSummary, "drag to walk the field"]
                    .filter { !$0.isEmpty }
                    .joined(separator: " · "))
                    .font(.caption2)
                    .foregroundStyle(DesignTokens.Colors.textFaint)
            }
            .accessibilityElement(children: .combine)
            .frame(maxWidth: .infinity, alignment: .leading)

            // Appears only once you're lost, and eases back to the opening framing.
            if layout.isOffCentre(pan: pan, viewport: viewport) {
                headerButton(systemImage: "scope", label: "Recentre on the ball", identifier: "true-scale-recentre") {
                    selectedKey = nil
                    move(to: layout.initialPan(viewport: viewport))
                }
                .transition(.opacity)
            }

            headerButton(systemImage: "xmark", label: "Close true scale", identifier: "true-scale-close") {
                dismiss()
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.sm)
        .animation(DesignTokens.Motion.feedback, value: layout.isOffCentre(pan: pan, viewport: viewport))
    }

    private func headerButton(
        systemImage: String,
        label: String,
        identifier: String,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            Image(systemName: systemImage)
                .font(.body.weight(.semibold))
                .foregroundStyle(DesignTokens.Colors.textPrimary)
                .frame(width: 44, height: 44)
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel(label)
        .accessibilityIdentifier(identifier)
    }

    private func footer(layout: TrueScaleFieldLayout, pan: CGPoint, viewport: CGSize) -> some View {
        let selected = layout.dots.first { $0.key == selectedKey }
        return VStack(alignment: .leading, spacing: 3) {
            if let selected {
                Text(verbatim: "#\(selected.player.number)  \(selected.player.name)")
                    .font(.subheadline.bold())
                    .foregroundStyle(DesignTokens.Colors.textPrimary)
                    .lineLimit(1)
                Text(verbatim: TrueScaleFieldLayout.alignmentDescription(for: selected))
                    .font(.caption)
                    .foregroundStyle(DesignTokens.Colors.textMuted)
            } else {
                Text("True scale · 1 yd = 44pt")
                    .font(.subheadline.bold())
                    .foregroundStyle(DesignTokens.Colors.textPrimary)
                Text(verbatim: TrueScaleFieldLayout.windowDescription(
                    offsetYards: layout.windowOffsetYards(pan: pan, viewport: viewport)
                ))
                .font(.caption)
                .foregroundStyle(DesignTokens.Colors.textMuted)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, DesignTokens.Spacing.md)
        .accessibilityElement(children: .combine)
        .accessibilityIdentifier("true-scale-readout")
    }
}

/// The panned field, dots, and edge chips. `Animatable` over the pan so a chip tap or a
/// recentre eases every layer together — the Canvas, the dot visibility filter, and the
/// chips all recompute per animation frame instead of jumping to the destination.
private struct TrueScaleSurface: View, @MainActor Animatable {
    let layout: TrueScaleFieldLayout
    var pan: CGPoint
    let viewport: CGSize
    let colors: TeamColors
    let selectedKey: String?
    let onSelect: (String) -> Void
    let onChip: (TrueScaleFieldLayout.EdgeChip) -> Void

    private static let labelHeight: CGFloat = 28

    var animatableData: AnimatablePair<CGFloat, CGFloat> {
        get { AnimatablePair(pan.x, pan.y) }
        set { pan = CGPoint(x: newValue.first, y: newValue.second) }
    }

    var body: some View {
        let gutter = TrueScaleFieldLayout.gutter
        ZStack(alignment: .topLeading) {
            ZStack(alignment: .topLeading) {
                TrueScaleFurniture(layout: layout, pan: pan)
                ForEach(layout.dots.filter { layout.isVisible($0, pan: pan, viewport: viewport) }) { dot in
                    label(for: dot)
                    dotButton(dot)
                }
            }
            .frame(width: viewport.width, height: viewport.height, alignment: .topLeading)
            // Clip vertically at the window, but let a visible dot near the edge overhang
            // into the gutter by up to its radius rather than be sliced.
            .mask(
                Rectangle()
                    .frame(width: viewport.width + TrueScaleFieldLayout.dotSize, height: viewport.height)
            )
            .offset(x: gutter)

            ForEach(layout.edgeChips(pan: pan, viewport: viewport)) { chip in
                chipButton(chip)
                    .position(
                        x: chip.side == .leading ? gutter / 2 : gutter * 1.5 + viewport.width,
                        y: chip.y
                    )
            }
        }
        .frame(width: viewport.width + gutter * 2, height: viewport.height, alignment: .topLeading)
    }

    private func label(for dot: TrueScaleFieldLayout.Dot) -> some View {
        let size = TrueScaleFieldLayout.dotSize
        let width = TrueScaleFieldLayout.labelWidth(for: dot)
        // Centred on the dot, then pinned inside the window so panning never slices a
        // name against the gutter.
        let x = min(viewport.width - width / 2 - 4, max(width / 2 + 4, dot.center.x + pan.x))
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
            y: dot.center.y + pan.y + (size / 2 + 4 + Self.labelHeight / 2) * (dot.labelAbove ? -1 : 1)
        )
        .accessibilityHidden(true)
    }

    private func dotButton(_ dot: TrueScaleFieldLayout.Dot) -> some View {
        let selected = dot.key == selectedKey
        let fill = selected ? colors.secondary : colors.primary
        return Button { onSelect(dot.key) } label: {
            Circle()
                .fill(Color(hex: fill))
                .overlay {
                    Circle().strokeBorder(selected ? Color.white : Color(hex: colors.secondary), lineWidth: 2)
                }
                .overlay {
                    Text(verbatim: "\(dot.player.number)")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundStyle(Color(hex: readableTextOn(fill)))
                }
                .frame(width: TrueScaleFieldLayout.dotSize, height: TrueScaleFieldLayout.dotSize)
                .scaleEffect(selected ? 1.18 : 1)
                .frame(width: 44, height: 44)
                .contentShape(Circle())
        }
        .buttonStyle(.plain)
        .position(x: dot.center.x + pan.x, y: dot.center.y + pan.y)
        .accessibilityLabel("\(dot.label), \(dot.player.name)")
        .accessibilityValue(TrueScaleFieldLayout.alignmentDescription(for: dot))
        .accessibilityAddTraits(selected ? .isSelected : [])
        .accessibilityIdentifier("true-scale-dot-\(dot.key)")
    }

    private func chipButton(_ chip: TrueScaleFieldLayout.EdgeChip) -> some View {
        let arrow = chip.side == .leading ? "\u{2039}" : "\u{203A}"
        let title = chip.dot.map { "\(arrow)\($0.player.number)" } ?? "+\(chip.overflowCount)"
        let subtitle = chip.dot?.label ?? "MORE"
        let accent = Color(hex: colors.secondary)
        return Button { onChip(chip) } label: {
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
            chip.dot.map { "\($0.label) \($0.player.name), off screen \(chip.side == .leading ? "left" : "right")" }
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
        Canvas { context, size in
            context.translateBy(x: pan.x, y: pan.y)
            let content = layout.contentSize
            let chalk = Color.white

            context.fill(
                Path(CGRect(x: 0, y: 0, width: furniture.fieldMinX, height: content.height)),
                with: .color(.black.opacity(0.2))
            )
            context.fill(
                Path(CGRect(
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
                    Path(CGRect(
                        x: furniture.fieldMinX, y: y - 1,
                        width: furniture.fieldMaxX - furniture.fieldMinX, height: 2
                    )),
                    with: .color(chalk.opacity(0.78))
                )
            }

            let numeralColor = chalk.opacity(0.62)
            let numeralFont = Font.system(size: furniture.numeralFontSize, weight: .heavy).width(.condensed)
            for numeral in furniture.numerals {
                let text = context.resolve(Text(verbatim: numeral.text).font(numeralFont).foregroundStyle(numeralColor))
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
                        layer.draw(arrow, at: CGPoint(x: positive ? offset : -offset, y: 0), anchor: .center)
                    }
                }
            }

            context.fill(
                Path(CGRect(x: 0, y: layout.lineOfScrimmageY - 1, width: content.width, height: 2)),
                with: .color(DesignTokens.Colors.fieldLineOfScrimmage)
            )
        }
        .allowsHitTesting(false)
        .accessibilityHidden(true)
    }
}
