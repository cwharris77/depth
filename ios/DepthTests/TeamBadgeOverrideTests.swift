import Foundation
import Testing
@testable import Depth

// DEP-237 coverage: TeamBadgeOverride resolves the default primary-fill/secondary-ring
// badge for every team, and the two hand-curated overrides (Panthers keep their blue
// uiAccent background; Buccaneers swap the blend-in red primary for the pewter secondary
// with an orange ring). Colors are sourced from the team's own palette, never hardcoded.

private func team(id: String, primary: String, secondary: String, accent: String, uiAccent: String, onAccent: String = "#0a0e1a") -> Team {
    Team(
        id: id, city: "City", name: "Name", abbrev: id.uppercased(), conference: "AFC", division: "East",
        colors: TeamColors(primary: primary, secondary: secondary, accent: accent, uiAccent: uiAccent, onAccent: onAccent),
        logo: nil, logoDark: nil
    )
}

private let bills = team(id: "bills", primary: "#00338d", secondary: "#d50a0a", accent: "#d50a0a", uiAccent: "#d50a0a")
private let panthers = team(id: "panthers", primary: "#0085CA", secondary: "#101820", accent: "#101820", uiAccent: "#36A7E0")
private let buccaneers = team(id: "buccaneers", primary: "#D50A0A", secondary: "#34302B", accent: "#FF7900", uiAccent: "#FF4D4D")

@Test func defaultBadgeUsesPrimaryFillAndSecondaryRing() {
    #expect(TeamBadgeOverride.backgroundColorHex(for: bills) == "#00338d")
    #expect(TeamBadgeOverride.ringColorHex(for: bills) == "#d50a0a")
}

@Test func unknownTeamFallsBackToDefaultColors() {
    let mystery = team(id: "mystery", primary: "#123456", secondary: "#654321", accent: "#654321", uiAccent: "#654321")
    #expect(TeamBadgeOverride.backgroundColorHex(for: mystery) == "#123456")
    #expect(TeamBadgeOverride.ringColorHex(for: mystery) == "#654321")
}

@Test func panthersOverrideKeepsBlueUiAccentBackground() {
    #expect(TeamBadgeOverride.backgroundColorHex(for: panthers) == "#36A7E0")
    #expect(TeamBadgeOverride.ringColorHex(for: panthers) == "#101820", "ring stays the default secondary")
}

@Test func buccaneersOverrideSwapsRedPrimaryForPewterWithOrangeRing() {
    #expect(TeamBadgeOverride.backgroundColorHex(for: buccaneers) == "#34302B")
    #expect(TeamBadgeOverride.ringColorHex(for: buccaneers) == "#FF7900")
}
