import Foundation

// Mirrors lib/types.ts's FormationSlot. A spot in the shared offense/defense layout,
// resolved to a player by position(+index) or, when `group` is set, by broad group +
// optional preferredPosition (see Formations.swift's resolveGroupedSlots).
struct FormationSlot: Codable, Equatable {
    let id: String
    let position: Position
    let index: Int
    let group: PositionGroup?
    let preferredPosition: Position?
    let x: Double
    let y: Double
    let label: String
    let onLine: Bool

    init(
        id: String,
        position: Position,
        index: Int,
        group: PositionGroup? = nil,
        preferredPosition: Position? = nil,
        x: Double,
        y: Double,
        label: String,
        onLine: Bool
    ) {
        self.id = id
        self.position = position
        self.index = index
        self.group = group
        self.preferredPosition = preferredPosition
        self.x = x
        self.y = y
        self.label = label
        self.onLine = onLine
    }
}

// Mirrors lib/types.ts's RenderSlot — what the field renderer needs for one dot, after
// resolution.
struct RenderSlot {
    let key: String
    let x: Double
    let y: Double
    let label: String
    let player: Player?
    let onLine: Bool?
}
