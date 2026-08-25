import SwiftUI

// Renders one resolved `Unit` (offense/defense/special) as dots on a field, using the
// shared `resolveUnit` domain logic (T3) unchanged — this view's only job is turning
// `RenderSlot` percentages into an on-screen layout and a tap target per slot.
//
// Dot geometry comes from `DepthChartFieldLayout` (DEP-207): every slot targets one
// uniform dot size, and any cluster of adjacent same-row slots too tight for that size
// is re-spread around its own centroid. The *visual* dot shrinks only for a still-too-
// tight cluster after re-spread; the *tap target* stays at the 44-point minimum via
// `.frame(minWidth:minHeight:)` + `.contentShape` — the same 30px-visual/44px-hit-slop
// contract the web uses. The field's text is still capped at `.accessibility1`:
// positioned slots can't reflow, so a scaled glyph would merge the offensive line into
// one shape, and the full content stays reachable at any size through each slot's
// VoiceOver label.
//
// On top of #378's geometry, the field now renders a real green surface — gradient +
// yard-line/hash-mark/end-zone markings (FieldMarkings) — in place of the old flat
// team-tinted rect, and dots fill `primary` with a `secondary` ring (web's PlayerDot
// semantics) instead of a flat `uiAccent` fill (2026-08-15 visual-pass). DEP-250: each
// filled dot also carries the player's last name under the position tag. A slot the
// layout put in `nameCallouts` (a row too tight for a name under the dot even at the
// uniform size) instead gets its name via a leader line into the field's free space,
// replacing the old per-unit width-breakpoint gate (DepthChartFieldLayout.showsNames,
// still defined/tested but no longer consulted here). The chosen presentation style
// (DEP-323, Settings › Settings) decides whether those leader lines draw, whether a name
// with no room is simply hidden, or whether names are skipped entirely.
struct DepthChartFieldView: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    let snapshot: TeamSnapshot
    let unit: Unit
    /// Overrides the dot fill/ring colors (web's kit selection recolors the field dots
    /// with the chosen uniform's palette). Nil falls back to the team's own colors.
    /// Declared before `onSelectPlayer` so callers keep the trailing-closure style.
    var colors: TeamColors? = nil
    /// The unit's selected real formation to render (web's active formation, owned by the
    /// caller). Nil falls back to the generic synthetic layout — used when the unit has no
    /// formation data, is special teams, or is a historical season.
    var formation: TeamFormation? = nil
    /// DEP-323: which of the three name-presentation styles to draw (chosen in Settings).
    var nameMode: FieldNameMode = .callouts
    /// DEP-309: active full-team edit mode gently wiggles only the existing solid player
    /// dots. Labels, hit targets, field geometry, and empty special-team slots stay put.
    var isEditing = false
    let onSelectPlayer: (Player) -> Void

    // DEP-259: nameFontSize's 7-9pt clamp was a plain `.system(size:)` literal that never
    // grew with Dynamic Type — the field's only text ignoring accessibility settings.
    // Scaling the clamp's own bounds (not the computed size directly, since it's also
    // field-height-driven) keeps the field-height-based shrink behavior while letting the
    // label grow at larger text sizes, same as every other label on the field.
    @ScaledMetric(relativeTo: .caption2) private var minNameFontSize: CGFloat = 7
    @ScaledMetric(relativeTo: .caption2) private var maxNameFontSize: CGFloat = 9

    private var dotColors: TeamColors {
        colors ?? snapshot.team.colors
    }

    /// DEP-251: the one slot the "tap any player" coachmark points at. See the
    /// `.coachmarkTarget` call site in `body` for why it's "whichever renders first"
    /// rather than a fixed position.
    private var firstFilledSlotKey: String? {
        slots.first(where: { $0.player != nil })?.key
    }

    private var slots: [RenderSlot] {
        let roster = Roster(players: snapshot.players, specialTeams: snapshot.specialTeams)
        // DEP-221: pass the caller's selected real formation (formationSlots builds its
        // layout from the TeamFormation) so the field renders the team's actual FTN-charted
        // alignment instead of the generic synthetic layout. nil (no data, special, or
        // historical) falls back to the generic layout, matching web.
        let real = formation.flatMap { formationSlots(for: unit, formation: $0) }
        return resolveUnit(roster: roster, unit: unit, realFormation: real)
    }

    var body: some View {
        GeometryReader { proxy in
            // DEP-244: the offense always fills the field's full width (and its dots run
            // larger) whatever formation is active; defense/special keep their spread.
            let layout = DepthChartFieldLayout.compute(
                slots: slots,
                fieldSize: proxy.size,
                fillWidth: unit == .offense,
                nameMode: nameMode
            )
            ZStack {
                LinearGradient(
                    colors: [
                        DesignTokens.Colors.surfaceField1,
                        DesignTokens.Colors.surfaceField2,
                        DesignTokens.Colors.surfaceField1,
                    ],
                    startPoint: .top,
                    endPoint: .bottom
                )
                .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))

                FieldMarkings()
                    .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))

                ZStack {
                    // THROWAWAY PROTOTYPE: leader lines + name tags for slots the layout
                    // routed through `nameCallouts` (a row too tight for a name under the
                    // dot even at the uniform size). Drawn first so dots layer on top.
                    ForEach(Array(layout.nameCallouts.keys), id: \.self) { key in
                        if let dot = layout.positions[key], let callout = layout.nameCallouts[key],
                            let name = slots.first(where: { $0.key == key })?.player?.name, !name.isEmpty
                        {
                            // THROWAWAY PROTOTYPE, per Cooper 2026-08-23: a leader line to a
                            // dot deep in the formation used to be drawn straight through
                            // every dot between the two. It's now broken around them — the
                            // line is only stroked where it isn't passing over another dot,
                            // so it reads as running behind the formation instead of
                            // striking through it.
                            leaderLine(
                                from: callout,
                                to: dot,
                                avoiding: key,
                                layout: layout
                            )
                            .stroke(Color.white.opacity(0.3), lineWidth: 1)

                            Text(verbatim: formatLastName(name))
                                .font(.system(size: 9, weight: .bold))
                                .foregroundStyle(DesignTokens.Colors.textPrimary)
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(Color.black.opacity(0.5), in: RoundedRectangle(cornerRadius: 6))
                                .overlay(
                                    RoundedRectangle(cornerRadius: 6)
                                        .strokeBorder(Color.white.opacity(0.16))
                                )
                                .fixedSize()
                                .position(callout)
                        }
                    }

                    ForEach(Array(slots.enumerated()), id: \.element.key) { index, slot in
                        slotView(
                            slot,
                            index: index,
                            dotSize: layout.dotSize,
                            showsName: layout.showsInlineName(slot.key),
                            fieldHeight: proxy.size.height
                        )
                        // DEP-251: first-run tutorial's "tap any player" coachmark points at
                        // whichever filled slot renders first — the field has no single
                        // fixed "the QB dot", so the first resolved player stands in for
                        // "any dot" rather than hard-coding a position that may be missing
                        // on some team/unit. Tagged *before* `.position()` deliberately:
                        // `.position()` makes a view accept/report whatever size its parent
                        // proposes (here, the whole field's `ZStack`) rather than its own
                        // small content size, so an anchor read after `.position()` resolves
                        // to that inflated frame (measured directly: a "player dot" ring
                        // that covered the entire field) instead of the ~44pt dot.
                        .coachmarkTarget(if: slot.key == firstFilledSlotKey, id: .playerDot)
                        .position(layout.positions[slot.key] ?? .zero)
                        // Web parity (components/PlayerDot.tsx): on-line players would
                        // straddle the line of scrimmage, so push the drawn dot a
                        // circle-radius (+ a hair) onto its own side — offense (y past 50)
                        // down, defense (y before 50) up. Keeps the whole circle behind
                        // the line. Applied at render time so the formation coordinates
                        // and geometry layer stay untouched (Formations parity oracle).
                        .offset(y: lineOffset(for: slot, dotSize: layout.dotSize))
                    }
                }
                .id(unit)
                .transition(.opacity)
                .animation(
                    reduceMotion ? DesignTokens.Motion.feedback : DesignTokens.Motion.formation,
                    value: formation
                )
            }
            // THROWAWAY PROTOTYPE, per Cooper 2026-08-22: a name near the field's edge
            // (a pinned WR, an outer callout tag) can still run past the card's rounded
            // corner despite the wider margin above — clip so it's cropped at the field
            // boundary instead of visibly bleeding onto the surrounding screen.
            .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
            .overlay {
                RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                    .strokeBorder(DesignTokens.Colors.borderStrong, lineWidth: 1)
            }
        }
        .dynamicTypeSize(...DynamicTypeSize.accessibility1)
        .accessibilityElement(children: .contain)
    }

    /// Verbatim web port of PlayerDot's line offset: `slot.onLine ? (slot.y >= 50 ? 18
    /// : -18) : 0`, scaled from the web's fixed 30px dot to whatever the geometry layer
    /// drew (`dotSize / 2 + 3` = circle radius + a hair, web's 15px + 3). Offense dots
    /// (y ≥ 50, on their side of the line) shift down; defense dots shift up.
    /// The visible parts of a leader line: the segment from a callout tag to its dot, minus
    /// the stretches where it would cross any OTHER dot (plus a small clearance, so the line
    /// visibly stops short rather than kissing the dot's edge). Walks the segment and emits
    /// the runs that stay clear — a straight line can pass over several dots on the way in.
    private func leaderLine(
        from callout: CGPoint,
        to dot: CGPoint,
        avoiding key: String,
        layout: DepthChartFieldLayout
    ) -> Path {
        let clearance = layout.dotSize / 2 + 5
        let blockers = slots.compactMap { slot -> CGPoint? in
            guard slot.key != key, let p = layout.positions[slot.key] else { return nil }
            return CGPoint(x: p.x, y: p.y + lineOffset(for: slot, dotSize: layout.dotSize))
        }

        let steps = 60
        var path = Path()
        var runStart: CGPoint?
        var previous: CGPoint?
        for step in 0...steps {
            let t = CGFloat(step) / CGFloat(steps)
            let point = CGPoint(
                x: callout.x + (dot.x - callout.x) * t,
                y: callout.y + (dot.y - callout.y) * t
            )
            let blocked = blockers.contains { hypot(point.x - $0.x, point.y - $0.y) < clearance }
            if blocked {
                if let start = runStart, let end = previous {
                    path.move(to: start)
                    path.addLine(to: end)
                }
                runStart = nil
            } else if runStart == nil {
                runStart = point
            }
            previous = point
        }
        if let start = runStart, let end = previous {
            path.move(to: start)
            path.addLine(to: end)
        }
        return path
    }

    private func lineOffset(for slot: RenderSlot, dotSize: CGFloat) -> CGFloat {
        // Shared with the geometry layer so the collision math and the drawn dot can't
        // disagree about where an on-line slot actually sits.
        DepthChartFieldLayout.lineOffset(y: slot.y, onLine: slot.onLine, dotSize: dotSize)
    }

    @ViewBuilder
    private func slotView(
        _ slot: RenderSlot,
        index: Int,
        dotSize: CGFloat,
        showsName: Bool,
        fieldHeight: CGFloat
    ) -> some View {
        if let player = slot.player {
            Button {
                onSelectPlayer(player)
            } label: {
                slotDot(
                    label: slot.label,
                    number: player.number,
                    wiggleIndex: index,
                    dotSize: dotSize,
                    playerName: player.name,
                    showsName: showsName,
                    fieldHeight: fieldHeight
                )
                    // The visual dot shrinks with the geometry (DEP-207); the hit area
                    // stays at the 44-point minimum, mirroring the web's 30px dot +
                    // 44px hit-slop (components/PlayerDot.tsx).
                    .frame(minWidth: 44, minHeight: 44)
                    .contentShape(Rectangle())
            }
            .accessibilityLabel("\(slot.label), \(player.name.isEmpty ? "number \(player.number)" : player.name)")
            .accessibilityHint("Opens player detail")
            .accessibilityIdentifier("player-slot-\(slot.key)")
            .buttonStyle(FieldPlayerButtonStyle())
        } else if unit == .special {
            // Web parity gap, deliberately kept: special-team returners are the one case
            // where "no player" is a real, documented state (KR/PR "unfilled by policy",
            // see HistoricalRosterMapper) rather than a resolution gap — showing a mark
            // here is intentional, not a stand-in for a missing player.
            slotDot(
                label: slot.label,
                number: nil,
                wiggleIndex: nil,
                dotSize: dotSize,
                playerName: nil,
                showsName: false,
                fieldHeight: fieldHeight
            )
            .accessibilityLabel("\(slot.label), unfilled")
        } else {
            // Offense/defense: an unresolved slot is a data/formation gap, not a real
            // "no player" state, so it renders nothing — matching web's DepthChartFieldSurface
            // (`if (!player) return null`). A "?" placeholder here would look exactly like a
            // real player circle but do nothing when tapped, which reads as a broken dot
            // rather than an empty one.
            EmptyView()
        }
    }

    private func slotDot(
        label: String,
        number: Int?,
        wiggleIndex: Int?,
        dotSize: CGFloat,
        playerName: String?,
        showsName: Bool,
        fieldHeight: CGFloat
    ) -> some View {
        // THROWAWAY PROTOTYPE, per Cooper 2026-08-23: the dot is its own fixed-size view
        // and the label block hangs BELOW it in an overlay, rather than all three sharing
        // one centered VStack. In the stack version the whole stack was centered on the
        // slot's position, so the circle's real y depended on whether a name happened to
        // render under it — a dot visibly shifted when its name moved to a callout, and
        // the layout's collision math could not predict where anything actually landed.
        // Now the circle sits exactly on the computed position and the label occupies the
        // rectangle DepthChartFieldLayout reserves for it (labelTopGap/labelBlockHeight).
        Circle()
            .fill(Color(hex: dotColors.primary))
            .overlay {
                Circle().strokeBorder(Color(hex: dotColors.secondary), lineWidth: 2)
            }
            .overlay {
                if let number {
                    // Verbatim: a jersey number is an identifier, not a quantity —
                    // LocalizedStringKey interpolation would group it ("1,000"), the
                    // same bug class already fixed for the season year elsewhere.
                    Text(verbatim: "\(number)")
                        .font(.caption.bold())
                        .foregroundStyle(Color(hex: readableTextOn(dotColors.primary)))
                } else {
                    Image(systemName: "questionmark")
                        .font(.caption2)
                        .foregroundStyle(Color(hex: readableTextOn(dotColors.primary)))
                }
            }
            .frame(width: dotSize, height: dotSize)
            .modifier(PlayerDotWiggleModifier(
                isEditing: isEditing && wiggleIndex != nil,
                index: wiggleIndex ?? 0
            ))
            .overlay(alignment: .top) {
                VStack(spacing: 2) {
                    // Web parity (components/PlayerDot.tsx): the position tag renders in
                    // the app's muted gray (textMuted), not the system `.secondary` gray,
                    // so the field matches the web app's label color exactly.
                    Text(label)
                        .font(.caption2.weight(.semibold))
                        .foregroundStyle(DesignTokens.Colors.textMuted)

                    // DEP-250: web's PlayerDot name row — the player's last name under the
                    // position tag, rendered here only when the layout found room for it;
                    // otherwise the name is drawn as a leader-line callout instead.
                    if showsName, let playerName, !playerName.isEmpty {
                        Text(verbatim: formatLastName(playerName))
                            .font(.system(size: nameFontSize(fieldHeight: fieldHeight), weight: .bold))
                            .foregroundStyle(DesignTokens.Colors.textPrimary)
                            .lineLimit(1)
                            .fixedSize()
                    }
                }
                .frame(height: DepthChartFieldLayout.labelBlockHeight, alignment: .top)
                .offset(y: dotSize + DepthChartFieldLayout.labelTopGap)
            }
    }

    /// Web parity (components/PlayerDot.tsx): the name size is clamped to the field's
    /// height (`clamp(7px, 1.3dvh, 9px)` — dvh proxies to the field's own height here)
    /// so labels shrink ahead of colliding when the field's available height shrinks
    /// (short/landscape or split-screen viewports), while staying ≥7pt readable. The
    /// 7/9 bounds are Dynamic-Type-scaled (DEP-259) so the field-height clamp still
    /// applies, but the whole range grows at larger accessibility text sizes.
    private func nameFontSize(fieldHeight: CGFloat) -> CGFloat {
        min(maxNameFontSize, max(minNameFontSize, fieldHeight * 1.3 / 100))
    }
}

