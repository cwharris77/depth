import { describe, expect, it } from 'vitest';
import {
  extractComments,
  findForbiddenCommentReferences,
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

  it('parses added-line ranges from a zero-context diff', () => {
    const ranges = parseChangedLineRanges(
      '+++ b/Depth/Example.swift\n@@ -4 +4,3 @@\n+line\n+line\n+line\n'
    );

    expect(ranges.get('Depth/Example.swift')).toEqual([[4, 6]]);
  });
});
