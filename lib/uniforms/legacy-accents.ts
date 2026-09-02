import type { TeamColors } from '../types';

export type LegacyAccentPair = Pick<TeamColors, 'uiAccent' | 'onAccent'>;

// Legacy compatibility values for `uniforms.ui_accent` / `uniforms.on_accent`. These are
// NOT team colors and must never be rendered by this codebase — `lib/utils/team-surfaces.ts`
// resolves every surface from the kit's real jersey colors instead.
//
// They exist because iOS builds already on devices name `ui_accent, on_accent` in their
// PostgREST select strings and decode them into non-optional Strings. Dropping either column
// 400s the team page, team list and uniform archive for every installed copy; nulling either
// fails decode. So the columns stay populated, and `seed-sql.ts` reads this map to fill them.
//
// FROZEN. Do not re-derive, re-curate, or "fix" these values:
//   - Shipped builds paint ui_accent as a FOREGROUND on the dark app ground, so each value
//     has to stay legible there rather than truthful to the kit. PR #590 set 14 of them to
//     the real (dark) team color and made those teams unreadable on device; #591 restored
//     them. 63 of the 105 are invented hues for that reason — that is now correct, because
//     the column no longer claims to be the team's color, only what old clients should paint.
//   - on_accent is likewise frozen rather than derived from readableTextOn(ui_accent):
//     deriving it would rewrite 91 rows from #0a0e1a to #15161a (the app ground moved in
//     DEP-274) for no benefit, and would break the byte-identical-migration check that
//     proves this refactor is a no-op for shipped builds.
//
// Retirement is blocked on DEP-425 (forced-update gate) plus pre-gate installs draining —
// see the spec's "Retirement path". Design: ../../obsidian/Projects/depth/specs/
// 2026-09-01-team-color-surface-rules-design.md.
//
// A new kit needs an entry here: use `teamRing()` from lib/utils/team-surfaces.ts for
// uiAccent (legible by construction) and `readableTextOn()` for onAccent.
export const LEGACY_ACCENTS: Record<string, LegacyAccentPair> = {
  'ravens-home-1996': { uiAccent: '#9E7C0C', onAccent: '#0a0e1a' },
  'bengals-home-2021': { uiAccent: '#FF6A33', onAccent: '#0a0e1a' },
  'browns-home-2020': { uiAccent: '#FF6A33', onAccent: '#0a0e1a' },
  'steelers-home-1997': { uiAccent: '#FFB612', onAccent: '#0a0e1a' },
  'bills-home-2011': { uiAccent: '#5B9BFF', onAccent: '#0a0e1a' },
  'dolphins-home-2018': { uiAccent: '#2DD4D4', onAccent: '#0a0e1a' },
  'patriots-home-2020': { uiAccent: '#C8CDD6', onAccent: '#0a0e1a' },
  'jets-home-2024': { uiAccent: '#4CC38A', onAccent: '#0a0e1a' },
  'texans-home-2024': { uiAccent: '#5B9BFF', onAccent: '#0a0e1a' },
  'colts-home-2004': { uiAccent: '#A2AAAD', onAccent: '#0a0e1a' },
  'jaguars-home-2018': { uiAccent: '#2DD4D4', onAccent: '#0a0e1a' },
  'titans-home-2018': { uiAccent: '#5BA8E8', onAccent: '#0a0e1a' },
  'broncos-home-2024': { uiAccent: '#FF6A33', onAccent: '#0a0e1a' },
  'chiefs-home-1963': { uiAccent: '#FF4D5E', onAccent: '#0a0e1a' },
  'raiders-home-1963': { uiAccent: '#C8CDD6', onAccent: '#0a0e1a' },
  'chargers-home-2020': { uiAccent: '#36A7E0', onAccent: '#0a0e1a' },
  'bears-home-1984': { uiAccent: '#FF6A33', onAccent: '#0a0e1a' },
  'lions-home-2024': { uiAccent: '#36A7E0', onAccent: '#0a0e1a' },
  'packers-home-1959': { uiAccent: '#FFB612', onAccent: '#0a0e1a' },
  'vikings-home-2013': { uiAccent: '#FFC62F', onAccent: '#0a0e1a' },
  'cowboys-home-1964': { uiAccent: '#869397', onAccent: '#0a0e1a' },
  'giants-home-2000': { uiAccent: '#5B9BFF', onAccent: '#0a0e1a' },
  'eagles-home-1996': { uiAccent: '#2FA3A3', onAccent: '#0a0e1a' },
  'commanders-home-2022': { uiAccent: '#FFB612', onAccent: '#0a0e1a' },
  'falcons-home-2020': { uiAccent: '#FF4D5E', onAccent: '#0a0e1a' },
  'panthers-home-2012': { uiAccent: '#36A7E0', onAccent: '#0a0e1a' },
  'saints-home-2002': { uiAccent: '#E2CC9A', onAccent: '#0a0e1a' },
  'buccaneers-home-2020': { uiAccent: '#FF4D4D', onAccent: '#0a0e1a' },
  'cardinals-home-2023': { uiAccent: '#FF4D6A', onAccent: '#0a0e1a' },
  'rams-home-2020': { uiAccent: '#FFC20E', onAccent: '#0a0e1a' },
  '49ers-home-2022': { uiAccent: '#FF4D4D', onAccent: '#0a0e1a' },
  'seahawks-home-2012': { uiAccent: '#69BE28', onAccent: '#0a0e1a' },
  'seahawks-1976-throwback-1976': { uiAccent: '#3DB06A', onAccent: '#0a0e1a' },
  'buccaneers-creamsicle-1976': { uiAccent: '#FF8200', onAccent: '#0a0e1a' },
  'eagles-kelly-green-1987': { uiAccent: '#2BB673', onAccent: '#0a0e1a' },
  'broncos-orange-crush-1968': { uiAccent: '#FA4616', onAccent: '#0a0e1a' },
  'seahawks-away-2012': { uiAccent: '#69BE28', onAccent: '#0a0e1a' },
  'bills-away-2011': { uiAccent: '#5B9BFF', onAccent: '#0a0e1a' },
  'dolphins-away-2018': { uiAccent: '#2DD4D4', onAccent: '#0a0e1a' },
  'patriots-away-2020': { uiAccent: '#C8CDD6', onAccent: '#0a0e1a' },
  'jets-away-2024': { uiAccent: '#4CC38A', onAccent: '#0a0e1a' },
  'cardinals-away-2023': { uiAccent: '#FF4D6A', onAccent: '#0a0e1a' },
  'rams-away-2020': { uiAccent: '#FFC20E', onAccent: '#0a0e1a' },
  '49ers-away-2022': { uiAccent: '#FF4D4D', onAccent: '#0a0e1a' },
  'ravens-away-1996': { uiAccent: '#9E7C0C', onAccent: '#0a0e1a' },
  'bengals-away-2021': { uiAccent: '#FF6A33', onAccent: '#0a0e1a' },
  'browns-away-2020': { uiAccent: '#FF6A33', onAccent: '#0a0e1a' },
  'steelers-away-1997': { uiAccent: '#FFB612', onAccent: '#0a0e1a' },
  'texans-away-2024': { uiAccent: '#5B9BFF', onAccent: '#0a0e1a' },
  'colts-away-2004': { uiAccent: '#A2AAAD', onAccent: '#0a0e1a' },
  'jaguars-away-2018': { uiAccent: '#2DD4D4', onAccent: '#0a0e1a' },
  'titans-away-2018': { uiAccent: '#5BA8E8', onAccent: '#0a0e1a' },
  'broncos-away-2024': { uiAccent: '#FF6A33', onAccent: '#0a0e1a' },
  'chiefs-away-1963': { uiAccent: '#FF4D5E', onAccent: '#0a0e1a' },
  'raiders-away-1963': { uiAccent: '#C8CDD6', onAccent: '#0a0e1a' },
  'chargers-away-2020': { uiAccent: '#36A7E0', onAccent: '#0a0e1a' },
  'cowboys-away-1964': { uiAccent: '#869397', onAccent: '#0a0e1a' },
  'giants-away-2000': { uiAccent: '#5B9BFF', onAccent: '#0a0e1a' },
  'eagles-away-1996': { uiAccent: '#2FA3A3', onAccent: '#0a0e1a' },
  'commanders-away-2022': { uiAccent: '#FFB612', onAccent: '#0a0e1a' },
  'bears-away-1984': { uiAccent: '#FF6A33', onAccent: '#0a0e1a' },
  'lions-away-2024': { uiAccent: '#36A7E0', onAccent: '#0a0e1a' },
  'packers-away-1959': { uiAccent: '#FFB612', onAccent: '#0a0e1a' },
  'vikings-away-2013': { uiAccent: '#FFC62F', onAccent: '#0a0e1a' },
  'falcons-away-2020': { uiAccent: '#FF4D5E', onAccent: '#0a0e1a' },
  'panthers-away-2012': { uiAccent: '#36A7E0', onAccent: '#0a0e1a' },
  'saints-away-2002': { uiAccent: '#E2CC9A', onAccent: '#0a0e1a' },
  'buccaneers-away-2020': { uiAccent: '#FF4D4D', onAccent: '#0a0e1a' },
  'chargers-powder-blue-1960': { uiAccent: '#36A7E0', onAccent: '#0a0e1a' },
  'titans-oilers-throwback-1960': { uiAccent: '#5BA8E8', onAccent: '#0a0e1a' },
  'bears-orange-alternate-2005': { uiAccent: '#FF6A33', onAccent: '#0a0e1a' },
  'saints-color-rush-2022': { uiAccent: '#E2CC9A', onAccent: '#0a0e1a' },
  'jaguars-teal-throwback-1998': { uiAccent: '#2DD4D4', onAccent: '#0a0e1a' },
  'commanders-70s-burgundy-1972': { uiAccent: '#FFB612', onAccent: '#0a0e1a' },
  'vikings-purple-classic-1961': { uiAccent: '#FFC62F', onAccent: '#0a0e1a' },
  'packers-1923-throwback-1923': { uiAccent: '#CC8835', onAccent: '#0a0e1a' },
  'bills-rivalries-2025-2025': { uiAccent: '#5B9BFF', onAccent: '#0a0e1a' },
  'dolphins-rivalries-2025-2025': { uiAccent: '#2DD4D4', onAccent: '#0a0e1a' },
  'patriots-rivalries-2025-2025': { uiAccent: '#5B9BFF', onAccent: '#0a0e1a' },
  'jets-rivalries-2025-2025': { uiAccent: '#4CC38A', onAccent: '#0a0e1a' },
  'cardinals-rivalries-2025-2025': { uiAccent: '#EE6B3D', onAccent: '#0a0e1a' },
  'rams-rivalries-2025-2025': { uiAccent: '#FFC20E', onAccent: '#0a0e1a' },
  '49ers-rivalries-2025-2025': { uiAccent: '#B3995D', onAccent: '#0a0e1a' },
  'seahawks-rivalries-2025-2025': { uiAccent: '#C6D3DC', onAccent: '#0a0e1a' },
  'dolphins-1972-throwback-1966': { uiAccent: '#2DD4D4', onAccent: '#0a0e1a' },
  'patriots-pat-patriot-1961': { uiAccent: '#C8CDD6', onAccent: '#0a0e1a' },
  'jets-black-alt-2024': { uiAccent: '#4CC38A', onAccent: '#0a0e1a' },
  'steelers-bumblebee-1933': { uiAccent: '#FFB612', onAccent: '#0a0e1a' },
  'browns-1946-throwback-1946': { uiAccent: '#FF6A33', onAccent: '#0a0e1a' },
  'bengals-orange-alt-2021': { uiAccent: '#FF6A33', onAccent: '#0a0e1a' },
  'bengals-color-rush-2016': { uiAccent: '#FF6A33', onAccent: '#0a0e1a' },
  'ravens-black-alt-2004': { uiAccent: '#9E7C0C', onAccent: '#0a0e1a' },
  'texans-battle-red-2024': { uiAccent: '#5B9BFF', onAccent: '#0a0e1a' },
  'jaguars-black-alt-2018': { uiAccent: '#2DD4D4', onAccent: '#0a0e1a' },
  'titans-navy-alt-2018': { uiAccent: '#5BA8E8', onAccent: '#0a0e1a' },
  'broncos-orange-alt-2024': { uiAccent: '#FF6A33', onAccent: '#0a0e1a' },
  'giants-1980s-throwback-1980': { uiAccent: '#5B9BFF', onAccent: '#0a0e1a' },
  'eagles-black-alt-2003': { uiAccent: '#2FA3A3', onAccent: '#0a0e1a' },
  'lions-gridiron-gray-2017': { uiAccent: '#36A7E0', onAccent: '#0a0e1a' },
  'vikings-winter-warrior-2024': { uiAccent: '#FFC62F', onAccent: '#0a0e1a' },
  'packers-winter-warning-2025': { uiAccent: '#FFB612', onAccent: '#0a0e1a' },
  'falcons-red-alt-2020': { uiAccent: '#FF4D5E', onAccent: '#0a0e1a' },
  'panthers-black-alt-2012': { uiAccent: '#36A7E0', onAccent: '#0a0e1a' },
  'cardinals-black-alt-2023': { uiAccent: '#FF4D6A', onAccent: '#0a0e1a' },
  'rams-bone-2020': { uiAccent: '#FFC20E', onAccent: '#0a0e1a' },
};
