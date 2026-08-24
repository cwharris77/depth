// Generates the cross-language domain fixtures under fixtures/domain/*.json by calling
// the real TypeScript implementations for formations, roster ordering, and Compare
// metrics — the TS side is the oracle. Swift's DepthTests loads the same JSON and must
// match exactly. Re-run this (`npx tsx fixtures/generate.mts`) whenever one of those pure
// implementations changes, and commit the regenerated JSON alongside the code change.
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  OFFENSE_FORMATION,
  BASE_DEFENSE,
  resolveUnit,
  buildRealFormation,
  buildRealDefenseFormation,
  alignmentLabel,
} from '@/lib/utils/depth-chart/formations';
import { getPlayersByPosition } from '@/lib/utils/roster/roster';
import {
  buildMatchupMetrics,
  type TeamMatchupMetricsRow,
} from '@/lib/utils/compare/matchup-metrics';
import {
  buildRecentParticipation,
  type PlayerRecentSnapsRow,
} from '@/lib/utils/compare/recent-participation';
import type { Player, TeamRoster, FormationSlot } from '@/lib/types';

const outDir = join(dirname(fileURLToPath(import.meta.url)), 'domain');
mkdirSync(outDir, { recursive: true });

function write(name: string, data: unknown) {
  writeFileSync(join(outDir, `${name}.json`), JSON.stringify(data, null, 2) + '\n');
  console.log(`wrote fixtures/domain/${name}.json`);
}

function player(
  p: Partial<Player> & Pick<Player, 'id' | 'position' | 'depthRank' | 'number'>
): Player {
  return {
    name: p.id,
    status: 'starter',
    age: 25,
    college: '',
    experience: 1,
    height: '6\'0"',
    weight: 200,
    bio: '',
    ...p,
  } as Player;
}

function roster(players: Player[], specialTeams: TeamRoster['specialTeams'] = []): TeamRoster {
  return {
    team: {
      id: 't',
      city: 'Test',
      name: 'Team',
      abbrev: 'TST',
      conference: 'NFC',
      division: 'West',
      colors: {
        primary: '#000',
        secondary: '#fff',
        accent: '#888',
        uiAccent: '#fff',
        onAccent: '#000',
      },
    },
    players,
    specialTeams,
    uniforms: [],
  };
}

function slimSlot(s: FormationSlot) {
  return {
    id: s.id,
    position: s.position,
    index: s.index,
    group: s.group ?? null,
    preferredPosition: s.preferredPosition ?? null,
    x: s.x,
    y: s.y,
    label: s.label,
    onLine: s.onLine,
  };
}

function slimRoster(r: TeamRoster) {
  return {
    players: r.players.map((p) => ({
      id: p.id,
      position: p.position,
      depthRank: p.depthRank,
      number: p.number,
      order: p.order ?? null,
    })),
    specialTeams: r.specialTeams,
  };
}

function slimResolved(resolved: ReturnType<typeof resolveUnit>) {
  return resolved.map((s) => ({
    key: s.key,
    x: s.x,
    y: s.y,
    label: s.label,
    onLine: s.onLine ?? null,
    playerId: s.player?.id ?? null,
  }));
}

// --- depth-order.json — byDepthOrder / getPlayersByPosition -----------------------

const depthOrderCases = [
  {
    description: 'three WR1s in scrambled input/number order, tiebreak by jersey number',
    players: [
      player({ id: 'c', position: 'WR', depthRank: 1, number: 16 }),
      player({ id: 'a', position: 'WR', depthRank: 1, number: 11 }),
      player({ id: 'b', position: 'WR', depthRank: 1, number: 14 }),
      player({ id: 'd', position: 'WR', depthRank: 2, number: 80 }),
    ],
    position: 'WR' as const,
  },
  {
    description: 'stable regardless of input array order',
    players: [
      player({ id: 'b', position: 'QB', depthRank: 2, number: 19 }),
      player({ id: 'a', position: 'QB', depthRank: 1, number: 7 }),
    ],
    position: 'QB' as const,
  },
  {
    description: 'a user override (order field) beats the jersey-number tiebreak',
    players: [
      player({ id: 'a', position: 'RB', depthRank: 1, number: 20, order: 2 }),
      player({ id: 'b', position: 'RB', depthRank: 1, number: 5, order: 1 }),
    ],
    position: 'RB' as const,
  },
  {
    description: 'empty roster at a position returns an empty list',
    players: [player({ id: 'a', position: 'QB', depthRank: 1, number: 7 })],
    position: 'RB' as const,
  },
];

