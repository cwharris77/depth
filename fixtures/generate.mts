// Generates the cross-language domain fixtures under fixtures/domain/*.json by calling
// the real TypeScript implementation (lib/utils/depth-chart/formations.ts,
// lib/utils/roster/roster.ts) — the TS side is the oracle (2026-08-14 native iOS design
// spec, Milestone 1 step 13). Swift's DepthTests loads the same JSON and must match
// exactly. Re-run this (`npx tsx fixtures/generate.mts`) whenever formations.ts/roster.ts
// changes, and commit the regenerated JSON alongside the code change.
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

console.log('done.');
