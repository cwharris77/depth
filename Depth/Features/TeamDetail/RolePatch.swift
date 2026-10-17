import SwiftUI

/// The letter a dot wears while its player holds a role on top of his position (N for the
/// nickel back). The same glyph appears in the field's key, so the two read as one sign.
/// Both field views draw it, so the depth chart and true scale mark a role identically.
struct RolePatch: View {
    let letter: String
    let size: CGFloat

    var body: some View {
        Circle()
            .fill(DesignTokens.Colors.textPrimary)
            .overlay {
                Text(verbatim: letter)
                    .font(.system(size: size * 0.68, weight: .heavy))
                    .foregroundStyle(DesignTokens.Colors.bg)
            }
            .overlay { Circle().strokeBorder(DesignTokens.Colors.surfaceField1, lineWidth: 1.5) }
            .frame(width: size, height: size)
            .accessibilityHidden(true)
    }
}

/// One key entry: the patch beside the role's plain name. The container (capsule, glass)
/// belongs to each field view.
struct RoleKeyEntry: View {
    let letter: String
    let name: String

    var body: some View {
        HStack(spacing: DesignTokens.Spacing.xs) {
            RolePatch(letter: letter, size: 14)
            Text(name)
                .font(.caption2.weight(.semibold))
                .foregroundStyle(DesignTokens.Colors.textSecondary)
        }
    }
}
