#if INTERNAL_BUILD
    import SwiftUI

    // Internal-build screen for flipping feature flags at runtime. Each toggle writes a
    // local override; Reset returns the flag to its internal-build default (on).
    struct FeatureFlagsSheet: View {
        @Bindable var store: FeatureFlagStore

        var body: some View {
            DepthSheet(title: "Feature Flags", closeIdentifier: "feature-flags-close") {
                ScrollView {
                    VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
                        if store.definitions.isEmpty {
                            Text("No feature flags are registered.")
                                .font(.callout)
                                .foregroundStyle(DesignTokens.Colors.textMuted)
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .depthCard()
                                .accessibilityIdentifier("feature-flags-empty")
                        } else {
                            VStack(alignment: .leading, spacing: 0) {
                                ForEach(
                                    Array(store.definitions.enumerated()), id: \.element.key
                                ) { index, definition in
                                    if index > 0 {
                                        Divider().overlay(DesignTokens.Colors.borderSubtle)
                                    }
                                    row(definition)
                                }
                            }
                            .padding(.vertical, DesignTokens.Spacing.sm)
                            .depthCard(padded: false)
                        }
                        Text(
                            "Release builds ignore these overrides and use each flag's launched value."
                        )
                        .font(.footnote)
                        .foregroundStyle(DesignTokens.Colors.textFaint)
                    }
                    .padding(DesignTokens.Spacing.md)
                }
            }
        }

        private func row(_ definition: FeatureFlagDefinition) -> some View {
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
                Toggle(
                    definition.summary,
                    isOn: Binding(
                        get: { store.isEnabled(definition) },
                        set: { store.setOverride($0, for: definition) }
                    )
                )
                .tint(DesignTokens.Colors.accent)
                .accessibilityIdentifier("feature-flag-\(definition.key)")
                HStack(spacing: DesignTokens.Spacing.sm) {
                    Text(details(definition))
                        .font(.caption)
                        .foregroundStyle(DesignTokens.Colors.textMuted)
                    Spacer()
                    if store.overrides[definition.key] != nil {
                        Button("Reset") { store.setOverride(nil, for: definition) }
                            .font(.caption.weight(.semibold))
                            .accessibilityIdentifier("feature-flag-reset-\(definition.key)")
                    }
                }
            }
            .padding(.horizontal, DesignTokens.Spacing.md)
            .padding(.vertical, DesignTokens.Spacing.sm)
        }

        private func details(_ definition: FeatureFlagDefinition) -> String {
            var parts = [definition.key, definition.kind.rawValue]
            if definition.launched { parts.append("launched") }
            if let removeBy = definition.removeBy {
                // `added` is parsed as a UTC day, so format in UTC to show that same day.
                let style = Date.FormatStyle(date: .abbreviated, time: .omitted, timeZone: .gmt)
                parts.append("remove by \(removeBy.formatted(style))")
            }
            return parts.joined(separator: " · ")
        }
    }
#endif
