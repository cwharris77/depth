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
        "\(snapshot.team.city) \(snapshot.team.name) depth chart · \(AppBuildInfo.displayName)"
    }

    private var renderedImages: (item: Image, preview: Image)? {
        let itemRenderer = ImageRenderer(
            content: ShareCardView(team: snapshot.team, starters: featuredStarters(from: snapshot))
        )
        itemRenderer.scale = displayScale
        guard let itemUIImage = itemRenderer.uiImage else { return nil }
        let item = Image(uiImage: itemUIImage)

        // DEP-296: the activity sheet crops its preview thumbnail independently of the
        // transferred image. Give that thumbnail a square, padded composition while the
        // actual shared item stays the original 600×315 card.
        let previewRenderer = ImageRenderer(
            content: ShareCardPreviewView(
                team: snapshot.team,
                starters: featuredStarters(from: snapshot)
            )
        )
        previewRenderer.scale = displayScale
        let preview = previewRenderer.uiImage.map { Image(uiImage: $0) } ?? item
        return (item, preview)
    }

    var body: some View {
        if let images = renderedImages {
            // `preview:` only drives the share sheet's own preview UI — it is not
            // transferred to the chosen destination (Greptile review on depth#367).
            // `subject`/`message` are the actual accompanying text some destinations
            // (Mail, Messages) attach alongside the image.
            ShareLink(
                item: images.item,
                subject: Text(shareTitle),
                message: Text(shareTitle),
                preview: SharePreview(shareTitle, image: images.preview)
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
