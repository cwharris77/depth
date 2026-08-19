import SwiftUI

// Native equivalent of web's boxed OtpInput (components/ui/OtpInput.tsx) — one box per
// digit instead of a bare numeric TextField, so the code step reads as a real native
// verification control rather than a stock Form row. A single invisible TextField
// captures all keyboard input (typing, backspace, paste of a full code) and drives the
// visible boxes purely from the `code` string; this avoids juggling per-box SwiftUI
// focus state to reproduce web's auto-advance/backspace/paste behavior.
struct OtpCodeField: View {
    let length: Int
    @Binding var code: String
    var disabled: Bool = false
    var onComplete: () -> Void = {}

    @FocusState private var isFocused: Bool

    init(
        length: Int = 6, code: Binding<String>, disabled: Bool = false,
        onComplete: @escaping () -> Void = {}
    ) {
        self.length = length
        self._code = code
        self.disabled = disabled
        self.onComplete = onComplete
    }

    var body: some View {
        ZStack {
            TextField("", text: $code)
                .keyboardType(.numberPad)
                .textContentType(.oneTimeCode)
                .focused($isFocused)
                .opacity(0.01)
                .disabled(disabled)
                .accessibilityIdentifier("auth-code")
                .accessibilityLabel("\(length)-digit sign-in code")
                .onChange(of: code) { _, newValue in
                    let filtered = String(newValue.filter(\.isNumber).prefix(length))
                    if filtered != newValue { code = filtered }
                    if filtered.count == length { onComplete() }
                }

            HStack(spacing: DesignTokens.Spacing.sm) {
                ForEach(0..<length, id: \.self) { index in
                    digitBox(index)
                }
            }
            .allowsHitTesting(false)
        }
        .contentShape(Rectangle())
        .onTapGesture { isFocused = true }
        .task { isFocused = true }
    }

    private func digitBox(_ index: Int) -> some View {
        let chars = Array(code)
        let char = index < chars.count ? String(chars[index]) : ""
        let isActiveBox = isFocused && index == chars.count
        return Text(char)
            .font(.title2.bold())
            .foregroundStyle(DesignTokens.Colors.textPrimary)
            .frame(width: 44, height: 56)
            .background(
                RoundedRectangle(cornerRadius: DesignTokens.Radius.sm)
                    .fill(DesignTokens.Colors.surfaceRaised)
            )
            .overlay(
                RoundedRectangle(cornerRadius: DesignTokens.Radius.sm)
                    .strokeBorder(
                        isActiveBox ? DesignTokens.Colors.accent : DesignTokens.Colors.borderInput,
                        lineWidth: isActiveBox ? 2 : 1)
            )
    }
}
