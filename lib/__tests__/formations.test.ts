import { describe, it, expect } from 'vitest';
import {
  OFFENSE_FORMATION,
  BASE_DEFENSE,
  resolveUnit,
  buildRealFormation,
  buildRealDefenseFormation,
  alignmentLabel,
} from '../formations';
import { getPlayersByPosition, TEAMS } from '../teams';
import type { Player, TeamRoster } from '../types';

// Minimal roster factory — only the fields the resolver touches.
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

describe('getPlayersByPosition — deterministic order', () => {
  it('sorts by depthRank, then jersey number as a stable tiebreak', () => {
    // Three WR1s in scrambled input order and number order.
    const r = roster([
      player({ id: 'c', position: 'WR', depthRank: 1, number: 16 }),
      player({ id: 'a', position: 'WR', depthRank: 1, number: 11 }),
      player({ id: 'b', position: 'WR', depthRank: 1, number: 14 }),
      player({ id: 'd', position: 'WR', depthRank: 2, number: 80 }),
    ]);
    expect(getPlayersByPosition(r, 'WR').map((p) => p.id)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('is stable regardless of input array order', () => {
    const a = player({ id: 'a', position: 'QB', depthRank: 1, number: 7 });
    const b = player({ id: 'b', position: 'QB', depthRank: 2, number: 19 });
    expect(getPlayersByPosition(roster([a, b]), 'QB').map((p) => p.id)).toEqual(['a', 'b']);
    expect(getPlayersByPosition(roster([b, a]), 'QB').map((p) => p.id)).toEqual(['a', 'b']);
  });
});

describe('resolveUnit — offense/defense via shared formation', () => {
  it('fills each formation slot with the player at that position+index', () => {
    const r = roster([
      player({ id: 'wr1', position: 'WR', depthRank: 1, number: 11 }),
      player({ id: 'wr2', position: 'WR', depthRank: 1, number: 14 }),
      player({ id: 'wr3', position: 'WR', depthRank: 1, number: 16 }),
      player({ id: 'qb1', position: 'QB', depthRank: 1, number: 7 }),
    ]);
    const resolved = resolveUnit(r, 'offense');
    const wrSlots = resolved.filter((s) => s.label === 'WR');
    expect(wrSlots.map((s) => s.player?.id)).toEqual(['wr1', 'wr2', 'wr3']);
    expect(resolved.find((s) => s.key === 'off-qb-0')?.player?.id).toBe('qb1');
  });

  it('leaves a slot empty (no crash) when the roster has no player at that index', () => {
    // Only one WR, but the formation has three WR slots.
    const r = roster([player({ id: 'wr1', position: 'WR', depthRank: 1, number: 11 })]);
    const resolved = resolveUnit(r, 'offense');
    const wrSlots = resolved.filter((s) => s.label === 'WR');
    expect(wrSlots[0].player?.id).toBe('wr1');
    expect(wrSlots[1].player).toBeUndefined();
    expect(wrSlots[2].player).toBeUndefined();
  });

  it('leaves every slot empty for an empty roster, without throwing', () => {
    const resolved = resolveUnit(roster([]), 'defense');
    expect(resolved).toHaveLength(BASE_DEFENSE.length);
    expect(resolved.every((s) => s.player === undefined)).toBe(true);
  });
});

describe('resolveUnit — special teams via explicit assignments', () => {
  it('resolves explicit playerId references', () => {
    const r = roster(
      [player({ id: 'kicker', position: 'K', depthRank: 1, number: 3 })],
      [{ id: 'st-k', playerId: 'kicker', x: 50, y: 80, label: 'K' }]
    );
    const resolved = resolveUnit(r, 'special');
    expect(resolved[0].player?.id).toBe('kicker');
  });

  it('renders an empty slot for an unmarked (null) returner — no guess, no crash', () => {
    const r = roster([], [{ id: 'st-pr', playerId: null, x: 70, y: 18, label: 'PR' }]);
    const resolved = resolveUnit(r, 'special');
    expect(resolved[0].label).toBe('PR');
    expect(resolved[0].player).toBeUndefined();
  });

  it('renders an empty slot when the referenced player is missing from the roster', () => {
    const r = roster([], [{ id: 'st-k', playerId: 'ghost', x: 50, y: 80, label: 'K' }]);
    expect(resolveUnit(r, 'special')[0].player).toBeUndefined();
  });
});

describe('shipped rosters resolve fully against the formation', () => {
  // Guards real data: a team missing a starter at a formation position would leave a
  // visible empty slot on the field. Every shipped roster should fill all 11 + ST.
  for (const [id, roster] of Object.entries(TEAMS)) {
    it(`${id}: every offense and defense slot has a player`, () => {
      for (const unit of ['offense', 'defense'] as const) {
        const empties = resolveUnit(roster, unit)
          .filter((s) => !s.player)
          .map((s) => s.key);
        expect(empties, `empty ${unit} slots`).toEqual([]);
      }
    });

    it(`${id}: every special-teams slot resolves to a real player`, () => {
      const empties = resolveUnit(roster, 'special')
        .filter((s) => !s.player)
        .map((s) => s.key);
      expect(empties).toEqual([]);
    });
  }
});

describe('formations are well-formed', () => {
  it('every formation slot index is non-negative', () => {
    for (const slot of [...OFFENSE_FORMATION, ...BASE_DEFENSE]) {
      expect(slot.index).toBeGreaterThanOrEqual(0);
    }
  });

  it('slot ids are unique within each unit', () => {
    const offIds = OFFENSE_FORMATION.map((s) => s.id);
    const defIds = BASE_DEFENSE.map((s) => s.id);
    expect(new Set(offIds).size).toBe(offIds.length);
    expect(new Set(defIds).size).toBe(defIds.length);
  });

  it('offense has exactly 7 players on the line of scrimmage', () => {
    expect(OFFENSE_FORMATION.filter((s) => s.onLine).length).toBe(7);
  });

  it('the 5 interior offensive linemen are always on the line', () => {
    const ol = new Set(['LT', 'LG', 'C', 'RG', 'RT']);
    const olSlots = OFFENSE_FORMATION.filter((s) => ol.has(s.position));
    expect(olSlots).toHaveLength(5);
    expect(olSlots.every((s) => s.onLine)).toBe(true);
  });
});

describe('buildRealFormation — real per-team formations', () => {
  const ALIGNMENTS = ['SHOTGUN', 'UNDER CENTER', 'PISTOL'] as const;
  const CODES = ['10', '11', '12', '13', '21', '22'];

  for (const alignment of ALIGNMENTS) {
    for (const code of CODES) {
      it(`${alignment} ${code}: exactly 11 well-formed slots`, () => {
        const slots = buildRealFormation(alignment, code);
        expect(slots).toHaveLength(11);
        expect(slots.filter((s) => s.onLine).length).toBe(7);
        expect(new Set(slots.map((s) => s.id)).size).toBe(11);
        for (const slot of slots) {
          expect(slot.x).toBeGreaterThanOrEqual(5);
          expect(slot.x).toBeLessThanOrEqual(95);
        }
      });
    }
  }

  it('falls back to the generic formation for a code that is not two digits 0-3', () => {
    expect(buildRealFormation('SHOTGUN', '99')).toBe(OFFENSE_FORMATION);
    expect(buildRealFormation('SHOTGUN', '1')).toBe(OFFENSE_FORMATION);
    expect(buildRealFormation('SHOTGUN', 'ab')).toBe(OFFENSE_FORMATION);
  });

  it('falls back to the generic formation when total skill players would exceed 5', () => {
    expect(buildRealFormation('SHOTGUN', '33')).toBe(OFFENSE_FORMATION);
  });

  it('falls back to the generic formation for a 3rd RB (no defined spot)', () => {
    expect(buildRealFormation('SHOTGUN', '30')).toBe(OFFENSE_FORMATION);
  });

  it('flexes the 2nd TE off the line only when a WR is also on the field', () => {
    const twoTeNoWr = buildRealFormation('SHOTGUN', '23'); // rb2 te3 wr0
    const te1 = twoTeNoWr.find((s) => s.position === 'TE' && s.index === 1);
    expect(te1?.onLine).toBe(true);

    const twoTeWithWr = buildRealFormation('SHOTGUN', '12'); // rb1 te2 wr2
    const te1b = twoTeWithWr.find((s) => s.position === 'TE' && s.index === 1);
    expect(te1b?.onLine).toBe(false);
  });

  it('places the QB by alignment', () => {
    expect(buildRealFormation('UNDER CENTER', '11').find((s) => s.position === 'QB')?.y).toBe(56);
    expect(buildRealFormation('PISTOL', '11').find((s) => s.position === 'QB')?.y).toBe(63);
    expect(buildRealFormation('SHOTGUN', '11').find((s) => s.position === 'QB')?.y).toBe(68);
  });

  it('resolveUnit renders a real formation the same way it renders the generic one', () => {
    const r = roster([
      player({ id: 'wr1', position: 'WR', depthRank: 1, number: 11 }),
      player({ id: 'rb1', position: 'RB', depthRank: 1, number: 22 }),
      player({ id: 'te1', position: 'TE', depthRank: 1, number: 88 }),
      player({ id: 'qb1', position: 'QB', depthRank: 1, number: 7 }),
    ]);
    const real = buildRealFormation('SHOTGUN', '11');
    const resolved = resolveUnit(r, 'offense', real);
    expect(resolved).toHaveLength(11);
    expect(resolved.find((s) => s.label === 'QB')?.player?.id).toBe('qb1');
  });
});

describe('buildRealDefenseFormation — real per-team defensive fronts', () => {
  const CODES = ['4-2-5', '4-3-4', '3-4-4', '2-4-5', '2-3-6', '1-3-7', '4-4-3'];

  for (const code of CODES) {
    it(`${code}: exactly 11 well-formed slots, all on-field`, () => {
      const slots = buildRealDefenseFormation(code);
      expect(slots).toHaveLength(11);
      expect(new Set(slots.map((s) => s.id)).size).toBe(11);
      for (const slot of slots) {
        expect(slot.x).toBeGreaterThanOrEqual(0);
        expect(slot.x).toBeLessThanOrEqual(100);
        expect(slot.index).toBeGreaterThanOrEqual(0);
      }
    });
  }

  it('falls back to the generic defense formation for a malformed code', () => {
    expect(buildRealDefenseFormation('garbage')).toBe(BASE_DEFENSE);
    expect(buildRealDefenseFormation('4-2')).toBe(BASE_DEFENSE);
  });

  it('falls back to the generic defense formation when counts do not sum to 11', () => {
    expect(buildRealDefenseFormation('4-2-4')).toBe(BASE_DEFENSE);
  });

  it('assigns unique per-position indices (e.g. two DT slots are index 0 and 1)', () => {
    const slots = buildRealDefenseFormation('4-3-4'); // 2 DE + 2 DT
    const dts = slots.filter((s) => s.position === 'DT');
    expect(dts.map((s) => s.index).sort()).toEqual([0, 1]);
    const des = slots.filter((s) => s.position === 'DE');
    expect(des.map((s) => s.index).sort()).toEqual([0, 1]);
  });

  it('a lone lineman is positioned as DT but labeled NT for display', () => {
    const slots = buildRealDefenseFormation('1-4-6');
    const dl = slots.filter((s) => s.position === 'DE' || s.position === 'DT');
    expect(dl).toHaveLength(1);
    expect(dl[0].position).toBe('DT');
    expect(dl[0].label).toBe('NT');
  });

  it('resolveUnit renders a real defensive front the same way it renders the generic one', () => {
    const r = roster([
      player({ id: 'de1', position: 'DE', depthRank: 1, number: 91 }),
      player({ id: 'dt1', position: 'DT', depthRank: 1, number: 99 }),
      player({ id: 'lb1', position: 'LB', depthRank: 1, number: 54 }),
      player({ id: 'cb1', position: 'CB', depthRank: 1, number: 21 }),
      player({ id: 's1', position: 'S', depthRank: 1, number: 32 }),
    ]);
    const real = buildRealDefenseFormation('4-3-4');
    const resolved = resolveUnit(r, 'defense', real);
    expect(resolved).toHaveLength(11);
  });

  it('fills a nflverse-driven layout from a roster tagged with only granular positions (positionGroup() regression)', () => {
    // No plain LB/S/RB entries anywhere on this roster -- if the count-driven slot
    // builders (buildDlSlots/buildLbSlots/buildDbSlots/buildRealFormation's RB slots)
    // ever regress to an exact match on the old collapsed groups instead of
    // getPlayersByPositionGroup, every one of these slots comes back empty.
    const r = roster([
      player({ id: 'lde1', position: 'LDE', depthRank: 1, number: 91 }),
      player({ id: 'nt1', position: 'NT', depthRank: 1, number: 99 }),
      player({ id: 'rde1', position: 'RDE', depthRank: 1, number: 94 }),
      player({ id: 'wlb1', position: 'WLB', depthRank: 1, number: 54 }),
      player({ id: 'lilb1', position: 'LILB', depthRank: 1, number: 55 }),
      player({ id: 'lcb1', position: 'LCB', depthRank: 1, number: 21 }),
      player({ id: 'rcb1', position: 'RCB', depthRank: 1, number: 22 }),
      player({ id: 'nb1', position: 'NB', depthRank: 1, number: 23 }),
      player({ id: 'ss1', position: 'SS', depthRank: 1, number: 32 }),
      player({ id: 'fs1', position: 'FS', depthRank: 1, number: 33 }),
      player({ id: 'ss2', position: 'SS', depthRank: 2, number: 34 }),
      player({ id: 'fb1', position: 'FB', depthRank: 1, number: 44 }),
    ]);

    const realDefense = buildRealDefenseFormation('3-2-6'); // 3 DL, 2 LB, 6 DB
    const resolvedDefense = resolveUnit(r, 'defense', realDefense);
    expect(resolvedDefense.filter((s) => !s.player)).toEqual([]);

    const realOffense = buildRealFormation('SHOTGUN', '12'); // 1 RB (matches FB via group)
    const resolvedOffense = resolveUnit(r, 'offense', realOffense);
    const rbSlot = resolvedOffense.find((s) => s.label === 'RB');
    expect(rbSlot?.player?.id).toBe('fb1');
  });
});

describe('alignmentLabel', () => {
  it('maps the three FTN alignment values to display labels', () => {
    expect(alignmentLabel('SHOTGUN')).toBe('Shotgun');
    expect(alignmentLabel('UNDER CENTER')).toBe('Under center');
    expect(alignmentLabel('PISTOL')).toBe('Pistol');
  });

  it('passes an unrecognized value through verbatim', () => {
    expect(alignmentLabel('WILDCAT')).toBe('WILDCAT');
  });
});
