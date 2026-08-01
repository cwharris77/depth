import type { FormationSlot, Position, RenderSlot, TeamRosterSeed, Unit } from './types';
import { getPlayerById, getPlayersByPosition } from './roster';

// Shared, generic formations. Every team's offense/defense renders on these — slots
// resolve to players by position group + depth index, so adding a team is data-only.
//
//   index 0 = first at that position (by depthRank, then jersey number)
//   index 1 = second, etc.  If the roster has no player at that index → empty slot.
//
// Coords are percentages: x = 0–100 across, y = 0–100 down. y=50 = line of scrimmage.

// Base 11-personnel look. The OL + TE + the split-end WR sit ON the line of scrimmage
// (y just past 50); slot/flanker WRs are off the line, QB under center, RB behind.
// Exactly 7 onLine, per the rule.
export const OFFENSE_FORMATION: FormationSlot[] = [
  { id: 'off-wr-0', position: 'WR', index: 0, x: 88, y: 51, label: 'WR', onLine: true },
  { id: 'off-wr-1', position: 'WR', index: 1, x: 12, y: 55, label: 'WR', onLine: false },
  { id: 'off-wr-2', position: 'WR', index: 2, x: 24, y: 56, label: 'WR', onLine: false },
  { id: 'off-te-0', position: 'TE', index: 0, x: 74, y: 51, label: 'TE', onLine: true },
  { id: 'off-lt-0', position: 'LT', index: 0, x: 34, y: 51, label: 'LT', onLine: true },
  { id: 'off-lg-0', position: 'LG', index: 0, x: 42, y: 51, label: 'LG', onLine: true },
  { id: 'off-c-0', position: 'C', index: 0, x: 50, y: 51, label: 'C', onLine: true },
  { id: 'off-rg-0', position: 'RG', index: 0, x: 58, y: 51, label: 'RG', onLine: true },
  { id: 'off-rt-0', position: 'RT', index: 0, x: 66, y: 51, label: 'RT', onLine: true },
  { id: 'off-qb-0', position: 'QB', index: 0, x: 50, y: 66, label: 'QB', onLine: false },
  { id: 'off-rb-0', position: 'RB', index: 0, x: 50, y: 78, label: 'RB', onLine: false },
];

// 4-3 base. The four down linemen sit at the line (just past 50 on the defense's side);
// linebackers, then corners and safeties stack back. onLine marks the DL front.
export const DEFENSE_FORMATION: FormationSlot[] = [
  { id: 'def-s-0', position: 'S', index: 0, x: 34, y: 14, label: 'SS', onLine: false },
  { id: 'def-s-1', position: 'S', index: 1, x: 66, y: 14, label: 'FS', onLine: false },
  { id: 'def-cb-0', position: 'CB', index: 0, x: 10, y: 26, label: 'CB', onLine: false },
  { id: 'def-cb-1', position: 'CB', index: 1, x: 90, y: 26, label: 'CB', onLine: false },
  { id: 'def-lb-0', position: 'LB', index: 0, x: 26, y: 37, label: 'LB', onLine: false },
  { id: 'def-lb-1', position: 'LB', index: 1, x: 50, y: 37, label: 'LB', onLine: false },
  { id: 'def-lb-2', position: 'LB', index: 2, x: 74, y: 37, label: 'LB', onLine: false },
  { id: 'def-de-0', position: 'DE', index: 0, x: 24, y: 49, label: 'DE', onLine: true },
  { id: 'def-dt-0', position: 'DT', index: 0, x: 42, y: 49, label: 'DT', onLine: true },
  { id: 'def-dt-1', position: 'DT', index: 1, x: 58, y: 49, label: 'DT', onLine: true },
  { id: 'def-de-1', position: 'DE', index: 1, x: 76, y: 49, label: 'DE', onLine: true },
];

// Resolve a unit to render-ready slots for a given roster. `offenseFormation` lets a
// caller swap in a real per-team layout (buildRealFormation, below) for the offense
// unit — ignored for defense/special, which have no such override.
export function resolveUnit(
  roster: TeamRosterSeed,
  unit: Unit,
  offenseFormation?: FormationSlot[]
): RenderSlot[] {
  if (unit === 'special') {
    return roster.specialTeams.map((slot) => ({
      key: slot.id,
      x: slot.x,
      y: slot.y,
      label: slot.label,
      player: slot.playerId ? getPlayerById(roster, slot.playerId) : undefined,
    }));
  }

  const formation =
    unit === 'offense' ? (offenseFormation ?? OFFENSE_FORMATION) : DEFENSE_FORMATION;
  return formation.map((slot) => ({
    key: slot.id,
    x: slot.x,
    y: slot.y,
    label: slot.label,
    onLine: slot.onLine,
    player: getPlayersByPosition(roster, slot.position)[slot.index],
  }));
}

// --- Real per-team formations (Phase E, docs/superpowers/specs/2026-07-07-phase-e-
// real-formations-design.md) -----------------------------------------------------
//
// A "real formation" is the pair (qbAlignment, personnelCode) nflverse participation
// data reliably gives: qbAlignment is FTN's charted offense_formation, personnelCode is
// the standard NFL shorthand `{RB count}{TE count}` (WR count is implied — 5 skill
// spots total). buildRealFormation turns that pair into the same FormationSlot[] shape
// OFFENSE_FORMATION uses, so resolveUnit needs no changes to render it.

export type QbAlignment = 'SHOTGUN' | 'UNDER CENTER' | 'PISTOL';

const ALIGNMENT_LABELS: Record<QbAlignment, string> = {
  SHOTGUN: 'Shotgun',
  'UNDER CENTER': 'Under center',
  PISTOL: 'Pistol',
};

