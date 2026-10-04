import type { JerseyColors, UniformKind } from '../types';
import { catalogRow } from './teams/core/catalog';
import { BENGALS_CATALOG } from './teams/bengals/catalog';
import { BUCCANEERS_CATALOG } from './teams/buccaneers/catalog';
import { BEARS_CATALOG } from './teams/bears/catalog';
import { CHARGERS_CATALOG } from './teams/chargers/catalog';
import { BILLS_CATALOG } from './teams/bills/catalog';
import { CARDINALS_CATALOG } from './teams/cardinals/catalog';
import { BROWNS_CATALOG } from './teams/browns/catalog';
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
import { RAMS_CATALOG } from './teams/rams/catalog';
import { RAVENS_CATALOG } from './teams/ravens/catalog';
import { SAINTS_CATALOG } from './teams/saints/catalog';
import { STEELERS_CATALOG } from './teams/steelers/catalog';
import { TEXANS_CATALOG } from './teams/texans/catalog';
import { TITANS_CATALOG } from './teams/titans/catalog';
import { VIKINGS_CATALOG } from './teams/vikings/catalog';
import { NINERS_CATALOG } from './teams/49ers/catalog';
import { SEAHAWKS_CATALOG } from './teams/seahawks/catalog';

// Hand-curated uniform archive. This file is the sole jersey-color authority. The seed generator
// turns these rows into an append-only SQL migration. APPEND-ONLY — never delete a kit; retire it
// with yearEnd + isCurrent.
//
// colors.primary/secondary/accent are the exact curated palette consumed by each team's
// geometry definition. They are the only colors in this file, and they describe the real
// jersey and nothing else — the type is `JerseyColors`, not `TeamColors`, precisely so a
// rendering concern cannot be smuggled back into a row.
//
// What the app paints is NOT stored here. Every surface (fill, ring, text-on-fill, the
// player-card numeral) resolves from these three via lib/utils/team-surfaces.ts. The legacy
// `ui_accent`/`on_accent` columns still exist in Postgres for iOS builds already on devices;
// their frozen values live in lib/uniforms/legacy-accents.ts and are read only by the seed
// generator.
//
// The row id is `${teamId}-${slug}-${yearStart}`.
//
// year_start/year_end describe the kit's primary era; is_current marks whether it's in a
// team's active rotation today. The database invariant requires isCurrent exactly when
// yearEnd is null.
//
// A migrated team's rows come from its catalog (teams/<team>/catalog.ts) via catalogRow, kept at
// their original positions so the generated seed is unchanged.

export interface UniformSeed {
  teamId: string;
  slug: string;
  constructionKey: string;
  kind: UniformKind;
  name: string;
  yearStart: number;
  yearEnd: number | null;
  isCurrent: boolean;
  colors: JerseyColors;
  imagePath?: string;
}

