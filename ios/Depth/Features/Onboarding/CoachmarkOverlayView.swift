import SwiftUI

// DEP-251 first-run tutorial, screen two of two: the active coachmark step rendered as
// a dimmed spotlight cut out around the real control plus a callout bubble explaining
// it — "in-context coachmarks over the real UI", per the locked direction (no
// standalone tutorial mode, nothing blocks exploration underneath). Mounted once at
// ContentView's root via `.coachmarkOverlay`, which resolves every `.coachmarkAnchor`
// tag anywhere in the tree into a screen rect and hands it here alongside the root's own
// GeometryProxy.
//
// `.bottomTabs` and `.teamPill` have no *reliable* tracked anchor — TabView doesn't
// expose a per-tab frame through the public SwiftUI API, and (measured directly:
// `.coachmarkAnchor` tagging the team pill's toolbar item never resolved a rect at
// runtime) `anchorPreference`/`.overlayPreferenceValue` do not reliably bubble a
// `ToolbarItem`'s content up through the enclosing view's preference tree the way
// regular body content does. Both steps fall back to a fixed band computed from the
// proxy's own geometry instead — spotlighting the general nav-bar/tab-bar region rather
// than the exact control, same trade-off, same reasoning.
struct CoachmarkOverlayView: View {
    let controller: OnboardingController
    let anchors: [CoachmarkID: CGRect]
    let proxy: GeometryProxy

    private var targetRect: CGRect? {
        guard let step = controller.currentStep else { return nil }
        switch step.id {
        case .bottomTabs:
            let barHeight: CGFloat = 49 + proxy.safeAreaInsets.bottom
            return CGRect(
                x: 0, y: proxy.size.height - barHeight,
                width: proxy.size.width, height: barHeight
            )
        case .teamPill:
            // Prefer a real anchor if one ever resolves (harmless to keep the tag in
            // TeamDetailView); otherwise a band over the toolbar's trailing half,
            // where the pill always renders (DEP-236: it owns the trailing slot).
            if let anchor = anchors[.teamPill] { return anchor }
            let navBarHeight: CGFloat = 44
            return CGRect(
                x: proxy.size.width * 0.42, y: proxy.safeAreaInsets.top,
                width: proxy.size.width * 0.58 - 16, height: navBarHeight
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
            .animation(.easeInOut(duration: 0.2), value: controller.phase)
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
        let bubbleY = showsBelow
            ? min(rect.maxY + 100, proxy.size.height - 100)
            : max(rect.minY - 100, 100)

        return VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
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
        .frame(width: bubbleWidth, alignment: .leading)
        .background(RoundedRectangle(cornerRadius: DesignTokens.Radius.md).fill(DesignTokens.Colors.surfaceCard))
        .overlay(
            RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                .strokeBorder(DesignTokens.Colors.borderDefault, lineWidth: 1)
        )
        .position(x: bubbleX, y: bubbleY)
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("coachmark-bubble")
    }
}
