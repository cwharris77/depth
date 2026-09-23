import { describe, expect, it } from 'vitest';
import {
  extractComments,
  findForbiddenCommentReferences,
  findPrivatePathsInSource,
  parseChangedLineRanges,
  parsePrivateRules,
} from '@/lib/public-comments';

// Stand-ins for the real denylist, which is supplied at runtime and never committed.
const privateRules = parsePrivateRules(
  JSON.stringify([
    { label: 'placeholder name', pattern: '\\bZephyrine\\b', flags: 'i' },
    { label: 'placeholder stance', pattern: '\\bquuxable\\b', exemptFiles: ['NOTICES.md'] },
  ])
);

describe('public source comment policy', () => {
  it('finds internal references in line comments', () => {
    const comments = extractComments('// DEP-123 explains this\nconst value = 1;', 'Example.swift');

    expect(findForbiddenCommentReferences(comments)).toEqual([
      expect.objectContaining({ line: 1, pattern: 'ticket id' }),
    ]);
  });

  it('finds internal references in block comments', () => {
    const comments = extractComments(
      '/* See the vault ticket DEP-456. */\nconst value = 1;',
      'Example.ts'
    );

    expect(findForbiddenCommentReferences(comments)).toEqual([
      expect.objectContaining({ line: 1, pattern: 'ticket id' }),
      expect.objectContaining({ pattern: 'private documentation path' }),
    ]);
  });

  it('does not inspect string literals as comments', () => {
    const comments = extractComments("const label = 'DEP-789';", 'Example.ts');

    expect(findForbiddenCommentReferences(comments)).toEqual([]);
  });

  it('allows concrete technical rationale', () => {
    const comments = extractComments(
      '// Falls back to a live fetch when the cache cannot decode.',
      'Example.swift'
    );

    expect(findForbiddenCommentReferences(comments)).toEqual([]);
  });

  it.each([
    ['// See obsidian:Projects/depth/specs/x.md.', 'private documentation path'],
    ['// Cached per 2026-08-20-ingest-cache-revalidation-design.md.', 'private documentation path'],
  ])('rejects %s', (source, pattern) => {
    const comments = extractComments(source, 'Example.ts');

    expect(findForbiddenCommentReferences(comments)).toEqual(
      expect.arrayContaining([expect.objectContaining({ pattern })])
    );
  });

  it('reads Python docstrings and markup comments as comments', () => {
    const python = extractComments('"""Mark is quuxable upstream."""\nx = 1', 'mark.py');
    const svg = extractComments("<svg><!-- Derived from Zephyrine's drawing --></svg>", 'base.svg');

    expect(findForbiddenCommentReferences(python, 'mark.py', privateRules)).toEqual([
      expect.objectContaining({ pattern: 'placeholder stance', private: true }),
    ]);
    expect(findForbiddenCommentReferences(svg, 'base.svg', privateRules)).toEqual([
      expect.objectContaining({ pattern: 'placeholder name', private: true }),
    ]);
  });

  it('applies runtime rules only when supplied', () => {
    const comments = extractComments('// Picked by zephyrine.', 'Example.ts');

    expect(findForbiddenCommentReferences(comments, 'Example.ts')).toEqual([]);
    expect(findForbiddenCommentReferences(comments, 'Example.ts', privateRules)).toEqual([
      expect.objectContaining({ pattern: 'placeholder name', match: 'zephyrine', private: true }),
    ]);
  });

  it('rejects a malformed denylist', () => {
    expect(() => parsePrivateRules('{}')).toThrow('JSON array');
    expect(() => parsePrivateRules('[{ "label": "x" }]')).toThrow('entry 0');
  });

  it('does not read shell globs as block comments', () => {
    const comments = extractComments('rm -rf "$OUT"/*.png\n# design spec\n', 'run.sh');

    expect(comments).toEqual([expect.objectContaining({ line: 2 })]);
  });

  it('rejects personal absolute paths anywhere in source', () => {
    const source = "REF = Path('/Users/someone/Downloads/mark.svg')";

    expect(findPrivatePathsInSource(source)).toEqual([
      expect.objectContaining({ pattern: 'personal path' }),
    ]);
  });

  it('rejects private paths in string literals', () => {
    const source = "const sources = [\n  'obsidian:Projects/depth/specs/x.md',\n];";

    expect(findPrivatePathsInSource(source)).toEqual([
      expect.objectContaining({ line: 2, pattern: 'private documentation path' }),
    ]);
  });

  it('checks every Markdown line and exempts agent-file cross references', () => {
    const markdown = 'See AGENTS.md for setup.\nDecided in DEP-12.';
    const comments = extractComments(markdown, 'CLAUDE.md');

    expect(findForbiddenCommentReferences(comments, 'CLAUDE.md')).toEqual([
      expect.objectContaining({ line: 2, pattern: 'ticket id' }),
    ]);
  });

  it('skips a runtime rule in the files it exempts', () => {
    const notice = 'These marks are quuxable.';

    expect(
      findForbiddenCommentReferences(
        extractComments(notice, 'NOTICES.md'),
        'NOTICES.md',
        privateRules
      )
    ).toEqual([]);
    expect(
      findForbiddenCommentReferences(
        extractComments(notice, 'README.md'),
        'README.md',
        privateRules
      )
    ).toEqual([expect.objectContaining({ pattern: 'placeholder stance' })]);
  });

  it('parses added-line ranges from a zero-context diff', () => {
    const ranges = parseChangedLineRanges(
      '+++ b/Depth/Example.swift\n@@ -4 +4,3 @@\n+line\n+line\n+line\n'
    );

    expect(ranges.get('Depth/Example.swift')).toEqual([[4, 6]]);
  });
});
