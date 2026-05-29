export type Position =
  | "QB" | "RB" | "WR" | "TE" | "LT" | "LG" | "C" | "RG" | "RT"
  | "DE" | "DT" | "LB" | "CB" | "SS" | "FS" | "K" | "P";

export type PlayerStatus = "starter" | "backup" | "rookie" | "injured";

export interface Player {
  id: string;
  name: string;
  number: number;
  position: Position;
  depth: 1 | 2 | 3;
  status: PlayerStatus;
  age: number;
  college: string;
  experience: number; // years in NFL
  height: string;
  weight: number;
  bio: string;
  stats?: Record<string, string | number>;
}

// Field layout: x/y as percentage of field (0-100)
// x = horizontal, y = vertical (0 = offense end zone, 100 = defense end zone)
// Offense lines up around y: 35-55, defense y: 55-70
export interface PositionSlot {
  position: Position;
  depth: 1 | 2 | 3;
  x: number; // % from left
  y: number; // % from top
  label: string;
}

export const OFFENSE_POSITIONS: PositionSlot[] = [
  // QB
  { position: "QB", depth: 1, x: 50, y: 58, label: "QB" },
  // RB
  { position: "RB", depth: 1, x: 50, y: 64, label: "RB" },
  // WR left
  { position: "WR", depth: 1, x: 10, y: 52, label: "WR" },
  // WR right
  { position: "WR", depth: 2, x: 90, y: 52, label: "WR" },
  // WR slot
  { position: "WR", depth: 3, x: 25, y: 52, label: "WR" },
  // TE
  { position: "TE", depth: 1, x: 72, y: 52, label: "TE" },
  // OL
  { position: "LT", depth: 1, x: 32, y: 56, label: "LT" },
  { position: "LG", depth: 1, x: 40, y: 56, label: "LG" },
  { position: "C",  depth: 1, x: 50, y: 56, label: "C" },
  { position: "RG", depth: 1, x: 60, y: 56, label: "RG" },
  { position: "RT", depth: 1, x: 68, y: 56, label: "RT" },
];

export const DEFENSE_POSITIONS: PositionSlot[] = [
  // DL
  { position: "DE", depth: 1, x: 30, y: 42, label: "DE" },
  { position: "DT", depth: 1, x: 42, y: 42, label: "DT" },
  { position: "DT", depth: 2, x: 58, y: 42, label: "DT" },
  { position: "DE", depth: 2, x: 70, y: 42, label: "DE" },
  // LB
  { position: "LB", depth: 1, x: 35, y: 35, label: "LB" },
  { position: "LB", depth: 2, x: 50, y: 35, label: "LB" },
  { position: "LB", depth: 3, x: 65, y: 35, label: "LB" },
  // DB
  { position: "CB", depth: 1, x: 10, y: 28, label: "CB" },
  { position: "CB", depth: 2, x: 90, y: 28, label: "CB" },
  { position: "SS", depth: 1, x: 35, y: 24, label: "SS" },
  { position: "FS", depth: 1, x: 65, y: 24, label: "FS" },
];