// Human label for a stored alignment value. Unrecognized input (defensive only — the
// ingest step only ever writes the three FTN values) passes through verbatim.
export function alignmentLabel(alignment: string): string {
  return ALIGNMENT_LABELS[alignment as QbAlignment] ?? alignment;
}

const PERSONNEL_CODE_RE = /^[0-3][0-3]$/;
const LINE_Y = 51; // same row as the 5 OL
const WING_Y = 54; // off-line WR/TE row

const QB_Y: Record<QbAlignment, number> = {
  'UNDER CENTER': 56,
  PISTOL: 63,
  SHOTGUN: 68,
};

// x=10 split end (onLine) / x=90 flanker / x=26,74 slots / x=33 tight slot — in the
// order the 1st..5th WR fill them (spec's locked composition rules).
const WR_SPOTS: { x: number; y: number; onLine: boolean }[] = [
  { x: 10, y: LINE_Y, onLine: true },
  { x: 90, y: WING_Y, onLine: false },
  { x: 26, y: WING_Y, onLine: false },
  { x: 74, y: WING_Y, onLine: false },
  { x: 33, y: WING_Y, onLine: false },
];

interface SkillSlot {
  position: Position;
  index: number;
  x: number;
  y: number;
  onLine: boolean;
  label: string;
}

// x/y for the 5 OL, unchanged from the generic base look — every real formation keeps
// the same line.
const OL_SLOTS: SkillSlot[] = [
  { position: 'LT', index: 0, x: 34, y: LINE_Y, label: 'LT', onLine: true },
  { position: 'LG', index: 0, x: 42, y: LINE_Y, label: 'LG', onLine: true },
  { position: 'C', index: 0, x: 50, y: LINE_Y, label: 'C', onLine: true },
  { position: 'RG', index: 0, x: 58, y: LINE_Y, label: 'RG', onLine: true },
  { position: 'RT', index: 0, x: 66, y: LINE_Y, label: 'RT', onLine: true },
];

function slotId(s: Pick<SkillSlot, 'position' | 'index'>): string {
  return `off-${s.position.toLowerCase()}-${s.index}`;
}

// Builds one team's actual offense layout from its most-used (qbAlignment,
// personnelCode) combo. Deterministic geometry from the RB/TE counts the code encodes
// (WR count is implied: 5 skill spots total, less RB and TE). Falls back to the generic
// OFFENSE_FORMATION for a code this repo can't fully place — a personnelCode that isn't
// two digits 0-3, more than 5 total skill players, or more than 2 RBs (the only counts
// the composition rules below define a spot for) — never a crash, never a half-built
// layout.
export function buildRealFormation(alignment: string, code: string): FormationSlot[] {
  if (!PERSONNEL_CODE_RE.test(code)) return OFFENSE_FORMATION;
  const rb = Number(code[0]);
  const te = Number(code[1]);
  const wr = 5 - rb - te;
  if (wr < 0 || rb > 2) return OFFENSE_FORMATION;

  const wrSlots: SkillSlot[] = Array.from({ length: wr }, (_, i) => ({
    position: 'WR' as const,
    index: i,
    label: 'WR',
    ...WR_SPOTS[i],
  }));

  const teSlots: SkillSlot[] = [];
  if (te >= 1) {
    teSlots.push({ position: 'TE', index: 0, x: 71, y: LINE_Y, onLine: true, label: 'TE' });
  }
  if (te >= 2) {
    // A 2nd in-line TE only when there's no WR to flex out wide; otherwise it wings off
    // the line next to the 1st TE.
    teSlots.push(
      wr < 1
        ? { position: 'TE', index: 1, x: 29, y: LINE_Y, onLine: true, label: 'TE' }
        : { position: 'TE', index: 1, x: 76, y: WING_Y, onLine: false, label: 'TE' }
    );
  }
  if (te >= 3) {
    teSlots.push({ position: 'TE', index: 2, x: 24, y: WING_Y, onLine: false, label: 'TE' });
  }

  // Exactly 7 onLine total (5 OL + 2 skill) — promote off-line WRs, then TEs, in fill
  // order until the invariant holds. Every valid (rb<=2, wr+te<=5) combo already lands
  // on exactly 2 baseline-onLine skill slots or needs exactly one promotion; this loop
  // is the general form of that rule.
  const skillSlots = [...wrSlots, ...teSlots];
  let onLineCount = skillSlots.filter((s) => s.onLine).length;
  for (const slot of skillSlots) {
    if (onLineCount >= 2) break;
    if (!slot.onLine) {
      slot.onLine = true;
      onLineCount++;
    }
  }

  const isShotgun = alignment === 'SHOTGUN';
  const rbSlots: SkillSlot[] = [];
  if (rb >= 1) {
    rbSlots.push({
      position: 'RB',
      index: 0,
      x: isShotgun ? 58 : 50,
      y: isShotgun ? 70 : 76,
      onLine: false,
      label: 'RB',
    });
  }
  if (rb >= 2) {
    rbSlots.push({ position: 'RB', index: 1, x: 42, y: 70, onLine: false, label: 'RB' });
  }

  const qbSlot: SkillSlot = {
    position: 'QB',
    index: 0,
    x: 50,
    y: QB_Y[alignment as QbAlignment] ?? QB_Y.SHOTGUN,
    onLine: false,
    label: 'QB',
  };

  return [...OL_SLOTS, ...skillSlots, ...rbSlots, qbSlot].map((s) => ({ ...s, id: slotId(s) }));
}
