import SwiftUI

// A team logo image (web's "team icons"). The app never caches logo blobs (design spec:
// "no image blobs"), so this is an opportunistic AsyncImage of the dark logo variant — the
// app is always dark, so the dark-optimized ESPN asset reads correctly (same reasoning as
// TeamBadge and the season-stats card's logo_dark_url) — falling back to the light logo.
// Renders nothing when neither URL is present; the caller places it in its own container
// and provides its own fallback if it needs one. Shared by the schedule card and the stats
// NEXT GAME card so the "which URL + how to render a team icon" rule lives in one place.
struct TeamIconView: View {
    let team: Team
    var size: CGFloat = 28

    var body: some View {
        if let url = (team.logoDark ?? team.logo).flatMap(URL.init(string:)) {
            AsyncImage(url: url) { phase in
                if let image = phase.image {
                    image.resizable().scaledToFit()
                }
            }
            .frame(width: size, height: size)
            .accessibilityHidden(true)
        }
    }
}
