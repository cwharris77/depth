import SwiftUI

// Drag-to-reorder primitives for one position, extracted unchanged from the deleted player
// card (2026-09-11 merge spec) so PositionReorderSheet can host them. Behavior contract:
// DEP-226 long-press pickup + frozen-center slot mapping, DEP-414 VoiceOver move actions.

// Web parity (lucide GripVertical, DEP-241): the six-dot vertical drag grip. SF Symbols
// has no six-dot grip — line.3.horizontal is the hamburger and circle.grid.2x2 is four
// dots — so this draws the 2x3 dot grid GripVertical depicts, the "drag me" affordance
// web uses for both the Reorder toggle and the reorder rows. Sized like web (toggle 12,
// rows 16) so it reads as a small grip, not an oversized icon (DEP-241 follow-up).
struct SixDotGrip: View {
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

// DEP-226: drag-to-reorder row list for the position-depth section. SwiftUI's `.onMove`
// only exists on ForEach inside a List, and a List can't nest inside the card's ScrollView
// without introducing a nested scroll container. The earlier attempts (`.onDrag`/`.onDrop`,
// then `.draggable`/`.dropDestination`) all failed with a real finger: inside a ScrollView
// the scroll pan claims vertical drags, so the system drag interaction never starts by hand.
// This version disambiguates the way every scrollable reorder does — the row is "picked up"
// with a short long-press, then dragged with a DragGesture. Live reorder targets use row
// frames frozen at pickup, so the finger maps to a slot without a feedback loop; the commit
// fires once on release.
struct DepthReorderList: View {
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
