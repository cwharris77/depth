import SwiftUI
import UIKit

// DEP-251 first-run tutorial, screen two of two: the active coachmark step rendered as
// a dimmed spotlight cut out around the real control plus a callout bubble explaining
// it — "in-context coachmarks over the real UI", per the locked direction (no
// standalone tutorial mode, nothing blocks exploration underneath). Mounted once at
// ContentView's root via `.coachmarkOverlay`, which resolves every `.coachmarkAnchor`
// tag anywhere in the tree into a screen rect and hands it here alongside the root's own
// GeometryProxy.
//
// `.bottomTabs` has no tracked target — SwiftUI's TabView doesn't expose a per-tab frame
// through the public API — so that step's rect is computed directly from the overlay's
// GeometryProxy (a fixed band at the screen's bottom) instead of a lookup.
//
// The proxy here comes from `.coachmarkOverlay`'s `GeometryReader`, which wraps
// `RootTabView` — and measured directly, `proxy.size` is the TabView's *content* area,
// already shrunk to exclude the floating tab bar's own reserved band (iOS 26: ~96pt on
// an iPhone 17 Pro) rather than the full screen. `.bottomTabs`' band starts exactly
// where that reservation begins (`proxy.size.height`) and runs to the screen's real
// bottom edge, which `proxy` itself can't report (its own frame stops short of it) — so
// this step alone reads `UIScreen.main.bounds` for that one number.
struct CoachmarkOverlayView: View {
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    let controller: OnboardingController
    let anchors: [CoachmarkID: CGRect]
    let proxy: GeometryProxy
    /// The bubble's own measured size (DEP-251 placement audit) — `bubble(for:around:)`
    /// positions itself by its center via `.position()`, so placing it a fixed distance
    /// *below* a target requires knowing its own height; a hardcoded clearance instead
    /// of this (the original "+100") undershoots for any bubble taller than ~200pt and
    /// the bubble ends up overlapping the very target it's introducing (measured
    /// directly on the `.teamPill` step). Defaults to a plausible size so the first frame
    /// (before the `GeometryReader` below reports the real one) is already close.
    @State private var bubbleSize = CGSize(width: 320, height: 200)

    private var targetRect: CGRect? {
        guard let step = controller.currentStep else { return nil }
        switch step.id {
        case .bottomTabs:
            let screenHeight = UIScreen.main.bounds.height
            let barTop = proxy.size.height
            return CGRect(
                x: 0, y: barTop,
                width: proxy.size.width, height: max(screenHeight - barTop, 49)
            )
        default:
            return anchors[step.id]
        }
    }

    var body: some View {
        if let step = controller.currentStep, let rect = targetRect {
            ZStack {
                dimLayer
                ring(around: rect)
                bubble(for: step, around: rect)
            }
            .ignoresSafeArea()
            .transition(.opacity)
            .animation(
                reduceMotion ? DesignTokens.Motion.feedback : .easeInOut(duration: 0.2),
                value: controller.phase
            )
        }
    }

    /// A flat dim layer over the whole screen. An earlier version tried to punch a true
    /// transparent "spotlight" cutout around the target using a `.destinationOut`-
    /// blended shape + `.compositingGroup()` — measured directly: unreliable inside this
    /// overlay's `GeometryReader`/`overlayPreferenceValue` stack, sometimes not dimming
    /// at all. A uniform dim plus a bright ring around the target (`ring(around:)`
    /// below) points at the same control just as clearly, with none of the blend-mode
    /// fragility.
    private var dimLayer: some View {
        Color.black.opacity(0.6)
            // The dim layer is decorative; it must never eat the tap that's supposed
            // to advance the coachmark or reach the bubble's own buttons above it.
            .allowsHitTesting(false)
    }

    /// Bright accent-colored outline around the target rect — the actual "look here"
    /// signal, now that the dim layer is flat rather than cut out around it.
    private func ring(around rect: CGRect) -> some View {
        let padding: CGFloat = 8
        return RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
            .strokeBorder(DesignTokens.Colors.accent, lineWidth: 3)
            .frame(width: rect.width + padding * 2, height: rect.height + padding * 2)
            .position(x: rect.midX, y: rect.midY)
            .allowsHitTesting(false)
    }

    private func bubble(for step: CoachmarkStep, around rect: CGRect) -> some View {
        let bubbleWidth = min(320, proxy.size.width - DesignTokens.Spacing.lg * 2)
        // Prefer the side of the target with more room, so the bubble never has to
        // overlap the spotlight it's explaining.
        let showsBelow = rect.midY < proxy.size.height / 2
        let bubbleX = min(
            max(rect.midX, bubbleWidth / 2 + DesignTokens.Spacing.md),
            proxy.size.width - bubbleWidth / 2 - DesignTokens.Spacing.md
        )
        let spacing: CGFloat = 24
        let halfHeight = bubbleSize.height / 2
        let topInset = dynamicTypeSize.isAccessibilitySize ? proxy.safeAreaInsets.top : 0
        let bottomInset = dynamicTypeSize.isAccessibilitySize ? proxy.safeAreaInsets.bottom : 0
        let bubbleY = showsBelow
            ? min(rect.maxY + spacing + halfHeight, proxy.size.height - bottomInset - halfHeight)
            : max(rect.minY - spacing - halfHeight, topInset + halfHeight)

        let content = VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            HStack {
                Text("\(controller.stepNumber) of \(CoachmarkStep.all.count)")
                    .font(.caption.weight(.bold))
                    .foregroundStyle(DesignTokens.Colors.textFaint)
                Spacer()
                Button("Skip") {
                    controller.skipCoachmarks()
                }
                .font(.caption.weight(.semibold))
                .foregroundStyle(DesignTokens.Colors.textMuted)
                .accessibilityIdentifier("coachmark-skip")
            }
            Text(step.title)
                .font(.headline)
                .foregroundStyle(DesignTokens.Colors.textPrimary)
            Text(step.message)
                .font(.subheadline)
                .foregroundStyle(DesignTokens.Colors.textSecondary)
            Button {
                controller.advance()
            } label: {
                Text(controller.isLastStep ? "Done" : "Next")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .tint(DesignTokens.Colors.accent)
            .foregroundStyle(DesignTokens.Colors.onAccent)
            .frame(minHeight: 44)
            .accessibilityIdentifier("coachmark-next")
        }
        .padding(DesignTokens.Spacing.md)

        return Group {
            if dynamicTypeSize.isAccessibilitySize {
                // DEP-415: keep Next/Skip reachable when the explanation is taller
                // than the available viewport; the spotlight still names its target.
                ScrollView { content }
                    .frame(maxHeight: max(44, proxy.size.height - topInset - bottomInset - DesignTokens.Spacing.lg * 2))
            } else {
                content
            }
        }
        .frame(width: bubbleWidth, alignment: .leading)
        .background(RoundedRectangle(cornerRadius: DesignTokens.Radius.md).fill(DesignTokens.Colors.surfaceCard))
        .overlay(
            RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                .strokeBorder(DesignTokens.Colors.borderDefault, lineWidth: 1)
        )
        .background(
            GeometryReader { proxy in
                Color.clear
                    .onAppear { bubbleSize = proxy.size }
                    .onChange(of: proxy.size) { _, newSize in bubbleSize = newSize }
            }
        )
        .position(x: bubbleX, y: bubbleY)
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("coachmark-bubble")
    }
}
