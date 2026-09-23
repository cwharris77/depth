import { describe, expect, it } from 'vitest';
import {
  authoredJerseys,
  findUnresolvedConstructions,
  formatValidationIssues,
  isValidHexColor,
  isValidPathData,
  jerseySurfaceIssues,
  resolveAuthoredJersey,
  validateAuthoredDefinition,
} from '../core/validate';

// The validator is the authoring path's safety net: a model-authored JSON or a curated catalog
// row that names a colour, pattern, surface, or path the renderer cannot draw must fail at the
// boundary, not publish plausible-but-wrong art. Each case pins one rule the review asked for.

function definition(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schemaVersion: 1,
    teamId: 'seahawks',
    target: { kind: 'jersey', id: 'rivalries-silver' },
    palette: { navy: '#002244', green: '#69BE28' },
    patterns: {
      rivalDashes: {
        width: 22,
        height: 22,
        gradient: {
          x1: 0,
          y1: 372,
          x2: 0,
          y2: 720,
          stops: [
            { offset: 0, color: 'green' },
            { offset: 1, color: 'navy' },
          ],
        },
        shapes: [{ d: 'M3,2 L6,4 Z', fill: 'green' }],
      },
    },
    jerseys: {
      'rivalries-silver': {
        base: 'navy',
        layers: [
          {
            id: 'field',
            surface: 'jersey',
            clip: true,
            kind: 'fill',
            fill: 'pattern:rivalDashes',
            d: 'M0,0 L560,0 L560,452 L0,452 Z',
          },
        ],
        number: { fill: 'green', outline: 'navy', outlineWidth: 14 },
      },
    },
    ...overrides,
  };
}

describe('validateAuthoredDefinition', () => {
  it('accepts a valid definition', () => {
    expect(validateAuthoredDefinition(definition())).toEqual([]);
  });

  it('rejects an unsupported top-level field', () => {
    const issues = validateAuthoredDefinition(definition({ sneaky: true }));
    expect(issues.map((issue) => issue.path)).toContain('sneaky');
  });

  it('rejects an unsupported schema version', () => {
    expect(validateAuthoredDefinition(definition({ schemaVersion: 99 }))).toContainEqual(
      expect.objectContaining({ path: 'schemaVersion' })
    );
  });

  it('rejects a palette value that is not a hex color', () => {
    const issues = validateAuthoredDefinition(definition({ palette: { navy: 'navy' } }));
    expect(issues.map((issue) => issue.path)).toContain('palette.navy');
  });

  it('rejects a layer color that is not a palette key or pattern ref', () => {
    const issues = validateAuthoredDefinition(
      definition({
        jerseys: {
          'rivalries-silver': {
            base: 'navy',
            layers: [
              { id: 'field', surface: 'jersey', clip: true, kind: 'fill', fill: 'chartreuse' },
            ],
          },
        },
      })
    );
    expect(issues.map((issue) => issue.path)).toContain('jerseys.rivalries-silver.layers.0.fill');
  });

  it('rejects a pattern reference that does not resolve', () => {
    const issues = validateAuthoredDefinition(
      definition({
        jerseys: {
          'rivalries-silver': {
            base: 'navy',
            layers: [
              { id: 'field', surface: 'jersey', clip: true, kind: 'fill', fill: 'pattern:missing' },
            ],
          },
        },
      })
    );
    expect(issues.map((issue) => issue.path)).toContain('jerseys.rivalries-silver.layers.0.fill');
  });

  it('rejects a non-positive pattern tile dimension', () => {
    const issues = validateAuthoredDefinition(
      definition({
        patterns: {
          rivalDashes: { width: 0, height: 22, shapes: [{ d: 'M0,0 L1,1 Z' }] },
        },
      })
    );
    expect(issues.map((issue) => issue.path)).toContain('patterns.rivalDashes.width');
  });

  it('rejects a gradient stop offset outside [0, 1]', () => {
    const issues = validateAuthoredDefinition(
      definition({
        patterns: {
          rivalDashes: {
            width: 22,
            height: 22,
            gradient: {
              x1: 0,
              y1: 0,
              x2: 1,
              y2: 1,
              stops: [
                { offset: 2, color: 'green' },
                { offset: 1, color: 'navy' },
              ],
            },
            shapes: [{ d: 'M0,0 L1,1 Z' }],
          },
        },
      })
    );
    expect(issues.map((issue) => issue.path)).toContain(
      'patterns.rivalDashes.gradient.stops.0.offset'
    );
  });

  it('rejects duplicate layer ids within a part', () => {
    const layer = { id: 'field', surface: 'jersey', clip: true, kind: 'fill', fill: 'navy' };
    const issues = validateAuthoredDefinition(
      definition({ jerseys: { 'rivalries-silver': { base: 'navy', layers: [layer, layer] } } })
    );
    expect(issues.map((issue) => issue.message).join(' ')).toContain('duplicate layer id');
  });

  it('rejects a jersey layer painting a helmet surface', () => {
    const issues = validateAuthoredDefinition(
      definition({
        jerseys: {
          'rivalries-silver': {
            base: 'navy',
            layers: [{ id: 'cheat', surface: 'helmet', clip: true, kind: 'fill', fill: 'navy' }],
          },
        },
      })
    );
    expect(issues.map((issue) => issue.path)).toContain(
      'jerseys.rivalries-silver.layers.0.surface'
    );
  });

  it('rejects invalid path data', () => {
    const issues = validateAuthoredDefinition(
      definition({
        jerseys: {
          'rivalries-silver': {
            base: 'navy',
            layers: [
              { id: 'field', surface: 'jersey', clip: true, kind: 'fill', fill: 'navy', d: 'wat' },
            ],
          },
        },
      })
    );
    expect(issues.map((issue) => issue.path)).toContain('jerseys.rivalries-silver.layers.0.d');
  });

  it('reports every problem, not just the first', () => {
    const issues = validateAuthoredDefinition({
      palette: { bad: 'nope' },
      jerseys: { a: { base: 'missing', layers: [] } },
    });
    expect(issues.length).toBeGreaterThan(1);
  });
});

