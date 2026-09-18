import Foundation
import OSLog

// DTO → domain mapping for the team-snapshot query. Every conversion is explicit and
// never silently coerces bad data — the existing web `dbRosterSource` conflating "not
// found" with "unavailable" is exactly the failure mode the design spec calls out to not
// reproduce here.
//
// "Explicit" is not the same as "fatal", and this file used to conflate those too. A row
// the build cannot represent degrades that one seat or athlete and is counted; only a
// payload that yields nothing at all is an error. The strict version made every new value
// in `depth_chart_entries` or `players` a client-compatibility event on the app's launch
// screen — one unrecognized position, rank or status took the whole team down. That is the
// same mechanism that forced DEP-486's generic OT/G rollback, and it is why storing ESPN's
// real status designations (`specs/2026-09-17-historical-data-and-source-boundaries-design.md`,
// step 8) would otherwise break every installed build the moment the ingest changed.
//
// What is deliberately *not* tolerated: `mapUniform`'s unknown kind still throws. A kit is
// shown with a label, so skipping one could surface a wrongly-labeled uniform, and the
// snapshot's uniforms only feed team colors — a different trade from a roster row.
enum TeamSnapshotMapper {
    /// Why a row could not become a seat or an athlete. Carries the identifying key so a
    /// drop is actionable rather than a bare count, matching HistoricalRosterMapper.
    struct DroppedRow: Equatable {
        let id: String
        let reason: Reason

        enum Reason: Equatable {
            case unknownSeatPosition(String)
            case invalidSeatDepthRank(Int)
            case unknownPlayerPosition(String)
            case invalidPlayerDepthRank(Int)
        }
    }

    private static let logger = Logger(
        subsystem: Bundle.main.bundleIdentifier ?? "com.cwharris.depth",
        category: "team-snapshot"
    )

    static func map(_ dto: TeamDTO) throws -> TeamSnapshot {
        let result = try mapWithDiagnostics(dto)
        for drop in result.dropped {
            logger.error("team snapshot drop \(drop.id, privacy: .public): \(String(describing: drop.reason), privacy: .public)")
        }
        return result.snapshot
    }

    /// The same mapping, with the dropped rows returned instead of only logged, so the
    /// degrade path is assertable in tests.
    static func mapWithDiagnostics(_ dto: TeamDTO) throws -> (snapshot: TeamSnapshot, dropped: [DroppedRow]) {
        let uniforms = try dto.uniforms.map(mapUniform)
        let team = Team(
            id: dto.id, city: dto.city, name: dto.name, abbrev: dto.abbrev,
            conference: dto.conference, division: dto.division,
            colors: currentHomeColors(uniforms),
            logo: dto.logoUrl, logoDark: dto.logoDarkUrl
        )

        // Identity and seat are separate (DEP-585). `players` keeps exactly one row per
        // athlete, built from the `players` join; `depthChart` records every slot the
        // chart publishes. One athlete can hold two — ESPN cross-lists a swing tackle at
        // LT2 and RT1 — so seating off `players.position` used to leave the second slot
        // empty and the formation a man short.
        //
        // Special-teams-only players are appended afterwards with a nominal depthRank 3,
        // as before: a returner ranked outside the top 3 at his own position still has to
        // exist for the special-teams slot to resolve.
        var players: [Player] = []
        var depthChart: [DepthSeat] = []
        var seenPlayerIds = Set<String>()
        var dropped: [DroppedRow] = []
        for entry in dto.depthChartEntries {
            let seatId = "\(entry.teamId)/\(entry.position)"
            guard let seatPosition = Position(rawValue: entry.position) else {
                dropped.append(DroppedRow(id: seatId, reason: .unknownSeatPosition(entry.position)))
                continue
            }
            // No upper bound on purpose: the 1...3 cap is a property of today's ingest and
            // its CHECK constraint, not of the domain, and removing it must not require a
            // gated client release. A rank below 1 is still malformed.
            guard entry.depthRank >= 1 else {
                dropped.append(DroppedRow(id: seatId, reason: .invalidSeatDepthRank(entry.depthRank)))
                continue
            }
            depthChart.append(
                DepthSeat(
                    position: seatPosition, depthRank: entry.depthRank, playerId: entry.playerId
                )
            )
            guard !seenPlayerIds.contains(entry.playerId) else { continue }
            // A seat whose athlete cannot be decoded stays in the chart: `playersInSeats`
            // already skips a seat whose player is absent, so the rest of the unit renders.
            guard let player = mapPlayer(entry.player, depthRank: entry.depthRank, dropped: &dropped)
            else { continue }
            players.append(player)
            seenPlayerIds.insert(player.id)
        }
        for slot in dto.specialTeamsSlots {
            guard let playerDTO = slot.player, !seenPlayerIds.contains(playerDTO.id) else { continue }
            guard let player = mapPlayer(playerDTO, depthRank: 3, dropped: &dropped) else { continue }
            players.append(player)
            seenPlayerIds.insert(player.id)
        }

        // An empty chart is a legitimate payload (a team with no published depth chart yet);
        // a chart that had rows and decoded to none is a real failure, because a blank field
        // reads as a broken screen rather than a state the user can act on.
        guard !(players.isEmpty && !dto.depthChartEntries.isEmpty) else {
            throw DepthError.decoding(
                "team snapshot \(dto.id): no decodable roster rows (\(dropped.count) dropped)"
            )
        }

        let specialTeams = dto.specialTeamsSlots.map { slot in
            SpecialSlot(id: slot.id, playerId: slot.playerId, x: slot.x, y: slot.y, label: slot.label)
        }

        let snapshot = TeamSnapshot(
            team: team, players: players, specialTeams: specialTeams,
            uniforms: uniforms, formations: mapFormations(dto.teamFormations),
            depthChart: depthChart
        )
        return (snapshot, dropped)
    }

