import SwiftUI

// A team logo image (web's "team icons"). The app never bundles logo artwork and the
// SwiftData snapshot cache stays text/URL-only (design spec: "no image blobs") — fetched
// logos land in TeamLogoCache (a URLCache), so repeat renders and offline use read from
// disk instead of re-downloading (DEP-247). Renders the dark-optimized ESPN asset (the
// app is always dark; same reasoning as TeamBadge and the season-stats card's
// logo_dark_url), falling back to the light logo. Renders nothing when neither URL is
// present; the caller places it in its own container and provides its own fallback if it
// needs one. Shared by the schedule card, the stats NEXT GAME card, and TeamBadge (the
// team list/switcher) so the single "which URL + how to render a team icon" rule lives
// in one place.
struct TeamIconView<Placeholder: View>: View {
    let team: Team
    var size: CGFloat = 28
    private let placeholder: () -> Placeholder

    init(
        team: Team,
        size: CGFloat = 28,
        @ViewBuilder placeholder: @escaping () -> Placeholder = { Color.clear }
    ) {
        self.team = team
        self.size = size
        self.placeholder = placeholder
    }

    var body: some View {
        // DEP-247: `placeholder` shows while the first fetch completes so an already-
        // seen logo renders instantly and a fresh one doesn't flash to an empty slot.
        // The default is a transparent clear (schedule/stats lay the icon over their own
        // surface); TeamBadge passes its initials, which it underlays on its own circle.
        if let url = (team.logoDark ?? team.logo).flatMap(URL.init(string:)) {
            CachedTeamLogo(url: url) {
                placeholder()
            } content: { image in
                image.resizable().scaledToFit()
            }
            .frame(width: size, height: size)
            .accessibilityHidden(true)
        }
    }
}
