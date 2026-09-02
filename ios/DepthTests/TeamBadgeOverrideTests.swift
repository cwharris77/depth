import Foundation
import Testing
@testable import Depth

// DEP-237 coverage: TeamBadgeOverride resolves the default primary-fill/secondary-ring
// badge for every team, and the three hand-curated overrides (Panthers keep their blue
// DEP-424 retired the Panthers row (it pinned an invented hex); Buccaneers swap the
// blend-in red primary for the pewter secondary
// with an orange ring; Broncos swap the blend-in orange primary for the navy secondary
// with an orange ring). Colors are sourced from the team's own palette, never hardcoded.

private func team(id: String, primary: String, secondary: String, accent: String) -> Team {
    Team(
        id: id, city: "City", name: "Name", abbrev: id.uppercased(), conference: "AFC", division: "East",
        colors: TeamColors(primary: primary, secondary: secondary, accent: accent),
        logo: nil, logoDark: nil
    )
}

private let bills = team(id: "bills", primary: "#00338d", secondary: "#d50a0a", accent: "#d50a0a")
private let panthers = team(id: "panthers", primary: "#0085CA", secondary: "#101820", accent: "#101820")
private let buccaneers = team(id: "buccaneers", primary: "#D50A0A", secondary: "#34302B", accent: "#FF7900")
private let broncos = team(id: "broncos", primary: "#FB4F14", secondary: "#002244", accent: "#002244")

@Test func defaultBadgeUsesPrimaryFillAndSecondaryRing() {
    #expect(TeamBadgeOverride.backgroundColorHex(for: bills) == "#00338d")
    #expect(TeamBadgeOverride.ringColorHex(for: bills) == "#d50a0a")
}

@Test func unknownTeamFallsBackToDefaultColors() {
    let mystery = team(id: "mystery", primary: "#123456", secondary: "#654321", accent: "#654321")
    #expect(TeamBadgeOverride.backgroundColorHex(for: mystery) == "#123456")
    #expect(TeamBadgeOverride.ringColorHex(for: mystery) == "#654321")
}

// DEP-424: the Panthers row pinned the background to `uiAccent` (#36A7E0), a brightened
// blue the team does not own. With the invented accents retired they fall back to the
// default — their real primary #0085CA, which is already blue and reads under the logo.
@Test func panthersNoLongerOverrideAndFallBackToRealPrimary() {
    #expect(TeamBadgeOverride.backgroundColorHex(for: panthers) == "#0085CA")
    #expect(TeamBadgeOverride.ringColorHex(for: panthers) == "#101820", "ring stays the default secondary")
}

@Test func buccaneersOverrideSwapsRedPrimaryForPewterWithOrangeRing() {
    #expect(TeamBadgeOverride.backgroundColorHex(for: buccaneers) == "#34302B")
    #expect(TeamBadgeOverride.ringColorHex(for: buccaneers) == "#FF7900")
}

@Test func broncosOverrideSwapsOrangePrimaryForNavyWithOrangeRing() {
    #expect(TeamBadgeOverride.backgroundColorHex(for: broncos) == "#002244")
    #expect(TeamBadgeOverride.ringColorHex(for: broncos) == "#FB4F14", "ring is the primary, not the default secondary")
}