    static func mapTeamListRow(_ dto: TeamListRowDTO) -> Team {
        Team(
            id: dto.id, city: dto.city, name: dto.name, abbrev: dto.abbrev,
            conference: dto.conference, division: dto.division,
            colors: currentHomeColors(dto.uniforms),
            logo: dto.logoUrl, logoDark: dto.logoDarkUrl
        )
    }

    private static let neutralTeamColors = TeamColors(
        primary: "#333333", secondary: "#666666", accent: "#666666"
    )

    private static func currentHomeColors(_ uniforms: [Uniform]) -> TeamColors {
        uniforms.first(where: { $0.kind == .home && $0.isCurrent })?.colors ?? neutralTeamColors
    }

    private static func currentHomeColors(_ uniforms: [TeamColorUniformDTO]) -> TeamColors {
        guard let home = uniforms.first(where: { $0.kind == "home" && $0.isCurrent }) else {
            return neutralTeamColors
        }
        return TeamColors(
            primary: home.colorPrimary, secondary: home.colorSecondary, accent: home.colorAccent
        )
    }

    /// A search hit skips (rather than throws) when its embedded team is null — a
    /// dangling player.team_id can't happen FK-enforced, but web's toPlayerHit skips
    /// rather than surfacing a hit with no team to jump to; an unknown position decodes
    /// to nil the same way. Missing jersey number defaults to 0 (web's `?? 0`).
    static func mapPlayerHit(_ dto: PlayerSearchRowDTO) -> PlayerHit? {
        guard let team = dto.teams.map(mapTeamListRow),
              let position = Position(rawValue: dto.position) else {
            return nil
        }
        return PlayerHit(
            id: dto.id,
            name: dto.name,
            number: dto.number ?? 0,
            position: position,
            college: dto.college,
            photoUrl: dto.photoUrl,
            team: team
        )
    }

    static func mapAppConfig(_ dto: AppConfigDTO) -> AppConfig {
        AppConfig(minimumSupportedBuild: dto.minimumSupportedBuild, maintenanceMessage: dto.maintenanceMessage)
    }

    /// `nil` when the athlete cannot be represented at all — an unknown position (nothing
    /// can seat or group him) or a rank below 1. Everything else degrades in place:
    ///
    /// - A missing jersey number becomes 0, matching `mapPlayerHit` and the historical
    ///   mapper. Dropping a rostered athlete because ESPN omitted his number would lose
    ///   more than it protects.
    /// - An unrecognized status falls back to the rank-derived one, the same derivation
    ///   history already uses. This is what lets the ingest start storing ESPN's real
    ///   `Questionable`/`Doubtful`/`Out`/`IR` designations without a gated client release:
    ///   an older build shows the athlete at his correct rank instead of failing the team.
    static func mapPlayer(_ dto: PlayerDTO, depthRank: Int, dropped: inout [DroppedRow]) -> Player? {
        guard let position = Position(rawValue: dto.position) else {
            dropped.append(DroppedRow(id: dto.id, reason: .unknownPlayerPosition(dto.position)))
            return nil
        }
        guard depthRank >= 1 else {
            dropped.append(DroppedRow(id: dto.id, reason: .invalidPlayerDepthRank(depthRank)))
            return nil
        }
        let number = dto.number ?? 0
        let status = PlayerStatus(rawValue: dto.status ?? "backup")
            ?? (depthRank == 1 ? .starter : .backup)
        return Player(
            id: dto.id, name: dto.name, position: position, depthRank: depthRank, number: number,
            status: status, age: dto.age ?? 0, college: dto.college ?? "",
            experience: dto.experience ?? 0, height: dto.height ?? "", weight: dto.weight ?? 0,
            bio: dto.bio ?? "", photoUrl: dto.photoUrl
        )
    }