export const UNIFORMS: UniformSeed[] = [
  // Current home kits. #FFFFFF/#000000 are the listed neutral kit colors.
  // uiAccent/onAccent are the established dark-UI pair and are contrast-tested below.
  catalogRow(RAVENS_CATALOG, 'home'),
  catalogRow(BENGALS_CATALOG, 'home'),
  catalogRow(BROWNS_CATALOG, 'home'),
  catalogRow(STEELERS_CATALOG, 'home'),
  catalogRow(BILLS_CATALOG, 'home'),
  catalogRow(DOLPHINS_CATALOG, 'home'),
  catalogRow(PATRIOTS_CATALOG, 'home'),
  catalogRow(JETS_CATALOG, 'home'),
  catalogRow(TEXANS_CATALOG, 'home'),
  catalogRow(COLTS_CATALOG, 'home'),
  catalogRow(JAGUARS_CATALOG, 'home'),
  catalogRow(TITANS_CATALOG, 'home'),
  catalogRow(BRONCOS_CATALOG, 'home'),
  catalogRow(CHIEFS_CATALOG, 'home'),
  catalogRow(RAIDERS_CATALOG, 'home'),
  catalogRow(CHARGERS_CATALOG, 'home'),
  catalogRow(BEARS_CATALOG, 'home'),
  catalogRow(LIONS_CATALOG, 'home'),
  catalogRow(PACKERS_CATALOG, 'home'),
  catalogRow(VIKINGS_CATALOG, 'home'),
  catalogRow(COWBOYS_CATALOG, 'home'),
  catalogRow(GIANTS_CATALOG, 'home'),
  catalogRow(EAGLES_CATALOG, 'home'),
  catalogRow(COMMANDERS_CATALOG, 'home'),
  catalogRow(FALCONS_CATALOG, 'home'),
  catalogRow(PANTHERS_CATALOG, 'home'),
  catalogRow(SAINTS_CATALOG, 'home'),
  catalogRow(BUCCANEERS_CATALOG, 'home'),
  catalogRow(CARDINALS_CATALOG, 'home'),
  catalogRow(RAMS_CATALOG, 'home'),
  catalogRow(NINERS_CATALOG, 'home'),
  catalogRow(SEAHAWKS_CATALOG, 'home'),

  catalogRow(SEAHAWKS_CATALOG, '1976-throwback'),

  // Buccaneers 1976–1996 "Creamsicle" — reintroduced as an active alternate in 2023, so
  // is_current: true despite the historical era. Orange already reads on dark, so
  // uiAccent is the brand orange itself.
  catalogRow(BUCCANEERS_CATALOG, 'creamsicle'),

  // Eagles Kelly Green (1987–1995 era) — reintroduced as an active throwback in 2023, so
  // is_current: true. uiAccent brightens the era's deep kelly (#046A38) to clear the dark
  // UI.
  catalogRow(EAGLES_CATALOG, 'kelly-green'),
  catalogRow(EAGLES_CATALOG, 'kelly-green-modern'),

  catalogRow(BRONCOS_CATALOG, 'orange-crush'),

  // Away kits — the standard white-base road look. secondary/accent are each team's real
  // identity hexes (the trim/number color on the white jersey). First tranche (PR-A); the
  // rest follow the curation cadence. primary #FFFFFF = white base -- which is why the mark
  // resolver asks for secondary/accent before primary: a body-first rule would paint every
  // away kit's chrome white. See lib/utils/team-surfaces.ts.
  catalogRow(SEAHAWKS_CATALOG, 'away'),
  catalogRow(BILLS_CATALOG, 'away'),
  catalogRow(DOLPHINS_CATALOG, 'away'),
  catalogRow(PATRIOTS_CATALOG, 'away'),
  catalogRow(JETS_CATALOG, 'away'),
  catalogRow(CARDINALS_CATALOG, 'away'),
  catalogRow(RAMS_CATALOG, 'away'),
  catalogRow(NINERS_CATALOG, 'away'),
  // Away kits — second tranche (remaining 24 teams). Same rule as the first tranche:
  // white base; secondary = team primary, accent = the team's identity trim color.
  // Generated from lib/teams/league.ts.
  catalogRow(RAVENS_CATALOG, 'away'),
  catalogRow(BENGALS_CATALOG, 'away'),
  catalogRow(BROWNS_CATALOG, 'away'),
  catalogRow(STEELERS_CATALOG, 'away'),
  catalogRow(TEXANS_CATALOG, 'away'),
  catalogRow(COLTS_CATALOG, 'away'),
  catalogRow(JAGUARS_CATALOG, 'away'),
  catalogRow(TITANS_CATALOG, 'away'),
  catalogRow(BRONCOS_CATALOG, 'away'),
  catalogRow(CHIEFS_CATALOG, 'away'),
  catalogRow(RAIDERS_CATALOG, 'away'),
  catalogRow(CHARGERS_CATALOG, 'away'),
  catalogRow(COWBOYS_CATALOG, 'away'),
  catalogRow(GIANTS_CATALOG, 'away'),
  catalogRow(EAGLES_CATALOG, 'away'),
  catalogRow(COMMANDERS_CATALOG, 'away'),
  catalogRow(BEARS_CATALOG, 'away'),
  catalogRow(LIONS_CATALOG, 'away'),
  catalogRow(PACKERS_CATALOG, 'away'),
  catalogRow(VIKINGS_CATALOG, 'away'),
  catalogRow(FALCONS_CATALOG, 'away'),
  catalogRow(PANTHERS_CATALOG, 'away'),
  catalogRow(SAINTS_CATALOG, 'away'),
  catalogRow(BUCCANEERS_CATALOG, 'away'),
  // Throwbacks & alternates (Wave 2a) — published heritage hexes, eras verified where
  // set. uiAccent reuses each team's live dark-UI pair.
  catalogRow(CHARGERS_CATALOG, 'powder-blue'),
  catalogRow(CHARGERS_CATALOG, 'charger-power'),
  catalogRow(CHARGERS_CATALOG, 'super-chargers'),
  // Houston Oilers Columbia blue (1960-1996, per Wikipedia). Hexes: Columbia blue #4B92DB = the Oilers heritage blue, red #C8102E. isCurrent: Titans' designated throwback alternate (not worn every season).
  catalogRow(TITANS_CATALOG, 'oilers-throwback'),
  catalogRow(BEARS_CATALOG, 'orange-alternate'),
  catalogRow(SAINTS_CATALOG, 'color-rush'),
  catalogRow(JAGUARS_CATALOG, 'teal-throwback'),
  // Washington 1970s burgundy & gold (George Allen gold-helmet era). Hexes: burgundy #5A1414, gold #FFB612. uiAccent reuses the team's gold.
  catalogRow(COMMANDERS_CATALOG, '70s-burgundy'),
  // Throwbacks (Wave 2b): Vikings 1960s purple classic + Packers 1923 throwback (eyedropped).
  catalogRow(VIKINGS_CATALOG, 'purple-classic'),
  // Packers 1923 throwback (navy body, old-gold/tan numbers, leather helmets; unveiled 2025). Colors EYEDROPPED from the reveal flat-lay: secondary/uiAccent #CC8835 sampled off the number (passes 6.55:1 on #0a0e1a); primary #1B2C4E is a brightened estimate of the underexposed navy. No published hex exists.
  catalogRow(PACKERS_CATALOG, '1923-throwback'),
  // 2025 Nike 'Rivalries' kits (AFC East + NFC West). Designs from the official Nike/NFL
  // product shots; identity hexes from published heritage. Derived approximations noted per row.
  // Bills 2025 Rivalries: white base, royal/red. Heritage hexes (royal #00338D, red #C60C30).
  catalogRow(BILLS_CATALOG, 'rivalries-2025'),
  catalogRow(DOLPHINS_CATALOG, 'rivalries-2025'),
  catalogRow(PATRIOTS_CATALOG, 'rivalries-2025'),
  catalogRow(JETS_CATALOG, 'rivalries-2025'),
  catalogRow(CARDINALS_CATALOG, 'rivalries-2025'),
  catalogRow(RAMS_CATALOG, 'rivalries-2025'),
  // 49ers 2025 Rivalries: black base, gold numbers, scarlet accent. Heritage gold #B3995D (uiAccent, 7.0:1) + scarlet #AA0000.
  catalogRow(NINERS_CATALOG, 'rivalries-2025'),
  catalogRow(SEAHAWKS_CATALOG, 'rivalries-2025'),
  catalogRow(SEAHAWKS_CATALOG, 'color-rush'),
  // Wave 4: currently-worn alternates & throwbacks (heritage-derived; Browns '46 and
  // Packers Winter Warning verified from reveals). uiAccent reuses each team's live pair.
  catalogRow(DOLPHINS_CATALOG, '1972-throwback'),
  catalogRow(PATRIOTS_CATALOG, 'pat-patriot'),
  catalogRow(JETS_CATALOG, 'black-alt'),
  catalogRow(STEELERS_CATALOG, 'bumblebee'),
  // Browns 1946 throwback (verified from reveal: WHITE jersey, orange/brown stripes, black numbers). Worn 2024+.
  catalogRow(BROWNS_CATALOG, '1946-throwback'),
  catalogRow(BENGALS_CATALOG, 'orange-alt'),
  catalogRow(BENGALS_CATALOG, 'color-rush'),
  catalogRow(RAVENS_CATALOG, 'black-alt'),
  // Texans 'Battle Red' alternate. Deep red base, navy/white trim.
  catalogRow(TEXANS_CATALOG, 'battle-red'),
  catalogRow(JAGUARS_CATALOG, 'black-alt'),
  // Titans navy alternate. Navy base, Titans-blue/red trim.
  catalogRow(TITANS_CATALOG, 'navy-alt'),
  catalogRow(TITANS_CATALOG, 'titans-blue-home'),
  catalogRow(TITANS_CATALOG, 'home-2026'),
  catalogRow(TITANS_CATALOG, 'away-2026'),
  catalogRow(BRONCOS_CATALOG, 'orange-alt'),
  catalogRow(GIANTS_CATALOG, '1980s-throwback'),
  // Eagles black alternate (2020+). Black base, midnight-green/silver trim.
  catalogRow(EAGLES_CATALOG, 'black-alt'),
  // Lions 'Gridiron Gray' alternate. Silver-gray base, Honolulu-blue trim.
  catalogRow(LIONS_CATALOG, 'gridiron-gray'),
  catalogRow(VIKINGS_CATALOG, 'winter-warrior'),
  // Packers 'Winter Warning' all-white alternate (verified 2025 reveal). White base + helmet, green/gold trim.
  catalogRow(PACKERS_CATALOG, 'winter-warning'),
  catalogRow(FALCONS_CATALOG, 'red-alt'),
  // Panthers black alternate. Black base, blue/silver trim.
  catalogRow(PANTHERS_CATALOG, 'black-alt'),
  // Cardinals black alternate (2023+). Black base, cardinal-red trim.
  catalogRow(CARDINALS_CATALOG, 'black-alt'),
  catalogRow(RAMS_CATALOG, 'bone'),
  catalogRow(TEXANS_CATALOG, 'h-town'),
];