export const SEAHAWKS_PLAYERS: Player[] = [
  // OFFENSE
  {
    id: "geno-smith",
    name: "Geno Smith",
    number: 7,
    position: "QB",
    depth: 1,
    status: "starter",
    age: 34,
    college: "West Virginia",
    experience: 12,
    height: "6'3\"",
    weight: 221,
    bio: "The comeback story of the league. After years as a backup, Geno led Seattle to back-to-back playoff appearances and won NFL Comeback Player of the Year in 2022.",
    stats: { "2024 Rating": "97.3", Yards: "3891", TDs: 20, INTs: 9 },
  },
  {
    id: "kenneth-walker",
    name: "Kenneth Walker III",
    number: 9,
    position: "RB",
    depth: 1,
    status: "starter",
    age: 24,
    college: "Michigan State",
    experience: 3,
    height: "5'9\"",
    weight: 211,
    bio: "KWIII is an explosive, elusive back who burst onto the scene with 1,050 rushing yards as a rookie. A key piece of Seattle's ground game identity.",
    stats: { "2024 Yards": 1040, "YPC": 4.4, TDs: 9 },
  },
  {
    id: "jaxon-smith-njigba",
    name: "Jaxon Smith-Njigba",
    number: 11,
    position: "WR",
    depth: 1,
    status: "starter",
    age: 23,
    college: "Ohio State",
    experience: 2,
    height: "6'0\"",
    weight: 196,
    bio: "The 2023 first-round pick is developing into a true No. 1 receiver. His route-running precision and YAC ability make him a matchup nightmare in the slot.",
    stats: { "2024 Rec": 81, Yards: 1024, TDs: 4 },
  },
  {
    id: "dk-metcalf",
    name: "DK Metcalf",
    number: 14,
    position: "WR",
    depth: 2,
    status: "starter",
    age: 27,
    college: "Mississippi",
    experience: 6,
    height: "6'4\"",
    weight: 235,
    bio: "One of the most physically imposing receivers in the NFL. DK's combination of size and speed is unmatched — he ran a 4.33 at the combine and benched 225 lbs 27 times.",
    stats: { "2024 Rec": 66, Yards: 992, TDs: 8 },
  },
  {
    id: "tyler-lockett",
    name: "Tyler Lockett",
    number: 16,
    position: "WR",
    depth: 3,
    status: "starter",
    age: 32,
    college: "Kansas State",
    experience: 10,
    height: "5'10\"",
    weight: 182,
    bio: "A Seahawks cornerstone and one of the most reliable receivers of his generation. Lockett's precise routes and elite hands have made him Geno's security blanket.",
    stats: { "2024 Rec": 59, Yards: 722, TDs: 6 },
  },
  {
    id: "noah-fant",
    name: "Noah Fant",
    number: 87,
    position: "TE",
    depth: 1,
    status: "starter",
    age: 27,
    college: "Iowa",
    experience: 6,
    height: "6'4\"",
    weight: 249,
    bio: "An athletic pass-catcher who adds a vertical dimension to Seattle's tight end usage. His speed after the catch makes him a mismatch against linebackers.",
    stats: { "2024 Rec": 44, Yards: 491, TDs: 3 },
  },
  {
    id: "charles-cross",
    name: "Charles Cross",
    number: 67,
    position: "LT",
    depth: 1,
    status: "starter",
    age: 24,
    college: "Mississippi State",
    experience: 3,
    height: "6'5\"",
    weight: 310,
    bio: "The cornerstone of Seattle's rebuilt offensive line. Cross has established himself as one of the premier young left tackles in the NFL, protecting the blind side with technical precision.",
    stats: { "2024 PFF Grade": 74.2, Sacks: 3 },
  },
  {
    id: "laken-tomlinson",
    name: "Laken Tomlinson",
    number: 77,
    position: "LG",
    depth: 1,
    status: "starter",
    age: 33,
    college: "Duke",
    experience: 10,
    height: "6'3\"",
    weight: 330,
    bio: "A veteran presence providing stability at left guard. His experience and technique anchor the left side of Seattle's offensive line.",
    stats: {},
  },
  {
    id: "connorwilliams",
    name: "Connor Williams",
    number: 52,
    position: "C",
    depth: 1,
    status: "starter",
    age: 28,
    college: "Texas",
    experience: 7,
    height: "6'4\"",
    weight: 302,
    bio: "A reliable center who directs Seattle's protection schemes. His communication skills at the line of scrimmage are a key part of the offense's success.",
    stats: {},
  },
  {
    id: "anthony-bradford",
    name: "Anthony Bradford",
    number: 66,
    position: "RG",
    depth: 1,
    status: "starter",
    age: 25,
    college: "LSU",
    experience: 2,
    height: "6'4\"",
    weight: 345,
    bio: "A physically imposing guard who brings raw power to Seattle's right side. The 2023 fourth-round pick is developing into a solid starter.",
    stats: {},
  },
  {
    id: "abe-lucas",
    name: "Abe Lucas",
    number: 72,
    position: "RT",
    depth: 1,
    status: "starter",
    age: 25,
    college: "Washington State",
    experience: 3,
    height: "6'6\"",
    weight: 316,
    bio: "A physical right tackle who excels in the run game. Lucas has steadily improved each season and is developing into a cornerstone of Seattle's line.",
    stats: {},
  },

  // DEFENSE
  {
    id: "uchenna-nwosu",
    name: "Uchenna Nwosu",
    number: 10,
    position: "DE",
    depth: 1,
    status: "starter",
    age: 28,
    college: "USC",
    experience: 6,
    height: "6'2\"",
    weight: 250,
    bio: "A versatile edge rusher who can set the edge and rush the passer. Nwosu's motor and relentless effort make him a disruptive force off the edge.",
    stats: { "2024 Sacks": 8.0, "TFLs": 10 },
  },
  {
    id: "leonard-williams",
    name: "Leonard Williams",
    number: 99,
    position: "DT",
    depth: 1,
    status: "starter",
    age: 30,
    college: "USC",
    experience: 10,
    height: "6'5\"",
    weight: 302,
    bio: "A dominant interior force signed in 2024. Williams brings veteran leadership and consistent disruption up the middle, demanding double-teams that free up Seattle's pass rushers.",
    stats: { "2024 Sacks": 6.5, "TFLs": 12 },
  },
  {
    id: "jarran-reed",
    name: "Jarran Reed",
    number: 90,
    position: "DT",
    depth: 2,
    status: "starter",
    age: 31,
    college: "Alabama",
    experience: 8,
    height: "6'3\"",
    weight: 309,
    bio: "A savvy veteran returning to Seattle. Reed's first stint included a 10.5-sack season in 2018. He provides valuable depth and situational pass-rush ability.",
    stats: {},
  },
  {
    id: "boye-mafe",
    name: "Boye Mafe",
    number: 53,
    position: "DE",
    depth: 2,
    status: "starter",
    age: 26,
    college: "Minnesota",
    experience: 3,
    height: "6'4\"",
    weight: 261,
    bio: "An ascending pass rusher with freakish athletic traits. Mafe is developing into a cornerstone of Seattle's defensive front with his combination of speed and power.",
    stats: { "2024 Sacks": 7.0 },
  },
  {
    id: "jerome-baker",
    name: "Jerome Baker",
    number: 17,
    position: "LB",
    depth: 1,
    status: "starter",
    age: 29,
    college: "Ohio State",
    experience: 7,
    height: "6'2\"",
    weight: 232,
    bio: "A rangy linebacker who excels in coverage. Baker's athleticism allows him to match up with tight ends and backs in space, giving Seattle flexibility in their defensive packages.",
    stats: { "2024 Tackles": 89, "INT": 2 },
  },
  {
    id: "tyrel-dodson",
    name: "Tyrel Dodson",
    number: 51,
    position: "LB",
    depth: 2,
    status: "starter",
    age: 27,
    college: "Texas A&M",
    experience: 5,
    height: "6'1\"",
    weight: 240,
    bio: "A physical inside linebacker who fills gaps and stops the run. Dodson is the thumper in Seattle's linebacking corps, bringing aggression and toughness to the middle.",
    stats: { "2024 Tackles": 102, "TFLs": 6 },
  },
  {
    id: "dre-greenlaw",
    name: "Dre Greenlaw",
    number: 57,
    position: "LB",
    depth: 3,
    status: "starter",
    age: 27,
    college: "Arkansas",
    experience: 5,
    height: "6'0\"",
    weight: 237,
    bio: "An instinctive linebacker who excels in run defense and zone coverage. His football IQ allows him to diagnose plays quickly and get in position before the snap.",
    stats: {},
  },
  {
    id: "devon-witherspoon",
    name: "Devon Witherspoon",
    number: 21,
    position: "CB",
    depth: 1,
    status: "starter",
    age: 24,
    college: "Illinois",
    experience: 2,
    height: "6'0\"",
    weight: 185,
    bio: "The 2023 fifth overall pick has emerged as one of the NFL's best young corners. His physical press coverage and ball-hawk instincts immediately evoke memories of Richard Sherman.",
    stats: { "2024 INTs": 3, "PBUs": 12, "PFF Grade": 82.4 },
  },
  {
    id: "riq-woolen",
    name: "Riq Woolen",
    number: 27,
    position: "CB",
    depth: 2,
    status: "starter",
    age: 26,
    college: "UTSA",
    experience: 3,
    height: "6'4\"",
    weight: 205,
    bio: "A rare combination of elite size and elite speed (4.26 40-yard dash). Woolen led the NFL with 6 interceptions as a rookie, announcing himself as one of the game's most unique cornerbacks.",
    stats: { "2024 INTs": 4, "PBUs": 8 },
  },
  {
    id: "quandre-diggs",
    name: "Quandre Diggs",
    number: 6,
    position: "SS",
    depth: 1,
    status: "starter",
    age: 31,
    college: "Texas",
    experience: 10,
    height: "5'9\"",
    weight: 203,
    bio: "The heartbeat of Seattle's secondary. Diggs' exceptional football IQ and leadership have been a cornerstone of the Seahawks defense for years. A Pro Bowl selection multiple times.",
    stats: { "2024 INTs": 2, "Tackles": 68 },
  },
  {
    id: "julian-love",
    name: "Julian Love",
    number: 37,
    position: "FS",
    depth: 1,
    status: "starter",
    age: 27,
    college: "Notre Dame",
    experience: 6,
    height: "5'11\"",
    weight: 196,
    bio: "A versatile safety who can play in the box or deep. Love's range and instincts make him the last line of defense in Seattle's secondary, cleaning up mistakes and creating turnovers.",
    stats: { "2024 INTs": 3, "Tackles": 74 },
  },
];

export function getPlayerForSlot(slot: PositionSlot): Player | undefined {
  return SEAHAWKS_PLAYERS.find(
    (p) => p.position === slot.position && p.depth === slot.depth
  );
}
