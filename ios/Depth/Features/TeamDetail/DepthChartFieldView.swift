import SwiftUI

// Renders one resolved `Unit` (offense/defense/special) as dots on a field, using the
// shared `resolveUnit` domain logic (T3) unchanged — this view's only job is turning
// `RenderSlot` percentages into an on-screen layout and a tap target per slot.
//
// Dot geometry comes from `DepthChartFieldLayout` (DEP-207): the tightest same-row gap
// decides the drawn dot size so neighbouring dots never touch, and rows that can't fit
// at the minimum size are re-spread around their centroid. The *visual* dot shrinks, but
// the *tap target* stays at the 44-point minimum via `.frame(minWidth:minHeight:)` +
// `.contentShape` — the same 30px-visual/44px-hit-slop contract the web uses. The field's
// text is still capped at `.accessibility1`: positioned slots can't reflow, so a scaled
// glyph would merge the offensive line into one shape, and the full content stays
// reachable at any size through each slot's VoiceOver label.
//
// On top of #378's geometry, the field now renders a real green surface — gradient +
// yard-line/hash-mark/end-zone markings (FieldMarkings) — in place of the old flat
// team-tinted rect, and dots fill `primary` with a `secondary` ring (web's PlayerDot
// semantics) instead of a flat `uiAccent` fill (2026-08-15 visual-pass). Each filled
// dot also carries the player's last name under the position tag (DEP-250) at web's
// per-unit breakpoints (DepthChartFieldLayout.showsNames — offense highest threshold,
// defense mid, special always), sized against the field's height so packed rows stay
// readable without colliding.
struct DepthChartFieldView: View {
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
    let onSelectPlayer: (Player) -> Void

    private var dotColors: TeamColors {
        colors ?? snapshot.team.colors
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
                fillWidth: unit == .offense
            )
            // DEP-250: per-unit name-label visibility (web's PlayerDot LABEL_VISIBILITY)
            // — names render under each dot only when the unit's layout has room for
            // them (offense highest threshold, defense mid, special always).
            let showsNames = DepthChartFieldLayout.showsNames(unit: unit, fieldWidth: proxy.size.width)
            ZStack {
                LinearGradient(
                    colors: [Color(hex: "#1e3d10"), Color(hex: "#2d5a1b"), Color(hex: "#1e3d10")],
                    startPoint: .top,
                    endPoint: .bottom
                )
                .clipShape(RoundedRectangle(cornerRadius: 16))

                FieldMarkings()
                    .clipShape(RoundedRectangle(cornerRadius: 16))

                ForEach(slots, id: \.key) { slot in
                    slotView(
                        slot,
                        dotSize: layout.dotSize,
                        showsNames: showsNames,
                        fieldHeight: proxy.size.height
                    )
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
        }
        .dynamicTypeSize(...DynamicTypeSize.accessibility1)
        .accessibilityElement(children: .contain)
    }

    /// Verbatim web port of PlayerDot's line offset: `slot.onLine ? (slot.y >= 50 ? 18
    /// : -18) : 0`, scaled from the web's fixed 30px dot to whatever the geometry layer
    /// drew (`dotSize / 2 + 3` = circle radius + a hair, web's 15px + 3). Offense dots
    /// (y ≥ 50, on their side of the line) shift down; defense dots shift up.
    private func lineOffset(for slot: RenderSlot, dotSize: CGFloat) -> CGFloat {
        guard slot.onLine == true else { return 0 }
        return slot.y >= 50 ? dotSize / 2 + 3 : -(dotSize / 2 + 3)
    }

    @ViewBuilder
    private func slotView(
        _ slot: RenderSlot,
        dotSize: CGFloat,
        showsNames: Bool,
        fieldHeight: CGFloat
    ) -> some View {
        if let player = slot.player {
            Button {
                onSelectPlayer(player)
            } label: {
                slotDot(
                    label: slot.label,
                    number: player.number,
                    dotSize: dotSize,
                    playerName: player.name,
                    showsName: showsNames,
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
        } else {
            slotDot(
                label: slot.label,
                number: nil,
                dotSize: dotSize,
                playerName: nil,
                showsName: false,
                fieldHeight: fieldHeight
            )
            .accessibilityLabel("\(slot.label), unfilled")
        }
    }

    private func slotDot(
        label: String,
        number: Int?,
        dotSize: CGFloat,
        playerName: String?,
        showsName: Bool,
        fieldHeight: CGFloat
    ) -> some View {
        VStack(spacing: 4) {
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
            // Web parity (components/PlayerDot.tsx): the position tag renders in the
            // app's muted gray (textMuted), not the system `.secondary` gray, so the
            // field matches the web app's label color exactly.
            Text(label)
                .font(.caption2.weight(.semibold))
                .foregroundStyle(DesignTokens.Colors.textMuted)

            // DEP-250: web's PlayerDot name row — the player's last name under the
            // position tag, shown only when the unit's layout has room (see
            // DepthChartFieldLayout.showsNames). Bold white (textPrimary), size clamped
            // to the field's height, wraps instead of truncating so long names like
            // "Smith-Njigba" stay readable.
            if showsName, let playerName, !playerName.isEmpty {
                Text(verbatim: formatLastName(playerName))
                    .font(.system(size: nameFontSize(fieldHeight: fieldHeight), weight: .bold))
                    .foregroundStyle(DesignTokens.Colors.textPrimary)
                    .multilineTextAlignment(.center)
                    .frame(maxWidth: 72)
            }
        }
    }

    /// Web parity (components/PlayerDot.tsx): the name size is clamped to the field's
    /// height (`clamp(7px, 1.3dvh, 9px)` — dvh proxies to the field's own height here)
    /// so labels shrink ahead of colliding when the field's available height shrinks
    /// (short/landscape or split-screen viewports), while staying ≥7pt readable.
    private func nameFontSize(fieldHeight: CGFloat) -> CGFloat {
        min(9, max(7, fieldHeight * 1.3 / 100))
    }
}