write(
  'depth-order',
  depthOrderCases.map((c) => ({
    description: c.description,
    players: c.players.map((p) => ({
      id: p.id,
      position: p.position,
      depthRank: p.depthRank,
      number: p.number,
      order: p.order ?? null,
    })),
    position: c.position,
    expectedIds: getPlayersByPosition(roster(c.players), c.position).map((p) => p.id),
  }))
);

// --- real-offense-formation.json — buildRealFormation ------------------------------

const offenseFormationCases: { description: string; alignment: string; code: string }[] = [
  { description: '11 personnel, shotgun (1 RB, 1 TE, 3 WR)', alignment: 'SHOTGUN', code: '11' },
  {
    description: '12 personnel, under center — 2nd TE wings off-line (a WR exists to flex)',
    alignment: 'UNDER CENTER',
    code: '12',
  },
  {
    description: '20 personnel, pistol — 2 RB, 0 TE, 3 WR, no in-line 2nd TE possible',
    alignment: 'PISTOL',
    code: '20',
  },
  {
    description:
      '02 personnel — 0 RB, 2 TE, both fit in-line since no WR flex constraint applies (wr=3)',
    alignment: 'SHOTGUN',
    code: '02',
  },
  {
    description: '03 personnel — 0 RB, 3 TE, 2nd TE in-line (wr=2, not <1), 3rd TE wings off',
    alignment: 'UNDER CENTER',
    code: '03',
  },
  {
    description: '13 personnel — 1 RB, 3 TE, wr=1 so 2nd TE wings off-line (wr not < 1)',
    alignment: 'SHOTGUN',
    code: '13',
  },
  {
    description: 'invalid personnel code (non-digit) falls back to generic OFFENSE_FORMATION',
    alignment: 'SHOTGUN',
    code: 'xx',
  },
  {
    description: 'rb=3 exceeds the 2-RB cap, falls back to generic OFFENSE_FORMATION',
    alignment: 'SHOTGUN',
    code: '30',
  },
  {
    description: 'unrecognized alignment string falls back to the SHOTGUN QB depth',
    alignment: 'WILDCAT',
    code: '11',
  },
];

write(
  'real-offense-formation',
  offenseFormationCases.map((c) => ({
    description: c.description,
    alignment: c.alignment,
    personnelCode: c.code,
    expectedSlots: buildRealFormation(c.alignment, c.code).map(slimSlot),
    isFallback: buildRealFormation(c.alignment, c.code) === OFFENSE_FORMATION,
  }))
);

// --- real-defense-formation.json — buildRealDefenseFormation -----------------------

const defenseFormationCases: { description: string; code: string }[] = [
  { description: 'true 3-4 base — DL gets LDE/NT/RDE, LB gets all 4 exact tags', code: '3-4-4' },
  {
    description: '4-3 front — 4 DL (2 edge DE + 2 interior DT), 3 LB stays generic (not 4)',
    code: '4-3-4',
  },
  { description: '2-man DL front — both edges, no NT (dl != 1 and dl != 3)', code: '2-4-5' },
  { description: '1-man DL front — sole lineman tagged NT', code: '1-4-6' },
  { description: 'nickel: 5 DBs — 4 base slots plus the 5th (NB) fixed slot', code: '4-2-5' },
  { description: 'dime: 6 DBs — adds the 6th fixed (generic S) slot', code: '4-1-6' },
  { description: 'quarter: 7 DBs — adds the 7th fixed (generic CB) slot', code: '4-0-7' },
  { description: 'counts do not sum to 11 — falls back to BASE_DEFENSE', code: '4-4-4' },
  { description: 'malformed code — falls back to BASE_DEFENSE', code: 'not-a-code' },
  {
    description: 'DB count exceeds 8-slot capacity — falls back to BASE_DEFENSE',
    code: '1-1-9',
  },
];

write(
  'real-defense-formation',
  defenseFormationCases.map((c) => ({
    description: c.description,
    code: c.code,
    expectedSlots: buildRealDefenseFormation(c.code).map(slimSlot),
    isFallback: buildRealDefenseFormation(c.code) === BASE_DEFENSE,
  }))
);

