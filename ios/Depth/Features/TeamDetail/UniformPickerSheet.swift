import SwiftUI

// Native counterpart to the web UniformSheet: one deterministic VoiceOver row per
// uniform, with the currently-selected one checked. Selecting persists the choice per
// team (UserPreferences.setUniformSelection) and recolors the field dots via
// DepthChartFieldView's colors override.
struct UniformPickerSheet: View {
    @Environment(\.dismiss) private var dismiss

    let uniforms: [Uniform]
    let selectedID: String?
    let onSelect: (String) -> Void

    var body: some View {
        NavigationStack {
            List(uniforms) { uniform in
                Button {
                    onSelect(uniform.id)
                    dismiss()
                } label: {
                    HStack(spacing: 12) {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(uniform.name)
                                .font(.headline)
                            Text(description(for: uniform))
                                .font(.footnote)
                                .foregroundStyle(DesignTokens.Colors.textMuted)
                        }
                        Spacer()
                        if uniform.id == selectedID {
                            Image(systemName: "checkmark")
                                .foregroundStyle(DesignTokens.Colors.accent)
                                .accessibilityLabel("Selected")
                        }
                    }
                }
                .frame(minHeight: 44)
                .accessibilityIdentifier("uniform-\(uniform.id)")
                .accessibilityLabel(
                    "\(uniform.name), \(description(for: uniform))\(uniform.id == selectedID ? ", selected" : "")"
                )
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