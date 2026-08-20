import SwiftUI

// DEP-252/DEP-277 (Cooper review, 2026-08-19): the app's universal top nav, shared by
// every top-level screen (team page, Compare, Uniforms) instead of each screen
// hand-rolling its own `ToolbarItem`s. This is what closed the actual bug behind this
// file: DEP-252 (tab bar/account placement) and DEP-277 (brand mark app-wide) were
// independently editing near-duplicate toolbar code in TeamDetailView/CompareView/
// UniformsTab/SettingsView and drifting out of sync. One shared definition here means
// there's only one place to get the brand mark, the team-pill/account spacing, and the
// account button right — every screen inherits it instead of re-implementing it.
//
// Built on the system `.toolbar` API, not a custom nav bar — deliberately. It keeps
// native nav-bar behavior (large-title collapse, back-button integration, accessibility,
// Liquid Glass theming) for free. The one thing it gives up is exact control over the
// system's own trailing-edge inset (there's no public API to read or override it,
// hence `toolbarTrailingSystemInset` below being an empirically-measured constant
// rather than a real token) — an accepted tradeoff, not a bug to keep chasing.
//
// `showTeamPicker`'s conditional rendering is the "team pill only exists on the roster
// page" requirement: pass a team pill on the team page, `EmptyView()` everywhere else.
@MainActor
@ToolbarContentBuilder
func depthTopNavToolbar<TeamPill: View>(
    @ViewBuilder teamPill: @escaping () -> TeamPill,
    onAccountTap: @escaping () -> Void
) -> some ToolbarContent {
    if #available(iOS 26.0, *) {
        // Both items need `.sharedBackgroundVisibility(.hidden)` on 26+, not just the
        // trailing group — the leading brand mark was missing it, so Liquid Glass left
        // its own default circular backdrop showing behind the mark (a visible ring the
        // mark's own drawing never accounted for).
        ToolbarItem(placement: .topBarLeading) {
            DepthBrandMark(size: 36)
                .allowsHitTesting(false)
                .accessibilityHidden(true)
        }
        .sharedBackgroundVisibility(.hidden)
        ToolbarItem(placement: .topBarTrailing) {
            DepthTopNavTrailingGroup(teamPill: teamPill, onAccountTap: onAccountTap)
        }
        .sharedBackgroundVisibility(.hidden)
    } else {
        ToolbarItem(placement: .topBarLeading) {
            DepthBrandMark(size: 36)
                .allowsHitTesting(false)
                .accessibilityHidden(true)
        }
        ToolbarItem(placement: .topBarTrailing) {
            DepthTopNavTrailingGroup(teamPill: teamPill, onAccountTap: onAccountTap)
        }
    }
}

/// The trailing half of `depthTopNavToolbar`: an optional team pill plus the account
/// button, laid out as one `HStack` (not two separate `ToolbarItem`s) so their gap is
/// our own explicit `Spacing.xs` rather than the system's fixed inter-item spacing.
@MainActor
private struct DepthTopNavTrailingGroup<TeamPill: View>: View {
    @ViewBuilder let teamPill: () -> TeamPill
    let onAccountTap: () -> Void

    /// Empirically measured gap iOS reserves after trailing toolbar content before the
    /// true safe-area edge (not a design token — a workaround for the lack of a public
    /// API to read or override it). Cooper review, 2026-08-19: close enough as-is, not
    /// worth further hand-tuning against an unreadable system constant.
    private static var toolbarTrailingSystemInset: CGFloat { 32 }

    var body: some View {
        HStack(spacing: DesignTokens.Spacing.xs) {
            teamPill()
            Button(action: onAccountTap) {
                Image(systemName: "person.crop.circle")
                    .frame(minWidth: 44, minHeight: 44, alignment: .leading)
                    .contentShape(Rectangle())
            }
            .accessibilityLabel("Account")
            .accessibilityIdentifier("account-button")
        }
        .padding(.trailing, DesignTokens.Spacing.screenMargin - Self.toolbarTrailingSystemInset)
    }
}
