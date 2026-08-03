// Parses nflverse participation's `defense_personnel` column (FTN-era, 2023+ — mirrors
// `personnel.ts`'s offense parser, see docs/superpowers/specs/2026-07-07-phase-e-real-
// formations-design.md, defense listed as a "later mirror") into DL/LB/DB counts, and
// derives the standard front label from those counts.
//
// Sampled from the real 2024 `pbp_participation_2024.csv` release asset (2026-08-03): on
// an actual scrimmage snap (non-blank `offense_formation`) the column is a clean
// comma-separated `"<count> <POS>"` list summing to 11, e.g.
// `"3 CB, 2 DE, 2 DT, 1 FS, 2 ILB, 1 SS"`. Rows with a blank `offense_formation`
// (kneel-downs / non-charted plays) carry noisy defense_personnel too (stray K/RB/WR
// entries from special-teams snaps) — DefenseFormationAccumulator gates on the same
// non-blank `offense_formation` check the offense accumulator already uses, so this
// parser only ever sees the clean rows in practice.

export interface DefensePersonnelCounts {
  dl: number;
  lb: number;
  db: number;
}

const PART_RE = /^(\d+)\s+([A-Z]+)$/;

// '' / whitespace-only -> null. A string that doesn't parse as any `"<n> <POS>"` parts
// also -> null, rather than a silent {0,0,0}.
export function parseDefensePersonnel(raw: string): DefensePersonnelCounts | null {
  const s = raw?.trim();
  if (!s) return null;

  let dl = 0;
  let lb = 0;
  let db = 0;
  let matchedAny = false;

  for (const part of s.split(',')) {
    const m = PART_RE.exec(part.trim());
    if (!m) continue;
    matchedAny = true;
    const count = Number(m[1]);
    switch (m[2]) {
      case 'DE':
      case 'DT':
      case 'NT':
        dl += count;
        break;
      case 'LB':
      case 'ILB':
      case 'OLB':
      case 'MLB':
        lb += count;
        break;
      case 'CB':
      case 'FS':
      case 'SS':
      case 'S':
      case 'DB':
        db += count;
        break;
      default:
      // Stray special-teams position codes (K, P, LS, RB, WR, ...) — noise, ignored,
      // same as offense_personnel's OL/QB ignore rule.
    }
  }

  return matchedAny ? { dl, lb, db } : null;
}

// Standard NFL shorthand: {DL count}-{LB count}-{DB count}, e.g. {dl:4, lb:2, db:5} ->
// "4-2-5". Callers that need to validate the result against a real front should also
// check dl + lb + db === 11 on the source counts.
export function defensePersonnelCode({ dl, lb, db }: DefensePersonnelCounts): string {
  return `${dl}-${lb}-${db}`;
}

// The DB count alone reliably names the front — standard broadcast/coaching
// terminology, and the only dimension that varies meaningfully across the real sampled
// data (DL+LB fill whatever's left of the 11). Goal Line covers the rare heavy-box looks
// with 3 or fewer DBs.
export function defenseAlignmentLabel(dbCount: number): string {
  if (dbCount <= 3) return 'Goal Line';
  if (dbCount === 4) return 'Base';
  if (dbCount === 5) return 'Nickel';
  if (dbCount === 6) return 'Dime';
  return 'Quarter';
}
