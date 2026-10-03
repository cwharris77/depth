import type { TeamColors } from '../types';
import { catalogAccents } from './teams/core/catalog';
import { BENGALS_CATALOG } from './teams/bengals/catalog';
import { BUCCANEERS_CATALOG } from './teams/buccaneers/catalog';
import { BEARS_CATALOG } from './teams/bears/catalog';
import { CHARGERS_CATALOG } from './teams/chargers/catalog';
import { BRONCOS_CATALOG } from './teams/broncos/catalog';
import { CHIEFS_CATALOG } from './teams/chiefs/catalog';
import { COLTS_CATALOG } from './teams/colts/catalog';
import { COMMANDERS_CATALOG } from './teams/commanders/catalog';
import { COWBOYS_CATALOG } from './teams/cowboys/catalog';
import { DOLPHINS_CATALOG } from './teams/dolphins/catalog';
import { EAGLES_CATALOG } from './teams/eagles/catalog';
import { FALCONS_CATALOG } from './teams/falcons/catalog';
import { GIANTS_CATALOG } from './teams/giants/catalog';
import { JAGUARS_CATALOG } from './teams/jaguars/catalog';
import { JETS_CATALOG } from './teams/jets/catalog';
import { LIONS_CATALOG } from './teams/lions/catalog';
import { PACKERS_CATALOG } from './teams/packers/catalog';
import { PANTHERS_CATALOG } from './teams/panthers/catalog';
import { PATRIOTS_CATALOG } from './teams/patriots/catalog';
import { RAIDERS_CATALOG } from './teams/raiders/catalog';
import { NINERS_CATALOG } from './teams/49ers/catalog';
import { SEAHAWKS_CATALOG } from './teams/seahawks/catalog';

export type LegacyAccentPair = Pick<TeamColors, 'uiAccent' | 'onAccent'>;

// Hand-curated entries for teams that have not converted to a catalog yet. A converted team's
// entries move out of here into its `teams/<team>/catalog.ts` instead.
export const HAND_ACCENTS: Record<string, LegacyAccentPair> = {
  'ravens-home-1996': { uiAccent: '#9E7C0C', onAccent: '#0a0e1a' },
  'browns-home-2020': { uiAccent: '#FF6A33', onAccent: '#0a0e1a' },
  'steelers-home-1997': { uiAccent: '#FFB612', onAccent: '#0a0e1a' },
  'bills-home-2011': { uiAccent: '#5B9BFF', onAccent: '#0a0e1a' },
  'texans-home-2024': { uiAccent: '#5B9BFF', onAccent: '#0a0e1a' },
  'titans-home-2018': { uiAccent: '#5BA8E8', onAccent: '#0a0e1a' },
  'vikings-home-2013': { uiAccent: '#FFC62F', onAccent: '#0a0e1a' },
  'saints-home-2002': { uiAccent: '#E2CC9A', onAccent: '#0a0e1a' },
  'cardinals-home-2023': { uiAccent: '#FF4D6A', onAccent: '#0a0e1a' },
  'rams-home-2020': { uiAccent: '#FFC20E', onAccent: '#0a0e1a' },
  'bills-away-2011': { uiAccent: '#5B9BFF', onAccent: '#0a0e1a' },
  'cardinals-away-2023': { uiAccent: '#FF4D6A', onAccent: '#0a0e1a' },
  'rams-away-2020': { uiAccent: '#FFC20E', onAccent: '#0a0e1a' },
  'ravens-away-1996': { uiAccent: '#9E7C0C', onAccent: '#0a0e1a' },
  'browns-away-2020': { uiAccent: '#FF6A33', onAccent: '#0a0e1a' },
  'steelers-away-1997': { uiAccent: '#FFB612', onAccent: '#0a0e1a' },
  'texans-away-2024': { uiAccent: '#5B9BFF', onAccent: '#0a0e1a' },
  'titans-away-2018': { uiAccent: '#5BA8E8', onAccent: '#0a0e1a' },
  'vikings-away-2013': { uiAccent: '#FFC62F', onAccent: '#0a0e1a' },
  'saints-away-2002': { uiAccent: '#E2CC9A', onAccent: '#0a0e1a' },
  'titans-oilers-throwback-1960': { uiAccent: '#5BA8E8', onAccent: '#0a0e1a' },
  'saints-color-rush-2022': { uiAccent: '#E2CC9A', onAccent: '#0a0e1a' },
  'vikings-purple-classic-1961': { uiAccent: '#FFC62F', onAccent: '#0a0e1a' },
  'bills-rivalries-2025-2025': { uiAccent: '#5B9BFF', onAccent: '#0a0e1a' },
  'cardinals-rivalries-2025-2025': { uiAccent: '#EE6B3D', onAccent: '#0a0e1a' },
  'rams-rivalries-2025-2025': { uiAccent: '#FFC20E', onAccent: '#0a0e1a' },
  'steelers-bumblebee-1933': { uiAccent: '#FFB612', onAccent: '#0a0e1a' },
  'browns-1946-throwback-1946': { uiAccent: '#FF6A33', onAccent: '#0a0e1a' },
  'ravens-black-alt-2004': { uiAccent: '#9E7C0C', onAccent: '#0a0e1a' },
  'texans-battle-red-2024': { uiAccent: '#5B9BFF', onAccent: '#0a0e1a' },
  'titans-navy-alt-2018': { uiAccent: '#5BA8E8', onAccent: '#0a0e1a' },
  'vikings-winter-warrior-2024': { uiAccent: '#FFC62F', onAccent: '#0a0e1a' },
  'cardinals-black-alt-2023': { uiAccent: '#FF4D6A', onAccent: '#0a0e1a' },
  'rams-bone-2020': { uiAccent: '#FFC20E', onAccent: '#0a0e1a' },
};

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
//     deriving it would rewrite 91 rows from #0a0e1a to #15161a (the app ground moved) for
//     no benefit, and would break the byte-identical-migration check that proves this
//     refactor is a no-op for shipped builds.
//
// Retirement is blocked on an armed forced-update gate plus pre-gate installs draining.
//
// A new kit needs an entry here: use `teamRing()` from lib/utils/team-surfaces.ts for
// uiAccent (legible by construction) and `readableTextOn()` for onAccent.
export const LEGACY_ACCENTS: Record<string, LegacyAccentPair> = {
  ...HAND_ACCENTS,
  ...catalogAccents(BEARS_CATALOG),
  ...catalogAccents(BENGALS_CATALOG),
  ...catalogAccents(CHARGERS_CATALOG),
  ...catalogAccents(BRONCOS_CATALOG),
  ...catalogAccents(BUCCANEERS_CATALOG),
  ...catalogAccents(CHIEFS_CATALOG),
  ...catalogAccents(COLTS_CATALOG),
  ...catalogAccents(COMMANDERS_CATALOG),
  ...catalogAccents(COWBOYS_CATALOG),
  ...catalogAccents(DOLPHINS_CATALOG),
  ...catalogAccents(EAGLES_CATALOG),
  ...catalogAccents(FALCONS_CATALOG),
  ...catalogAccents(GIANTS_CATALOG),
  ...catalogAccents(JAGUARS_CATALOG),
  ...catalogAccents(JETS_CATALOG),
  ...catalogAccents(LIONS_CATALOG),
  ...catalogAccents(PACKERS_CATALOG),
  ...catalogAccents(PANTHERS_CATALOG),
  ...catalogAccents(PATRIOTS_CATALOG),
  ...catalogAccents(RAIDERS_CATALOG),
  ...catalogAccents(NINERS_CATALOG),
  ...catalogAccents(SEAHAWKS_CATALOG),
};
