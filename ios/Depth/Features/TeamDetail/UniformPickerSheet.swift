import SwiftUI

// Native counterpart to the web UniformSheet (components/UniformSheet.tsx): a
// horizontal swipeable carousel — one full-width card per uniform — replacing the old
// vertical row list (DEP-256). Paging is native SwiftUI (`TabView` + `.page` style)
// rather than a hand-rolled drag gesture: the platform already has a swipeable-carousel
// primitive, so reimplementing framer-motion's drag/snap math here would just be
// distribution-inflation over a built-in (see gstack ethos, "search before building").
// `onSelect` fires on every page change (swipe settle or dot tap) so the field
// live-previews each kit's colors while browsing — but it's a preview signal only.
// The caller (TeamDetailView) holds the live-previewed id separately from the
// committed one and only persists it (UserPreferences.setUniformSelection) when this
// sheet is dismissed, whichever way that happens (X button or swipe-down). Web commits
// on every drag settle instead, which is the bug this deliberately avoids: browsing
// through kits shouldn't overwrite the saved pick until you actually close the picker.
//
// DEP-256 acceptance target: the card art reuses UniformsTab's `UniformThumb`, pointed
// at the plain jersey crop (`UniformArt.jerseyURL`, not the archive's full-mannequin
// `-full` raster) — the picker shows just the jersey, matching web's UniformSheet swatch,
// while sharing the same thumbnail component as the archive instead of a second
// jersey-rendering implementation. Each card's caption is the kit kind only (Home/Away/
// etc.) — no year range, since an undated kit has nothing meaningful to show there.
struct UniformPickerSheet: View {
    @Environment(\.dismiss) private var dismiss

    let uniforms: [Uniform]
    let selectedID: String?
    let onSelect: (String) -> Void

    @State private var currentIndex: Int

    init(uniforms: [Uniform], selectedID: String?, onSelect: @escaping (String) -> Void) {
        self.uniforms = uniforms
        self.selectedID = selectedID
        self.onSelect = onSelect
        let startIndex = selectedID.flatMap { id in uniforms.firstIndex(where: { $0.id == id }) } ?? 0
        _currentIndex = State(initialValue: startIndex)
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                TabView(selection: $currentIndex) {
                    ForEach(Array(uniforms.enumerated()), id: \.element.id) { index, uniform in
                        card(for: uniform)
                            .tag(index)
                    }
                }
                .tabViewStyle(.page(indexDisplayMode: .never))
                // Page dots below are the accent-tinted equivalent (UniformSheet.tsx's
                // custom dot row); the system page dots don't take the team accent.

                pageDots
                    .padding(.bottom, DesignTokens.Spacing.md)
            }
            .navigationTitle("Choose Uniform")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        dismiss()
                    } label: {
                        Image(systemName: "xmark")
                    }
                    .frame(minWidth: 44, minHeight: 44)
                    .accessibilityLabel("Close")
                }
            }
        }
        .presentationBackground(DesignTokens.Colors.bg)
        .accessibilityIdentifier("uniform-picker-sheet")
        // Preview-only signal on every page change — see the header comment. The
        // caller decides whether/when this becomes the committed selection.
        .onChange(of: currentIndex) { _, newIndex in
            guard uniforms.indices.contains(newIndex) else { return }
            onSelect(uniforms[newIndex].id)
        }
    }

    private func card(for uniform: Uniform) -> some View {
        VStack(spacing: DesignTokens.Spacing.sm) {
            UniformThumb(url: UniformArt.jerseyURL(for: uniform.id), size: 140, heightMultiplier: 0.81)
                .padding(.top, DesignTokens.Spacing.md)

            VStack(spacing: DesignTokens.Spacing.xs) {
                Text(uniform.name)
                    .font(.title3.bold())
                    .foregroundStyle(DesignTokens.Colors.textPrimary)
                Text(uniform.kind.displayName)
                    .font(.footnote)
                    .foregroundStyle(DesignTokens.Colors.textMuted)
            }
            .multilineTextAlignment(.center)

            if uniform.id == selectedID {
                HStack(spacing: 6) {
                    Image(systemName: "checkmark")
                        .font(.caption.weight(.bold))
                    Text("Active")
                        .font(.caption.weight(.bold))
                }
                .foregroundStyle(DesignTokens.Colors.accent)
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(DesignTokens.Colors.accent.opacity(0.12), in: Capsule())
                .overlay(Capsule().strokeBorder(DesignTokens.Colors.accent.opacity(0.4), lineWidth: 1))
                .accessibilityHidden(true)
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
        .padding(.bottom, DesignTokens.Spacing.md)
        .frame(maxWidth: .infinity)
        .accessibilityElement(children: .ignore)
        .accessibilityIdentifier("uniform-\(uniform.id)")
        .accessibilityLabel(
            "\(uniform.name), \(uniform.kind.displayName)\(uniform.id == selectedID ? ", selected" : "")"
        )
    }

    /// Accent-tinted page dots (web's UniformSheet.tsx page-dot row): the active dot is
    /// a wider capsule, the rest are small circles. Tapping a dot jumps directly to that
    /// page, matching web's tappable dots. Sized and tinted up from web's row (8pt
    /// circles, `textFaint` instead of the barely-visible `textFaintest`, plus a soft
    /// accent glow on the active pill) — the 6pt/`textFaintest` original read as flat,
    /// low-contrast specks against the dark background.
    private var pageDots: some View {
        HStack(spacing: 8) {
            ForEach(Array(uniforms.enumerated()), id: \.element.id) { index, uniform in
                Button {
                    currentIndex = index
                } label: {
                    Capsule()
                        .fill(index == currentIndex ? DesignTokens.Colors.accent : DesignTokens.Colors.textFaint)
                        .frame(width: index == currentIndex ? 24 : 8, height: 8)
                        .shadow(
                            color: index == currentIndex ? DesignTokens.Colors.accent.opacity(0.6) : .clear,
                            radius: 4
                        )
                }
                .frame(minWidth: 44, minHeight: 44)
                .contentShape(Rectangle())
                .accessibilityLabel("Select \(uniform.name)")
                .accessibilityIdentifier("uniform-dot-\(uniform.id)")
            }
        }
        .animation(.easeOut(duration: 0.2), value: currentIndex)
    }
}

extension UniformKind {
    var displayName: String {
        switch self {
        case .home: "Home"
        case .away: "Away"
        case .throwback: "Throwback"
        case .colorRush: "Color Rush"
        case .alternate: "Alternate"
        }
    }
}