/// Field-specific press feedback. Only the touched player moves, so the response reads
/// as direct manipulation without making the whole formation bounce or delaying the
/// system sheet transition that follows the tap.
private struct FieldPlayerButtonStyle: ButtonStyle {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed && !reduceMotion ? 0.92 : 1)
            .brightness(configuration.isPressed ? 0.08 : 0)
            .animation(DesignTokens.Motion.feedback, value: configuration.isPressed)
    }
}

// The rotation is applied before slotDot adds its position/name label overlay, so the
// circle has the familiar Home Screen jiggle without making text wobble or moving the
// 44-point Button hit target. Each modifier owns its tiny animation phase; the tested
// policy decides whether it runs and supplies the stable stagger.
private struct PlayerDotWiggleModifier: ViewModifier {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var isAtPositiveAngle = false

    let isEditing: Bool
    let index: Int

    private var motion: PlayerDotWiggleMotion? {
        PlayerDotWigglePolicy.motion(
            isEditing: isEditing,
            reduceMotion: reduceMotion
                || ProcessInfo.processInfo.arguments.contains("UI_TESTING_REDUCE_MOTION"),
            index: index
        )
    }

    func body(content: Content) -> some View {
        content
            .rotationEffect(
                .degrees(motion.map { isAtPositiveAngle ? $0.angle : -$0.angle } ?? 0),
                anchor: .bottom
            )
            .onAppear { updateAnimation() }
            .onChange(of: isEditing) { _, _ in updateAnimation() }
            .onChange(of: reduceMotion) { _, _ in updateAnimation() }
    }

    private func updateAnimation() {
        guard let motion else {
            isAtPositiveAngle = false
            return
        }
        isAtPositiveAngle = false
        withAnimation(
            .easeInOut(duration: motion.duration)
                .delay(motion.delay)
                .repeatForever(autoreverses: true)
        ) {
            isAtPositiveAngle = true
        }
    }
}
