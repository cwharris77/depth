import { describe, expect, it } from 'vitest';
import { compileParts, type TeamPartsDefinition, type UniformPart } from './parts';
import {
  formatPartialUpdatePlan,
  planPartialUpdate,
  renderGeneratedPartialModule,
  type GeneratedPartial,
  type PartialUpdatePlan,
} from './partial';
import type { PatternDef } from './types';

// The partial-update command's acceptance criteria, pinned one test each: a dry run reports every
// affected kit and changes nothing, a real run replaces exactly one named jersey, conflicting
// palette/pattern definitions are rejected unless separately authorized, and an unrelated kit's
// compiled output is byte-identical before and after.

const WEAVE: PatternDef = {
  width: 8,
  height: 8,
  shapes: [{ d: 'M0,0 H1 V1 H0 Z', fill: 'navy' }],
};

const HOME_JERSEY: UniformPart = {
  base: 'white',
  layers: [
    {
      id: 'home-weave',
      surface: 'jersey',
      d: 'M0,0 H10 V10 H0 Z',
      clip: true,
      kind: 'fill',
      fill: 'pattern:weave',
    },
  ],
  number: { fill: 'navy', outline: 'white', outlineWidth: 26 },
};

// Both kits share the navy helmet, so a generated palette entry that changes `navy` repaints the
// away kit's helmet even though the partial never touches the away helmet object.
const BASE: TeamPartsDefinition = {
  teamId: 'test',
  palette: { navy: '#001122', green: '#00FF00', white: '#FFFFFF' },
  patterns: { weave: WEAVE },
  helmets: { plain: { base: 'navy', layers: [] } },
  jerseys: {
    home: HOME_JERSEY,
    away: {
      base: 'white',
      layers: [],
      number: { fill: 'green', outline: 'white', outlineWidth: 26 },
    },
  },
  pants: { plain: { base: 'navy', layers: [] } },
  kits: {
    home: { helmet: 'plain', jersey: 'home', pants: 'plain' },
    away: { helmet: 'plain', jersey: 'away', pants: 'plain' },
  },
};

function generated(overrides: Partial<GeneratedPartial> = {}): GeneratedPartial {
  return {
    teamId: 'test',
    target: { kind: 'jersey', id: 'home' },
    palette: { ...BASE.palette },
    patterns: { weave: WEAVE },
    jersey: HOME_JERSEY,
    ...overrides,
  };
}

// A jersey whose only visible change is its number, so exactly the home kit's compiled override
// differs from BASE while the away kit is untouched.
function changedJersey(): UniformPart {
  return {
    ...HOME_JERSEY,
    number: { fill: 'green', outline: 'white', outlineWidth: 26 },
  };
}

// Narrows a plan to its compiled sides, failing loudly if the plan was rejected.
function compiled(plan: PartialUpdatePlan) {
  if (!plan.before || !plan.after) throw new Error('plan has no compiled definitions');
  return { before: plan.before, after: plan.after };
}

