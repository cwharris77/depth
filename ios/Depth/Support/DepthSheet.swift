import SwiftUI

// One sheet shell for every sheet in the app, consolidating the chrome each screen used
// to hand-roll (DEP-420 — the iOS half of web's DEP-398). Every sheet was re-declaring
// its own `NavigationStack` + inline title + toolbar close + presentation
// background/detents/drag indicator, and two sheets (AuthSheet, AccountDeletionSheet)
// still used a text "Cancel" instead of the shared `CloseButton`. This view owns all of
// that; a sheet's body becomes `DepthSheet(title:) { content }` and the chrome stops
// being re-negotiated per call site.
//
// Design notes:
//   • The close control is always `CloseButton`. `closePlacement: .overlay` hosts it as a
//     persistent top-trailing overlay instead of a toolbar item — required by
//     TeamListPickerSheet, whose inline `.searchable` hides every nav-bar toolbar item
//     while the field is focused (DEP-273; see that file). `closeOverlayPadding` exists
//     because the two overlay sheets tune their X differently: the uniform kit pins it at
//     the standard `Spacing.md` inset; TeamListPickerSheet drops it onto the inline
//     title's own band (top 13 / `screenMargin`).
//   • `sizing` answers the family's "how tall does it open" question in one place:
//     `.full` (`.large`, the system default) for content sheets; `.medium`
//     (`[.medium, .large]`) for the picker sheets; `.height(h)` (`[.height(h), .large]`)
//     for the artwork-sized kit/filter sheets that must grow under a11y text sizes.
//   • `showClose: false` covers sheets that deliberately dismiss another way:
//     UniformFilterSheet's "Show N kits" button, and AuthSheet's success step (which
//     hides the X so the only path forward is "Manage account settings").
//   • A title-less sheet still gets a `NavigationStack` when it hosts a toolbar close
//     (PlayerDetailView) — the X needs a nav bar to sit in; only fully chrome-less
//     sheets (uniform kit/filters) render plain content.
//   • `.presentationBackground(background)` lives here so the old bg/`surfaceCard` split
//     (and AuthSheet's `.background` instead of `.presentationBackground`) is a per-sheet
//     `background:` prop, not a per-call-site modifier.
struct DepthSheet<Content: View>: View {
    /// Open height, mapped to real detents in `body`.
    enum Sizing {
        /// `.large` — the system default full height.
        case full
        /// `[.medium, .large]` — the picker sheets (uniform/formations replace a 70%
        /// full-bleed wall of empty space with a compact first detent).
        case medium
        /// `[.height(h), .large]` — artwork-sized sheets that can still grow.
        case height(CGFloat)
    }

    @Environment(\.dismiss) private var dismiss

    private let title: String?
    private let content: Content
    private let sizing: Sizing
    private let showDragIndicator: Bool
    private let closePlacement: CloseButton.Placement
    private let closeIdentifier: String?
    private let showClose: Bool
    private let closeDisabled: Bool
    private let dismissDisabled: Bool
    private let background: Color
    private let closeOverlayPadding: EdgeInsets
    private let closeAction: (() -> Void)?

    init(
        title: String? = nil,
        sizing: Sizing = .full,
        showDragIndicator: Bool = false,
        closePlacement: CloseButton.Placement = .toolbar,
        closeIdentifier: String? = nil,
        showClose: Bool = true,
        closeDisabled: Bool = false,
        dismissDisabled: Bool = false,
        background: Color = DesignTokens.Colors.bg,
        closeOverlayPadding: EdgeInsets = EdgeInsets(
            top: DesignTokens.Spacing.md,
            leading: 0,
            bottom: 0,
            trailing: DesignTokens.Spacing.md
        ),
        closeAction: (() -> Void)? = nil,
        @ViewBuilder content: () -> Content
    ) {
        self.title = title
        self.sizing = sizing
        self.showDragIndicator = showDragIndicator
        self.closePlacement = closePlacement
        self.closeIdentifier = closeIdentifier
        self.showClose = showClose
        self.closeDisabled = closeDisabled
        self.dismissDisabled = dismissDisabled
        self.background = background
        self.closeOverlayPadding = closeOverlayPadding
        self.closeAction = closeAction
        self.content = content()
    }

    var body: some View {
        // A toolbar-hosted X needs a nav bar to sit in; a title needs one to show. Only
        // truly chrome-less sheets (uniform kit/filters) render bare content.
        let needsNavStack = title != nil || (closePlacement == .toolbar && showClose)
        let root = needsNavStack ? AnyView(navigationStack) : AnyView(content)

        root
            .overlay(alignment: .topTrailing) {
                if closePlacement == .overlay && showClose {
                    closeButton
                        .padding(closeOverlayPadding)
                        // Sits above any sibling content when overlaid on the
                        // NavigationStack (TeamListPickerSheet's conference picker).
                        .zIndex(1)
                }
            }
            .presentationBackground(background)
            .presentationDetents(sizeDetents)
            .presentationDragIndicator(showDragIndicator ? .visible : .hidden)
            .interactiveDismissDisabled(dismissDisabled)
    }

    private var navigationStack: some View {
        NavigationStack {
            content
                .toolbar {
                    if closePlacement == .toolbar && showClose {
                        ToolbarItem(placement: .topBarTrailing) {
                            closeButton
                        }
                    }
                }
                .navigationTitle(title ?? "")
                .navigationBarTitleDisplayMode(.inline)
        }
    }

    private var closeButton: some View {
        CloseButton(
            action: closeAction ?? { dismiss() },
            placement: closePlacement,
            identifier: closeIdentifier
        )
        // AccountDeletionSheet's cancelled-while-in-flight state maps onto the shared X.
        .disabled(closeDisabled)
    }

    private var sizeDetents: Set<PresentationDetent> {
        switch sizing {
        case .full: [.large]
        case .medium: [.medium, .large]
        case .height(let height): [.height(height), .large]
        }
    }
}