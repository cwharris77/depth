import { describe, expect, it } from 'vitest';
import {
  extractComments,
  findForbiddenCommentReferences,
  findPrivatePathsInSource,
  parseChangedLineRanges,
} from '@/lib/public-comments';

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
    ['// Mark is non-free upstream (fair use; trademarked).', 'legal or sourcing stance'],
    ['// Colors are facts, not copyrightable.', 'legal or sourcing stance'],
    ['// Redrawn from the reference, not traced.', 'legal or sourcing stance'],
    ['// Sources collected by Luna; Astra authored the art.', 'model or agent name'],
    ["// Home first, away second (Cooper's call).", 'private decision provenance'],
    ['// See obsidian:Projects/depth/specs/x.md.', 'private documentation path'],
  ])('rejects %s', (source, pattern) => {
    const comments = extractComments(source, 'Example.ts');

    expect(findForbiddenCommentReferences(comments)).toEqual(
      expect.arrayContaining([expect.objectContaining({ pattern })])
    );
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

  it('allows license and trademark notices only in the attributions file', () => {
    const notice = 'Team marks are trademarks of their respective clubs.';

    expect(
      findForbiddenCommentReferences(extractComments(notice, 'ATTRIBUTIONS.md'), 'ATTRIBUTIONS.md')
    ).toEqual([]);
    expect(
      findForbiddenCommentReferences(extractComments(notice, 'README.md'), 'README.md')
    ).toEqual([expect.objectContaining({ pattern: 'legal or sourcing stance' })]);
  });

  it('allows the Claude Code attribution footer', () => {
    const comments = extractComments('Generated with Claude Code', 'template.md');

    expect(findForbiddenCommentReferences(comments, 'template.md')).toEqual([]);
  });

  it('parses added-line ranges from a zero-context diff', () => {
    const ranges = parseChangedLineRanges(
      '+++ b/Depth/Example.swift\n@@ -4 +4,3 @@\n+line\n+line\n+line\n'
    );

    expect(ranges.get('Depth/Example.swift')).toEqual([[4, 6]]);
  });
});
