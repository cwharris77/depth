import SwiftUI

// Off-screen share-card layout, rendered to an image by `DepthChartShareButton` via
// `ImageRenderer`. Mirrors the web OG card's visual contract (app/team/[id]/og-image/
// route.tsx) — team-primary background, eyebrow, city/name, featured-starter panels —
// as the behavioral oracle, not the implementation (that route renders server-side JSX
// through `next/og`; this is a native SwiftUI view instead).
struct ShareCardView: View {
    let team: Team
    let starters: [FeaturedStarter]

    private var textColor: Color { Color(hex: readableTextOn(team.colors.primary)) }
    private var subtleTextColor: Color { textColor.opacity(0.72) }
    private var panelBackground: Color { textColor.opacity(0.12) }

    var body: some View {
        VStack(alignment: .leading, spacing: 24) {
            HStack(spacing: 12) {
                RoundedRectangle(cornerRadius: 3)
                    .fill(Color(hex: team.colors.secondary))
                    .frame(width: 28, height: 6)
                Text("DEPTH CHART")
                    .font(.system(size: 15, weight: .bold))
                    .tracking(4)
                    .foregroundStyle(subtleTextColor)
            }

            VStack(alignment: .leading, spacing: 0) {
                Text(team.city.uppercased())
                    .font(.system(size: 22, weight: .semibold))
                    .tracking(2)
                    .foregroundStyle(subtleTextColor)
                Text(team.name)
                    .font(.system(size: 66, weight: .heavy))
                    .foregroundStyle(textColor)
            }

            Spacer(minLength: 0)

            HStack(spacing: 10) {
                ForEach(starters, id: \.label) { starter in
                    VStack(alignment: .leading, spacing: 2) {
                        Text(starter.label)
                            .font(.system(size: 13, weight: .bold))
                            .foregroundStyle(subtleTextColor)
                        Text(starter.name)
                            .font(.system(size: 19, weight: .bold))
                            .foregroundStyle(textColor)
                            .lineLimit(1)
                    }
                    .padding(.horizontal, 13)
                    .padding(.vertical, 9)
                    .background(panelBackground, in: RoundedRectangle(cornerRadius: 9))
                }
            }
        }
        .padding(38)
        .frame(width: 600, height: 315, alignment: .topLeading)
        .background(Color(hex: team.colors.primary))
    }
}
