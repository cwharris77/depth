import { describe, it, expect } from 'vitest';
import { parseCsv } from './csv';

describe('parseCsv', () => {
  it('parses simple rows into header-keyed records', () => {
    const rows = parseCsv('a,b,c\n1,2,3\n4,5,6\n');
    expect(rows).toEqual([
      { a: '1', b: '2', c: '3' },
      { a: '4', b: '5', c: '6' },
    ]);
  });

  it('handles quoted fields with embedded commas', () => {
    const rows = parseCsv('name,note\nAlice,"Ran for 100, 2 TDs"\n');
    expect(rows).toEqual([{ name: 'Alice', note: 'Ran for 100, 2 TDs' }]);
  });

  it('handles embedded escaped quotes', () => {
    const rows = parseCsv('name,note\nBob,"He said ""hi"""\n');
    expect(rows).toEqual([{ name: 'Bob', note: 'He said "hi"' }]);
  });

  it('handles embedded newlines inside quoted fields', () => {
    const rows = parseCsv('name,note\nCarl,"line one\nline two"\n');
    expect(rows).toEqual([{ name: 'Carl', note: 'line one\nline two' }]);
  });

  it('handles CRLF line endings', () => {
    const rows = parseCsv('a,b\r\n1,2\r\n3,4\r\n');
    expect(rows).toEqual([
      { a: '1', b: '2' },
      { a: '3', b: '4' },
    ]);
  });

  it('handles a missing trailing newline', () => {
    const rows = parseCsv('a,b\n1,2');
    expect(rows).toEqual([{ a: '1', b: '2' }]);
  });

  it('returns an empty array for a header-only file', () => {
    expect(parseCsv('a,b,c\n')).toEqual([]);
    expect(parseCsv('')).toEqual([]);
  });
});
