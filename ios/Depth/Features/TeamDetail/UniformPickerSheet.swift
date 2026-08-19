import SwiftUI

// Native counterpart to the web UniformSheet (components/UniformSheet.tsx): a
// horizontal swipeable carousel — one full-width card per uniform — replacing the old
// vertical row list (DEP-256). Paging is native SwiftUI (`TabView` + `.page` style)
// rather than a hand-rolled drag gesture: the platform already has a swipeable-carousel
// primitive, so reimplementing framer-motion's drag/snap math here would just be
// distribution-inflation over a built-in (see gstack ethos, "search before building").
// Selecting persists the choice per team (UserPreferences.setUniformSelection) and
// recolors the field dots via DepthChartFieldView's colors override — same as before,
// now fired on every page change instead of only on row tap, so paging live-previews
// the recolor exactly like web's drag-driven `onSelect`.
//
// DEP-256 acceptance target: the card art reuses UniformsTab's `UniformThumb` (the
// archive's full-mannequin jersey renderer) rather than the old 3:4 imagePath crop —
// drop-in parity with the archive screen instead of a second jersey-rendering
// implementation.
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
        // Fire on every page change (swipe settle or dot tap) so the field recolors
        // live while browsing, mirroring web's drag-driven onSelect — not just on a
        // final confirm tap.
        .onChange(of: currentIndex) { _, newIndex in
            guard uniforms.indices.contains(newIndex) else { return }
            onSelect(uniforms[newIndex].id)
        }
    }

    private func card(for uniform: Uniform) -> some View {
        VStack(spacing: DesignTokens.Spacing.md) {
            UniformThumb(url: UniformArt.fullURL(for: uniform.id), size: 120)
                .padding(.top, DesignTokens.Spacing.lg)

            VStack(spacing: DesignTokens.Spacing.xs) {
                Text(uniform.name)
                    .font(.title3.bold())
                    .foregroundStyle(DesignTokens.Colors.textPrimary)
                Text(description(for: uniform))
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

            Spacer(minLength: 0)
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
        .frame(maxWidth: .infinity)
        .accessibilityElement(children: .ignore)
        .accessibilityIdentifier("uniform-\(uniform.id)")
        .accessibilityLabel(
            "\(uniform.name), \(description(for: uniform))\(uniform.id == selectedID ? ", selected" : "")"
        )
    }

    /// Accent-tinted page dots (web's UniformSheet.tsx page-dot row): the active dot is
    /// a wider capsule, the rest are small circles. Tapping a dot jumps directly to that
    /// page, matching web's tappable dots.
    private var pageDots: some View {
        HStack(spacing: 6) {
            ForEach(Array(uniforms.enumerated()), id: \.element.id) { index, uniform in
                Button {
                    currentIndex = index
                } label: {
                    Capsule()
                        .fill(index == currentIndex ? DesignTokens.Colors.accent : DesignTokens.Colors.textFaintest)
                        .frame(width: index == currentIndex ? 20 : 6, height: 6)
                }
                .frame(minWidth: 44, minHeight: 44)
                .contentShape(Rectangle())
                .accessibilityLabel("Select \(uniform.name)")
                .accessibilityIdentifier("uniform-dot-\(uniform.id)")
            }
        }
        .animation(.easeOut(duration: 0.2), value: currentIndex)
    }

    private func description(for uniform: Uniform) -> String {
        let kind = uniform.kind.displayName
        let years: String
        if let start = uniform.yearStart, let end = uniform.yearEnd {
            years = start == end ? "\(start)" : "\(start)–\(end)"
        } else if let start = uniform.yearStart {
            years = "\(start)"
        } else {
            years = "—"
        }
        return "\(kind) · \(years)"
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
