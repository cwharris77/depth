import Foundation

// Mirrors web/lib/types.ts's Position — every case must round-trip through the shared
// JSON fixtures under web/fixtures/domain/. Adding a case here without a `family` is a
// compile error; case order is the display order every derived position list keeps.
enum Position: String, Codable, Hashable, CaseIterable {
    case qb = "QB"
    case rb = "RB"
    case fb = "FB"
    case wr = "WR"
    case te = "TE"
    case lt = "LT"
    case lg = "LG"
    case c = "C"
    case rg = "RG"
    case rt = "RT"
    case ot = "OT"
    case g = "G"
    case de = "DE"
    case lde = "LDE"
    case rde = "RDE"
    case dt = "DT"
    case nt = "NT"
    case lb = "LB"
    case wlb = "WLB"
    case lilb = "LILB"
    case rilb = "RILB"
    case slb = "SLB"
    case cb = "CB"
    case lcb = "LCB"
    case rcb = "RCB"
    case nb = "NB"
    case s = "S"
    case ss = "SS"
    case fs = "FS"
    case db = "DB"
    case k = "K"
    case p = "P"
    case ls = "LS"
    case kr = "KR"
    case pr = "PR"
}

extension Position {
    var fullName: String {
        switch self {
        case .qb: "Quarterback"
        case .rb: "Running Back"
        case .fb: "Fullback"
        case .wr: "Wide Receiver"
        case .te: "Tight End"
        case .lt: "Left Tackle"
        case .lg: "Left Guard"
        case .c: "Center"
        case .rg: "Right Guard"
        case .rt: "Right Tackle"
        case .ot: "Offensive Tackle"
        case .g: "Guard"
        case .de: "Defensive End"
        case .lde: "Left Defensive End"
        case .rde: "Right Defensive End"
        case .dt: "Defensive Tackle"
        case .nt: "Nose Tackle"
        case .lb: "Linebacker"
        case .wlb: "Weakside Linebacker"
        case .lilb: "Left Inside Linebacker"
        case .rilb: "Right Inside Linebacker"
        case .slb: "Strongside Linebacker"
        case .cb: "Cornerback"
        case .lcb: "Left Cornerback"
        case .rcb: "Right Cornerback"
        case .nb: "Nickel Back"
        case .s: "Safety"
        case .ss: "Strong Safety"
        case .fs: "Free Safety"
        case .db: "Defensive Back"
        case .k: "Kicker"
        case .p: "Punter"
        case .ls: "Long Snapper"
        case .kr: "Kick Returner"
        case .pr: "Punt Returner"
        }
    }
}

/// The football family a position belongs to: the one grouping that formation seating,
/// search aliases, stat layouts, and Compare rooms all derive from. Sided and generic tags
/// share a family (`OT` and `LT` are both `offensiveLine`); the generic `DB` gets its own
/// family because it belongs to neither corners nor safeties.
enum PositionFamily: CaseIterable {
    case quarterback
    case backfield
    case receiver
    case offensiveLine
    case edge
    case interiorLine
    case linebacker
    case corner
    case safety
    case defensiveBack
    case kicker
    case punter
    case longSnapper
    case returner

    var unit: Unit {
        switch self {
        case .quarterback, .backfield, .receiver, .offensiveLine: .offense
        case .edge, .interiorLine, .linebacker, .corner, .safety, .defensiveBack: .defense
        case .kicker, .punter, .longSnapper, .returner: .special
        }
    }

    /// Every position in these families, in `Position` declaration order.
    static func positions(in families: Set<PositionFamily>) -> [Position] {
        Position.allCases.filter { families.contains($0.family) }
    }
}

extension Position {
    var family: PositionFamily {
        switch self {
        case .qb: .quarterback
        case .rb, .fb: .backfield
        case .wr, .te: .receiver
        case .lt, .lg, .c, .rg, .rt, .ot, .g: .offensiveLine
        case .de, .lde, .rde: .edge
        case .dt, .nt: .interiorLine
        case .lb, .wlb, .lilb, .rilb, .slb: .linebacker
        case .cb, .lcb, .rcb, .nb: .corner
        case .s, .ss, .fs: .safety
        case .db: .defensiveBack
        case .k: .kicker
        case .p: .punter
        case .ls: .longSnapper
        case .kr, .pr: .returner
        }
    }

    var unit: Unit { family.unit }
}

// Mirrors web/lib/types.ts's PositionGroup.
enum PositionGroup: String, Codable, Hashable {
    case ol = "OL"
    case dl = "DL"
    case lb = "LB"
    case cb = "CB"
    case s = "S"
    case rb = "RB"
}

// Mirrors web/lib/types.ts's PlayerStatus.
enum PlayerStatus: String, Codable {
    case starter
    case backup
    case rookie
    case injured
}

// Mirrors web/lib/types.ts's Unit.
enum Unit: String, Codable {
    case offense
    case defense
    case special
}
