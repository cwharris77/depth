import SwiftUI

// The app's inline search field — a bounded input that lives in page content rather than
// in the nav bar. `.searchable` is the usual native answer and is what TeamListPickerSheet
// uses, but it can't be used where a screen keeps its own header controls visible while
// searching: SwiftUI hides nav-bar toolbar items outright once an inline search field is
// focused (see TeamListPickerSheet's DEP-273 note), which would take the account button
// and brand mark with it. The uniform archive's v2 header (2026-08-27) keeps search, the
// By team / By era switch and Filters on screen together, so it owns its field.
//
// Styled from the chip vocabulary (`surfaceChip` fill, `borderInput` hairline, `Radius.sm`)
// so it reads as the same family as the Filters pill sitting under it.
struct DepthSearchField: View {
    @Binding var text: String
    var placeholder: String
    /// Set where a UI test needs to address this specific field.
    var identifier: String? = nil

    /// A `TextField` is only hit-testable across its own intrinsic text box — roughly a
    /// 20pt band, starting after the magnifier. Everything else inside the capsule (the
    /// horizontal padding, the icon, the space above and below the baseline) is dead
    /// unless focus is driven explicitly, so a tap near the edge silently did nothing.
    @FocusState private var isFocused: Bool

    var body: some View {
        HStack(spacing: DesignTokens.Spacing.sm) {
            Image(systemName: "magnifyingglass")
                .font(.footnote)
                .foregroundStyle(DesignTokens.Colors.textFaint)
                .accessibilityHidden(true)

            TextField(placeholder, text: $text)
                .textFieldStyle(.plain)
                .autocorrectionDisabled()
                .textInputAutocapitalization(.never)
                .submitLabel(.search)
                .focused($isFocused)
                .foregroundStyle(DesignTokens.Colors.textPrimary)
                .tint(DesignTokens.Colors.accent)
                .accessibilityIdentifier(identifier ?? "")

            if !text.isEmpty {
                Button {
                    text = ""
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .symbolRenderingMode(.palette)
                        .foregroundStyle(
                            DesignTokens.Colors.onAccent,
                            DesignTokens.Colors.borderInput
                        )
                        // The glyph is the design's 18pt dot; the frame is the tap
                        // target it needs to be reachable, not a bigger dot.
                        .font(.body)
                        .frame(width: 44, height: 44)
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Clear search")
                .accessibilityIdentifier(identifier.map { "\($0)-clear" } ?? "")
                // Keep the field's own height fixed whether or not the button is there.
                .padding(.vertical, -6)
                .padding(.trailing, -DesignTokens.Spacing.sm)
            }
        }
        .font(.subheadline)
        .padding(.horizontal, DesignTokens.Spacing.sm + DesignTokens.Spacing.xs)
        // 44, not the design's 38: every other tappable control in this app asks for the
        // HIG minimum, and a text field is no less of a touch target than a chip.
        .frame(height: 44)
        .background(DesignTokens.Colors.surfaceChip, in: RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))
        .overlay {
            RoundedRectangle(cornerRadius: DesignTokens.Radius.sm)
                .strokeBorder(
                    isFocused ? DesignTokens.Colors.accent : DesignTokens.Colors.borderInput,
                    lineWidth: 1
                )
        }
        // The whole capsule is the target — see `isFocused`. The clear button and the
        // text field claim their own taps first, so this only picks up the gaps.
        .contentShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))
        .onTapGesture { isFocused = true }
    }
}
