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
                        UniformThumbnailView(uniform: uniform, artURL: artURL(for: uniform))
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
            .scrollIndicators(.hidden)
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

    // DEP-220: each row renders its prerendered WebP thumbnail (the shared UniformFigure
    // jersey crop, committed under public/uniforms). Rows whose image_path is still NULL
    // degrade to today's text-only layout — no empty placeholder box. The image is hidden
    // from VoiceOver because the row label already names the kit.
    private func artURL(for uniform: Uniform) -> URL? {
        if let imagePath = uniform.imagePath, let url = URL(string: imagePath) {
            return url
        }
        #if DEBUG
        // UI-testing hook (same convention as DepthApp's UI_TESTING_RESET_STATE): reroute
        // every uniform's image URL to a local artifact server so DEP-220 rows can be
        // screenshot-verified before the image_path backfill migration lands. Example:
        //   xcodebuild ... test  (then feed launch-arguments = ["UI_TESTING_UNIFORM_ART_BASE_URL=http://127.0.0.1:8787/uniforms"])
        // with `python3 -m http.server 8787 -d public` running in the repo.
        if let base = ProcessInfo.processInfo.arguments.first(where: {
            $0.hasPrefix("UI_TESTING_UNIFORM_ART_BASE_URL=")
        })?.dropFirst("UI_TESTING_UNIFORM_ART_BASE_URL=".count), !base.isEmpty {
            return URL(string: base.hasSuffix("/") ? "\(base)\(uniform.id).webp" : "\(base)/\(uniform.id).webp")
        }
        #endif
        return nil
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

// The leading 3:4 jersey thumbnail. object-cover semantics (scaledToFill within the fixed
// frame, then clipped) match the web picker's JerseySwatch box; while loading, the frame
// keeps its slot with the surface fill so rows don't shift. artURL is nil (no image_path
// yet) → renders nothing and the row stays the text-only layout.
private struct UniformThumbnailView: View {
    let uniform: Uniform
    let artURL: URL?

    var body: some View {
        if let artURL {
            AsyncImage(url: artURL) { phase in
                if let image = phase.image {
                    image.resizable().scaledToFill()
                }
            }
            .frame(width: 48, height: 64)
            .background(DesignTokens.Colors.surfaceRaised)
            .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
            .accessibilityHidden(true)
        }
    }
}