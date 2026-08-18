import SwiftUI

// A team logo image (web's "team icons"). The app never bundles logo artwork and the
// SwiftData snapshot cache stays text/URL-only (design spec: "no image blobs") — fetched
// logos land in TeamLogoCache (a URLCache), so repeat renders and offline use read from
// disk instead of re-downloading (DEP-247). Renders the dark-optimized ESPN asset (the
// app is always dark; same reasoning as TeamBadge and the season-stats card's
// logo_dark_url), falling back to the light logo. Renders nothing when neither URL is
// present; the caller places it in its own container and provides its own fallback if it
// needs one. Shared by the schedule card and the stats NEXT GAME card so the "which URL +
// how to render a team icon" rule lives in one place.
struct TeamIconView: View {
    let team: Team
    var size: CGFloat = 28

    var body: some View {
        if let url = (team.logoDark ?? team.logo).flatMap(URL.init(string:)) {
            CachedTeamLogo(url: url) {
                Color.clear
            } content: { image in
                image.resizable().scaledToFit()
            }
            .frame(width: size, height: size)
            .accessibilityHidden(true)
        }
    }
}
