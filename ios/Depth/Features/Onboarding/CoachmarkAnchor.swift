import SwiftUI

// Coachmark target registry for the first-run tutorial (DEP-251). A view that a
// coachmark step should point at tags itself with `.coachmarkAnchor(_:)`; the target's
// on-screen frame bubbles up through SwiftUI's preference system to a single overlay
// mounted at ContentView's root (`.coachmarkOverlay`), which hands the resolved rects
// (plus its own GeometryProxy, needed for the anchor-less `.bottomTabs` step) to
// `content`. This degrades safely (the overlay just has no rect for that step) if the
// target view isn't currently mounted (a different tab, a closed sheet).
//
// DEP-251 follow-up (placement audit): this used to read each target's frame via
// `anchorPreference(value: .bounds)` + `proxy[anchor]`, the textbook SwiftUI pattern for
// this — but measured directly, every real target (`.teamPill`'s toolbar item,
// `.overflowMenu` and `.playerDot` inside TeamDetailView's `ScrollView`) resolved to a
// rect nowhere near the actual control; only the coordinates were free of any scroll
// offset or intervening layout, as if resolved before the surrounding content laid out.
// Reporting each target's `GeometryReader`-read `.global` frame through a plain `CGRect`
// preference instead — same "tag once, resolve at the root" shape, an equally standard
// SwiftUI idiom for this exact case — measured correctly in every case tried, including
// through the `ScrollView` and the `NavigationStack`-hosted toolbar item.
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

private struct CoachmarkFrameKey: PreferenceKey {
    static var defaultValue: [CoachmarkID: CGRect] { [:] }
    static func reduce(value: inout [CoachmarkID: CGRect], nextValue: () -> [CoachmarkID: CGRect]) {
        // Last-write-wins: only one live instance of each target should exist at a
        // time (e.g. the first player dot on the currently displayed field), but if
        // more than one ever registers the same id, a newer frame replacing an older
        // one is a safe default rather than silently keeping a stale rect.
        value.merge(nextValue()) { _, new in new }
    }
}

extension View {
    /// Registers this view as the on-screen target for the given coachmark step,
    /// reporting its live `.global`-space frame (see the file header for why `.global`
    /// over an anchor preference).
    func coachmarkAnchor(_ id: CoachmarkID) -> some View {
        background(
            GeometryReader { proxy in
                Color.clear.preference(key: CoachmarkFrameKey.self, value: [id: proxy.frame(in: .global)])
            }
        )
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

    /// Mounted once at the root: hands every registered target's screen-space `CGRect`
    /// (plus the root's own GeometryProxy, needed for the anchor-less `.bottomTabs`
    /// step) to `content`.
    func coachmarkOverlay<Overlay: View>(
        @ViewBuilder content: @escaping ([CoachmarkID: CGRect], GeometryProxy) -> Overlay
    ) -> some View {
        overlayPreferenceValue(CoachmarkFrameKey.self) { frames in
            GeometryReader { proxy in
                content(frames, proxy)
            }
        }
    }
}
