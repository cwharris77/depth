// Drift guard for fixtures/domain/*.json — the cross-language contracts Swift's
// DepthTests verifies against. Each fixture case carries its own input; this test
// re-derives the expected output from that input against the *live* TS implementation,
// so a changed pure implementation that forgot to regenerate fixtures
// (`npx tsx fixtures/generate.mts`) fails here instead of silently diverging from Swift.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
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
import type { Player, TeamRoster, FormationSlot, Position } from '@/lib/types';

const fixturesDir = join(process.cwd(), 'fixtures/domain');

function load<T>(name: string): T {
  return JSON.parse(readFileSync(join(fixturesDir, `${name}.json`), 'utf-8'));
}

function player(p: {
  id: string;
  position: Position;
  depthRank: 1 | 2 | 3;
  number: number;
  order: number | null;
}): Player {
  return {
    id: p.id,
    position: p.position,
    depthRank: p.depthRank,
    number: p.number,
    order: p.order ?? undefined,
    name: p.id,
    status: 'starter',
    age: 25,
    college: '',
    experience: 1,
    height: '6\'0"',
    weight: 200,
    bio: '',
  };
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

describe('domain fixtures parity (drift guard)', () => {
  it('depth-order.json matches getPlayersByPosition', () => {
    const cases = load<
      {
        description: string;
        players: Parameters<typeof player>[0][];
        position: Position;
        expectedIds: string[];
      }[]
    >('depth-order');
    for (const c of cases) {
      const r = roster(c.players.map(player));
      expect(
        getPlayersByPosition(r, c.position).map((p) => p.id),
        c.description
      ).toEqual(c.expectedIds);
    }
  });

  it('real-offense-formation.json matches buildRealFormation', () => {
    const cases = load<
      {
        description: string;
        alignment: string;
        personnelCode: string;
        expectedSlots: unknown[];
        isFallback: boolean;
      }[]
    >('real-offense-formation');
    for (const c of cases) {
      const actual = buildRealFormation(c.alignment, c.personnelCode);
      expect(actual.map(slimSlot), c.description).toEqual(c.expectedSlots);
      expect(actual === OFFENSE_FORMATION, `${c.description} — fallback flag`).toBe(c.isFallback);
    }
  });

  it('real-defense-formation.json matches buildRealDefenseFormation', () => {
    const cases =
      load<{ description: string; code: string; expectedSlots: unknown[]; isFallback: boolean }[]>(
        'real-defense-formation'
      );
    for (const c of cases) {
      const actual = buildRealDefenseFormation(c.code);
      expect(actual.map(slimSlot), c.description).toEqual(c.expectedSlots);
      expect(actual === BASE_DEFENSE, `${c.description} — fallback flag`).toBe(c.isFallback);
    }
  });

  it('resolve-unit.json matches resolveUnit', () => {
    const cases = load<
      {
        description: string;
        unit: 'offense' | 'defense' | 'special';
        roster: {
          players: Parameters<typeof player>[0][];
          specialTeams: TeamRoster['specialTeams'];
        };
        realFormation: FormationSlot[] | null;
        resolved: {
          key: string;
          x: number;
          y: number;
          label: string;
          onLine: boolean | null;
          playerId: string | null;
        }[];
      }[]
    >('resolve-unit');
    for (const c of cases) {
      const r = roster(c.roster.players.map(player), c.roster.specialTeams);
      const actual = resolveUnit(r, c.unit, c.realFormation ?? undefined);
      const slim = actual.map((s) => ({
        key: s.key,
        x: s.x,
        y: s.y,
        label: s.label,
        onLine: s.onLine ?? null,
        playerId: s.player?.id ?? null,
      }));
      expect(slim, c.description).toEqual(c.resolved);
    }
  });

  it('alignment-label.json matches alignmentLabel', () => {
    const cases = load<{ alignment: string; expectedLabel: string }[]>('alignment-label');
    for (const c of cases) {
      expect(alignmentLabel(c.alignment)).toBe(c.expectedLabel);
    }
  });

  it('matchup-metrics.json matches buildMatchupMetrics', () => {
    const cases = load<
      {
        description: string;
        input: TeamMatchupMetricsRow;
        expected: ReturnType<typeof buildMatchupMetrics>;
      }[]
    >('matchup-metrics');
    for (const c of cases) {
      expect(buildMatchupMetrics(c.input), c.description).toEqual(c.expected);
    }
  });

  it('recent-participation.json matches buildRecentParticipation', () => {
    const cases = load<
      {
        description: string;
        input: PlayerRecentSnapsRow[];
        expected: ReturnType<typeof buildRecentParticipation>;
      }[]
    >('recent-participation');
    for (const c of cases) {
      expect(buildRecentParticipation(c.input), c.description).toEqual(c.expected);
    }
  });
});
