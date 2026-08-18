import Foundation

// Port of web's lib/utils/compare.ts — the pure, UI-free logic behind the two-team
// compare. Kept in Domain (not Feature) so it is unit-testable without the view and
// usable from anywhere, mirroring web's split between lib/compare.ts and
// components/CompareView.tsx.

/// The position chip row, in display order. Mirrors web's `COMPARE_POSITIONS`
/// exactly: KR/PR/LS are editorial special-teams slots, not depth groups, so they
/// don't belong in a per-position depth comparison.
let COMPARE_POSITIONS: [Position] = [
    .qb, .rb, .fb, .wr, .te, .lt, .lg, .c, .rg, .rt,
    .de, .lde, .rde, .dt, .nt, .lb, .wlb, .lilb, .rilb, .slb,
    .cb, .lcb, .rcb, .nb, .s, .ss, .fs, .k, .p,
]

/// The "deepest room" teaser (web's reunification spec) needs one comparable
/// position, not the full list — picks whichever position has the most combined
/// depth across both sides (max(a, b) per position, tie → earliest position in
/// `positions` order). Pure and parallel-array-based: index i of `playersA`/
/// `playersB` corresponds to positions[i]. Mirrors web's `getDeepestPosition`.
func getDeepestPosition(
    playersA: [[Player]],
    playersB: [[Player]],
    positions: [Position]
) -> Position? {
    var best: (position: Position, depth: Int)?
    for (index, position) in positions.enumerated() {
        let depth = max(playersA[safe: index]?.count ?? 0, playersB[safe: index]?.count ?? 0)
        if depth > 0, best == nil || depth > best!.depth {
            best = (position: position, depth: depth)
        }
    }
    return best?.position
}

/// The small preview object the matchup tab renders as its discoverability row —
/// never a whole roster, just the deepest position's rank-1 players and both
/// sides' counts. Mirrors web's `buildCompareTeaser`.
struct CompareTeaser: Equatable {
    let position: Position
    let countA: Int
    let countB: Int
    let topA: Player?
    let topB: Player?
}

func buildCompareTeaser(
    playersA: [[Player]],
    playersB: [[Player]],
    positions: [Position]
) -> CompareTeaser? {
    guard let position = getDeepestPosition(playersA: playersA, playersB: playersB, positions: positions),
        let index = positions.firstIndex(of: position)
    else { return nil }
    return CompareTeaser(
        position: position,
        countA: playersA[safe: index]?.count ?? 0,
        countB: playersB[safe: index]?.count ?? 0,
        topA: playersA[safe: index]?.first,
        topB: playersB[safe: index]?.first
    )
}

private extension Array {
    subscript(safe index: Int) -> Element? {
        indices.contains(index) ? self[index] : nil
    }
}