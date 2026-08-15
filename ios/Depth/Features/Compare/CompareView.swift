import SwiftUI

// Tab 2 of the root TabView. Deliberately a placeholder (2026-08-15 navigation-parity
// spec, locked decision #6): the web has a /compare route, native has no comparison UI
// in any form, and building one is genuinely new scope with its own spec. The tab exists
// here so the navigation surface is complete and honest about what is coming, not so the
// feature can be quietly half-shipped.
struct CompareView: View {
    var body: some View {
        NavigationStack {
            ContentUnavailableView {
                Label("Compare Teams", systemImage: "rectangle.split.2x1")
            } description: {
                Text("Side-by-side team comparison is coming soon.")
            }
            // Without combining, `.accessibilityIdentifier` lands on each of
            // ContentUnavailableView's internal subviews (image + two text elements)
            // individually rather than one queryable element — none of which is the
            // `Other` type XCUITest's `otherElements[...]` looks for.
            .accessibilityElement(children: .combine)
            .accessibilityIdentifier("compare-placeholder")
            .navigationTitle("Compare")
        }
    }
}
