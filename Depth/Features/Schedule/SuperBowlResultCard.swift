import SwiftUI

/// Which version of a won title's celebration a card plays. A loss and every other round never
/// celebrate; they render as `.settled`.
enum SuperBowlCelebrationMode: Equatable {
    /// The first view of a title this launch: gradient sweep, then trophy, confetti and haptic.
    case first
    /// A repeat view this launch: the resting card with a single glint.
    case revisit
    /// Reduce Motion, or any card that does not celebrate: the resting card, no motion.
    case settled
}

/// Remembers, in memory only, which (team, season) title celebrations already played this
/// launch, so leaving the tab or switching seasons and back shows the quiet revisit. A
/// force-quit starts over by design.
@MainActor
final class SuperBowlCelebrationLedger {
    static let shared = SuperBowlCelebrationLedger()

    private var played: Set<String> = []
    /// UI tests launch with this argument to see the first-view celebration on every visit.
    private let replaysEveryVisit: Bool

    init(
        replaysEveryVisit: Bool = ProcessInfo.processInfo.arguments.contains(
            "UI_TESTING_REPLAY_CELEBRATION")
    ) {
        self.replaysEveryVisit = replaysEveryVisit
    }

    func hasPlayed(teamId: String, season: Int) -> Bool {
        !replaysEveryVisit && played.contains(Self.key(teamId, season))
    }

    /// Records the celebration as played. True only for the call that made it the first.
    @discardableResult
    func claim(teamId: String, season: Int) -> Bool {
        played.insert(Self.key(teamId, season)).inserted || replaysEveryVisit
    }

    func reset() {
        played.removeAll()
    }

    private static func key(_ teamId: String, _ season: Int) -> String { "\(teamId):\(season)" }
}

/// The Super Bowl card's colors, resolved from the team's own jersey colors: the body is the
/// fill, the ring color is the accent, and the text is whichever of white or near-black reads
/// on the fill.
struct SuperBowlPalette: Equatable {
    let fillHex: String
    let accentHex: String
    let inkHex: String

    init(colors: JerseyColors) {
        fillHex = TeamSurfaces.fill(colors)
        accentHex = TeamSurfaces.ring(colors)
        inkHex = readableTextOn(fillHex)
    }

    /// Before a team resolves, the app's own neutral slate.
    static let neutral = SuperBowlPalette(
        colors: JerseyColors(primary: "#2A3441", secondary: "#6E8CAE", accent: "#6E8CAE"))

    var fill: Color { Color(hex: fillHex) }
    var accent: Color { Color(hex: accentHex) }
    var ink: Color { Color(hex: inkHex) }
    var inkMuted: Color { ink.opacity(0.7) }
}

// MARK: - Card

/// The decided Super Bowl round. A win is a bold team-color card that celebrates the first time
/// it is seen in a launch; a loss keeps a quiet tinted card with the same geometry.
struct SuperBowlResultCard: View {
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize
    @ScaledMetric(relativeTo: .title) private var titleSize: CGFloat = 22
    @ScaledMetric(relativeTo: .title) private var scoreSize: CGFloat = 26

    let round: PostseasonRound
    let game: ScheduleGame
    let season: Int
    let palette: SuperBowlPalette
    /// The ladder's decided-round color: the loss red, or the team color on a win.
    let terminalColor: Color
    let mode: SuperBowlCelebrationMode
    /// The gradient sweep has begun.
    let sweepStarted: Bool
    /// Counts the end of the sweep, which lands the trophy, text, wash and confetti.
    let beat: Int
    /// Counts glint crossings.
    let glintBeat: Int
    let isShown: Bool
    let reduceMotion: Bool
    let barSweepDelay: Double

    @State private var cardWidth: CGFloat = 0
    @State private var confettiStart: Date?

    private var isWin: Bool { round.isChampionship }
    private var shape: RoundedRectangle { RoundedRectangle(cornerRadius: DesignTokens.Radius.lg) }

    /// The resting look: always for a loss, a revisit or Reduce Motion, and for a first view
    /// once the sweep ends.
    private var isResting: Bool { !isWin || mode != .first || beat > 0 }
    private var contentIsVisible: Bool { isResting || sweepStarted }

