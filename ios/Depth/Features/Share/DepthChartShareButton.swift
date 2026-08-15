import SwiftUI

// Local image/text sharing (design spec locked decision #10 and Milestone 2B item 25):
// renders `ShareCardView` off-screen with `ImageRenderer` and hands the result to the
// native share sheet via `ShareLink`. No public link, URL, or backend write — everything
// here is synchronous and derived only from the already-loaded live snapshot. A renderer
// failure (returns `nil`) falls back to text-only sharing rather than hiding the entry
// point or crashing (QA plan's "missing-image fallback").
struct DepthChartShareButton: View {
    let snapshot: TeamSnapshot

    @Environment(\.displayScale) private var displayScale

    private var shareTitle: String {
        "\(snapshot.team.city) \(snapshot.team.name) depth chart · Depth"
    }

    private var renderedImage: Image? {
        let renderer = ImageRenderer(
            content: ShareCardView(team: snapshot.team, starters: featuredStarters(from: snapshot))
        )
        renderer.scale = displayScale
        guard let uiImage = renderer.uiImage else { return nil }
        return Image(uiImage: uiImage)
    }

    var body: some View {
        if let image = renderedImage {
            ShareLink(
                item: image,
                preview: SharePreview(shareTitle, image: image)
            ) {
                Label("Share", systemImage: "square.and.arrow.up")
            }
            .frame(minWidth: 44, minHeight: 44)
            .accessibilityIdentifier("share-depth-chart")
        } else {
            ShareLink(item: shareTitle) {
                Label("Share", systemImage: "square.and.arrow.up")
            }
            .frame(minWidth: 44, minHeight: 44)
            .accessibilityIdentifier("share-depth-chart")
        }
    }
}
