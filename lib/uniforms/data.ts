import type { JerseyColors, UniformKind } from '../types';

// Hand-curated uniform archive (roadmap Phase 7). This file is the sole jersey-color
// authority: hexes come from teamcolorcodes.com, while kit patterns and era boundaries come
// from GUD (gridiron-uniforms.com). The seed generator turns these rows into an append-only
// SQL migration. APPEND-ONLY — never delete a kit; retire it with yearEnd + isCurrent.
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
// generator. Design: ../../obsidian/Projects/depth/specs/
// 2026-09-01-team-color-surface-rules-design.md.
//
// The row id is `${teamId}-${slug}-${yearStart}`.
//
// year_start/year_end describe the kit's primary era; is_current marks whether it's in a
// team's active rotation today. The database invariant requires isCurrent exactly when
// yearEnd is null.

export interface UniformSeed {
  teamId: string;
  slug: string;
  kind: UniformKind;
  name: string;
  yearStart: number;
  yearEnd: number | null;
  isCurrent: boolean;
  colors: JerseyColors;
  imagePath?: string;
}

export const UNIFORMS: UniformSeed[] = [
  // Current home kits. Era starts/patterns: each team's GUD archive. Jersey hexes:
  // teamcolorcodes.com's NFL HEX table; #FFFFFF/#000000 are the listed neutral kit colors.
  // uiAccent/onAccent are the established dark-UI pair and are contrast-tested below.
  {
    teamId: 'ravens',
    slug: 'home',
    kind: 'home',
    name: 'Home',
    yearStart: 1996,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#241773',
      secondary: '#000000',
      accent: '#9E7C0C',
    },
  },
  {
    teamId: 'bengals',
    slug: 'home',
    kind: 'home',
    name: 'Home',
    yearStart: 2021,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#FB4F14',
      secondary: '#000000',
      accent: '#000000',
    },
  },
  {
    teamId: 'browns',
    slug: 'home',
    kind: 'home',
    name: 'Home',
    yearStart: 2020,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#311D00',
      secondary: '#FF3C00',
      accent: '#FF3C00',
    },
  },
  {
    teamId: 'steelers',
    slug: 'home',
    kind: 'home',
    name: 'Home',
    yearStart: 1997,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#FFB612',
      secondary: '#101820',
      accent: '#101820',
    },
  },
  {
    teamId: 'bills',
    slug: 'home',
    kind: 'home',
    name: 'Home',
    yearStart: 2011,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#00338D',
      secondary: '#C60C30',
      accent: '#C60C30',
    },
  },
  {
    teamId: 'dolphins',
    slug: 'home',
    kind: 'home',
    name: 'Home',
    yearStart: 2018,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#008E97',
      secondary: '#FC4C02',
      accent: '#FC4C02',
    },
  },
  {
    teamId: 'patriots',
    slug: 'home',
    kind: 'home',
    name: 'Home',
    yearStart: 2020,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#002244',
      secondary: '#C60C30',
      accent: '#B0B7BC',
    },
  },
  {
    teamId: 'jets',
    slug: 'home',
    kind: 'home',
    name: 'Home',
    yearStart: 2024,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#125740',
      secondary: '#FFFFFF',
      accent: '#FFFFFF',
    },
  },
  {
    teamId: 'texans',
    slug: 'home',
    kind: 'home',
    name: 'Home',
    yearStart: 2024,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#03202F',
      secondary: '#A71930',
      accent: '#A71930',
    },
  },
  {
    teamId: 'colts',
    slug: 'home',
    kind: 'home',
    name: 'Home',
    yearStart: 2004,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#002C5F',
      secondary: '#A2AAAD',
      accent: '#A2AAAD',
    },
  },
  {
    teamId: 'jaguars',
    slug: 'home',
    kind: 'home',
    name: 'Home',
    yearStart: 2018,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#006778',
      secondary: '#D7A22A',
      accent: '#D7A22A',
    },
  },
  {
    teamId: 'titans',
    slug: 'home',
    kind: 'home',
    name: 'Home',
    yearStart: 2018,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#0C2340',
      secondary: '#4B92DB',
      accent: '#4B92DB',
    },
  },
  {
    teamId: 'broncos',
    slug: 'home',
    kind: 'home',
    name: 'Home',
    yearStart: 2024,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#FB4F14',
      secondary: '#002244',
      accent: '#002244',
    },
  },
  {
    teamId: 'chiefs',
    slug: 'home',
    kind: 'home',
    name: 'Home',
    yearStart: 1963,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#E31837',
      secondary: '#FFB81C',
      accent: '#FFB81C',
    },
  },
  {
    teamId: 'raiders',
    slug: 'home',
    kind: 'home',
    name: 'Home',
    yearStart: 1963,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#000000',
      secondary: '#A5ACAF',
      accent: '#A5ACAF',
    },
  },
  {
    teamId: 'chargers',
    slug: 'home',
    kind: 'home',
    name: 'Home',
    yearStart: 2020,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#0080C6',
      secondary: '#FFC20E',
      accent: '#FFC20E',
    },
  },
  {
    teamId: 'bears',
    slug: 'home',
    kind: 'home',
    name: 'Home',
    yearStart: 1984,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#0B162A',
      secondary: '#C83803',
      accent: '#C83803',
    },
  },
  {
    teamId: 'lions',
    slug: 'home',
    kind: 'home',
    name: 'Home',
    yearStart: 2024,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#0076B6',
      secondary: '#B0B7BC',
      accent: '#B0B7BC',
    },
  },
  {
    teamId: 'packers',
    slug: 'home',
    kind: 'home',
    name: 'Home',
    yearStart: 1959,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#203731',
      secondary: '#FFB612',
      accent: '#FFB612',
    },
  },
  {
    teamId: 'vikings',
    slug: 'home',
    kind: 'home',
    name: 'Home',
    yearStart: 2013,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#4F2683',
      secondary: '#FFC62F',
      accent: '#FFC62F',
    },
  },
  {
    teamId: 'cowboys',
    slug: 'home',
    kind: 'home',
    name: 'Home',
    yearStart: 1964,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#003594',
      secondary: '#869397',
      accent: '#869397',
    },
  },
  {
    teamId: 'giants',
    slug: 'home',
    kind: 'home',
    name: 'Home',
    yearStart: 2000,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#0B2265',
      secondary: '#A71930',
      accent: '#A71930',
    },
  },
  {
    teamId: 'eagles',
    slug: 'home',
    kind: 'home',
    name: 'Home',
    yearStart: 1996,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#004C54',
      secondary: '#A5ACAF',
      accent: '#A5ACAF',
    },
  },
  {
    teamId: 'commanders',
    slug: 'home',
    kind: 'home',
    name: 'Home',
    yearStart: 2022,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#5A1414',
      secondary: '#FFB612',
      accent: '#FFB612',
    },
  },
  {
    teamId: 'falcons',
    slug: 'home',
    kind: 'home',
    name: 'Home',
    yearStart: 2020,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#A71930',
      secondary: '#000000',
      accent: '#000000',
    },
  },
  {
    teamId: 'panthers',
    slug: 'home',
    kind: 'home',
    name: 'Home',
    yearStart: 2012,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#0085CA',
      secondary: '#101820',
      accent: '#101820',
    },
  },
  {
    teamId: 'saints',
    slug: 'home',
    kind: 'home',
    name: 'Home',
    yearStart: 2002,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#D3BC8D',
      secondary: '#101820',
      accent: '#101820',
    },
  },
  {
    teamId: 'buccaneers',
    slug: 'home',
    kind: 'home',
    name: 'Home',
    yearStart: 2020,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#D50A0A',
      secondary: '#34302B',
      accent: '#FF7900',
    },
  },
  {
    teamId: 'cardinals',
    slug: 'home',
    kind: 'home',
    name: 'Home',
    yearStart: 2023,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#97233F',
      secondary: '#000000',
      accent: '#FFB612',
    },
  },
  {
    teamId: 'rams',
    slug: 'home',
    kind: 'home',
    name: 'Home',
    yearStart: 2020,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#003594',
      secondary: '#FFA300',
      accent: '#FFA300',
    },
  },
  {
    teamId: '49ers',
    slug: 'home',
    kind: 'home',
    name: 'Home',
    yearStart: 2022,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#AA0000',
      secondary: '#B3995D',
      accent: '#B3995D',
    },
  },
  {
    teamId: 'seahawks',
    slug: 'home',
    kind: 'home',
    name: 'Home',
    yearStart: 2012,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#002244',
      secondary: '#69BE28',
      accent: '#A5ACAF',
    },
  },

  // Seahawks 1976–2001 royal/green/silver original — a retired throwback (not in the
  // current rotation). Hexes: teamcolorcodes historical Seahawks. uiAccent brightens the
  // era's green so it reads on the dark UI (the royal #003087 is far too dark).
  {
    teamId: 'seahawks',
    slug: '1976-throwback',
    kind: 'throwback',
    name: '1976 Throwback',
    yearStart: 1976,
    yearEnd: 2001,
    isCurrent: false,
    colors: {
      primary: '#003087',
      secondary: '#046A38',
      accent: '#8A8D8F',
    },
  },

  // Buccaneers 1976–1996 "Creamsicle" — reintroduced as an active alternate in 2023, so
  // is_current: true despite the historical era. Orange already reads on dark, so
  // uiAccent is the brand orange itself. Hexes: teamcolorcodes original/creamsicle.
  {
    teamId: 'buccaneers',
    slug: 'creamsicle',
    kind: 'throwback',
    name: 'Creamsicle',
    yearStart: 1976,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#FF8200',
      secondary: '#C8102E',
      accent: '#FFFFFF',
    },
  },

  // Eagles Kelly Green (1987–1995 era) — reintroduced as an active throwback in 2023, so
  // is_current: true. uiAccent brightens the era's deep kelly (#046A38) to clear the dark
  // UI. Hexes: teamcolorcodes historical Eagles green + jersey silver.
  {
    teamId: 'eagles',
    slug: 'kelly-green',
    kind: 'throwback',
    name: 'Kelly Green',
    yearStart: 1987,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#046A38',
      secondary: '#A5ACAF',
      accent: '#FFFFFF',
    },
  },

  // Broncos 1968–1996 royal-blue "Orange Crush" — a retired throwback (the modern kit is
  // navy/orange). The royal #001489 is too dark for the UI, so uiAccent is the era's
  // orange, which reads well. Hexes: teamcolorcodes historical Broncos.
  {
    teamId: 'broncos',
    slug: 'orange-crush',
    kind: 'throwback',
    name: 'Orange Crush',
    yearStart: 1968,
    yearEnd: 1996,
    isCurrent: false,
    colors: {
      primary: '#001489',
      secondary: '#FA4616',
      accent: '#FFFFFF',
    },
  },

  // Away kits — the standard white-base road look. secondary/accent are each team's real
  // identity hexes (the trim/number color on the white jersey); uiAccent/onAccent reuse the
  // team's live dark-UI pair, so they already clear the AA contrast gate on #0a0e1a. First
  // tranche (PR-A); the rest follow the curation cadence. primary #FFFFFF = white base.
  {
    teamId: 'seahawks',
    slug: 'away',
    kind: 'away',
    name: 'Away',
    yearStart: 2012,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#FFFFFF',
      secondary: '#002244',
      accent: '#69BE28',
    },
  },
  {
    teamId: 'bills',
    slug: 'away',
    kind: 'away',
    name: 'Away',
    yearStart: 2011,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#FFFFFF',
      secondary: '#00338D',
      accent: '#C60C30',
    },
  },
  {
    teamId: 'dolphins',
    slug: 'away',
    kind: 'away',
    name: 'Away',
    yearStart: 2018,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#FFFFFF',
      secondary: '#008E97',
      accent: '#FC4C02',
    },
  },
  {
    teamId: 'patriots',
    slug: 'away',
    kind: 'away',
    name: 'Away',
    yearStart: 2020,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#FFFFFF',
      secondary: '#002244',
      accent: '#C60C30',
    },
  },
  {
    teamId: 'jets',
    slug: 'away',
    kind: 'away',
    name: 'Away',
    yearStart: 2024,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#FFFFFF',
      secondary: '#125740',
      accent: '#125740',
    },
  },
  {
    teamId: 'cardinals',
    slug: 'away',
    kind: 'away',
    name: 'Away',
    yearStart: 2023,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#FFFFFF',
      secondary: '#97233F',
      accent: '#FFB612',
    },
  },
  {
    teamId: 'rams',
    slug: 'away',
    kind: 'away',
    name: 'Away',
    yearStart: 2020,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#FFFFFF',
      secondary: '#003594',
      accent: '#FFA300',
    },
  },
  {
    teamId: '49ers',
    slug: 'away',
    kind: 'away',
    name: 'Away',
    yearStart: 2022,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#FFFFFF',
      secondary: '#AA0000',
      accent: '#B3995D',
    },
  },
  // Away kits — second tranche (remaining 24 teams). Same rule as the first tranche:
  // white base; secondary = team primary, accent = the team's identity trim color;
  // uiAccent/onAccent reuse each team's live dark-UI pair (already AA-clear on #0a0e1a).
  // Generated from lib/teams/league.ts.
  {
    teamId: 'ravens',
    slug: 'away',
    kind: 'away',
    name: 'Away',
    yearStart: 1996,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#FFFFFF',
      secondary: '#241773',
      accent: '#9E7C0C',
    },
  },
  {
    teamId: 'bengals',
    slug: 'away',
    kind: 'away',
    name: 'Away',
    yearStart: 2021,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#FFFFFF',
      secondary: '#FB4F14',
      accent: '#FB4F14',
    },
  },
  {
    teamId: 'browns',
    slug: 'away',
    kind: 'away',
    name: 'Away',
    yearStart: 2020,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#FFFFFF',
      secondary: '#311D00',
      accent: '#FF3C00',
    },
  },
  {
    teamId: 'steelers',
    slug: 'away',
    kind: 'away',
    name: 'Away',
    yearStart: 1997,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#FFFFFF',
      secondary: '#FFB612',
      accent: '#101820',
    },
  },
  {
    teamId: 'texans',
    slug: 'away',
    kind: 'away',
    name: 'Away',
    yearStart: 2024,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#FFFFFF',
      secondary: '#03202F',
      accent: '#A71930',
    },
  },
  {
    teamId: 'colts',
    slug: 'away',
    kind: 'away',
    name: 'Away',
    yearStart: 2004,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#FFFFFF',
      secondary: '#002C5F',
      accent: '#A2AAAD',
    },
  },
  {
    teamId: 'jaguars',
    slug: 'away',
    kind: 'away',
    name: 'Away',
    yearStart: 2018,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#FFFFFF',
      secondary: '#006778',
      accent: '#D7A22A',
    },
  },
  {
    teamId: 'titans',
    slug: 'away',
    kind: 'away',
    name: 'Away',
    yearStart: 2018,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#FFFFFF',
      secondary: '#0C2340',
      accent: '#4B92DB',
    },
  },
  {
    teamId: 'broncos',
    slug: 'away',
    kind: 'away',
    name: 'Away',
    yearStart: 2024,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#FFFFFF',
      secondary: '#FB4F14',
      accent: '#002244',
    },
  },
  {
    teamId: 'chiefs',
    slug: 'away',
    kind: 'away',
    name: 'Away',
    yearStart: 1963,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#FFFFFF',
      secondary: '#E31837',
      accent: '#FFB81C',
    },
  },
  {
    teamId: 'raiders',
    slug: 'away',
    kind: 'away',
    name: 'Away',
    yearStart: 1963,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#FFFFFF',
      secondary: '#000000',
      accent: '#A5ACAF',
    },
  },
  {
    teamId: 'chargers',
    slug: 'away',
    kind: 'away',
    name: 'Away',
    yearStart: 2020,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#FFFFFF',
      secondary: '#0080C6',
      accent: '#FFC20E',
    },
  },
  {
    teamId: 'cowboys',
    slug: 'away',
    kind: 'away',
    name: 'Away',
    yearStart: 1964,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#FFFFFF',
      secondary: '#003594',
      accent: '#869397',
    },
  },
  {
    teamId: 'giants',
    slug: 'away',
    kind: 'away',
    name: 'Away',
    yearStart: 2000,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#FFFFFF',
      secondary: '#0B2265',
      accent: '#A71930',
    },
  },
  {
    teamId: 'eagles',
    slug: 'away',
    kind: 'away',
    name: 'Away',
    yearStart: 1996,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#FFFFFF',
      secondary: '#004C54',
      accent: '#A5ACAF',
    },
  },
  {
    teamId: 'commanders',
    slug: 'away',
    kind: 'away',
    name: 'Away',
    yearStart: 2022,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#FFFFFF',
      secondary: '#5A1414',
      accent: '#FFB612',
    },
  },
  {
    teamId: 'bears',
    slug: 'away',
    kind: 'away',
    name: 'Away',
    yearStart: 1984,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#FFFFFF',
      secondary: '#0B162A',
      accent: '#C83803',
    },
  },
  {
    teamId: 'lions',
    slug: 'away',
    kind: 'away',
    name: 'Away',
    yearStart: 2024,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#FFFFFF',
      secondary: '#0076B6',
      accent: '#B0B7BC',
    },
  },
  {
    teamId: 'packers',
    slug: 'away',
    kind: 'away',
    name: 'Away',
    yearStart: 1959,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#FFFFFF',
      secondary: '#203731',
      accent: '#FFB612',
    },
  },
  {
    teamId: 'vikings',
    slug: 'away',
    kind: 'away',
    name: 'Away',
    yearStart: 2013,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#FFFFFF',
      secondary: '#4F2683',
      accent: '#FFC62F',
    },
  },
  {
    teamId: 'falcons',
    slug: 'away',
    kind: 'away',
    name: 'Away',
    yearStart: 2020,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#FFFFFF',
      secondary: '#A71930',
      accent: '#A71930',
    },
  },
  {
    teamId: 'panthers',
    slug: 'away',
    kind: 'away',
    name: 'Away',
    yearStart: 2012,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#FFFFFF',
      secondary: '#0085CA',
      accent: '#101820',
    },
  },
  {
    teamId: 'saints',
    slug: 'away',
    kind: 'away',
    name: 'Away',
    yearStart: 2002,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#FFFFFF',
      secondary: '#D3BC8D',
      accent: '#101820',
    },
  },
  {
    teamId: 'buccaneers',
    slug: 'away',
    kind: 'away',
    name: 'Away',
    yearStart: 2020,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#FFFFFF',
      secondary: '#D50A0A',
      accent: '#34302B',
    },
  },
  // Throwbacks & alternates (Wave 2a) — published heritage hexes (teamcolorcodes),
  // eras verified where set. uiAccent reuses each team's live dark-UI pair.
  // Chargers AFL powder blue, worn as a current alternate. Hexes: teamcolorcodes (powder blue #0080C6, sunshine gold #FFC20E). uiAccent reuses the team's dark-UI blue.
  {
    teamId: 'chargers',
    slug: 'powder-blue',
    kind: 'alternate',
    name: 'Powder Blue',
    yearStart: 1960,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#0080C6',
      secondary: '#FFC20E',
      accent: '#FFFFFF',
    },
  },
  // Houston Oilers Columbia blue (1960-1996, per Wikipedia). Hexes: teamcolorcodes Titans page (Columbia blue #4B92DB = the Oilers heritage blue, red #C8102E). isCurrent: Titans' designated throwback alternate (not worn every season).
  {
    teamId: 'titans',
    slug: 'oilers-throwback',
    kind: 'throwback',
    name: 'Oilers Throwback',
    yearStart: 1960,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#4B92DB',
      secondary: '#C8102E',
      accent: '#FFFFFF',
    },
  },
  // Bears orange alternate (modern alt, no throwback era). Hexes: teamcolorcodes (orange #C83803, navy #0B162A). uiAccent reuses the team's brightened orange.
  {
    teamId: 'bears',
    slug: 'orange-alternate',
    kind: 'alternate',
    name: 'Orange Alternate',
    yearStart: 2005,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#C83803',
      secondary: '#0B162A',
      accent: '#FFFFFF',
    },
  },
  // Saints all-black Color Rush (2016+). Hexes: teamcolorcodes (black #101820, old gold #D3BC8D). uiAccent reuses the team's bright gold.
  {
    teamId: 'saints',
    slug: 'color-rush',
    kind: 'color-rush',
    name: 'Color Rush',
    yearStart: 2022,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#101820',
      secondary: '#D3BC8D',
      accent: '#D3BC8D',
    },
  },
  // Jaguars "Prowler Throwback" — recreates the 1998-2008 original teal design (curved
  // three-color numbers, running-jaguar sleeve patch); the team's primary color from
  // 1995-2008 before black took over 2009-2020, then dormant until this recreation
  // debuted 2024 (jaguars.com). yearStart is the era it recreates, matching the app's
  // other current throwbacks (Packers 1923 Throwback, Eagles Kelly Green), not the 2024
  // revival year. Hexes: teamcolorcodes (teal #006778, gold #D7A22A, black #101820).
  // uiAccent reuses the team's bright teal.
  {
    teamId: 'jaguars',
    slug: 'teal-throwback',
    kind: 'throwback',
    name: 'Prowler Throwback',
    yearStart: 1998,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#006778',
      secondary: '#D7A22A',
      accent: '#101820',
    },
  },
  // Washington 1970s burgundy & gold (George Allen gold-helmet era). Hexes: teamcolorcodes Commanders (burgundy #5A1414, gold #FFB612). uiAccent reuses the team's gold.
  {
    teamId: 'commanders',
    slug: '70s-burgundy',
    kind: 'throwback',
    name: '70s Burgundy',
    yearStart: 1972,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#5A1414',
      secondary: '#FFB612',
      accent: '#FFFFFF',
    },
  },
  // Throwbacks (Wave 2b): Vikings 1960s purple classic + Packers 1923 throwback (eyedropped).
  // Vikings 1960s purple classic (gold-trim numbers, per Wikipedia; retired era). Hexes: teamcolorcodes (purple #4F2683, gold #FFC62F). uiAccent reuses the team's gold.
  {
    teamId: 'vikings',
    slug: 'purple-classic',
    kind: 'throwback',
    name: 'Purple Classic',
    yearStart: 1961,
    yearEnd: 1969,
    isCurrent: false,
    colors: {
      primary: '#4F2683',
      secondary: '#FFC62F',
      accent: '#FFFFFF',
    },
  },
  // Packers 1923 throwback (navy body, old-gold/tan numbers, leather helmets; unveiled 2025). Colors EYEDROPPED from the reveal flat-lay: secondary/uiAccent #CC8835 sampled off the number (passes 6.55:1 on #0a0e1a); primary #1B2C4E is a brightened estimate of the underexposed navy. No published hex exists.
  {
    teamId: 'packers',
    slug: '1923-throwback',
    kind: 'throwback',
    name: '1923 Throwback',
    yearStart: 1923,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#1B2C4E',
      secondary: '#CC8835',
      accent: '#FFFFFF',
    },
  },
  // 2025 Nike 'Rivalries' kits (AFC East + NFC West). Designs from the official Nike/NFL
  // product shots; identity hexes from published heritage. Derived approximations noted per row.
  // Bills 2025 Rivalries: white base, royal/red. Heritage hexes (royal #00338D, red #C60C30).
  {
    teamId: 'bills',
    slug: 'rivalries-2025',
    kind: 'alternate',
    name: 'Rivalries',
    yearStart: 2025,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#FFFFFF',
      secondary: '#00338D',
      accent: '#C60C30',
    },
  },
  // Dolphins 2025 Rivalries: black base, aqua/orange. Heritage accents (aqua #008E97, orange #FC4C02).
  {
    teamId: 'dolphins',
    slug: 'rivalries-2025',
    kind: 'alternate',
    name: 'Rivalries',
    yearStart: 2025,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#101820',
      secondary: '#008E97',
      accent: '#FC4C02',
    },
  },
  // Patriots 2025 Rivalries: Pat-Patriot-style royal fauxback. primary #002F6C is a derived royal (brighter than current navy); red/white heritage.
  {
    teamId: 'patriots',
    slug: 'rivalries-2025',
    kind: 'alternate',
    name: 'Rivalries',
    yearStart: 2025,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#002F6C',
      secondary: '#C60C30',
      accent: '#FFFFFF',
    },
  },
  // Jets 2025 Rivalries 'Gotham': dark green base, black/white. Heritage green #115740.
  {
    teamId: 'jets',
    slug: 'rivalries-2025',
    kind: 'alternate',
    name: 'Rivalries',
    yearStart: 2025,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#115740',
      secondary: '#000000',
      accent: '#FFFFFF',
    },
  },
  // Cardinals 2025 Rivalries. Corrected from a white/cardinal/black guess (the original comment
  // noted the reveal was shot under red stage lighting, which is what it was read from) after
  // checking it against the GUD 2025 composite: it is a sandstone kit — speckled cream body and
  // shell, a brighter red than heritage cardinal, and an orange offset on the numerals. Black
  // appears nowhere on it. All three sampled from that composite; same caveat as every GUD
  // sample, its renderings run a step brighter than official hexes. uiAccent is the orange, which
  // clears AA on the dark UI at 6.24 where the kit's red is 2.80.
  {
    teamId: 'cardinals',
    slug: 'rivalries-2025',
    kind: 'alternate',
    name: 'Rivalries',
    yearStart: 2025,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#FFF7E3',
      secondary: '#B31529',
      accent: '#EE6B3D',
    },
  },
  // Rams 2025 'Midnight Mode': navy body, gold horns/numbers. primary #0D1B3E derived (reveal underexposed near-black); gold #FFD100 (Rams sol).
  {
    teamId: 'rams',
    slug: 'rivalries-2025',
    kind: 'alternate',
    name: 'Rivalries',
    yearStart: 2025,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#0D1B3E',
      secondary: '#FFD100',
      accent: '#FFFFFF',
    },
  },
  // 49ers 2025 Rivalries: black base, gold numbers, scarlet accent. Heritage gold #B3995D (uiAccent, 7.0:1) + scarlet #AA0000.
  {
    teamId: '49ers',
    slug: 'rivalries-2025',
    kind: 'alternate',
    name: 'Rivalries',
    yearStart: 2025,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#101820',
      secondary: '#B3995D',
      accent: '#AA0000',
    },
  },
  // Seahawks 2025 Rivalries. Corrected from a wolf-grey/action-green guess after checking the kit
  // against the GUD 2025 composite: the body is an ice blue-grey, not wolf grey, and the kit's
  // green is a muted pine — action green appears nowhere on it. primary/accent sampled from that
  // composite (#C6D3DC body, #29594C number and shoulder print); secondary is heritage College
  // Navy #002244 (teamcolorcodes), which GUD renders as #24293C exactly as it renders the same
  // navy on the home kit. Caveat: GUD's renderings run a step lighter than official hexes (its
  // navy is that #24293C), so the two sampled values are approximations pending a published hex.
  // uiAccent is the ice body because both the pine (2.41) and the kit's teal shell (1.57) fail AA
  // against the dark UI background — see the contrast tests in lib/__tests__/uniforms.test.ts.
  {
    teamId: 'seahawks',
    slug: 'rivalries-2025',
    kind: 'alternate',
    name: 'Rivalries',
    yearStart: 2025,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#C6D3DC',
      secondary: '#002244',
      accent: '#29594C',
    },
  },
  // Wave 4: currently-worn alternates & throwbacks (heritage-derived; Browns '46 and
  // Packers Winter Warning verified from reveals). uiAccent reuses each team's live pair.
  // Dolphins 1972 perfect-season aqua throwback. Heritage aqua/orange; throwback aqua reads slightly lighter in person (no published hex).
  {
    teamId: 'dolphins',
    slug: '1972-throwback',
    kind: 'throwback',
    name: '1972 Throwback',
    yearStart: 1966,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#008E97',
      secondary: '#FC4C02',
      accent: '#FFFFFF',
    },
  },
  // Patriots 'Pat Patriot' red throwback (worn 2022+). Red #C8102E over royal #002F6C, white numbers.
  {
    teamId: 'patriots',
    slug: 'pat-patriot',
    kind: 'throwback',
    name: 'Pat Patriot',
    yearStart: 1961,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#C8102E',
      secondary: '#002F6C',
      accent: '#FFFFFF',
    },
  },
  // Jets black alternate (2024+). Black base, gotham-green trim.
  {
    teamId: 'jets',
    slug: 'black-alt',
    kind: 'alternate',
    name: 'Black Alternate',
    yearStart: 2024,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#000000',
      secondary: '#125740',
      accent: '#FFFFFF',
    },
  },
  // Steelers 1934 'Bumblebee' block-stripe throwback (actively worn). Black base, gold stripes.
  {
    teamId: 'steelers',
    slug: 'bumblebee',
    kind: 'throwback',
    name: 'Bumblebee',
    yearStart: 1933,
    yearEnd: 1934,
    isCurrent: false,
    colors: {
      primary: '#101820',
      secondary: '#FFB612',
      accent: '#FFFFFF',
    },
  },
  // Browns 1946 throwback (verified from reveal: WHITE jersey, orange/brown stripes, black numbers). Worn 2024+.
  {
    teamId: 'browns',
    slug: '1946-throwback',
    kind: 'throwback',
    name: '1946 Throwback',
    yearStart: 1946,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#FFFFFF',
      secondary: '#FF3C00',
      accent: '#311D00',
    },
  },
  // Bengals orange alternate. Orange base, black tiger stripes.
  {
    teamId: 'bengals',
    slug: 'orange-alt',
    kind: 'alternate',
    name: 'Orange Alternate',
    yearStart: 2021,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#FB4F14',
      secondary: '#000000',
      accent: '#FFFFFF',
    },
  },
  // Bengals Color Rush. All white — "a nod to the white tiger" per Cincinnati's own unveiling
  // (Bengals.com, "Bengals Unveil Color Rush Jerseys", Sept 13 2016). First worn 9/29/2016
  // (TNF vs Miami), last worn 11/20/2022; paused for the 2021 season.
  {
    teamId: 'bengals',
    slug: 'color-rush',
    kind: 'color-rush',
    name: 'Color Rush',
    yearStart: 2016,
    yearEnd: 2022,
    isCurrent: false,
    colors: {
      primary: '#FFFFFF',
      secondary: '#000000',
      accent: '#000000',
    },
  },
  // Ravens black alternate. Black base, purple/gold trim.
  {
    teamId: 'ravens',
    slug: 'black-alt',
    kind: 'alternate',
    name: 'Black Alternate',
    yearStart: 2004,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#000000',
      secondary: '#241773',
      accent: '#9E7C0C',
    },
  },
  // Texans 'Battle Red' alternate. Deep red base, navy/white trim.
  {
    teamId: 'texans',
    slug: 'battle-red',
    kind: 'alternate',
    name: 'Battle Red',
    yearStart: 2024,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#A71930',
      secondary: '#03202F',
      accent: '#FFFFFF',
    },
  },
  // Jaguars black alternate. Black base, gold/teal trim.
  {
    teamId: 'jaguars',
    slug: 'black-alt',
    kind: 'alternate',
    name: 'Black Alternate',
    yearStart: 2018,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#101820',
      secondary: '#D7A22A',
      accent: '#006778',
    },
  },
  // Titans navy alternate. Navy base, Titans-blue/red trim.
  {
    teamId: 'titans',
    slug: 'navy-alt',
    kind: 'alternate',
    name: 'Navy Alternate',
    yearStart: 2018,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#0C2340',
      secondary: '#4B92DB',
      accent: '#C8102E',
    },
  },
  // Broncos orange alternate. Orange base, navy trim.
  {
    teamId: 'broncos',
    slug: 'orange-alt',
    kind: 'alternate',
    name: 'Orange Alternate',
    yearStart: 2024,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#FB4F14',
      secondary: '#002244',
      accent: '#FFFFFF',
    },
  },
  // Giants 1980s (LT-era) throwback (worn 2022+). Royal base, red/white 'GIANTS' wordmark.
  {
    teamId: 'giants',
    slug: '1980s-throwback',
    kind: 'throwback',
    name: '1980s Throwback',
    yearStart: 1980,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#0B2265',
      secondary: '#A71930',
      accent: '#FFFFFF',
    },
  },
  // Eagles black alternate (2020+). Black base, midnight-green/silver trim.
  {
    teamId: 'eagles',
    slug: 'black-alt',
    kind: 'alternate',
    name: 'Black Alternate',
    yearStart: 2003,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#000000',
      secondary: '#004C54',
      accent: '#A5ACAF',
    },
  },
  // Lions 'Gridiron Gray' alternate. Silver-gray base, Honolulu-blue trim.
  {
    teamId: 'lions',
    slug: 'gridiron-gray',
    kind: 'alternate',
    name: 'Gridiron Gray',
    yearStart: 2017,
    yearEnd: 2023,
    isCurrent: false,
    colors: {
      primary: '#B0B7BC',
      secondary: '#0076B6',
      accent: '#000000',
    },
  },
  // Vikings 'Winter Warrior' all-white alternate (2023+). White base, purple/gold trim.
  {
    teamId: 'vikings',
    slug: 'winter-warrior',
    kind: 'alternate',
    name: 'Winter Warrior',
    yearStart: 2024,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#FFFFFF',
      secondary: '#4F2683',
      accent: '#FFC62F',
    },
  },
  // Packers 'Winter Warning' all-white alternate (verified 2025 reveal). White base + helmet, green/gold trim.
  {
    teamId: 'packers',
    slug: 'winter-warning',
    kind: 'alternate',
    name: 'Winter Warning',
    yearStart: 2025,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#FFFFFF',
      secondary: '#203731',
      accent: '#FFB612',
    },
  },
  // Falcons red alternate. Red base, black trim.
  {
    teamId: 'falcons',
    slug: 'red-alt',
    kind: 'alternate',
    name: 'Red Alternate',
    yearStart: 2020,
    yearEnd: 2022,
    isCurrent: false,
    colors: {
      primary: '#A71930',
      secondary: '#000000',
      accent: '#FFFFFF',
    },
  },
  // Panthers black alternate. Black base, blue/silver trim.
  {
    teamId: 'panthers',
    slug: 'black-alt',
    kind: 'alternate',
    name: 'Black Alternate',
    yearStart: 2012,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#101820',
      secondary: '#0085CA',
      accent: '#A5ACAF',
    },
  },
  // Cardinals black alternate (2023+). Black base, cardinal-red trim.
  {
    teamId: 'cardinals',
    slug: 'black-alt',
    kind: 'alternate',
    name: 'Black Alternate',
    yearStart: 2023,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#000000',
      secondary: '#97233F',
      accent: '#FFFFFF',
    },
  },
  // Rams 'Bone' off-white alternate. Bone/cream base, royal/gold trim.
  {
    teamId: 'rams',
    slug: 'bone',
    kind: 'alternate',
    name: 'Bone',
    yearStart: 2020,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#F0EBE0',
      secondary: '#003594',
      accent: '#FFA300',
    },
  },
];
