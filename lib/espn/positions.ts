import type { Position } from '../types';

const DEPTH_POSITION: Record<string, Position> = {
  qb: 'QB',
  rb: 'RB',
  wr: 'WR',
  te: 'TE',
  lt: 'LT',
  lg: 'LG',
  c: 'C',
  rg: 'RG',
  rt: 'RT',
  lde: 'DE',
  rde: 'DE',
  nt: 'DT',
  dt: 'DT',
  wlb: 'LB',
  lilb: 'LB',
  rilb: 'LB',
  slb: 'LB',
  lb: 'LB',
  mlb: 'LB',
  lcb: 'CB',
  rcb: 'CB',
  cb: 'CB',
  nb: 'CB',
  ss: 'S',
  fs: 'S',
  s: 'S',
  pk: 'K',
  k: 'K',
  p: 'P',
  ls: 'LS',
};

export function mapDepthchartPosition(key: string): Position | null {
  return DEPTH_POSITION[key.toLowerCase()] ?? null;
}

const SPECIAL: Record<string, 'k' | 'p' | 'ls' | 'kr' | 'pr'> = {
  pk: 'k',
  k: 'k',
  p: 'p',
  ls: 'ls',
  kr: 'kr',
  pr: 'pr',
};

export function mapSpecialPosition(key: string): 'k' | 'p' | 'ls' | 'kr' | 'pr' | null {
  return SPECIAL[key.toLowerCase()] ?? null;
}

// The site roster's per-athlete `position.abbreviation` (e.g. "WR", "OT", "PK") uses a
// different vocabulary than the depthchart keys above (e.g. "wr", "lt"/"rt", "pk"). Used
// as a fallback when a special-teams player (KR/PR/etc) doesn't otherwise appear on the
// offense/defense depth chart (e.g. a low-ranked WR who's still the primary returner).
// Ambiguous OL positions (G, OT) default to the left side -- side is cosmetic for a
// bench/reserve entry with no real depth-chart rank.
const BIO_POSITION: Record<string, Position> = {
  qb: 'QB',
  rb: 'RB',
  fb: 'RB',
  wr: 'WR',
  te: 'TE',
  ot: 'LT',
  t: 'LT',
  g: 'LG',
  og: 'LG',
  c: 'C',
  de: 'DE',
  dt: 'DT',
  nt: 'DT',
  lb: 'LB',
  cb: 'CB',
  s: 'S',
  fs: 'S',
  ss: 'S',
  pk: 'K',
  k: 'K',
  p: 'P',
  ls: 'LS',
};

export function mapBioPosition(abbreviation: string): Position | null {
  return BIO_POSITION[abbreviation.toLowerCase()] ?? null;
}

export function classifyItem(
  positionKeys: string[]
): 'offense' | 'defense' | 'special' | 'unknown' {
  const keys = positionKeys.map((k) => k.toLowerCase());
  if (keys.some((k) => k === 'kr' || k === 'pr' || k === 'pk')) return 'special';
  if (keys.includes('qb')) return 'offense';
  if (keys.some((k) => ['lde', 'rde', 'nt', 'ss', 'fs', 'lcb', 'rcb'].includes(k)))
    return 'defense';
  return 'unknown';
}
