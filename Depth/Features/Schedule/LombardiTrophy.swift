import SwiftUI

/// The Super Bowl trophy as flat vector art: a football on a tapering three-sided stem. The
/// artwork is drawn for the app, so it is a plain silhouette with no mark, text or
/// wordmark. Coordinates are in a 700 x 1600 design box and scale to fit the proposed rect.
struct LombardiTrophyShape: Shape {
    enum Layer: CaseIterable {
        case light
        case shade
        case mid

        var color: Color {
            switch self {
            case .light: DesignTokens.Colors.trophySilverLight
            case .shade: DesignTokens.Colors.trophySilverShade
            case .mid: DesignTokens.Colors.trophySilverMid
            }
        }
    }

    static let aspectRatio: CGFloat = 700 / 1600

    /// One facet, or the whole silhouette when nil.
    var layer: Layer?

    func path(in rect: CGRect) -> Path {
        let scale = min(rect.width / 700, rect.height / 1600)
        let originX = rect.midX - 350 * scale
        let originY = rect.midY - 800 * scale
        var path = Path()
        for layer in layer.map({ [$0] }) ?? Layer.allCases {
            for outline in Self.outlines(layer) {
                for (index, point) in outline.enumerated() {
                    let mapped = CGPoint(x: originX + point.x * scale, y: originY + point.y * scale)
                    if index == 0 { path.move(to: mapped) } else { path.addLine(to: mapped) }
                }
                path.closeSubpath()
            }
        }
        return path
    }

    private static func outlines(_ layer: Layer) -> [[(x: CGFloat, y: CGFloat)]] {
        switch layer {
        case .light: lightOutline
        case .shade: shadeOutline
        case .mid: midOutline
        }
    }

    private static let lightOutline: [[(x: CGFloat, y: CGFloat)]] = [
        [
            (296.1, 566.0), (312.5, 556.1), (334.8, 533.5), (367.2, 487.9), (402.6, 417.2),
            (422.9, 358.6), (437.3, 296.3), (445.9, 213.5), (441.8, 130.3), (430.4, 76.8),
            (413.1, 38.3), (409.9, 34.5), (403.3, 34.1), (360.0, 48.2), (306.3, 81.7),
            (272.0, 112.6), (231.4, 164.0), (202.9, 220.6), (190.6, 261.2), (184.9, 295.1),
            (183.1, 333.3), (185.9, 371.1), (193.1, 407.7), (204.2, 442.5), (219.8, 477.6),
            (239.7, 510.9), (260.6, 537.5), (105.0, 1348.0), (136.2, 1358.3), (167.5, 1373.2),
            (230.0, 1417.0), (292.5, 1479.2), (355.0, 1560.0), (354.4, 546.5), (322.2, 560.7),
        ],
        [(432.9, 486.4), (400.6, 516.0), (366.5, 539.7), (597.0, 1345.0)],
    ]

    private static let shadeOutline: [[(x: CGFloat, y: CGFloat)]] = [
        [
            (355.0, 1560.0), (417.0, 1479.1), (478.0, 1416.2), (538.0, 1371.6), (567.6, 1356.0),
            (597.0, 1345.0), (366.5, 539.7), (354.4, 546.5),
        ]
    ]

    private static let midOutline: [[(x: CGFloat, y: CGFloat)]] = [
        [
            (409.1, 34.2), (421.0, 51.9), (431.3, 79.8), (444.6, 156.2), (444.9, 233.8),
            (433.2, 317.3), (409.9, 398.2), (375.9, 472.9), (334.8, 533.5), (312.5, 556.1),
            (296.1, 566.0), (326.7, 559.1), (363.1, 541.7), (400.6, 516.0), (434.7, 484.5),
            (463.2, 449.9), (485.3, 414.2), (502.6, 375.4), (514.4, 334.6), (520.3, 292.3),
            (520.2, 249.9), (514.5, 208.2), (502.6, 165.1), (484.2, 122.5), (462.3, 86.3),
            (434.4, 53.1),
        ]
    ]
}

/// The trophy in its three silvers. Hidden from VoiceOver: the card that carries it speaks
/// the result.
struct LombardiTrophy: View {
    var body: some View {
        ZStack {
            ForEach(LombardiTrophyShape.Layer.allCases, id: \.self) { layer in
                LombardiTrophyShape(layer: layer).fill(layer.color, style: FillStyle(eoFill: true))
            }
        }
        .aspectRatio(LombardiTrophyShape.aspectRatio, contentMode: .fit)
        .accessibilityHidden(true)
    }
}

#Preview("Trophy at 48 pt") {
    HStack(spacing: 0) {
        LombardiTrophy().frame(height: 48).padding(24).background(DesignTokens.Colors.surfaceCard)
        LombardiTrophy().frame(height: 48).padding(24).background(Color(white: 0.96))
    }
}