    var body: some View {
        content
            .padding(.horizontal, 16)
            .frame(maxWidth: .infinity, minHeight: 128, alignment: .leading)
            .background { cardBackground }
            .overlay { glint }
            .overlay { border }
            .overlay { confetti }
            .onGeometryChange(for: CGFloat.self) {
                $0.size.width
            } action: {
                cardWidth = $0
            }
            .accessibilityElement(children: .combine)
            .accessibilityLabel(round.accessibilityLabel(season: season, dateText: dateText))
            .zIndex(1)
            .task(id: beat) { await runConfetti() }
    }

    // MARK: Content

    @ViewBuilder
    private var content: some View {
        if dynamicTypeSize.isAccessibilitySize {
            // Accessibility sizes stack the trophy, title and score so nothing clips.
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
                trophy
                titleColumn
                scoreColumn(alignment: .leading)
            }
            .padding(.vertical, DesignTokens.Spacing.md)
        } else {
            HStack(spacing: 14) {
                trophy
                titleColumn
                Spacer(minLength: DesignTokens.Spacing.xs)
                scoreColumn(alignment: .trailing)
            }
        }
    }

    private var titleColumn: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(verbatim: round.kind.title(season: season))
                .font(.caption2.bold())
                .tracking(1.2)
                .foregroundStyle(isWin ? palette.ink.opacity(0.85) : terminalColor)
                .opacity(contentIsVisible ? 1 : 0)
                .animation(
                    reduceMotion ? nil : .easeOut(duration: 0.5).delay(0.35), value: sweepStarted)
            if isWin {
                Text("Champions")
                    .font(.system(size: titleSize, weight: .bold))
                    .foregroundStyle(palette.ink)
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)
                    .opacity(isResting ? 1 : 0)
                    .animation(reduceMotion ? nil : .easeOut(duration: 0.4), value: beat)
                opponentRow(font: .subheadline.weight(.heavy))
                    .opacity(contentIsVisible ? 1 : 0)
                    .animation(
                        reduceMotion ? nil : .easeOut(duration: 0.5).delay(0.35),
                        value: sweepStarted)
            } else {
                opponentRow(font: .system(size: titleSize, weight: .bold))
            }
        }
    }

    @ViewBuilder
    private func opponentRow(font: Font) -> some View {
        if let opponent = game.opponent {
            HStack(spacing: 6) {
                TeamIconView(team: opponent, size: 22)
                Text(verbatim: game.opponentLine(for: opponent))
                    .font(font)
                    .foregroundStyle(isWin ? palette.ink : DesignTokens.Colors.textPrimary)
            }
        }
    }

    private func scoreColumn(alignment: HorizontalAlignment) -> some View {
        VStack(alignment: alignment, spacing: DesignTokens.Spacing.xs) {
            Text(verbatim: game.scoreSummary)
                .font(.system(size: scoreSize, weight: .bold))
                .foregroundStyle(isWin ? palette.ink : resultColor)
                .lineLimit(1)
                .minimumScaleFactor(0.8)
            Text(verbatim: dateText)
                .font(.caption2.bold())
                .foregroundStyle(isWin ? palette.inkMuted : DesignTokens.Colors.textFaint)
        }
        .opacity(isResting ? 1 : 0)
        .animation(reduceMotion ? nil : .easeOut(duration: 0.4), value: beat)
    }

    private var resultColor: Color {
        switch game.result {
        case .win: DesignTokens.Colors.statusWin
        case .loss: DesignTokens.Colors.statusInjured
        case .tie, nil: DesignTokens.Colors.textMuted
        }
    }

    private var dateText: String { postseasonDateLabel(game) }

    private var trophy: some View {
        LombardiTrophy()
            .frame(height: 72)
            .shadow(color: .black.opacity(isWin ? 0.3 : 0), radius: 5, y: 3)
            .opacity(isResting ? 1 : 0)
            .scaleEffect(isResting ? 1 : 0.8)
            .offset(y: isResting ? 0 : 10)
            .animation(
                reduceMotion ? nil : .spring(response: 0.5, dampingFraction: 0.7), value: beat)
    }

    // MARK: Surfaces

    private var cardBackground: some View {
        ZStack {
            DesignTokens.Colors.surfaceCard
            if isWin {
                if mode == .first && beat == 0 {
                    SweepBand(palette: palette, started: sweepStarted, animated: !reduceMotion)
                } else {
                    palette.fill
                }
                LinearGradient(
                    colors: [palette.accent.opacity(0.38), .clear],
                    startPoint: .leading, endPoint: UnitPoint(x: 0.6, y: 0.5)
                )
                .opacity(isResting ? 1 : 0)
                HalftoneDots()
                    .opacity(isResting ? 1 : 0)
            } else {
                terminalColor.opacity(0.09)
            }
            // The decided round's bottom bar, swept in by the ladder before the celebration.
            if !isResting || !isWin {
                Rectangle()
                    .fill(terminalColor)
                    .frame(height: 3)
                    .scaleEffect(x: isShown ? 1 : 0, y: 1, anchor: .leading)
                    .frame(maxHeight: .infinity, alignment: .bottom)
                    .animation(
                        reduceMotion
                            ? nil
                            : .timingCurve(
                                0.4, 0, 0.2, 1, duration: PostseasonLadderTiming.sweepDuration
                            ).delay(barSweepDelay),
                        value: isShown)
            }
        }
        .animation(reduceMotion ? nil : .easeOut(duration: 0.4), value: beat)
        .clipShape(shape)
    }

    private var border: some View {
        shape.strokeBorder(isWin ? palette.accent : terminalColor, lineWidth: 1.5)
    }

    /// One soft diagonal band across the card. Parked past the leading edge until a glint beat.
    @ViewBuilder
    private var glint: some View {
        if isWin {
            GeometryReader { proxy in
                LinearGradient(
                    colors: [.clear, .white.opacity(0.35), .clear],
                    startPoint: .leading, endPoint: .trailing
                )
                .frame(width: 90)
                .rotationEffect(.degrees(20))
                .scaleEffect(y: 3)
                .offset(x: glintBeat > 0 ? proxy.size.width + 60 : -150)
                .frame(maxHeight: .infinity)
                .animation(
                    reduceMotion ? nil : .easeInOut(duration: SuperBowlTiming.glintDuration),
                    value: glintBeat)
            }
            .clipShape(shape)
            .allowsHitTesting(false)
            .accessibilityHidden(true)
        }
    }

    // MARK: Confetti

    /// Drawn above the card and deliberately outside its clip: the overlay frame is far larger
    /// than the card so the burst can rise past its rounded edge.
    @ViewBuilder
    private var confetti: some View {
        if let start = confettiStart {
            ConfettiBurst(
                start: start,
                origin: CGPoint(
                    x: 16 + 72 * LombardiTrophyShape.aspectRatio / 2 - cardWidth / 2, y: 0),
                accent: palette.accent
            )
            .frame(width: 900, height: 1000)
            .allowsHitTesting(false)
            .accessibilityHidden(true)
        }
    }

    private func runConfetti() async {
        guard isWin, mode == .first, beat > 0, !reduceMotion else { return }
        confettiStart = .now
        try? await Task.sleep(for: .seconds(SuperBowlTiming.confettiDuration + 0.2))
        confettiStart = nil
    }
}

