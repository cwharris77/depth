import { describe, expect, it } from 'vitest';
import {
  buildReviewSheet,
  parseReviewNotes,
  type ReviewDesign,
  type ReviewSheetInput,
} from './review-sheet';

const IMG = { src: 'data:image/webp;base64,AAAA', alt: 'a design' };

function design(overrides: Partial<ReviewDesign> = {}): ReviewDesign {
  return {
    rowId: 'seahawks-home-2012',
    name: 'Home',
    after: IMG,
    combinations: [],
    ...overrides,
  };
}

function input(overrides: Partial<ReviewSheetInput> = {}): ReviewSheetInput {
  return {
    teamName: 'Seahawks',
    baseRef: 'origin/main',
    designs: [design()],
    references: [],
    notes: { crops: {}, missing: [], absentMarks: [] },
    needsSource: [],
    ...overrides,
  };
}

describe('buildReviewSheet', () => {
  it('starts with the doctype and titles the page by team', () => {
    const html = buildReviewSheet(input());
    expect(html.startsWith('<!doctype html>')).toBe(true);
    expect(html).toContain('<title>Seahawks review</title>');
  });

  it('renders one section per design, in input order, with four figure slots', () => {
    const html = buildReviewSheet(
      input({
        designs: [
          design({ rowId: 'seahawks-home-2012', name: 'Home' }),
          design({ rowId: 'seahawks-away-2012', name: 'Away' }),
        ],
      })
    );
    const sections = html.match(/<section class="design">/g) ?? [];
    expect(sections).toHaveLength(2);
    const homeIndex = html.indexOf('seahawks-home-2012');
    const awayIndex = html.indexOf('seahawks-away-2012');
    expect(homeIndex).toBeGreaterThan(-1);
    expect(awayIndex).toBeGreaterThan(homeIndex);
  });

  it('shows the design name and row id', () => {
    const html = buildReviewSheet(
      input({ designs: [design({ name: 'Home', rowId: 'seahawks-home-2012' })] })
    );
    expect(html).toContain('Home');
    expect(html).toContain('seahawks-home-2012');
  });

  it('renders an img for each supplied slot and a placeholder otherwise', () => {
    const html = buildReviewSheet(
      input({
        designs: [
          design({
            reference: { src: 'data:image/webp;base64,REF', alt: 'reference' },
            before: { src: 'data:image/webp;base64,BEF', alt: 'before' },
            after: { src: 'data:image/webp;base64,AFT', alt: 'after' },
            combinations: [
              {
                label: 'White pants',
                image: { src: 'data:image/webp;base64,COMBO', alt: 'combo' },
              },
            ],
          }),
        ],
      })
    );
    expect(html).toContain('data:image/webp;base64,REF');
    expect(html).toContain('data:image/webp;base64,BEF');
    expect(html).toContain('data:image/webp;base64,AFT');
    expect(html).toContain('data:image/webp;base64,COMBO');
    expect(html).not.toContain('No reference crop');
    expect(html).not.toContain('New design');
    expect(html).not.toContain('No extra combinations');
  });

  it('wraps combinations in a div with its own caption, not a nested figure', () => {
    const html = buildReviewSheet(
      input({
        designs: [
          design({
            combinations: [
              {
                label: 'White pants',
                image: { src: 'data:image/webp;base64,COMBO', alt: 'combo' },
              },
            ],
          }),
        ],
      })
    );
    expect(html).toContain('<div class="combinations">');
    expect(html).toContain('<span class="combinations-caption">Combinations</span>');
    expect(html).not.toMatch(/<figure class="combinations">/);
  });

  it('shows placeholders when a slot is empty', () => {
    const html = buildReviewSheet(input({ designs: [design()] }));
    expect(html).toContain('No reference crop');
    expect(html).toContain('New design');
    expect(html).toContain('No extra combinations');
  });

  it('lists missing details with open entries first', () => {
    const html = buildReviewSheet(
      input({
        notes: {
          crops: {},
          missing: [
            { surface: 'pants', detail: 'knee claw', resolution: 'dismissed', note: 'skip' },
            { surface: 'jersey', detail: 'collar lining', resolution: 'open' },
          ],
          absentMarks: [],
        },
      })
    );
    const openIndex = html.indexOf('collar lining');
    const dismissedIndex = html.indexOf('knee claw');
    expect(openIndex).toBeGreaterThan(-1);
    expect(dismissedIndex).toBeGreaterThan(openIndex);
  });

  it('shows None separately for each empty notes section', () => {
    const html = buildReviewSheet(input());
    expect(html).toMatch(/Missing details<\/h2>\s*<p>None/);
    expect(html).toMatch(/Needs source<\/h2>\s*<p>None/);
    expect(html).toMatch(/Absent marks<\/h2>\s*<p>None/);
  });

  it('formats needs-source periods as rowId: from-to', () => {
    const html = buildReviewSheet(
      input({ needsSource: [{ rowId: 'seahawks-home-2012', from: 2012, to: 2018 }] })
    );
    expect(html).toContain('seahawks-home-2012: 2012–2018');
  });

  it('lists absent marks', () => {
    const html = buildReviewSheet(
      input({
        notes: {
          crops: {},
          missing: [],
          absentMarks: [{ mark: 'chest wordmark', note: 'no vector source' }],
        },
      })
    );
    expect(html).toContain('chest wordmark');
    expect(html).toContain('no vector source');
  });

  it('HTML-escapes every interpolated string', () => {
    const html = buildReviewSheet(input({ designs: [design({ name: '<b>&', rowId: '<i>x' })] }));
    expect(html).toContain('&lt;b&gt;&amp;');
    expect(html).not.toContain('<b>&');
    expect(html).toContain('&lt;i&gt;x');
    expect(html).not.toContain('<i>x');
  });

  it('defines color tokens with light and dark themes and no external URLs', () => {
    const html = buildReviewSheet(input());
    expect(html).toMatch(/:root\s*{[^}]*--bg/);
    expect(html).toMatch(/@media \(prefers-color-scheme: dark\)/);
    expect(html).toMatch(/body\s*{[^}]*background/);
    expect(html).not.toMatch(/<script|https?:\/\//);
  });
});

describe('parseReviewNotes', () => {
  it('accepts an empty object', () => {
    expect(parseReviewNotes({})).toEqual({ crops: {}, missing: [], absentMarks: [] });
  });

  it('rejects an unknown resolution, naming the index', () => {
    expect(() =>
      parseReviewNotes({
        missing: [{ surface: 'jersey', detail: 'x', resolution: 'maybe' }],
      })
    ).toThrow(/missing\[0\]/);
  });

  it('rejects a crop box that is not four non-negative numbers', () => {
    expect(() =>
      parseReviewNotes({
        crops: { 'seahawks-home-2012': { file: 'a.png', box: [1, 2, 3] } },
      })
    ).toThrow();
    expect(() =>
      parseReviewNotes({
        crops: { 'seahawks-home-2012': { file: 'a.png', box: [1, 2, 3, -1] } },
      })
    ).toThrow();
  });

  it('rejects a crop box with zero width or height', () => {
    expect(() =>
      parseReviewNotes({
        crops: { 'seahawks-home-2012': { file: 'a.png', box: [1, 2, 0, 4] } },
      })
    ).toThrow();
    expect(() =>
      parseReviewNotes({
        crops: { 'seahawks-home-2012': { file: 'a.png', box: [1, 2, 4, 0] } },
      })
    ).toThrow();
  });

  it('rejects a crop file that escapes the refs directory', () => {
    for (const file of ['a/b.png', 'a\\b.png', '../a.png', 'a/../b.png']) {
      expect(() =>
        parseReviewNotes({ crops: { 'seahawks-home-2012': { file, box: [0, 0, 1, 1] } } })
      ).toThrow();
    }
  });
});
