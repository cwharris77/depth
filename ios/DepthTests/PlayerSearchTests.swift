import Testing
@testable import Depth

// Native parity tests for the cross-team player search helpers — ports of
// lib/__tests__/search.test.ts, so the native search behaves identically to web's:
// same normalized query, same LIKE escaping, same prefix-first ranking, same
// colloquial position groups.

private func teamDTO(
    id: String = "bills", abbrev: String = "BUF", city: String = "Buffalo", name: String = "Bills"
) -> TeamListRowDTO {
    TeamListRowDTO(
        id: id, abbrev: abbrev, city: city, name: name,
        conference: "AFC", division: "East",
        logoUrl: nil, logoDarkUrl: nil,
        uniforms: [
            TeamColorUniformDTO(
                kind: "home", isCurrent: true,
                colorPrimary: "#00338d", colorSecondary: "#d50a0a", colorAccent: "#d50a0a",
                uiAccent: "#d50a0a", onAccent: "#ffffff"
            ),
        ]
    )
}

private func hitDTO(
    id: String = "p1", name: String = "Player", number: Int? = 12,
    position: String = "QB", teams: TeamListRowDTO? = teamDTO()
) -> PlayerSearchRowDTO {
    PlayerSearchRowDTO(
        id: id, name: name, number: number, position: position,
        college: nil, photoUrl: nil, teams: teams
    )
}

private func hit(
    id: String = "p1", name: String = "Player", number: Int = 12, position: Position = .qb
) -> PlayerHit {
    PlayerHit(
        id: id, name: name, number: number, position: position,
        college: nil, photoUrl: nil,
        team: Team(
            id: "bills", city: "Buffalo", name: "Bills", abbrev: "BUF",
            conference: "AFC", division: "East",
            colors: TeamColors(
                primary: "#00338d", secondary: "#d50a0a", accent: "#d50a0a",
                uiAccent: "#d50a0a", onAccent: "#ffffff"
            ),
            logo: nil, logoDark: nil
        )
    )
}

@Suite struct PlayerSearchTests {
    @Test func normalizeTrimsAndCollapsesInternalWhitespace() {
        #expect(PlayerSearch.normalizePlayerSearchQuery("  geno  smith  ") == "geno smith")
        #expect(PlayerSearch.normalizePlayerSearchQuery("geno\tsmith") == "geno smith")
    }

    @Test func normalizeReturnsNilForEmptyOrWhitespaceOnly() {
        #expect(PlayerSearch.normalizePlayerSearchQuery("") == nil)
        #expect(PlayerSearch.normalizePlayerSearchQuery("   ") == nil)
        #expect(PlayerSearch.normalizePlayerSearchQuery("\t\n ") == nil)
    }

    @Test func normalizeRejectsInputPastTheLengthCapAfterNormalization() {
        let max = PlayerSearch.maxQueryLength
        #expect(PlayerSearch.normalizePlayerSearchQuery(String(repeating: "x", count: max + 1)) == nil)
        #expect(PlayerSearch.normalizePlayerSearchQuery(String(repeating: "x", count: max)) == String(repeating: "x", count: max))
    }

    @Test func escapeLikeEscapesWildcardsSoInputMatchesLiterally() {
        #expect(PlayerSearch.escapeLike("100%") == "100\\%")
        #expect(PlayerSearch.escapeLike("a_b") == "a\\_b")
        #expect(PlayerSearch.escapeLike("a\\b") == "a\\\\b")
        #expect(PlayerSearch.escapeLike("100%_a\\b") == "100\\%\\_a\\\\b")
    }

    @Test func escapeLikeLeavesOrdinaryQueriesUntouched() {
        #expect(PlayerSearch.escapeLike("geno smith") == "geno smith")
        #expect(PlayerSearch.escapeLike("QB") == "QB")
    }

    @Test func positionGroupResolvesOffensiveAndDefensiveLine() {
        #expect(PlayerSearch.positionGroupPositions("OL") == [.lt, .lg, .c, .rg, .rt])
        #expect(PlayerSearch.positionGroupPositions("dl") == [.de, .lde, .rde, .dt, .nt])
    }

    @Test func positionGroupResolvesSecondaryAndAcceptsSpacingAndHyphens() {
        #expect(PlayerSearch.positionGroupPositions("secondary") == [.cb, .lcb, .rcb, .nb, .s, .ss, .fs])
        #expect(PlayerSearch.positionGroupPositions("D-Line") == [.de, .lde, .rde, .dt, .nt])
        #expect(PlayerSearch.positionGroupPositions("  o line  ") == [.lt, .lg, .c, .rg, .rt])
    }

    @Test func positionGroupReturnsNilForANonGroupQuery() {
        #expect(PlayerSearch.positionGroupPositions("geno") == nil)
        #expect(PlayerSearch.positionGroupPositions("QB") == nil)
    }

    @Test func rankByPrefixFirstThenAlphabetical() {
        let hits = [
            hit(id: "1", name: "Jaxon Smith-Njigba"),
            hit(id: "2", name: "Smith Jones"),
            hit(id: "3", name: "Adam Smith"),
        ]
        let ranked = PlayerSearch.rankByNameMatch(hits, query: "smith").map(\.name)
        #expect(ranked == ["Smith Jones", "Adam Smith", "Jaxon Smith-Njigba"])
    }

    @Test func mapPlayerHitBuildsAFullHitFromARow() {
        let mapped = TeamSnapshotMapper.mapPlayerHit(hitDTO(name: "Josh Allen", number: 17))
        #expect(mapped?.name == "Josh Allen")
        #expect(mapped?.number == 17)
        #expect(mapped?.position == .qb)
        #expect(mapped?.team.id == "bills")
        #expect(mapped?.team.abbrev == "BUF")
    }

    @Test func mapPlayerHitDefaultsMissingNumberToZero() {
        let mapped = TeamSnapshotMapper.mapPlayerHit(hitDTO(number: nil))
        #expect(mapped?.number == 0)
    }

    @Test func mapPlayerHitSkipsDanglingTeamAndUnknownPosition() {
        #expect(TeamSnapshotMapper.mapPlayerHit(hitDTO(teams: nil)) == nil)
        #expect(TeamSnapshotMapper.mapPlayerHit(hitDTO(position: "XYZ")) == nil)
    }
}
