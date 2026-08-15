import Foundation

// Mirrors lib/types.ts's Position — every case must round-trip through the shared
// JSON fixtures under fixtures/domain/. Adding a case here without a POSITION_GROUP
// entry in Formations.swift is a compile error, matching the TS Record's enforcement.
enum Position: String, Codable, Hashable {
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
        case .k: "Kicker"
        case .p: "Punter"
        case .ls: "Long Snapper"
        case .kr: "Kick Returner"
        case .pr: "Punt Returner"
        }
    }
}

// Mirrors lib/types.ts's PositionGroup.
enum PositionGroup: String, Codable, Hashable {
    case dl = "DL"
    case lb = "LB"
    case cb = "CB"
    case s = "S"
    case rb = "RB"
}

// Mirrors lib/types.ts's PlayerStatus.
enum PlayerStatus: String, Codable {
    case starter
    case backup
    case rookie
    case injured
}

// Mirrors lib/types.ts's Unit.
enum Unit: String, Codable {
    case offense
    case defense
    case special
}
