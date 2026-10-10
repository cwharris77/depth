import type { Position } from '../types';

// Maps nflverse's roster_<season>.csv position vocabulary to ours (mirrors
// lib/espn/positions.ts's approach for the ESPN vocabulary). A code with an exact
// canonical equivalent keeps it (`FB`, `NT`, `FS`, `SS`), and a coarse code stays coarse
// rather than being widened into a specific one. nflverse collapses offensive tackles
// and guards into one code per pair (`T`/`OT`, `G`/`OG`) with no left/right side in the
// data -- those remain generic `OT`/`G`; only the separately sourced historical depth
// chart may establish a side. `OLB`/`ILB`/`MLB` and `EDGE` have no unsided canonical
// value, so they map to `LB` and `DE`. A generic `DB` stays `DB` rather than being
// widened into a corner or safety. An unrecognized code is `null` -- the caller
// drops the row with a reason, never guesses.
export type RosterPosition = Position;

export const ROSTER_POSITION: Record<string, Position> = {
  QB: 'QB',
  RB: 'RB',
  HB: 'RB',
  FB: 'FB',
  WR: 'WR',
  TE: 'TE',
  T: 'OT',
  OT: 'OT',
  G: 'G',
  OG: 'G',
  C: 'C',
  DE: 'DE',
  EDGE: 'DE',
  DT: 'DT',
  NT: 'NT',
  OLB: 'LB',
  ILB: 'LB',
  MLB: 'LB',
  LB: 'LB',
  CB: 'CB',
  FS: 'FS',
  SS: 'SS',
  DB: 'DB',
  S: 'S',
  SAF: 'S',
  K: 'K',
  P: 'P',
  LS: 'LS',
  KR: 'KR',
  PR: 'PR',
};

export function mapRosterPosition(code: string): RosterPosition | null {
  return ROSTER_POSITION[code.trim().toUpperCase()] ?? null;
}

// nflverse's depth_charts_<season>.csv vocabulary (`depth_position` through 2024,
// `pos_abb` from 2025). Unlike the roster file it is club-authored free text, so one slot
// arrives under several spellings, and one spelling names a different slot on each side
// of the ball: `LT` is a left tackle on offense and a defensive tackle on defense. Every
// code is therefore read within the unit its row is charted under.
export type DepthChartUnit = 'offense' | 'defense' | 'special';

// Legacy files name the unit outright in `formation`. The 2025+ files carry a position
// group instead: `Special Teams`, a defensive front ending in ` D` (`Base 4-3 D`), or an
// offensive personnel label (`3WR 1TE`).
export function depthChartUnit(label: string, legacy: boolean): DepthChartUnit | null {
  const key = label.trim();
  if (key === 'Special Teams') return 'special';
  if (legacy) {
    if (key === 'Offense') return 'offense';
    if (key === 'Defense') return 'defense';
    return null;
  }
  if (!key) return null;
  return key.endsWith(' D') ? 'defense' : 'offense';
}

// A sided code keeps its side (`LOT` is `LT`, `LE` is `LDE`); a code whose side or role
// has no canonical value takes the nearest coarse one (a defensive tackle of either side
// is `DT`, `MIKE` and the outside/inside linebackers are `LB`, a split end or flanker is
// `WR`); a code with no side at all stays generic (an offensive `T` is `OT`, `G` is `G`). On a special-teams unit only
// the specialists hold a position there -- a returner or gunner listed by his everyday
// position is not being charted at it.
export const DEPTH_CHART_POSITION: Record<DepthChartUnit, Record<string, Position>> = {
  offense: {
    QB: 'QB',
    RB: 'RB',
    HB: 'RB',
    FB: 'FB',
    WR: 'WR',
    TE: 'TE',
    LT: 'LT',
    LOT: 'LT',
    LG: 'LG',
    C: 'C',
    RG: 'RG',
    RT: 'RT',
    ROT: 'RT',
    T: 'OT',
    G: 'G',
    SE: 'WR',
    FL: 'WR',
    LWR: 'WR',
    RWR: 'WR',
    LTE: 'TE',
    RTE: 'TE',
  },
  defense: {
    DE: 'DE',
    EDGE: 'DE',
    LDE: 'LDE',
    LE: 'LDE',
    RDE: 'RDE',
    RE: 'RDE',
    DT: 'DT',
    LDT: 'DT',
    RDT: 'DT',
    LT: 'DT',
    RT: 'DT',
    T: 'DT',
    NT: 'NT',
    LB: 'LB',
    MLB: 'LB',
    MIKE: 'LB',
    OLB: 'LB',
    ILB: 'LB',
    LOLB: 'LB',
    ROLB: 'LB',
    WLB: 'WLB',
    WILL: 'WLB',
    SLB: 'SLB',
    SAM: 'SLB',
    LILB: 'LILB',
    RILB: 'RILB',
    CB: 'CB',
    LCB: 'LCB',
    RCB: 'RCB',
    NB: 'NB',
    S: 'S',
    SS: 'SS',
    FS: 'FS',
    NCB: 'NB',
    NICK: 'NB',
    NICKE: 'NB',
    NKL: 'NB',
    NOSE: 'NT',
    END: 'DE',
    LLB: 'LB',
    RLB: 'LB',
    MILB: 'LB',
    WILB: 'LB',
  },
  special: {
    K: 'K',
    PK: 'K',
    P: 'P',
    LS: 'LS',
  },
};

