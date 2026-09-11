import SwiftUI

// The app's one dismiss ("X") control, shared by every sheet. Six sheets each hand-rolled
// the same xmark Button and had already drifted: some hung the 44pt tap target off the
// Button, some off the label, and TeamListPickerSheet rendered a bespoke 32pt filled chip
// pinned into the very corner — visibly smaller and higher than the other five. One view
// so a restyle can't leave a copy stale.
//
// `placement` exists because the hosting differs, not the control. Five sheets pass
// `.toolbar` and let `ToolbarItem` supply the system chrome (on iOS 26 that's a glass
// capsule). TeamListPickerSheet must pass `.overlay`: SwiftUI's inline `.searchable`
// hides nav-bar toolbar items outright once the field is focused (see that file's
// DEP-273 note), so its X can't live in the toolbar at all — `.overlay` reproduces the
// capsule the toolbar would have drawn, so the two placements still look identical.
struct CloseButton: View {
    enum Placement {
        /// Hosted in a `ToolbarItem(placement: .topBarTrailing)` — the default.
        case toolbar
        /// Hosted in a `.overlay(alignment: .topTrailing)`, drawing its own capsule.
        case overlay
    }

    let action: () -> Void
    var placement: Placement = .toolbar
    /// Set where a UI test needs to address this specific sheet's close button.
    var identifier: String? = nil

    var body: some View {
        // `.accessibilityIdentifier` is applied only when one was passed — an empty
        // string is a real identifier to XCTest, not an absent one.
        if let identifier {
            styled.accessibilityIdentifier(identifier)
        } else {
            styled
        }
    }

    @ViewBuilder
    private var styled: some View {
        switch placement {
        case .toolbar:
            button
        case .overlay:
            // Matches what ToolbarItem draws around the toolbar-hosted copies. The
            // pre-iOS-26 fallback is the opaque chip this sheet already used, since
            // there is no system glass to borrow there.
            if #available(iOS 26.0, *) {
                button.buttonStyle(.glass)
            } else {
                button.background(Capsule().fill(DesignTokens.Colors.surfaceChip))
            }
        }
    }

    private var button: some View {
        Button(action: action) {
            Image(systemName: "xmark")
                .foregroundStyle(DesignTokens.Colors.textPrimary)
                // A toolbar lays its item out at its own height regardless of what the
                // label asks for, so the 44pt request there only widens the hit box. The
                // overlay has no such host: 44 would render a capsule visibly taller than
                // the toolbar copies, so it asks for the size the toolbar actually
                // produces and lets `.buttonStyle(.glass)` pad it out to the same capsule.
                .frame(
                    minWidth: placement == .toolbar ? 44 : 30,
                    minHeight: placement == .toolbar ? 44 : 30
                )
                .contentShape(Rectangle())
        }
        .accessibilityLabel("Close")
    }
}