enum SuperBowlTiming {
    static let sweepDuration = 1.1
    static let glintDuration = 0.6
    static let confettiDuration = 1.7
}

// MARK: - Sweep band

/// A gradient three times the card's width, slid across it. The front is the team accent, with
/// the primary fill left behind it; ahead of the front the band is clear, so the card stays
/// neutral until the sweep reaches it.
private struct SweepBand: View {
    let palette: SuperBowlPalette
    let started: Bool
    let animated: Bool

    /// Where the accent front sits, as a multiple of the card width, and the soft edge past it.
    private static let frontEnd = 2.15
    private static let travel = 2.3
    private static let total = 3.3

    var body: some View {
        GeometryReader { proxy in
            let width = proxy.size.width
            LinearGradient(
                stops: [
                    .init(color: palette.fill, location: 0),
                    .init(color: palette.fill, location: 1 / Self.total),
                    .init(
                        color: palette.fill.mix(with: palette.accent, by: 0.5),
                        location: 1.5 / Self.total),
                    .init(color: palette.accent, location: 2 / Self.total),
                    .init(color: palette.accent, location: Self.frontEnd / Self.total),
                    .init(color: palette.accent.opacity(0), location: Self.travel / Self.total),
                    .init(color: palette.accent.opacity(0), location: 1),
                ],
                startPoint: .leading, endPoint: .trailing
            )
            .frame(width: width * Self.total)
            .offset(x: started ? 0 : -width * Self.travel)
            .animation(
                animated
                    ? .timingCurve(0.4, 0, 0.2, 1, duration: SuperBowlTiming.sweepDuration) : nil,
                value: started)
        }
    }
}