describe('authoredJerseys', () => {
  it('reads the jerseys map spelling', () => {
    expect(authoredJerseys({ jerseys: { a: {}, b: {} } })).toEqual({ a: {}, b: {} });
  });

  it('keys a single jersey by its target id', () => {
    const jersey = { base: 'navy', layers: [] };
    expect(authoredJerseys({ target: { id: 'home' }, jersey })).toEqual({ home: jersey });
  });
});

describe('resolveAuthoredJersey', () => {
  it('resolves the jersey named by target.id, not the first in the input', () => {
    const away = { base: 'navy', layers: [] };
    const resolved = resolveAuthoredJersey({
      teamId: 'seahawks',
      target: { kind: 'jersey', id: 'away' },
      jerseys: { home: { base: 'navy', layers: [] }, away },
    });
    expect(resolved.issues).toEqual([]);
    expect(resolved.id).toBe('away');
    expect(resolved.jersey).toBe(away);
  });

  it('resolves a single jersey keyed by its target id', () => {
    const jersey = { base: 'navy', layers: [] };
    const resolved = resolveAuthoredJersey({ target: { kind: 'jersey', id: 'home' }, jersey });
    expect(resolved.issues).toEqual([]);
    expect(resolved.id).toBe('home');
    expect(resolved.jersey).toBe(jersey);
  });

  it('requires an explicit target.id', () => {
    const resolved = resolveAuthoredJersey({ jerseys: { home: { base: 'navy', layers: [] } } });
    expect(resolved.issues.map((issue) => issue.path)).toContain('target.id');
  });

  it('rejects a target.id that resolves to no authored jersey', () => {
    const resolved = resolveAuthoredJersey({
      target: { kind: 'jersey', id: 'nope' },
      jerseys: { home: { base: 'navy', layers: [] } },
    });
    expect(resolved.issues.map((issue) => issue.path)).toContain('target.id');
  });

  it('rejects an unsupported target kind', () => {
    const resolved = resolveAuthoredJersey({
      target: { kind: 'helmet', id: 'home' },
      jerseys: { home: { base: 'navy', layers: [] } },
    });
    expect(resolved.issues.map((issue) => issue.path)).toContain('target.kind');
  });

  it('rejects ambiguous input carrying both jersey and jerseys', () => {
    const resolved = resolveAuthoredJersey({
      target: { kind: 'jersey', id: 'home' },
      jersey: { base: 'navy', layers: [] },
      jerseys: { home: { base: 'navy', layers: [] } },
    });
    expect(resolved.issues.some((issue) => /ambiguous/.test(issue.message))).toBe(true);
  });
});

describe('jerseySurfaceIssues', () => {
  it('flags a helmet surface but allows jersey, sleeve, collar, and number', () => {
    const issues = jerseySurfaceIssues('jersey', {
      layers: [
        { surface: 'jersey' },
        { surface: 'sleeve-left' },
        { surface: 'collar' },
        { surface: 'number' },
        { surface: 'helmet' },
        { surface: 'pants' },
      ],
    });
    expect(issues).toHaveLength(2);
    expect(issues.map((issue) => issue.message).join(' ')).toContain('helmet');
  });
});

describe('findUnresolvedConstructions', () => {
  const rows = [
    { id: 'eagles-kelly-green-1987', teamId: 'eagles', constructionKey: 'kelly-green-original' },
    {
      id: 'eagles-kelly-green-modern-2023',
      teamId: 'eagles',
      constructionKey: 'kelly-green-modern',
    },
  ];

  it('passes when every key resolves to a registered kit', () => {
    const kits = { 'kelly-green-original': {}, 'kelly-green-modern': {} };
    expect(findUnresolvedConstructions(rows, () => kits)).toEqual([]);
  });

  it('flags a key with no registered kit, and a team with no definition', () => {
    const unresolved = findUnresolvedConstructions(rows, (teamId) =>
      teamId === 'eagles' ? { 'kelly-green-original': {} } : undefined
    );
    expect(unresolved.map((row) => row.id)).toEqual(['eagles-kelly-green-modern-2023']);
  });
});

describe('primitives', () => {
  it('validates hex colors', () => {
    expect(isValidHexColor('#fff')).toBe(true);
    expect(isValidHexColor('#69BE28')).toBe(true);
    expect(isValidHexColor('69BE28')).toBe(false);
    expect(isValidHexColor(1)).toBe(false);
  });

  it('validates path data', () => {
    expect(isValidPathData('M206,388 L294,455 L386,388')).toBe(true);
    expect(isValidPathData('')).toBe(false);
    expect(isValidPathData('L1,1')).toBe(false);
    expect(isValidPathData('M0,0 L nope')).toBe(false);
  });

  it('formats issues readably', () => {
    expect(formatValidationIssues([{ path: 'a.b', message: 'bad' }])).toContain('a.b: bad');
  });
});
