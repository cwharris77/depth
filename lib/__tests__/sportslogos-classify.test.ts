import { describe, it, expect } from 'vitest';
import { classifyNewsItem, type RejectReason } from '@/lib/sportslogos/classify';

// The corpus is the real SportsLogos.net NFL feed as of the monitor's first successful
// run (2026-09-03) — all 30 items it surfaced, with the verdict each should get. Looping
// one `it` per title means a regression names the offending headline (AGENTS.md §3's
// data-integrity test convention) rather than failing as one opaque assertion.
const CORPUS: ReadonlyArray<readonly [string, true | RejectReason]> = [
  // --- Real unveilings: a team (or the league) putting out a new kit. ---
  ['NFL, Nike Unveil New “Rivalries” Uniforms For AFC South, NFC North', true],
  ['Tampa Bay Buccaneers To Revive All-Pewter Alternate Uniforms In 2026', true],
  [
    'Buffalo Bills Unveil New Gray “Nickel City” Alternate Uniforms, Logo-Inspired Royal Blue Helmets',
    true,
  ],
  ['Los Angeles Rams Reveal Two New Throwback-Inspired Alternate Uniforms', true],
  ['New York Jets Unveil New White Alternate Helmets For 2026 Season', true],
  ['New Orleans Saints Reveal 60th Season Logo, Uniform Patch For 2026', true],
  [
    'New York Giants To Wear “Legacy” Throwback Uniforms For Super Bowl XXI’s 40th Anniversary',
    true,
  ],
  // A first wearing of an already-unveiled kit reads the same as a reveal and is
  // admitted deliberately — deduping it against the earlier post is triage's job, not
  // the filter's. Better a rare duplicate than a missed kit.
  ['Chicago Bears To Debut Nike “Rivalries” Uniforms Against Green Bay Packers On Christmas', true],

  // --- Listicles, rankings, retrospectives, wishlists. ---
  ['Ranking The NFL’s 2026 Nike “Rivalries” Uniforms From Best To Worst', 'ranking-or-opinion'],
  ['The Best, Worst Uniforms In Every NFL Team’s History: NFC North Edition', 'ranking-or-opinion'],
  ['The Best, Worst Uniforms In Every NFL Team’s History: NFC East Edition', 'ranking-or-opinion'],
  ['The Best, Worst Uniforms In Every NFL Team’s History: AFC West Edition', 'ranking-or-opinion'],
  ['The Best, Worst Uniforms In Every NFL Team’s History: AFC South Edition', 'ranking-or-opinion'],
  ['The Best, Worst Uniforms In Every NFL Team’s History: AFC North Edition', 'ranking-or-opinion'],
  ['The Best, Worst Uniforms In Every NFL Team’s History: AFC East Edition', 'ranking-or-opinion'],
  ['NFL Teams In Need Of A Uniform Redesign: Carolina Panthers', 'ranking-or-opinion'],
  ['NFL Teams In Need Of A Uniform Redesign: New York Giants', 'ranking-or-opinion'],
  ['NFL Teams In Need Of A Uniform Redesign: Miami Dolphins', 'ranking-or-opinion'],

  // --- Video-game coverage. Uses "reveal" constantly, never ships a real kit. ---
  ['A Look At The New Nike “Rivalries” Uniforms In Madden NFL 27', 'video-game'],
  ['Taking A Look At The New Home, Road And Alternate Uniforms In Madden NFL 27', 'video-game'],
  [
    'EA Sports Officially Reveals Chicago Bears QB Caleb Williams As Madden NFL 27 Cover Athlete',
    'video-game',
  ],
  ['College Football 27, Madden NFL 27 Deluxe Edition Covers Leaked By Xbox', 'video-game'],

  // --- Merchandise and sales. ---
  [
    'New Era Launches 2026 NFL Sidelines Collection, Cold Weather Styles Coming in September',
    'merchandise',
  ],
  ['Dallas Cowboys, Miami Dolphins’ Draft Picks Lead Rookie Jersey Sales', 'merchandise'],

  // --- Pre-announcement leaks: the official post follows days later. ---
  ['Sources: NFL To Unveil 2026 Nike “Rivalries” Uniforms On August 25', 'leak'],
  [
    'Sources: Buffalo Bills To Reveal Gray Alternate Uniforms, Royal Blue Helmets On July 27',
    'leak',
  ],
  ['Sources: Los Angeles Rams To Unveil Two New Alternate Uniforms On July 23', 'leak'],
  ['Sources: Tennessee Titans’ “Rivalries” Concept Nearly Identical To Actual Uniforms', 'leak'],
  ['Buffalo Bills’ New Logo-Inspired Royal Blue Alternate Helmets Leak On Reddit', 'leak'],

  // --- Opinion with the right noun but no unveiling verb. ---
  [
    'Philadelphia Eagles’ Jalen Hurts Pleads For White Road Version Of Kelly Green Throwback Uniforms',
    'no-unveiling-verb',
  ],
];

describe('classifyNewsItem — real feed corpus', () => {
  for (const [title, expected] of CORPUS) {
    it(`${expected === true ? 'admits' : `rejects (${expected})`}: ${title}`, () => {
      const verdict = classifyNewsItem(title);
      if (expected === true) {
        expect(verdict).toEqual({ isUnveiling: true });
      } else {
        expect(verdict).toEqual({ isUnveiling: false, reason: expected });
      }
    });
  }
});

describe('classifyNewsItem — corpus shape', () => {
  it('admits exactly the 8 uniform-related items and rejects the other 22', () => {
    const admitted = CORPUS.filter(([title]) => classifyNewsItem(title).isUnveiling);
    expect(admitted).toHaveLength(8);
    expect(CORPUS).toHaveLength(30);
  });
});

describe('classifyNewsItem — malformed input degrades', () => {
  const malformed: ReadonlyArray<readonly [string, unknown]> = [
    ['empty string', ''],
    ['whitespace only', '   '],
    ['undefined', undefined],
    ['null', null],
    ['a number', 42],
  ];

  for (const [label, value] of malformed) {
    it(`rejects ${label} without throwing`, () => {
      expect(classifyNewsItem(value as string)).toEqual({
        isUnveiling: false,
        reason: 'no-unveiling-verb',
      });
    });
  }

  it('rejects a verb with no uniform noun', () => {
    expect(classifyNewsItem('Seattle Seahawks Unveil New Practice Facility')).toEqual({
      isUnveiling: false,
      reason: 'no-uniform-noun',
    });
  });
});
