import { describe, it, expect } from 'vitest';
import { epicNameForDate, formatInboxLine, insertUnsortedLines } from '@/lib/sportslogos/inbox';

const AUG = new Date(Date.UTC(2026, 7, 25));

describe('epicNameForDate', () => {
  it('names the epic by the run month, so a burst of kits shares one swimlane', () => {
    expect(epicNameForDate(AUG)).toBe('2026 Uniform Releases — Aug');
  });

  it('rolls over the year and month boundaries in UTC', () => {
    expect(epicNameForDate(new Date(Date.UTC(2027, 0, 1)))).toBe('2027 Uniform Releases — Jan');
    expect(epicNameForDate(new Date(Date.UTC(2026, 11, 31)))).toBe('2026 Uniform Releases — Dec');
  });
});

describe('formatInboxLine', () => {
  it('matches the inbox’s existing dated one-liner shape and carries the triage hints', () => {
    expect(
      formatInboxLine(
        {
          title: 'New York Jets Unveil New White Alternate Helmets For 2026 Season',
          url: 'https://news.sportslogos.net/jets/',
        },
        AUG
      )
    ).toBe(
      '- 2026-08-25 depth: uniform unveiling — New York Jets Unveil New White Alternate Helmets For 2026 Season → https://news.sportslogos.net/jets/ (epic: 2026 Uniform Releases — Aug, area: Uniform Archive)'
    );
  });

  it('collapses newlines and stray whitespace so one item stays one inbox line', () => {
    const line = formatInboxLine(
      { title: '  Rams\n Reveal\tThrowbacks  ', url: 'https://x/' },
      AUG
    );
    expect(line).toContain('— Rams Reveal Throwbacks →');
    expect(line.split('\n')).toHaveLength(1);
  });
});

describe('insertUnsortedLines', () => {
  const NOTE = [
    '---',
    'type: system',
    '---',
    '',
    '# Inbox',
    '',
    '## Unsorted',
    '',
    '<!-- dump -->',
    '',
    '## Needs you',
    '',
    '- existing item',
  ].join('\n');

  it('inserts directly under the ## Unsorted heading, above the capture hint', () => {
    const out = insertUnsortedLines(NOTE, ['- line a', '- line b']);
    expect(out).not.toBeNull();
    const lines = out!.split('\n');
    expect(lines[6]).toBe('## Unsorted');
    expect(lines[7]).toBe('');
    expect(lines[8]).toBe('- line a');
    expect(lines[9]).toBe('- line b');
    expect(lines[10]).toBe('');
    expect(lines[11]).toBe('<!-- dump -->');
  });

  it('leaves the rest of the note untouched', () => {
    const out = insertUnsortedLines(NOTE, ['- line a'])!;
    expect(out).toContain('## Needs you');
    expect(out).toContain('- existing item');
    expect(out.startsWith('---\ntype: system')).toBe(true);
  });

  it('returns the note unchanged when there is nothing to add', () => {
    expect(insertUnsortedLines(NOTE, [])).toBe(NOTE);
  });

  it('returns null rather than guessing when the anchor heading is missing', () => {
    expect(insertUnsortedLines('# Inbox\n\n## Triaged\n', ['- line a'])).toBeNull();
    expect(insertUnsortedLines('', ['- line a'])).toBeNull();
  });

  it('does not match a heading that merely starts with Unsorted', () => {
    expect(insertUnsortedLines('## Unsorted stuff\n', ['- line a'])).toBeNull();
  });
});
