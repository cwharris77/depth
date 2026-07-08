import type { TeamColors, UniformKind } from '../types';

// Hand-curated uniform archive (roadmap Phase 7). No structured uniform source exists
// (see Data Sources.md in the vault), so this file IS the source of truth for every
// `source='curated'` kit: a human reads a reference/press release, records the brand hexes,
// curates a dark-UI-legible uiAccent/onAccent, and appends a row here. The seed generator
// turns these into an append-only SQL migration. APPEND-ONLY — never delete a kit.
//
// What lives here: every kit EXCEPT each team's current home. The `kind='home'` rows are
// ESPN-owned (machine-managed) and are NOT authored here — they are backfilled from
// team.colors and maintained by the drift reconciler (PR-B). Away, throwbacks, color rush,
// and alternates all live here.
//
// colors.primary/secondary/accent are brand-true (the real kit). uiAccent/onAccent are
// curated to read on the dark app background (#0a0e1a) — enforced by
// lib/__tests__/uniforms.test.ts. The row id is `${teamId}-${slug}`.
//
// year_start/year_end describe the kit's primary era; is_current marks whether it's in a
// team's active rotation today (a reintroduced throwback keeps its historical year_end
// AND is_current: true).

export interface UniformSeed {
  teamId: string;
  slug: string;
  kind: UniformKind;
  name: string;
  yearStart: number | null;
  yearEnd: number | null;
  isCurrent: boolean;
  colors: TeamColors;
  imagePath?: string;
}