// --- resolve-unit.json — resolveUnit (generic + real formations + special teams) ---

const resolveUnitCases: {
  description: string;
  unit: 'offense' | 'defense' | 'special';
  players: Player[];
  specialTeams?: TeamRoster['specialTeams'];
  realFormation?: FormationSlot[];
}[] = [
  {
    description: 'generic offense: fills each slot by position+index, no crash on missing players',
    unit: 'offense',
    players: [
      player({ id: 'wr1', position: 'WR', depthRank: 1, number: 11 }),
      player({ id: 'qb1', position: 'QB', depthRank: 1, number: 7 }),
    ],
  },
  {
    description: 'empty roster leaves every slot empty, correct slot count, no throw',
    unit: 'defense',
    players: [],
  },
  {
    description: 'special teams: explicit playerId resolves; null playerId renders an empty slot',
    unit: 'special',
    players: [player({ id: 'kicker', position: 'K', depthRank: 1, number: 3 })],
    specialTeams: [
      { id: 'st-k', playerId: 'kicker', x: 50, y: 80, label: 'K' },
      { id: 'st-pr', playerId: null, x: 70, y: 18, label: 'PR' },
    ],
  },
  {
    description: 'RB-group slot with no tagged RB falls back to the best-ranked FB, relabeled "FB"',
    unit: 'offense',
    players: [player({ id: 'fb1', position: 'FB', depthRank: 1, number: 44 })],
  },
  {
    description:
      'real defense 3-4: exact-tag seating puts the real WLB/LILB/RILB/SLB/LDE/NT/RDE players in their named slots even when input order is scrambled',
    unit: 'defense',
    players: [
      player({ id: 'slb1', position: 'SLB', depthRank: 1, number: 55 }),
      player({ id: 'lde1', position: 'LDE', depthRank: 1, number: 91 }),
      player({ id: 'wlb1', position: 'WLB', depthRank: 1, number: 50 }),
      player({ id: 'nt1', position: 'NT', depthRank: 1, number: 99 }),
      player({ id: 'rde1', position: 'RDE', depthRank: 1, number: 93 }),
      player({ id: 'lilb1', position: 'LILB', depthRank: 1, number: 52 }),
      player({ id: 'rilb1', position: 'RILB', depthRank: 1, number: 53 }),
    ],
    realFormation: buildRealDefenseFormation('3-4-4'),
  },
  {
    description:
      'nickel DB seating: LCB/RCB/SS/FS get exact tags, 5th (NB) slot prefers the NB tag over a generic CB',
    unit: 'defense',
    players: [
      player({ id: 'lcb1', position: 'LCB', depthRank: 1, number: 24 }),
      player({ id: 'rcb1', position: 'RCB', depthRank: 1, number: 21 }),
      player({ id: 'ss1', position: 'SS', depthRank: 1, number: 31 }),
      player({ id: 'fs1', position: 'FS', depthRank: 1, number: 20 }),
      player({ id: 'nb1', position: 'NB', depthRank: 1, number: 27 }),
      player({ id: 'extracb', position: 'CB', depthRank: 2, number: 22 }),
    ],
    realFormation: buildRealDefenseFormation('4-2-5'),
  },
];

write(
  'resolve-unit',
  resolveUnitCases.map((c) => {
    const r = roster(c.players, c.specialTeams ?? []);
    return {
      description: c.description,
      unit: c.unit,
      roster: slimRoster(r),
      realFormation: c.realFormation ? c.realFormation.map(slimSlot) : null,
      resolved: slimResolved(resolveUnit(r, c.unit, c.realFormation)),
    };
  })
);

// --- alignment-label.json — alignmentLabel ------------------------------------------

const alignmentInputs = ['SHOTGUN', 'UNDER CENTER', 'PISTOL', 'WILDCAT'];
write(
  'alignment-label',
  alignmentInputs.map((a) => ({ alignment: a, expectedLabel: alignmentLabel(a) }))
);

// --- matchup-metrics.json — buildMatchupMetrics (DEP-312) ---------------------------

