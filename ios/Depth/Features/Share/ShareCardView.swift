import SwiftUI

// Off-screen share-card layout, rendered to an image by `DepthChartShareButton` via
// `ImageRenderer`. Mirrors the web OG card's visual contract (app/team/[id]/og-image/
// route.tsx) — team-primary background, eyebrow, city/name, featured-starter panels —
// as the behavioral oracle, not the implementation (that route renders server-side JSX
// through `next/og`; this is a native SwiftUI view instead). The native card renders at
// exactly half the web raster (600×315 vs 1200×630), so each fixed value lives in
// `ShareCardMetrics` with its web counterpart noted alongside it — one auditable source
// of truth instead of inline literals (DEP-269).
struct ShareCardView: View {
    let team: Team
    let starters: [FeaturedStarter]

    private var textColor: Color { Color(hex: readableTextOn(team.colors.primary)) }
    private var subtleTextColor: Color { textColor.opacity(0.72) }
    private var panelBackground: Color { textColor.opacity(0.12) }

    var body: some View {
        VStack(alignment: .leading, spacing: ShareCardMetrics.columnSpacing) {
            header

            VStack(alignment: .leading, spacing: 0) {
                Text(team.city.uppercased())
                    .font(.system(size: ShareCardMetrics.cityTextSize, weight: .semibold))
                    .tracking(ShareCardMetrics.cityTracking)
                    .foregroundStyle(subtleTextColor)
                Text(team.name)
                    .font(.system(size: ShareCardMetrics.teamNameSize, weight: .heavy))
                    .foregroundStyle(textColor)
            }

            Spacer(minLength: 0)

            HStack(spacing: ShareCardMetrics.starterSpacing) {
                ForEach(starters, id: \.label) { starter in
                    starterPanel(starter)
                }
            }
        }
        .padding(ShareCardMetrics.cardPadding)
        .frame(width: ShareCardMetrics.cardWidth, height: ShareCardMetrics.cardHeight, alignment: .topLeading)
        .background(Color(hex: team.colors.primary))
    }

    private var header: some View {
        HStack(spacing: ShareCardMetrics.eyebrowSpacing) {
            RoundedRectangle(cornerRadius: ShareCardMetrics.eyebrowBarRadius)
                .fill(Color(hex: team.colors.secondary))
                .frame(width: ShareCardMetrics.eyebrowBarSize.width, height: ShareCardMetrics.eyebrowBarSize.height)
            Text("DEPTH CHART")
                .font(.system(size: ShareCardMetrics.eyebrowTextSize, weight: .bold))
                .tracking(ShareCardMetrics.eyebrowTracking)
                .foregroundStyle(subtleTextColor)
        }
    }

    private func starterPanel(_ starter: FeaturedStarter) -> some View {
        VStack(alignment: .leading, spacing: ShareCardMetrics.starterTextSpacing) {
            Text(starter.label)
                .font(.system(size: ShareCardMetrics.starterLabelSize, weight: .bold))
                .foregroundStyle(subtleTextColor)
            Text(starter.name)
                .font(.system(size: ShareCardMetrics.starterNameSize, weight: .bold))
                .foregroundStyle(textColor)
                .lineLimit(1)
        }
        .padding(.horizontal, ShareCardMetrics.starterPaddingHorizontal)
        .padding(.vertical, ShareCardMetrics.starterPaddingVertical)
        .background(panelBackground, in: RoundedRectangle(cornerRadius: ShareCardMetrics.starterRadius))
    }
}

// The system share sheet owns its thumbnail crop, so preview the wide card inside a
// square safe area instead of handing the 600×315 transfer image directly to that crop.
// The background continues the team color and the shared item itself remains untouched.
struct ShareCardPreviewView: View {
    let team: Team
    let starters: [FeaturedStarter]

    var body: some View {
        ZStack {
            Color(hex: team.colors.primary)
            ShareCardView(team: team, starters: starters)
        }
        .frame(
            width: SharePreviewMetrics.canvasSide,
            height: SharePreviewMetrics.canvasSide
        )
    }
}

enum SharePreviewMetrics {
    /// A safe inset keeps the complete landscape raster inside any square
    /// thumbnail treatment used by the activity sheet (DEP-296).
    static let safeInset: CGFloat = 24
    static let canvasSide: CGFloat = ShareCardMetrics.cardWidth + (safeInset * 2)
}

/// Fixed-point metrics for the off-screen share card. The native card renders at exactly
/// half the web card's 1200×630 raster, so each value is the web route's
/// (`app/team/[id]/og-image/route.tsx`) equivalent scaled 1:2 — the web value is noted
/// on every line. Where the long-shipped native value is not a strict half (eyebrow
/// spacing, uniform padding), the shipped native value is kept and flagged below so the
/// two can be audited at a glance (DEP-269).
enum ShareCardMetrics {
    static let cardWidth: CGFloat = 600 // web 1200
    static let cardHeight: CGFloat = 315 // web 630

    /// Uniform card inset; web uses `padding: '76px 80px'` (top/bottom 76, left/right
    /// 80) — the shipped native value of 38 kept as-is, skirting web's 76/2 vs 80/2
    /// split to avoid a silent 2px visual change.
    static let cardPadding: CGFloat = 38

    /// Vertical gap between the card's stacked sections; the body's `Spacer` absorbs the
    /// remaining height — web uses `justify-content: space-between`.
    static let columnSpacing: CGFloat = 24

    /// Eyebrow bar↔label gap. Web margin-right is 20 (half: 10); the shipped native
    /// value 12 is kept, not 10 — a slightly wider label offset than the exact half.
    static let eyebrowSpacing: CGFloat = 12
    static let eyebrowBarRadius: CGFloat = 3 // web 6
    static let eyebrowBarSize = CGSize(width: 28, height: 6) // web 56×12
    static let eyebrowTextSize: CGFloat = 15 // web 26
    static let eyebrowTracking: CGFloat = 4 // web 8

    static let cityTextSize: CGFloat = 22 // web 44
    static let cityTracking: CGFloat = 2 // web 4
    static let teamNameSize: CGFloat = 66 // web 132

    static let starterSpacing: CGFloat = 10 // web gap 20
    static let starterRadius: CGFloat = 9 // web 18
    static let starterPaddingHorizontal: CGFloat = 13 // web 26
    static let starterPaddingVertical: CGFloat = 9 // web 18
    /// Gap between the starter's label and name rows. Web's panel is a flex column
    /// with no explicit gap (0); the shipped native value of 2 is kept as a slight
    /// text separation, not a web half.
    static let starterTextSpacing: CGFloat = 2
    static let starterLabelSize: CGFloat = 13 // web 26
    static let starterNameSize: CGFloat = 19 // web 38
}
