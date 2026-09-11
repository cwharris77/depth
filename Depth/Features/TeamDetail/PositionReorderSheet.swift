import SwiftUI

// Edit-mode reorder surface for one position (2026-09-11 merge spec). With the player card
// gone, "Edit Depth Chart" routes a field tap here instead of to the player profile: the
// position's drag list (DepthReorderList — long-press pickup, haptics, VoiceOver Move
// Up/Down), the CUSTOM tag, and Reset. Writes go through the caller's callbacks, which
// TeamDetailView wires to the same local-first override writer the card used (DEP-219/226).
//
// `players` is a presentation-time value: the sheet content closure doesn't re-run after a
// commit, so the rendered order and CUSTOM state are local @State seeded from it.
struct PositionReorderSheet: View {
    let position: Position
    /// The tapped dot's row keeps the team-accent highlight, so the user can see which
    /// player they opened the sheet from.
    let highlightedPlayerID: String
    let accent: Color
    /// The position's pre-override order, which Reset restores.
    let defaultOrder: [Player]
    let onReorder: ([String]) -> Void
    let onReset: () -> Void

    @State private var players: [Player]
    @State private var isCustom: Bool

    init(
        position: Position,
        players: [Player],
        defaultOrder: [Player],
        isCustom: Bool,
        highlightedPlayerID: String,
        accent: Color,
        onReorder: @escaping ([String]) -> Void,
        onReset: @escaping () -> Void
    ) {
        self.position = position
        self.highlightedPlayerID = highlightedPlayerID
        self.accent = accent
        self.defaultOrder = defaultOrder
        self.onReorder = onReorder
        self.onReset = onReset
        _players = State(initialValue: players)
        _isCustom = State(initialValue: isCustom)
    }

    var body: some View {
        DepthSheet(title: position.fullName, sizing: .medium) {
            // A ScrollView, not a List: DepthReorderList's long-press-then-drag gesture is
            // the disambiguator against this scroll (see its header), and a List would add
            // its own competing reorder and scroll behavior.
            ScrollView {
                VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
                    if isCustom {
                        HStack(spacing: DesignTokens.Spacing.sm) {
                            customTag
                            Spacer()
                            resetButton
                        }
                    }
                    DepthReorderList(
                        players: $players,
                        currentPlayerID: highlightedPlayerID,
                        accent: accent,
                        onCommit: commit
                    )
                    .depthCard(dense: true, padded: false)
                }
                .padding()
            }
            .scrollIndicators(.hidden)
            // The tag/Reset/row identifiers are the card's (player-profile-depth-*) on
            // purpose: the reorder UI tests changed how they reach this list, not what they
            // assert about it.
            .accessibilityIdentifier("position-reorder-sheet")
        }
    }

    // Web parity (Badge variant="tag"): accent text on a 10%-alpha accent fill with an
    // accent-tinted border.
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

    private var resetButton: some View {
        Button(action: reset) {
            HStack(spacing: 4) {
                Image(systemName: "arrow.counterclockwise")
                    .font(.caption2.weight(.bold))
                Text("Reset")
                    .font(.caption.bold())
            }
            .foregroundStyle(DesignTokens.Colors.textMuted)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            // DEP-259: 44pt hit target without inflating the pill's visual size; DEP-395:
            // the shape sits on the label, after its frame.
            .frame(minWidth: 44, minHeight: 44)
            .contentShape(Rectangle())
        }
        .accessibilityIdentifier("player-profile-depth-reset")
    }

    private func commit(_ ordered: [Player]) {
        let reranked = rerankedPlayers(ordered)
        onReorder(reranked.map(\.id))
        players = reranked
        isCustom = true
    }

    private func reset() {
        onReset()
        players = defaultOrder
        isCustom = false
    }
}
