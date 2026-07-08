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
];
