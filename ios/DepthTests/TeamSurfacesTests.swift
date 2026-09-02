import Testing
@testable import Depth

// Parity against fixtures/domain/team-surfaces.json, generated from the TS oracle
// (lib/utils/team-surfaces.ts) over all 105 curated kits. Swift must return identical
// strings for every kit and every surface — this is what keeps the two implementations from
// drifting once views on both sides ask for surfaces instead of reading a stored hex.
//
// Regenerate with `npx tsx fixtures/generate.mts` after changing either side's rule.

private struct FixtureJerseyColors: Decodable {
    let primary: String
    let secondary: String
    let accent: String

    var domain: JerseyColors {
        JerseyColors(primary: primary, secondary: secondary, accent: accent)
    }
}

private struct FixtureExpected: Decodable {
    let fill: String
    let ring: String
    let mark: String
    let textOnFill: String
    let numeralFill: String
    let numeralStroke: String
}

private struct TeamSurfaceCase: Decodable {
    let id: String
    let colors: FixtureJerseyColors
    let expected: FixtureExpected
}

@Test func teamSurfacesParity() throws {
    let cases = try loadFixture("team-surfaces", as: [TeamSurfaceCase].self)
    // Guards against a truncated or stale fixture silently passing with a handful of rows.
    #expect(cases.count == 105, "expected every curated kit in the fixture")

    for c in cases {
        let colors = c.colors.domain
        #expect(TeamSurfaces.fill(colors) == c.expected.fill, "\(c.id) — fill")
        #expect(TeamSurfaces.ring(colors) == c.expected.ring, "\(c.id) — ring")
        #expect(TeamSurfaces.mark(colors) == c.expected.mark, "\(c.id) — mark")
        #expect(TeamSurfaces.textOnFill(colors) == c.expected.textOnFill, "\(c.id) — textOnFill")

        let numeral = TeamSurfaces.numeral(colors)
        #expect(numeral.fill == c.expected.numeralFill, "\(c.id) — numeral fill")
        #expect(numeral.stroke == c.expected.numeralStroke, "\(c.id) — numeral stroke")
    }
}

// The two properties the TS suite asserts structurally, restated here so a Swift-only
// regression (a typo'd threshold, a flipped comparison) fails on this side too rather than
// only when someone regenerates the fixture.
@Test func numeralFillAndStrokeAlwaysDiffer() throws {
    let cases = try loadFixture("team-surfaces", as: [TeamSurfaceCase].self)
    for c in cases {
        let numeral = TeamSurfaces.numeral(c.colors.domain)
        #expect(numeral.fill.lowercased() != numeral.stroke.lowercased(), "\(c.id) — collapsed numeral")
    }
}

@Test func everySurfaceIsARealTeamColorOrWhiteOrGround() throws {
    let cases = try loadFixture("team-surfaces", as: [TeamSurfaceCase].self)
    for c in cases {
        let colors = c.colors.domain
        let allowed = Set(
            [colors.primary, colors.secondary, colors.accent, "#FFFFFF", darkBackgroundHex]
                .map { $0.lowercased() }
        )
        let numeral = TeamSurfaces.numeral(colors)
        let produced = [
            TeamSurfaces.fill(colors),
            TeamSurfaces.ring(colors),
            TeamSurfaces.mark(colors),
            TeamSurfaces.textOnFill(colors),
            numeral.fill,
            numeral.stroke,
        ]
        for value in produced {
            #expect(allowed.contains(value.lowercased()), "\(c.id) — \(value) is not one of this kit's colors")
        }
    }
}
