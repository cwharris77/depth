import type { TeamColors } from '../types';

// Hand-curated uniform archive (roadmap Phase 7). No structured uniform source exists
// (see Data Sources.md in the vault), so this file IS the source of truth: a human reads
// a reference/press release, records the brand hexes, curates a dark-UI-legible
// uiAccent/onAccent, and appends a row here. `scripts/ingest-uniforms.mts` upserts these
// into Postgres. APPEND-ONLY — never delete a kit; the archive keeps every past uniform.
//
// What lives here: every kit EXCEPT each team's home/primary look. The home kit is the
// team's ESPN-derived `team.colors` and is synthesized as "Home" at read time
// (lib/roster-source.db.ts), so it is never a row.
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
];
