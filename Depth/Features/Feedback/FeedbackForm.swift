import SwiftUI

struct FeedbackForm: View {
    let title: String
    var isReport = true
    var context: [String: String] = [:]

    @Environment(\.dismiss) private var dismiss
    @Environment(\.openURL) private var openURL
    @State private var message = ""
    @State private var source = ""
    @State private var category = ""
    @State private var mailUnavailable = false

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    Text(
                        "Review your draft in your email app before sending it to the Depth developer."
                    )
                    ForEach(context.keys.sorted(), id: \.self) { key in
                        LabeledContent(key.capitalized, value: context[key] ?? "")
                    }
                    if isReport && context["category"] == nil {
                        Picker("Category (optional)", selection: $category) {
                            Text("None").tag("")
                            Text("Uniform").tag("Uniform")
                            Text("Lineup").tag("Lineup")
                            Text("Other").tag("Other")
                        }
                    }
                    TextField("Message", text: $message, axis: .vertical)
                        .lineLimit(4...8)
                        .accessibilityIdentifier("feedback-message")
                    if isReport {
                        TextField("Source link (optional)", text: $source)
                            .keyboardType(.URL)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                    }
                }
                Section {
                    Button("Open Email Draft", action: openDraft)
                        .disabled(message.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                    if mailUnavailable {
                        Text(
                            "Couldn’t open an email app. Copy your draft and send it to \(AppBuildInfo.supportEmail)."
                        )
                        Button("Copy Draft") {
                            UIPasteboard.general.string = draftBody
                        }
                    }
                }
            }
            .navigationTitle(title)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { dismiss() }
                }
            }
        }
    }

    private var draftBody: String {
        var fields = context
        if !category.isEmpty { fields["category"] = category }
        let link = source.trimmingCharacters(in: .whitespacesAndNewlines)
        if isReport && !link.isEmpty { fields["source"] = link }
        let details = fields.sorted { $0.key < $1.key }.map {
            "\($0.key.capitalized): \($0.value)"
        }
        return ([message.trimmingCharacters(in: .whitespacesAndNewlines)] + details)
            .joined(separator: "\n\n")
    }

    private func openDraft() {
        guard
            let url = AppBuildInfo.feedbackMailtoURL(
                topic: isReport ? "data issue" : "feedback", body: draftBody
            )
        else {
            mailUnavailable = true
            return
        }
        openURL(url) { accepted in
            mailUnavailable = !accepted
        }
    }
}
