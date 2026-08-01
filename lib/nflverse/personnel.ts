// Parses nflverse participation's `offense_personnel` column (FTN-era, 2023+ — see
// docs/superpowers/specs/2026-07-07-phase-e-real-formations-design.md) into RB/TE/WR
// counts, and reduces those counts to the standard NFL personnel-grouping shorthand
// ("11", "12", "21", ...). Pure; no fetch, no DB.
//
// The raw string is a comma-separated `"<count> <POS>"` list, e.g.
// `"1 C, 2 G, 1 QB, 1 RB, 2 T, 1 TE, 3 WR"`. OL detail (C/G/T counts) varies row to row
// and is noise for this purpose — ignored. FB counts as RB (fullback is a run-blocking
// back, same shorthand slot). A handful of special-teams snaps carry unrelated position
// codes (K/P/LS/DE/DT/CB/...) in this column — also ignored; those rows almost always
// have a blank `offense_formation` too and get excluded upstream by that check.

export interface PersonnelCounts {
  rb: number;
  te: number;
  wr: number;
}

const PART_RE = /^(\d+)\s+([A-Z]+)$/;

// '' / whitespace-only -> null (kneel-downs and other no-charting rows). A string that
// doesn't parse as any `"<n> <POS>"` parts also -> null, rather than a silent {0,0,0}.
export function parsePersonnel(raw: string): PersonnelCounts | null {
  const s = raw?.trim();
  if (!s) return null;

  let rb = 0;
  let te = 0;
  let wr = 0;
  let matchedAny = false;

  for (const part of s.split(',')) {
    const m = PART_RE.exec(part.trim());
    if (!m) continue;
    matchedAny = true;
    const count = Number(m[1]);
    switch (m[2]) {
      case 'RB':
      case 'FB':
        rb += count;
        break;
      case 'TE':
        te += count;
        break;
      case 'WR':
        wr += count;
        break;
      default:
      // OL (C/G/T), QB, and stray special-teams position codes are noise — ignored.
    }
  }

  return matchedAny ? { rb, te, wr } : null;
}

// Standard NFL shorthand: {RB count}{TE count}, e.g. {rb:1, te:1} -> "11". Callers that
// need to validate the result against a real personnel grouping should also check
// rb + te + wr === 5 on the source PersonnelCounts (lib/nflverse/participation.ts) —
// this function just formats whatever counts it's given.
export function personnelCode({ rb, te }: Pick<PersonnelCounts, 'rb' | 'te'>): string {
  return `${rb}${te}`;
}