describe('planPartialUpdate', () => {
  it('reports the affected kit and a readable diff without touching unrelated kits', () => {
    const plan = planPartialUpdate(BASE, generated({ jersey: changedJersey() }));

    expect(plan.issues).toEqual([]);
    expect(plan.conflicts).toEqual([]);
    expect(plan.affectedKits).toEqual(['home']);
    expect(plan.unchangedKits).toEqual(['away']);
    expect(plan.diff).toContain('kits.home');
    expect(plan.diff).toContain('->');
  });

  it('replaces exactly one named jersey in the compiled output', () => {
    const plan = planPartialUpdate(BASE, generated({ jersey: changedJersey() }));
    const { before, after } = compiled(plan);

    expect(Object.keys(after.kits).sort()).toEqual(Object.keys(before.kits).sort());
    expect(after.kits.home).not.toEqual(before.kits.home);
    expect(after.patterns).toEqual(before.patterns);
  });

  it('leaves an unrelated kit byte-identical before and after', () => {
    const plan = planPartialUpdate(BASE, generated({ jersey: changedJersey() }));
    const { before, after } = compiled(plan);

    expect(JSON.stringify(after.kits.away)).toBe(JSON.stringify(before.kits.away));
  });

  it('marks every kit a shared palette change repaints, including helmet/pants surface users', () => {
    const plan = planPartialUpdate(
      BASE,
      generated({ palette: { ...BASE.palette, navy: '#000000' } }),
      { paletteConflicts: true }
    );

    // Both kits wear the shared navy helmet; the away kit's jersey is untouched but its shell is
    // repainted, which is exactly the failure mode preserving helmet/pants objects would miss.
    expect(plan.conflicts).toEqual([]);
    expect(plan.affectedKits.sort()).toEqual(['away', 'home']);
    expect(plan.diff).toContain('kits.away.helmetColor');
  });

  it('marks a kit whose pattern changed even when its own override is byte-identical', () => {
    const editedWeave: PatternDef = {
      ...WEAVE,
      shapes: [{ d: 'M0,0 H8 V8 H0 Z', fill: 'navy' }],
    };
    const plan = planPartialUpdate(BASE, generated({ patterns: { weave: editedWeave } }), {
      patternConflicts: true,
    });
    const { before, after } = compiled(plan);

    expect(JSON.stringify(after.kits.home)).toBe(JSON.stringify(before.kits.home));
    expect(plan.affectedKits).toEqual(['home']);
    expect(plan.diff).toContain('patterns.changed: weave');
  });

  describe('conflict handling', () => {
    it('rejects a conflicting palette definition unless authorized', () => {
      const plan = planPartialUpdate(BASE, generated({ palette: { navy: '#000000' } }));
      expect(plan.conflicts).toEqual([
        { kind: 'palette', key: 'navy', existing: '#001122', incoming: '#000000' },
      ]);
      expect(plan.after).toBeUndefined();
      expect(formatPartialUpdatePlan(plan)).toContain('--authorize-palette-conflicts');
    });

    it('accepts a conflicting palette definition when separately authorized', () => {
      const plan = planPartialUpdate(BASE, generated({ palette: { navy: '#000000' } }), {
        paletteConflicts: true,
      });
      expect(plan.conflicts).toEqual([]);
      expect(plan.after).toBeDefined();
    });

    it('rejects a conflicting pattern definition unless authorized', () => {
      const plan = planPartialUpdate(
        BASE,
        generated({ patterns: { weave: { ...WEAVE, width: 16 } } })
      );
      expect(plan.conflicts.map((conflict) => conflict.kind)).toEqual(['pattern']);
      expect(plan.after).toBeUndefined();
    });

    it('accepts a conflicting pattern definition when separately authorized', () => {
      const plan = planPartialUpdate(
        BASE,
        generated({ patterns: { weave: { ...WEAVE, width: 16 } } }),
        { patternConflicts: true }
      );
      expect(plan.conflicts).toEqual([]);
      expect(plan.after).toBeDefined();
    });
  });

  describe('target and surface rejection', () => {
    it('rejects a target that does not resolve to a jersey', () => {
      const plan = planPartialUpdate(
        BASE,
        generated({ target: { kind: 'jersey', id: 'missing' } })
      );
      expect(plan.issues.map((issue) => issue.path)).toContain('target.id');
      expect(plan.after).toBeUndefined();
    });

    it('rejects a team mismatch', () => {
      const plan = planPartialUpdate(BASE, generated({ teamId: 'other' }));
      expect(plan.issues.map((issue) => issue.path)).toContain('teamId');
    });

    it('rejects a jersey that paints a helmet surface', () => {
      const plan = planPartialUpdate(
        BASE,
        generated({
          jersey: {
            base: 'white',
            layers: [
              {
                id: 'cheat',
                surface: 'helmet',
                d: 'M0,0 H1 V1 Z',
                clip: true,
                kind: 'fill',
                fill: 'navy',
              },
            ],
          },
        })
      );
      expect(plan.issues.map((issue) => issue.path)).toContain('jerseys.home.layers.0.surface');
      expect(plan.after).toBeUndefined();
    });
  });
});

describe('renderGeneratedPartialModule', () => {
  it('emits a self-describing module the team parts module imports', () => {
    const source = renderGeneratedPartialModule(generated());
    expect(source).toContain("import type { GeneratedPartial } from '../partial'");
    expect(source).toContain('export const GENERATED_PARTIAL: GeneratedPartial =');
    expect(source).toContain('teamId: "test"');
  });
});

describe('compileParts with a literal-hex pattern fill', () => {
  it('passes a converter-emitted hex through instead of throwing on the palette lookup', () => {
    const definition: TeamPartsDefinition = {
      ...BASE,
      patterns: { weave: { ...WEAVE, shapes: [{ d: 'M0,0 H1 V1 Z', fill: '#123456' }] } },
    };
    expect(compileParts(definition).patterns?.weave.shapes[0].fill).toBe('#123456');
  });
});