    static func mapPlayerSeasonStats(_ dto: PlayerSeasonStatsDTO) -> PlayerSeasonStats {
        PlayerSeasonStats(
            season: dto.season, seasonType: .regular, teamAbbrev: dto.teams?.abbrev,
            games: dto.games, completions: dto.completions, attempts: dto.attempts,
            passingYards: dto.passingYards, passingTds: dto.passingTds,
            passingInterceptions: dto.passingInterceptions, carries: dto.carries,
            rushingYards: dto.rushingYards, rushingTds: dto.rushingTds,
            receptions: dto.receptions, targets: dto.targets, receivingYards: dto.receivingYards,
            receivingTds: dto.receivingTds, defTacklesSolo: dto.defTacklesSolo,
            defSacks: dto.defSacks, defInterceptions: dto.defInterceptions, fgMade: dto.fgMade,
            fgAtt: dto.fgAtt, defTackleAssists: dto.defTackleAssists,
            defTacklesForLoss: dto.defTacklesForLoss, defQbHits: dto.defQbHits,
            defPassDefended: dto.defPassDefended, defFumblesForced: dto.defFumblesForced,
            defTds: dto.defTds, defSafeties: dto.defSafeties,
            fumbleRecoveries: dto.fumbleRecoveries, fumbleRecoveryTds: dto.fumbleRecoveryTds,
            puntReturns: dto.puntReturns, puntReturnYards: dto.puntReturnYards,
            kickoffReturns: dto.kickoffReturns, kickoffReturnYards: dto.kickoffReturnYards,
            specialTeamsTds: dto.specialTeamsTds, penalties: dto.penalties,
            penaltyYards: dto.penaltyYards, patMade: dto.patMade, patAtt: dto.patAtt,
            fgLong: dto.fgLong, offenseSnaps: dto.offenseSnaps, offensePct: dto.offensePct,
            defenseSnaps: dto.defenseSnaps, defensePct: dto.defensePct,
            specialTeamsSnaps: dto.specialTeamsSnaps, specialTeamsPct: dto.specialTeamsPct
        )
    }

    static func mapUniform(_ dto: UniformDTO) throws -> Uniform {
        guard let kind = UniformKind(rawValue: dto.kind) else {
            throw DepthError.decoding("uniform \(dto.id): unknown kind \"\(dto.kind)\"")
        }
        return Uniform(
            id: dto.id, teamId: dto.teamId, kind: kind, name: dto.name,
            yearStart: dto.yearStart, yearEnd: dto.yearEnd, isCurrent: dto.isCurrent,
            colors: TeamColors(
                primary: dto.colorPrimary, secondary: dto.colorSecondary, accent: dto.colorAccent
            ),
            imagePath: dto.imagePath
        )
    }

    /// The archive's flat kit listing (mirrors web's listUniforms): a uniform row joined
    /// with its team's conference/division. A dangling team reference (invariant 6 —
    /// never possible FK-enforced, but the remote read is untrusted) is skipped, not
    /// thrown, exactly like web's `flatMap` skip. An unknown kind throws so one bad row
    /// can't surface a wrongly-labeled kit.
    static func mapUniformListing(_ dto: UniformListingRowDTO, team: Team) throws -> UniformListing {
        guard let kind = UniformKind(rawValue: dto.kind) else {
            throw DepthError.decoding("uniform listing \(dto.id): unknown kind \"\(dto.kind)\"")
        }
        return UniformListing(
            id: dto.id, teamId: team.id, teamName: "\(team.city) \(team.name)",
            teamAbbrev: team.abbrev, teamShortName: team.name,
            conference: team.conference, division: team.division, kind: kind, name: dto.name,
            yearStart: dto.yearStart, yearEnd: dto.yearEnd, isCurrent: dto.isCurrent,
            colors: TeamColors(
                primary: dto.colorPrimary, secondary: dto.colorSecondary, accent: dto.colorAccent
            ),
            imagePath: dto.imagePath
        )
    }

    /// Maps real per-team formations, keeping only the latest ingested season — mirrors
    /// web's `getTeamFormations` (the ingest writes per-season rows and the field renders
    /// the most recent one). An unknown unit string (only offense/defense exist in the
    /// data) is skipped rather than throwing, so one bad row never takes down the whole
    /// snapshot (web/CLAUDE.md invariant 6). Empty input yields an empty array, which the
    /// field treats as "no real formation data → generic layout".
    static func mapFormations(_ dtos: [TeamFormationDTO]) -> [TeamFormation] {
        guard let latest = dtos.map(\.season).max() else { return [] }
        return dtos
            .filter { $0.season == latest }
            .compactMap { dto in
                guard let unit = Unit(rawValue: dto.unit) else { return nil }
                return TeamFormation(
                    season: dto.season, rank: dto.rank, unit: unit,
                    alignment: dto.alignment, personnel: dto.personnel, pct: dto.pct
                )
            }
    }
}