// MARK: - Halftone

/// A faint dot texture, drawn once as a single path.
private struct HalftoneDots: View {
    var body: some View {
        Canvas { context, size in
            var path = Path()
            var y: CGFloat = 2
            while y < size.height {
                var x: CGFloat = 2
                while x < size.width {
                    path.addEllipse(in: CGRect(x: x - 1, y: y - 1, width: 2, height: 2))
                    x += 4
                }
                y += 4
            }
            context.fill(path, with: .color(.black.opacity(0.28)))
        }
        .allowsHitTesting(false)
        .accessibilityHidden(true)
    }
}

// MARK: - Confetti

struct ConfettiFleck: Equatable {
    let velocity: CGVector
    let spin: Double
    let phase: Double
    let colorIndex: Int

    static let count = 48
    static let gravity: Double = 700
    static let drag: Double = 1.4

    static func burst() -> [ConfettiFleck] {
        (0..<count).map { index in
            let angle = Double.random(in: (-90 - 62)...(-90 + 62)) * .pi / 180
            let speed = Double.random(in: 380...860)
            return ConfettiFleck(
                velocity: CGVector(dx: cos(angle) * speed, dy: sin(angle) * speed),
                spin: Double.random(in: -9...9),
                phase: Double.random(in: 0...(2 * .pi)),
                colorIndex: index % 5)
        }
    }

    /// Offset from the burst origin after `time` seconds, with air drag on the velocity and
    /// gravity pulling down.
    func offset(at time: Double) -> CGPoint {
        let decay = 1 - exp(-Self.drag * time)
        let terminal = Self.gravity / Self.drag
        return CGPoint(
            x: velocity.dx / Self.drag * decay,
            y: terminal * time + (velocity.dy - terminal) / Self.drag * decay)
    }

    static func opacity(at time: Double) -> Double {
        let fadeStart = 0.5
        guard time > fadeStart else { return 1 }
        return max(0, 1 - (time - fadeStart) / (SuperBowlTiming.confettiDuration - fadeStart))
    }
}

private struct ConfettiBurst: View {
    let start: Date
    /// Burst origin relative to the canvas center.
    let origin: CGPoint
    let accent: Color

    @State private var flecks = ConfettiFleck.burst()

    var body: some View {
        TimelineView(.animation) { timeline in
            Canvas { context, size in
                let time = timeline.date.timeIntervalSince(start)
                guard time >= 0, time < SuperBowlTiming.confettiDuration else { return }
                let palette: [Color] = [
                    accent, DesignTokens.Colors.trophySilverLight,
                    DesignTokens.Colors.trophySilverShade, .white,
                    Color(hex: "#FFD23F"),
                ]
                let alpha = ConfettiFleck.opacity(at: time)
                for fleck in flecks {
                    let offset = fleck.offset(at: time)
                    var layer = context
                    layer.translateBy(
                        x: size.width / 2 + origin.x + offset.x,
                        y: size.height / 2 + origin.y + offset.y)
                    layer.rotate(by: .radians(fleck.phase + fleck.spin * time))
                    // Tumbling about a horizontal axis: the flat face narrows and widens.
                    layer.scaleBy(
                        x: 1, y: abs(cos(fleck.phase * 2 + fleck.spin * time * 1.3)) * 0.8 + 0.2)
                    layer.opacity = alpha
                    layer.fill(
                        Path(
                            roundedRect: CGRect(x: -4.5, y: -2.5, width: 9, height: 5),
                            cornerRadius: 1.5),
                        with: .color(palette[fleck.colorIndex]))
                }
            }
        }
    }
}
