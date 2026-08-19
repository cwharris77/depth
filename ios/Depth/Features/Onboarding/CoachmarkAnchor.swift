import SwiftUI

// Coachmark target registry for the first-run tutorial (DEP-251). A view that a
// coachmark step should point at tags itself with `.coachmarkAnchor(_:)`; the anchor
// bubbles up through SwiftUI's preference system to a single overlay mounted at
// ContentView's root (`.coachmarkOverlay`), which resolves every registered anchor to a
// screen rect once its own GeometryProxy is available. This is the standard SwiftUI
// pattern for "point at this real view living several layers down the tree" UI — no
// manual frame plumbing through every intermediate view, and it degrades safely (the
// overlay just has no rect for that step) if the target view isn't currently mounted
// (a different tab, a closed sheet).
//
// `.bottomTabs` deliberately has no case here — SwiftUI's TabView doesn't expose a
// per-tab frame through the public API, so that step's rect is computed directly from
// the overlay's GeometryProxy (a fixed band at the screen's bottom) instead of an
// anchor lookup. See CoachmarkOverlayView.targetRect.
enum CoachmarkID: CaseIterable {
    case teamPill
    case playerDot
    case overflowMenu
    case bottomTabs
}

private struct CoachmarkAnchorKey: PreferenceKey {
    // A computed (not stored) static var sidesteps the "nonisolated global shared
    // mutable state" Swift 6 concurrency error PreferenceKey's usual `static var = [:]`
    // pattern trips on here — `Anchor<CGRect>` isn't Sendable, so a stored default
    // would need explicit isolation; an empty dictionary literal computed fresh each
    // access needs none.
    static var defaultValue: [CoachmarkID: Anchor<CGRect>] { [:] }
    static func reduce(value: inout [CoachmarkID: Anchor<CGRect>], nextValue: () -> [CoachmarkID: Anchor<CGRect>]) {
        // Last-write-wins: only one live instance of each target should exist at a
        // time (e.g. the first player dot on the currently displayed field), but if
        // more than one ever registers the same id, a newer anchor replacing an older
        // one is a safe default rather than silently keeping a stale rect.
        value.merge(nextValue()) { _, new in new }
    }
}

extension View {
    /// Registers this view as the on-screen target for the given coachmark step.
    func coachmarkAnchor(_ id: CoachmarkID) -> some View {
        anchorPreference(key: CoachmarkAnchorKey.self, value: .bounds) { [id: $0] }
    }

    /// Registers this view as the coachmark target only when `condition` holds — for a
    /// view repeated many times (e.g. one player dot per roster slot) where exactly one
    /// instance, picked at render time, should stand in as "the" target.
    @ViewBuilder
    func coachmarkTarget(if condition: Bool, id: CoachmarkID) -> some View {
        if condition {
            coachmarkAnchor(id)
        } else {
            self
        }
    }

    /// Mounted once at the root: resolves every anchor registered anywhere in the
    /// subtree below into a screen-space `CGRect` and hands the result (plus the
    /// root's own GeometryProxy, needed for the anchor-less `.bottomTabs` step) to
    /// `content`.
    func coachmarkOverlay<Overlay: View>(
        @ViewBuilder content: @escaping ([CoachmarkID: CGRect], GeometryProxy) -> Overlay
    ) -> some View {
        overlayPreferenceValue(CoachmarkAnchorKey.self) { anchors in
            GeometryReader { proxy in
                content(anchors.mapValues { proxy[$0] }, proxy)
            }
        }
    }
}
