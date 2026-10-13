import SwiftUI

// A native paged jersey carousel. Selection previews the field while browsing;
// the caller commits the preview when the sheet is dismissed.
struct UniformPickerSheet: View {
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    let uniforms: [Uniform]
    let teamName: String
    let onSelect: (String) -> Void

    @State private var currentIndex: Int

    init(
        uniforms: [Uniform], teamName: String, selectedID: String?,
        onSelect: @escaping (String) -> Void
    ) {
        func priority(_ uniform: Uniform) -> Int {
            guard uniform.isCurrent else { return 3 }
            switch uniform.kind {
            case .home: return 0
            case .away: return 1
            default: return 2
            }
        }
        let ordered = uniforms.sorted { priority($0) < priority($1) }
        self.teamName = teamName
        self.uniforms = ordered
        self.onSelect = onSelect
        let startIndex =
            selectedID.flatMap { id in ordered.firstIndex(where: { $0.id == id }) } ?? 0
        _currentIndex = State(initialValue: startIndex)
    }

    var body: some View {
        DepthSheet(
            title: "Choose Uniform", sizing: dynamicTypeSize.isAccessibilitySize ? .full : .medium
        ) {
            VStack(spacing: 0) {
                TabView(selection: $currentIndex) {
                    ForEach(Array(uniforms.enumerated()), id: \.element.id) { index, uniform in
                        Group {
                            if dynamicTypeSize.isAccessibilitySize {
                                ScrollView { card(for: uniform, index: index) }
                            } else {
                                card(for: uniform, index: index)
                            }
                        }
                        .tag(index)
                    }
                }
                .tabViewStyle(.page(indexDisplayMode: .never))
                // Page dots below are the accent-tinted equivalent (UniformSheet.tsx's
                // custom dot row); the system page dots don't take the team accent.

                pageDots
                    .padding(.bottom, DesignTokens.Spacing.md)
            }
            // Preview-only signal on every page change — see the header comment. The
            // caller decides whether/when this becomes the committed selection.
            .onChange(of: currentIndex) { _, newIndex in
                guard uniforms.indices.contains(newIndex) else { return }
                onSelect(uniforms[newIndex].id)
            }
        }
        .accessibilityIdentifier("uniform-picker-sheet")
    }

    private func card(for uniform: Uniform, index: Int) -> some View {
        let presentation = UniformPresentation(uniform, teamName: teamName)
        return VStack(spacing: DesignTokens.Spacing.sm) {
            UniformThumb(
                url: UniformArt.jerseyURL(for: uniform.id), size: 140, heightMultiplier: 0.81
            )
            .padding(.top, DesignTokens.Spacing.md)

            VStack(spacing: DesignTokens.Spacing.xs) {
                Text(presentation.title)
                    .font(.title3.bold())
                    .foregroundStyle(DesignTokens.Colors.textPrimary)
                Text(presentation.dates)
                    .font(.footnote.monospacedDigit())
                    .foregroundStyle(DesignTokens.Colors.textSecondary)
                Text(presentation.metadata)
                    .font(.footnote)
                    .foregroundStyle(DesignTokens.Colors.textMuted)
            }
            .multilineTextAlignment(.center)
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
        .padding(.bottom, DesignTokens.Spacing.md)
        .frame(maxWidth: .infinity)
        .accessibilityElement(children: .ignore)
        .accessibilityIdentifier("uniform-\(uniform.id)")
        .accessibilityLabel(
            "\(presentation.accessibilityLabel)\(index == currentIndex ? ", selected" : "")"
        )
        .accessibilityValue("\(index + 1) of \(uniforms.count)")
    }

    /// Accent-tinted page dots (web's UniformSheet.tsx page-dot row): the active dot is
    /// a wider capsule, the rest are small circles. Tapping a dot jumps directly to that
    /// page, matching web's tappable dots. Sized and tinted up from web's row (8pt
    /// circles, `textFaint` instead of the barely-visible `textFaintest`, plus a soft
    /// accent glow on the active pill) — the 6pt/`textFaintest` original read as flat,
    /// low-contrast specks against the dark background.
    private var pageDots: some View {
        ScrollViewReader { proxy in
            ScrollView(.horizontal) {
                HStack(spacing: DesignTokens.Spacing.sm) {
                    ForEach(Array(uniforms.enumerated()), id: \.element.id) { index, uniform in
                        Button {
                            currentIndex = index
                        } label: {
                            Capsule()
                                .fill(
                                    index == currentIndex
                                        ? DesignTokens.Colors.accent : DesignTokens.Colors.textFaint
                                )
                                .frame(width: index == currentIndex ? 24 : 8, height: 8)
                                .shadow(
                                    color: index == currentIndex
                                        ? DesignTokens.Colors.accent.opacity(0.6) : .clear,
                                    radius: 4
                                )
                                .frame(width: 44, height: 44)
                                .contentShape(Rectangle())
                        }
                        .buttonStyle(.plain)
                        .id(index)
                        .accessibilityLabel(
                            "Select \(UniformPresentation(uniform, teamName: teamName).accessibilityLabel)"
                        )
                        .accessibilityValue("\(index + 1) of \(uniforms.count)")
                        .accessibilityAddTraits(index == currentIndex ? .isSelected : [])
                        .accessibilityIdentifier("uniform-dot-\(uniform.id)")
                    }
                }
                .padding(.horizontal, DesignTokens.Spacing.md)
            }
            .scrollIndicators(.hidden)
            .defaultScrollAnchor(.center, for: .alignment)
            .frame(height: 44)
            .onAppear { proxy.scrollTo(currentIndex, anchor: .center) }
            .onChange(of: currentIndex) { _, index in
                withAnimation(DesignTokens.Motion.selection.respectingReduceMotion(reduceMotion)) {
                    proxy.scrollTo(index, anchor: .center)
                }
            }
        }
        .animation(
            DesignTokens.Motion.selection.respectingReduceMotion(reduceMotion), value: currentIndex
        )
        // Swipes and dot taps both land on `currentIndex`, so each page change ticks once.
        .sensoryFeedback(.selection, trigger: currentIndex)
    }
}