// A special-teams job a player holds on top of his field position: returner, holder,
// kickoff specialist. It never replaces the field position, so it is read separately.
export type DepthChartSpecialRole = 'kr' | 'pr' | 'h' | 'ko';

export const DEPTH_CHART_SPECIAL_ROLE: Record<string, DepthChartSpecialRole> = {
  KR: 'kr',
  KOR: 'kr',
  PR: 'pr',
  H: 'h',
  PH: 'h',
  KO: 'ko',
  KOS: 'ko',
};

// Codes nflverse has published that name no single canonical position in their unit: a
// blank, a unit rather than a slot (`DL`, `OL`), a two-position combo, a scheme-specific
// or coverage-unit label, a code from the other side of the ball, or a data-entry slip.
// A player charted only under one of these keeps his roster position. Listing them is
// what separates a code that was looked at from a new one.
export const DEPTH_CHART_UNPLACED: Record<DepthChartUnit, ReadonlySet<string>> = {
  offense: new Set([
    '',
    // Two-position combos and a unit rather than a slot.
    'OL',
    'FB/TE',
    'TE/FB',
    'TE/HB',
    'HB/TE',
    'HB-TE',
    'RB/TE',
    'TE/LS',
    'LS/TE',
    // Scheme-specific and alternate labels with no agreed canonical value.
    'F',
    'H-B',
    'J',
    'NG',
    'OC',
    'WE',
    'WRE',
    // Defensive codes charted on offense.
    'DE',
    'DT',
    'S',
    // Data-entry slips.
    '19',
    '78',
    '87',
    '9',
    'RB5',
    'RB86',
    'RB`',
    'WR1',
    'WR2',
    'WR\\8',
  ]),
  defense: new Set([
    '',
    // Two-position combos and units rather than slots.
    'DL',
    'DL/OL',
    'OL B',
    'DE/LB',
    'LB/DE',
    // Scheme-specific and alternate labels with no agreed canonical value.
    'BLB',
    'CS',
    'DB',
    'DDE',
    'JACK',
    'JLB',
    'LBE',
    'LCR',
    'LEO',
    'LS',
    'LSB',
    'MCB',
    'MIL',
    'ML',
    'MO',
    'MOLB',
    'N',
    'NDB',
    'NDT',
    'OE',
    'OTTO',
    'RUSH',
    'SL',
    'TED',
    'UT',
    'WE',
    'WIL',
    'WL',
    'WS',
    // Special-teams labels charted on defense.
    'DPR',
    'DS',
    'RS',
    // Data-entry slips.
    '$LB',
    '0LB',
    '2',
    '21',
    '6',
    '7',
    'DL44',
    'LILBI',
    'RBC',
    'S47',
  ]),
  special: new Set([
    '',
    // Position players listed on a kicking or return unit.
    'C',
    'CB',
    'FS',
    'HB',
    'RB',
    'S',
    'T',
    'TE',
    'WR',
    // Combos and special-teams labels other than the roles read above.
    'K/KO',
    'KO/LS',
    'P/H',
    'PC/KC',
    'FG',
    'HLS',
    'HO',
    'KC',
    'LA',
    'LC',
    'PC',
    'PF',
    'PS',
    'R',
    // Data-entry slips.
    '19',
    'K222',
    'P.',
  ]),
};

export type DepthChartCode =
  | { kind: 'position'; position: Position }
  | { kind: 'special'; role: DepthChartSpecialRole }
  | { kind: 'unplaced' }
  | { kind: 'unmapped' };

// `unmapped` is a code in none of the unit's tables -- one nflverse has started
// publishing since they were written. Callers report it rather than guessing a position.
export function classifyDepthChartCode(unit: DepthChartUnit, code: string): DepthChartCode {
  const key = code.trim().toUpperCase();
  const position = DEPTH_CHART_POSITION[unit][key];
  if (position) return { kind: 'position', position };
  const role = unit === 'special' ? DEPTH_CHART_SPECIAL_ROLE[key] : undefined;
  if (role) return { kind: 'special', role };
  return DEPTH_CHART_UNPLACED[unit].has(key) ? { kind: 'unplaced' } : { kind: 'unmapped' };
}
