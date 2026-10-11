import Foundation

// A role is a job a player holds on top of his position. The nickel back is a corner or
// safety who comes on as the fifth defensive back: only in fronts that carry one, so the
// role is marked on the field and never on the player himself.

/// The player as his roster lists him, whichever seat he was seen from.
///
/// `identities` is the roster's players as themselves, before any seat projection or user
/// reorder, so a player's own position is never one a seat lent him. A player whose own
/// listing is nickel back has no other position to show and is returned as seen.
func ownListing(of seated: Player, identities: [Player]) -> Player {
    guard seated.position == .nb,
        let own = identities.first(where: { $0.id == seated.id }), own.position != .nb
    else { return seated }
    return seated.seated(at: own.position, depthRank: own.depthRank)
}

/// The position to print under a nickel slot's dot in place of the slot's own label: the
/// holder's own position. Nil for any other slot, an empty one, or a holder whose only
/// listing is nickel back, all of which keep the slot's label and carry no nickel mark.
func nickelHolderLabel(
    slotLabel: String, playerId: String?, ownPositions: [String: Position]
) -> String? {
    guard slotLabel == Position.nb.rawValue, let playerId,
        let own = ownPositions[playerId], own != .nb
    else { return nil }
    return own.rawValue
}