export const UNIFORMS: UniformSeed[] = [
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
      uiAccent: '#3DB06A',
      onAccent: '#0a0e1a',
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
    yearEnd: 1996,
    isCurrent: true,
    colors: {
      primary: '#FF8200',
      secondary: '#C8102E',
      accent: '#FFFFFF',
      uiAccent: '#FF8200',
      onAccent: '#0a0e1a',
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
    yearEnd: 1995,
    isCurrent: true,
    colors: {
      primary: '#046A38',
      secondary: '#A5ACAF',
      accent: '#FFFFFF',
      uiAccent: '#2BB673',
      onAccent: '#0a0e1a',
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
      uiAccent: '#FA4616',
      onAccent: '#0a0e1a',
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
    yearStart: null,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#FFFFFF',
      secondary: '#002244',
      accent: '#69BE28',
      uiAccent: '#69BE28',
      onAccent: '#0a0e1a',
    },
  },
  {
    teamId: 'bills',
    slug: 'away',
    kind: 'away',
    name: 'Away',
    yearStart: null,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#FFFFFF',
      secondary: '#00338D',
      accent: '#C60C30',
      uiAccent: '#5B9BFF',
      onAccent: '#0a0e1a',
    },
  },
  {
    teamId: 'dolphins',
    slug: 'away',
    kind: 'away',
    name: 'Away',
    yearStart: null,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#FFFFFF',
      secondary: '#008E97',
      accent: '#FC4C02',
      uiAccent: '#2DD4D4',
      onAccent: '#0a0e1a',
    },
  },
  {
    teamId: 'patriots',
    slug: 'away',
    kind: 'away',
    name: 'Away',
    yearStart: null,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#FFFFFF',
      secondary: '#002244',
      accent: '#C60C30',
      uiAccent: '#C8CDD6',
      onAccent: '#0a0e1a',
    },
  },
  {
    teamId: 'jets',
    slug: 'away',
    kind: 'away',
    name: 'Away',
    yearStart: null,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#FFFFFF',
      secondary: '#125740',
      accent: '#125740',
      uiAccent: '#4CC38A',
      onAccent: '#0a0e1a',
    },
  },
  {
    teamId: 'cardinals',
    slug: 'away',
    kind: 'away',
    name: 'Away',
    yearStart: null,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#FFFFFF',
      secondary: '#97233F',
      accent: '#FFB612',
      uiAccent: '#FF4D6A',
      onAccent: '#0a0e1a',
    },
  },
  {
    teamId: 'rams',
    slug: 'away',
    kind: 'away',
    name: 'Away',
    yearStart: null,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#FFFFFF',
      secondary: '#003594',
      accent: '#FFA300',
      uiAccent: '#FFC20E',
      onAccent: '#0a0e1a',
    },
  },
  {
    teamId: '49ers',
    slug: 'away',
    kind: 'away',
    name: 'Away',
    yearStart: null,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#FFFFFF',
      secondary: '#AA0000',
      accent: '#B3995D',
      uiAccent: '#FF4D4D',
      onAccent: '#0a0e1a',
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
    yearStart: null,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#FFFFFF',
      secondary: '#241773',
      accent: '#9E7C0C',
      uiAccent: '#9F8CFF',
      onAccent: '#0a0e1a',
    },
  },
  {
    teamId: 'bengals',
    slug: 'away',
    kind: 'away',
    name: 'Away',
    yearStart: null,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#FFFFFF',
      secondary: '#FB4F14',
      accent: '#FB4F14',
      uiAccent: '#FF6A33',
      onAccent: '#0a0e1a',
    },
  },
  {
    teamId: 'browns',
    slug: 'away',
    kind: 'away',
    name: 'Away',
    yearStart: null,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#FFFFFF',
      secondary: '#311D00',
      accent: '#FF3C00',
      uiAccent: '#FF6A33',
      onAccent: '#0a0e1a',
    },
  },
  {
    teamId: 'steelers',
    slug: 'away',
    kind: 'away',
    name: 'Away',
    yearStart: null,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#FFFFFF',
      secondary: '#FFB612',
      accent: '#101820',
      uiAccent: '#FFB612',
      onAccent: '#0a0e1a',
    },
  },
  {
    teamId: 'texans',
    slug: 'away',
    kind: 'away',
    name: 'Away',
    yearStart: null,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#FFFFFF',
      secondary: '#03202F',
      accent: '#A71930',
      uiAccent: '#5B9BFF',
      onAccent: '#0a0e1a',
    },
  },
  {
    teamId: 'colts',
    slug: 'away',
    kind: 'away',
    name: 'Away',
    yearStart: null,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#FFFFFF',
      secondary: '#002C5F',
      accent: '#A2AAAD',
      uiAccent: '#5B9BFF',
      onAccent: '#0a0e1a',
    },
  },
  {
    teamId: 'jaguars',
    slug: 'away',
    kind: 'away',
    name: 'Away',
    yearStart: null,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#FFFFFF',
      secondary: '#006778',
      accent: '#D7A22A',
      uiAccent: '#2DD4D4',
      onAccent: '#0a0e1a',
    },
  },
  {
    teamId: 'titans',
    slug: 'away',
    kind: 'away',
    name: 'Away',
    yearStart: null,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#FFFFFF',
      secondary: '#0C2340',
      accent: '#4B92DB',
      uiAccent: '#5BA8E8',
      onAccent: '#0a0e1a',
    },
  },
  {
    teamId: 'broncos',
    slug: 'away',
    kind: 'away',
    name: 'Away',
    yearStart: null,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#FFFFFF',
      secondary: '#FB4F14',
      accent: '#002244',
      uiAccent: '#FF6A33',
      onAccent: '#0a0e1a',
    },
  },
  {
    teamId: 'chiefs',
    slug: 'away',
    kind: 'away',
    name: 'Away',
    yearStart: null,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#FFFFFF',
      secondary: '#E31837',
      accent: '#FFB81C',
      uiAccent: '#FF4D5E',
      onAccent: '#0a0e1a',
    },
  },
  {
    teamId: 'raiders',
    slug: 'away',
    kind: 'away',
    name: 'Away',
    yearStart: null,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#FFFFFF',
      secondary: '#000000',
      accent: '#A5ACAF',
      uiAccent: '#C8CDD6',
      onAccent: '#0a0e1a',
    },
  },
  {
    teamId: 'chargers',
    slug: 'away',
    kind: 'away',
    name: 'Away',
    yearStart: null,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#FFFFFF',
      secondary: '#0080C6',
      accent: '#FFC20E',
      uiAccent: '#36A7E0',
      onAccent: '#0a0e1a',
    },
  },
  {
    teamId: 'cowboys',
    slug: 'away',
    kind: 'away',
    name: 'Away',
    yearStart: null,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#FFFFFF',
      secondary: '#003594',
      accent: '#869397',
      uiAccent: '#5B9BFF',
      onAccent: '#0a0e1a',
    },
  },
  {
    teamId: 'giants',
    slug: 'away',
    kind: 'away',
    name: 'Away',
    yearStart: null,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#FFFFFF',
      secondary: '#0B2265',
      accent: '#A71930',
      uiAccent: '#5B9BFF',
      onAccent: '#0a0e1a',
    },
  },
  {
    teamId: 'eagles',
    slug: 'away',
    kind: 'away',
    name: 'Away',
    yearStart: null,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#FFFFFF',
      secondary: '#004C54',
      accent: '#A5ACAF',
      uiAccent: '#2FA3A3',
      onAccent: '#0a0e1a',
    },
  },
  {
    teamId: 'commanders',
    slug: 'away',
    kind: 'away',
    name: 'Away',
    yearStart: null,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#FFFFFF',
      secondary: '#5A1414',
      accent: '#FFB612',
      uiAccent: '#FFB612',
      onAccent: '#0a0e1a',
    },
  },
  {
    teamId: 'bears',
    slug: 'away',
    kind: 'away',
    name: 'Away',
    yearStart: null,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#FFFFFF',
      secondary: '#0B162A',
      accent: '#C83803',
      uiAccent: '#FF6A33',
      onAccent: '#0a0e1a',
    },
  },
  {
    teamId: 'lions',
    slug: 'away',
    kind: 'away',
    name: 'Away',
    yearStart: null,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#FFFFFF',
      secondary: '#0076B6',
      accent: '#B0B7BC',
      uiAccent: '#36A7E0',
      onAccent: '#0a0e1a',
    },
  },
  {
    teamId: 'packers',
    slug: 'away',
    kind: 'away',
    name: 'Away',
    yearStart: null,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#FFFFFF',
      secondary: '#203731',
      accent: '#FFB612',
      uiAccent: '#FFB612',
      onAccent: '#0a0e1a',
    },
  },
  {
    teamId: 'vikings',
    slug: 'away',
    kind: 'away',
    name: 'Away',
    yearStart: null,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#FFFFFF',
      secondary: '#4F2683',
      accent: '#FFC62F',
      uiAccent: '#FFC62F',
      onAccent: '#0a0e1a',
    },
  },
  {
    teamId: 'falcons',
    slug: 'away',
    kind: 'away',
    name: 'Away',
    yearStart: null,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#FFFFFF',
      secondary: '#A71930',
      accent: '#A71930',
      uiAccent: '#FF4D5E',
      onAccent: '#0a0e1a',
    },
  },
  {
    teamId: 'panthers',
    slug: 'away',
    kind: 'away',
    name: 'Away',
    yearStart: null,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#FFFFFF',
      secondary: '#0085CA',
      accent: '#101820',
      uiAccent: '#36A7E0',
      onAccent: '#0a0e1a',
    },
  },
  {
    teamId: 'saints',
    slug: 'away',
    kind: 'away',
    name: 'Away',
    yearStart: null,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#FFFFFF',
      secondary: '#D3BC8D',
      accent: '#101820',
      uiAccent: '#E2CC9A',
      onAccent: '#0a0e1a',
    },
  },
  {
    teamId: 'buccaneers',
    slug: 'away',
    kind: 'away',
    name: 'Away',
    yearStart: null,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#FFFFFF',
      secondary: '#D50A0A',
      accent: '#34302B',
      uiAccent: '#FF4D4D',
      onAccent: '#0a0e1a',
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
      uiAccent: '#36A7E0',
      onAccent: '#0a0e1a',
    },
  },
  // Houston Oilers Columbia blue (1960-1996, per Wikipedia). Hexes: teamcolorcodes Titans page (Columbia blue #4B92DB = the Oilers heritage blue, red #C8102E). isCurrent: Titans' designated throwback alternate (not worn every season).
  {
    teamId: 'titans',
    slug: 'oilers-throwback',
    kind: 'throwback',
    name: 'Oilers Throwback',
    yearStart: 1960,
    yearEnd: 1996,
    isCurrent: true,
    colors: {
      primary: '#4B92DB',
      secondary: '#C8102E',
      accent: '#FFFFFF',
      uiAccent: '#5BA8E8',
      onAccent: '#0a0e1a',
    },
  },
  // Bears orange alternate (modern alt, no throwback era). Hexes: teamcolorcodes (orange #C83803, navy #0B162A). uiAccent reuses the team's brightened orange.
  {
    teamId: 'bears',
    slug: 'orange-alternate',
    kind: 'alternate',
    name: 'Orange Alternate',
    yearStart: null,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#C83803',
      secondary: '#0B162A',
      accent: '#FFFFFF',
      uiAccent: '#FF6A33',
      onAccent: '#0a0e1a',
    },
  },
  // Saints all-black Color Rush (2016+). Hexes: teamcolorcodes (black #101820, old gold #D3BC8D). uiAccent reuses the team's bright gold.
  {
    teamId: 'saints',
    slug: 'color-rush',
    kind: 'color-rush',
    name: 'Color Rush',
    yearStart: null,
    yearEnd: null,
    isCurrent: true,
    colors: {
      primary: '#101820',
      secondary: '#D3BC8D',
      accent: '#D3BC8D',
      uiAccent: '#E2CC9A',
      onAccent: '#0a0e1a',
    },
  },
  // Jaguars original teal (1995-2012 design era, reintroduced 2023). Hexes: teamcolorcodes (teal #006778, gold #D7A22A, black #101820). uiAccent reuses the team's bright teal.
  {
    teamId: 'jaguars',
    slug: 'teal-throwback',
    kind: 'throwback',
    name: 'Teal Throwback',
    yearStart: 1995,
    yearEnd: 2012,
    isCurrent: true,
    colors: {
      primary: '#006778',
      secondary: '#D7A22A',
      accent: '#101820',
      uiAccent: '#2DD4D4',
      onAccent: '#0a0e1a',
    },
  },
  // Washington 1970s burgundy & gold (George Allen gold-helmet era). Hexes: teamcolorcodes Commanders (burgundy #5A1414, gold #FFB612). uiAccent reuses the team's gold.
  {
    teamId: 'commanders',
    slug: '70s-burgundy',
    kind: 'throwback',
    name: '70s Burgundy',
    yearStart: 1972,
    yearEnd: 1977,
    isCurrent: true,
    colors: {
      primary: '#5A1414',
      secondary: '#FFB612',
      accent: '#FFFFFF',
      uiAccent: '#FFB612',
      onAccent: '#0a0e1a',
    },
  },
];