const matchupMetricsCases: { description: string; input: TeamMatchupMetricsRow }[] = [
  {
    description: 'complete row keeps raw inputs and derives every auditable rate',
    input: {
      season: 2025,
      updated_at: '2026-08-23T12:00:00.000Z',
      games: 17,
      attempts: 500,
      carries: 425,
      sacks_suffered: 25,
      passing_epa: 72,
      rushing_epa: 23,
      passing_interceptions: 10,
      fumbles_lost_total: 7,
      def_sacks: 42,
      def_qb_hits: 96,
      def_interceptions: 16,
      def_fumbles: 9,
      def_fumbles_forced: 12,
      fg_made: 30,
      fg_att: 36,
      pt_att: 68,
      pt_net_yards: 2788,
      punt_returns: 34,
      punt_return_yards: 374,
      kickoff_returns: 24,
      kickoff_return_yards: 600,
      special_teams_tds: 2,
    },
  },
  {
    description: 'partial row omits rates whose source values are missing or zero-count',
    input: {
      season: 2025,
      updated_at: '2026-08-23T12:00:00.000Z',
      games: null,
      attempts: 500,
      carries: null,
      sacks_suffered: 25,
      passing_epa: 72,
      rushing_epa: null,
      passing_interceptions: 10,
      fumbles_lost_total: null,
      def_sacks: 42,
      def_qb_hits: 96,
      def_interceptions: 16,
      def_fumbles: null,
      def_fumbles_forced: 12,
      fg_made: 0,
      fg_att: null,
      pt_att: 0,
      pt_net_yards: 0,
      punt_returns: null,
      punt_return_yards: null,
      kickoff_returns: null,
      kickoff_return_yards: null,
      special_teams_tds: null,
    },
  },
];

write(
  'matchup-metrics',
  matchupMetricsCases.map((c) => ({
    ...c,
    expected: buildMatchupMetrics(c.input),
  }))
);

// --- recent-participation.json — buildRecentParticipation (DEP-313) ----------------

const currentParticipationRow: PlayerRecentSnapsRow = {
  team_id: 'chiefs',
  season: 2025,
  player_id: 'z-player',
  window_start_week: 15,
  window_end_week: 17,
  window_game_ids: ['g15', 'g16', 'g17'],
  games: 3,
  offense_snaps: 180,
  offense_pct: 1,
  defense_snaps: 0,
  defense_pct: 0,
  special_teams_snaps: 0,
  special_teams_pct: null,
  source: 'nflverse-pfr',
  updated_at: '2026-01-05T12:00:00.000Z',
};

const previousParticipationRow: PlayerRecentSnapsRow = {
  ...currentParticipationRow,
  team_id: 'bills',
  season: 2024,
  player_id: 'previous-only',
  window_start_week: 16,
  window_end_week: 18,
  window_game_ids: ['p16', 'p17', 'p18'],
  offense_snaps: 0,
  offense_pct: null,
  defense_snaps: 165,
  defense_pct: 0.92,
  special_teams_snaps: 12,
  special_teams_pct: 0,
  updated_at: '2025-01-06T12:00:00.000Z',
};

const recentParticipationCases: { description: string; rows: PlayerRecentSnapsRow[] }[] = [
  {
    description:
      'current season wins before timestamp, then latest window excludes stale players and sorts ids',
    rows: [
      {
        ...currentParticipationRow,
        season: 2024,
        player_id: 'newer-previous-season',
        updated_at: '2026-08-24T12:00:00.000Z',
      },
      {
        ...currentParticipationRow,
        player_id: 'stale-player',
        updated_at: '2026-01-04T12:00:00.000Z',
      },
      currentParticipationRow,
      {
        ...currentParticipationRow,
        player_id: 'a-player',
        offense_snaps: 0,
        offense_pct: null,
        defense_snaps: 21,
        defense_pct: 0,
        special_teams_snaps: 14,
        special_teams_pct: 0.5,
      },
    ],
  },
  {
    description: 'previous-season-only data remains available when the current season has no rows',
    rows: [
      {
        ...previousParticipationRow,
        player_id: 'stale-previous-player',
        updated_at: '2025-01-05T12:00:00.000Z',
      },
      previousParticipationRow,
    ],
  },
];

write(
  'recent-participation',
  recentParticipationCases.map((testCase) => ({
    description: testCase.description,
    input: testCase.rows,
    expected: buildRecentParticipation(testCase.rows),
  }))
);

console.log('done.');
